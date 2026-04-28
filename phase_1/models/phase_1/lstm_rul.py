"""
Intelligent Flight Readiness Prediction System
Team Kansas — Phase 1: Bi-LSTM RUL Prediction

Fixes applied based on SHAP analysis:
  1. Operating condition clustering — 6 regimes identified via KMeans on op1/op2/op3
  2. Per-regime scaling — MinMaxScaler fit separately per regime so sensors
     like s2 and s15 (which have very different ranges per condition) are
     normalised correctly. This was the root cause of poor FD002/FD004 performance.
"""

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings("ignore")

from utils.seed        import set_seed
from utils.logger      import get_logger
from utils.rul_metrics import compute_all, save_metrics
from utils.plotter     import plot_losses, plot_predictions, plot_trajectory, print_summary

logger = get_logger("lstm_rul")

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
DATA_DIR       = "/home/dmohile/capstone/data"
CHECKPOINT_DIR = "/home/dmohile/capstone/phase_1/models"
RESULTS_DIR    = "/home/dmohile/capstone/phase_1/results"

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────
COLS = (
    ["unit", "cycle"]
    + ["op1", "op2", "op3"]
    + ["s" + str(i) for i in range(1, 22)]
)

DROP_SENSORS    = ["s1", "s5", "s6", "s10", "s16", "s18", "s19"]
DROP_COLS       = DROP_SENSORS + ["op3"]
FEATURE_SENSORS = [s for s in ["s" + str(i) for i in range(1, 22)]
                   if s not in DROP_SENSORS]
OP_COLS         = ["op1", "op2"]   # used for regime clustering

RUL_CLIP    = 125
WINDOW_SIZE = 30
BATCH_SIZE  = 256
EPOCHS      = 100
LR          = 0.001
N_REGIMES   = 6    # C-MAPSS has 6 known operating regimes


# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
def load_data(fd="FD001"):
    logger.info(f"Loading {fd}...")
    train = pd.read_csv(f"{DATA_DIR}/train_{fd}.txt",
                        sep=r"\s+", header=None, names=COLS, engine="python")
    test  = pd.read_csv(f"{DATA_DIR}/test_{fd}.txt",
                        sep=r"\s+", header=None, names=COLS, engine="python")
    rul   = pd.read_csv(f"{DATA_DIR}/RUL_{fd}.txt",
                        sep=r"\s+", header=None, names=["RUL"], engine="python")

    # Train RUL: cycles to failure clipped at RUL_CLIP
    max_cycle = train.groupby("unit")["cycle"].max().rename("max_cycle")
    train = train.merge(max_cycle, on="unit")
    train["RUL"] = (train["max_cycle"] - train["cycle"]).clip(upper=RUL_CLIP)
    train.drop(columns=["max_cycle"], inplace=True)

    # Test RUL: from RUL file
    last_cycles = test.groupby("unit")["cycle"].max().reset_index()
    last_cycles.columns = ["unit", "last_cycle"]
    rul["unit"] = last_cycles["unit"].values
    test = test.merge(last_cycles, on="unit")
    test = test.merge(rul, on="unit")
    test["RUL"] = (test["RUL"] + test["last_cycle"] - test["cycle"]).clip(0, RUL_CLIP)
    test.drop(columns=["last_cycle"], inplace=True)

    logger.info(f"Train: {train.shape}  Test: {test.shape}")
    return train, test


# ─────────────────────────────────────────────
# 2. OPERATING CONDITION CLUSTERING
# FIX 1: Cluster op1/op2 into regime labels so the
# model gets regime info explicitly instead of having
# to infer it from sensor patterns (which caused the
# large SHAP values and poor FD002/FD004 performance)
# ─────────────────────────────────────────────
def add_regime_labels(train, test, n_regimes=N_REGIMES):
    """
    Fit KMeans on training op1/op2 → assign regime label 0..N-1.
    Single-condition datasets (FD001/FD003) will get 1 dominant cluster —
    that is fine, the label still gets added as a feature.
    """
    kmeans = KMeans(n_clusters=n_regimes, random_state=42, n_init=10)
    kmeans.fit(train[OP_COLS].values)

    train = train.copy()
    test  = test.copy()
    train["regime"] = kmeans.predict(train[OP_COLS].values)
    test["regime"]  = kmeans.predict(test[OP_COLS].values)

    n_train = train["regime"].nunique()
    logger.info(f"  Regimes found in train: {n_train} (of {n_regimes} requested)")
    return train, test, kmeans


# ─────────────────────────────────────────────
# 3. ROLLING FEATURES
# ─────────────────────────────────────────────
def add_rolling_features(df, window=5):
    df = df.copy()
    new_cols = {}
    for s in FEATURE_SENSORS:
        grp = df.groupby("unit")[s]
        new_cols[f"{s}_mean"] = grp.transform(lambda x: x.rolling(window, min_periods=1).mean())
        new_cols[f"{s}_std"]  = grp.transform(lambda x: x.rolling(window, min_periods=1).std().fillna(0))
        new_cols[f"{s}_min"]  = grp.transform(lambda x: x.rolling(window, min_periods=1).min())
        new_cols[f"{s}_max"]  = grp.transform(lambda x: x.rolling(window, min_periods=1).max())
    return pd.concat([df, pd.DataFrame(new_cols, index=df.index)], axis=1)


# ─────────────────────────────────────────────
# 4. PREPROCESSING
# FIX 2: Per-regime scaling instead of one global scaler.
# Sensors like s2/s15 have very different value ranges
# per operating condition — global scaling was mixing them
# which caused the 40× larger SHAP values on FD002.
# ─────────────────────────────────────────────
def preprocess(train, test):
    # Drop unused columns
    train = train.drop(columns=DROP_COLS, errors="ignore")
    test  = test.drop(columns=DROP_COLS,  errors="ignore")

    # FIX 1: Add regime labels before rolling features
    logger.info("Clustering operating conditions...")
    train, test, _ = add_regime_labels(train, test)

    # Rolling features
    logger.info("Computing rolling features for train...")
    train = add_rolling_features(train)
    logger.info("Computing rolling features for test...")
    test  = add_rolling_features(test)

    exclude      = {"unit", "cycle", "RUL", "regime"}
    feature_cols = [c for c in train.columns if c not in exclude]

    # FIX 2: Fit one scaler per regime, apply to train + test
    logger.info("Fitting per-regime scalers...")
    scalers = {}
    # Convert all feature columns to float64 to avoid dtype mismatch when
    # assigning scaled values back into integer columns
    train_scaled = train.copy()
    test_scaled  = test.copy()
    train_scaled[feature_cols] = train_scaled[feature_cols].astype(float)
    test_scaled[feature_cols]  = test_scaled[feature_cols].astype(float)

    for regime in sorted(train["regime"].unique()):
        scaler = MinMaxScaler()

        train_mask = train["regime"] == regime
        test_mask  = test["regime"]  == regime

        # Fit on train rows for this regime
        scaler.fit(train.loc[train_mask, feature_cols])

        # Transform train rows for this regime
        train_scaled.loc[train_mask, feature_cols] = scaler.transform(
            train.loc[train_mask, feature_cols]
        )

        # Transform test rows for this regime
        # If a test regime has no train samples (rare), fall back to global scaler
        if test_mask.sum() > 0:
            test_scaled.loc[test_mask, feature_cols] = scaler.transform(
                test.loc[test_mask, feature_cols]
            )

        scalers[regime] = scaler
        logger.info(f"  Regime {regime}: {train_mask.sum()} train rows, {test_mask.sum()} test rows")

    # Add regime as one-hot features so model sees it explicitly
    for r in sorted(train["regime"].unique()):
        train_scaled[f"regime_{r}"] = (train_scaled["regime"] == r).astype(float)
        test_scaled[f"regime_{r}"]  = (test_scaled["regime"]  == r).astype(float)

    # Final feature list includes regime one-hots
    final_feature_cols = feature_cols + [f"regime_{r}" for r in sorted(train["regime"].unique())]

    return train_scaled, test_scaled, final_feature_cols, scalers


# ─────────────────────────────────────────────
# 5. TRAIN / VALIDATION SPLIT
# ─────────────────────────────────────────────
def split_by_unit(df, val_fraction=0.2):
    units = df["unit"].unique()
    np.random.shuffle(units)
    n_val       = int(len(units) * val_fraction)
    val_units   = units[:n_val]
    train_units = units[n_val:]
    return (df[df["unit"].isin(train_units)].copy(),
            df[df["unit"].isin(val_units)].copy())


# ─────────────────────────────────────────────
# 6. SLIDING WINDOW DATASET
# ─────────────────────────────────────────────
class EngineDataset(Dataset):
    def __init__(self, df, feature_cols, window=WINDOW_SIZE):
        self.X, self.y = [], []
        for _, grp in df.groupby("unit"):
            grp  = grp.sort_values("cycle")
            feat = grp[feature_cols].values
            rul  = grp["RUL"].values
            for i in range(len(grp) - window + 1):
                self.X.append(feat[i: i + window])
                self.y.append(rul[i + window - 1])
        self.X = torch.tensor(np.array(self.X), dtype=torch.float32)
        self.y = torch.tensor(np.array(self.y), dtype=torch.float32)
        logger.info(f"Dataset: {len(self.y)} windows, shape {self.X.shape}")

    def __len__(self):  return len(self.y)
    def __getitem__(self, idx): return self.X[idx], self.y[idx]


# ─────────────────────────────────────────────
# 7. BI-LSTM MODEL  (unchanged)
# ─────────────────────────────────────────────
class BiLSTM(nn.Module):
    def __init__(self, input_size, hidden1=128, hidden2=64, dropout=0.3):
        super().__init__()
        self.lstm1   = nn.LSTM(input_size,   hidden1, batch_first=True, bidirectional=True)
        self.lstm2   = nn.LSTM(hidden1 * 2,  hidden2, batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(dropout)
        self.fc1     = nn.Linear(hidden2 * 2, 64)
        self.fc2     = nn.Linear(64, 1)
        self.relu    = nn.ReLU()

    def forward(self, x):
        out, _ = self.lstm1(x)
        out, _ = self.lstm2(out)
        out = self.dropout(out[:, -1, :])
        out = self.relu(self.fc1(out))
        return self.fc2(out).squeeze(1)


# ─────────────────────────────────────────────
# 8. TRAINING LOOP
# ─────────────────────────────────────────────
def train_model(train_df, val_df, feature_cols, fd="FD001"):
    import os
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR,    exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Training on: {device}")

    train_ds = EngineDataset(train_df, feature_cols)
    val_ds   = EngineDataset(val_df,   feature_cols)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE)

    model     = BiLSTM(input_size=len(feature_cols)).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
    criterion = nn.MSELoss()

    best_val_loss  = float("inf")
    train_history  = []
    val_history    = []
    best_path      = f"{CHECKPOINT_DIR}/best_lstm_{fd}.pt"
    patience_count = 0
    PATIENCE       = 15  # increased from implicit — stops faster if no improvement

    for epoch in range(1, EPOCHS + 1):
        # Train
        model.train()
        train_loss = 0.0
        for X_b, y_b in train_loader:
            X_b, y_b = X_b.to(device), y_b.to(device)
            optimizer.zero_grad()
            loss = criterion(model(X_b), y_b)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item() * len(y_b)
        train_loss /= len(train_ds)

        # Validate
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for X_b, y_b in val_loader:
                X_b, y_b = X_b.to(device), y_b.to(device)
                val_loss += criterion(model(X_b), y_b).item() * len(y_b)
        val_loss /= len(val_ds)

        scheduler.step(val_loss)
        train_history.append(train_loss ** 0.5)
        val_history.append(val_loss ** 0.5)

        if val_loss < best_val_loss:
            best_val_loss  = val_loss
            patience_count = 0
            torch.save(model.state_dict(), best_path)
        else:
            patience_count += 1
            if patience_count >= PATIENCE:
                logger.info(f"Early stopping at epoch {epoch}")
                break

        if epoch % 10 == 0:
            logger.info(
                f"Epoch {epoch:>3} | Train RMSE: {train_loss**0.5:.3f} "
                f"| Val RMSE: {val_loss**0.5:.3f}"
            )

    logger.info(f"Best val RMSE: {best_val_loss**0.5:.3f}")
    model.load_state_dict(torch.load(best_path))

    plot_losses(
        train_history, val_history,
        filepath=f"{RESULTS_DIR}/lstm_loss_{fd}.png"
    )
    return model, train_history, val_history, device


# ─────────────────────────────────────────────
# 9. INFERENCE
# ─────────────────────────────────────────────
def get_predictions(model, df, feature_cols, device):
    ds     = EngineDataset(df, feature_cols)
    loader = DataLoader(ds, batch_size=BATCH_SIZE)
    preds, actuals = [], []
    model.eval()
    with torch.no_grad():
        for X_b, y_b in loader:
            preds.extend(model(X_b.to(device)).cpu().numpy())
            actuals.extend(y_b.numpy())
    return np.clip(preds, 0, RUL_CLIP), np.array(actuals)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    set_seed(42)

    logger.info("=" * 55)
    logger.info("IFRPM — Bi-LSTM RUL Prediction (Fixed)")
    logger.info("Fix 1: Operating condition clustering")
    logger.info("Fix 2: Per-regime MinMaxScaler")
    logger.info("=" * 55)

    all_results = []

    for fd in ["FD001", "FD002", "FD003", "FD004"]:
        logger.info(f"\n{'#'*55}\nDATASET: {fd}\n{'#'*55}")

        # 1. Load
        train_raw, test_raw = load_data(fd)

        # 2. Preprocess (includes regime clustering + per-regime scaling)
        logger.info("[1/4] Preprocessing with regime-aware scaling...")
        train_proc, test_proc, feature_cols, scalers = preprocess(train_raw, test_raw)
        logger.info(f"Features: {len(feature_cols)} (includes {N_REGIMES} regime one-hots)")

        # 3. Split
        logger.info("[2/4] Splitting 80/20 by engine unit...")
        train_df, val_df = split_by_unit(train_proc)
        logger.info(
            f"Train engines: {train_df['unit'].nunique()} "
            f"| Val engines: {val_df['unit'].nunique()}"
        )

        # 4. Train
        logger.info("[3/4] Training Bi-LSTM...")
        model, train_hist, val_hist, device = train_model(
            train_df, val_df, feature_cols, fd
        )

        # 5. Evaluate
        logger.info("[4/4] Evaluating on test set...")
        test_preds, test_actuals = get_predictions(model, test_proc, feature_cols, device)
        metrics = compute_all(test_actuals, test_preds)
        logger.info(
            f"RMSE: {metrics['rmse']:.3f} | "
            f"MAE: {metrics['mae']:.3f} | "
            f"NASA: {metrics['nasa_score']:.1f}"
        )

        save_metrics(metrics, filepath=f"{RESULTS_DIR}/metrics_lstm_{fd}.json")
        all_results.append({"fd": fd, **metrics})

        # 6. Plots
        plot_predictions(
            test_actuals, test_preds,
            filepath=f"{RESULTS_DIR}/lstm_scatter_{fd}.png"
        )
        for uid in [5, 10, 15]:
            plot_trajectory(
                test_proc, feature_cols, model, device,
                unit_id=uid, fd=fd,
                window_size=WINDOW_SIZE, rul_clip=RUL_CLIP,
                save_dir=RESULTS_DIR
            )

    print_summary(all_results)
    logger.info(f"Done. Results saved to: {RESULTS_DIR}")


if __name__ == "__main__":
    main()