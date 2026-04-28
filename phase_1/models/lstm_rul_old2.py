"""
Intelligent Flight Readiness Prediction System
Team Kansas — Phase 1: Bi-LSTM RUL Prediction
Datasets: NASA C-MAPSS FD001, FD002, FD003, FD004
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
DATA_DIR   = "/home/dmohile/capstone/data"
OUTPUT_DIR = "/home/dmohile/capstone/phase_1/models"

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────
COLS = (
    ["unit", "cycle"]
    + ["op1", "op2", "op3"]
    + ["s" + str(i) for i in range(1, 22)]
)

DROP_SENSORS = ["s1", "s5", "s6", "s10", "s16", "s18", "s19"]
DROP_COLS    = DROP_SENSORS + ["op3"]
FEATURE_SENSORS = [s for s in ["s" + str(i) for i in range(1, 22)]
                   if s not in DROP_SENSORS]

RUL_CLIP    = 125
WINDOW_SIZE = 30   # how many cycles the LSTM looks back
BATCH_SIZE  = 256
EPOCHS      = 100  # increased from 50
LR          = 0.001


# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
def load_data(fd="FD001"):
    print("\n  Loading %s..." % fd)
    train = pd.read_csv(
        DATA_DIR + "/train_" + fd + ".txt",
        sep=r"\s+", header=None, names=COLS, engine="python")
    test = pd.read_csv(
        DATA_DIR + "/test_" + fd + ".txt",
        sep=r"\s+", header=None, names=COLS, engine="python")
    rul = pd.read_csv(
        DATA_DIR + "/RUL_" + fd + ".txt",
        sep=r"\s+", header=None, names=["RUL"], engine="python")

    # Training RUL: run-to-failure
    max_cycle = train.groupby("unit")["cycle"].max().rename("max_cycle")
    train = train.merge(max_cycle, on="unit")
    train["RUL"] = (train["max_cycle"] - train["cycle"]).clip(upper=RUL_CLIP)
    train.drop(columns=["max_cycle"], inplace=True)

    # Test RUL: from RUL file (last observed cycle per engine)
    last_cycles = test.groupby("unit")["cycle"].max().reset_index()
    last_cycles.columns = ["unit", "last_cycle"]
    rul["unit"] = last_cycles["unit"].values
    test = test.merge(last_cycles, on="unit")
    test = test.merge(rul, on="unit")
    test["RUL"] = (test["RUL"] + test["last_cycle"] - test["cycle"]).clip(0, RUL_CLIP)
    test.drop(columns=["last_cycle"], inplace=True)

    print("  Train: %s  Test: %s" % (str(train.shape), str(test.shape)))
    return train, test


# ─────────────────────────────────────────────
# 2. PREPROCESSING
# ─────────────────────────────────────────────
def add_rolling_features(df, window=5):
    df = df.copy()
    new_cols = {}
    for s in FEATURE_SENSORS:
        grp = df.groupby("unit")[s]
        new_cols[s + "_mean"] = grp.transform(
            lambda x: x.rolling(window, min_periods=1).mean())
        new_cols[s + "_std"] = grp.transform(
            lambda x: x.rolling(window, min_periods=1).std().fillna(0))
        new_cols[s + "_min"] = grp.transform(
            lambda x: x.rolling(window, min_periods=1).min())
        new_cols[s + "_max"] = grp.transform(
            lambda x: x.rolling(window, min_periods=1).max())
    return pd.concat([df, pd.DataFrame(new_cols, index=df.index)], axis=1)


def preprocess(train, test):
    train = train.drop(columns=DROP_COLS, errors="ignore")
    test  = test.drop(columns=DROP_COLS,  errors="ignore")

    print("  Computing rolling features for train...")
    train = add_rolling_features(train)
    print("  Computing rolling features for test...")
    test  = add_rolling_features(test)

    exclude = {"unit", "cycle", "RUL"}
    feature_cols = [c for c in train.columns if c not in exclude]

    # Fit scaler on train only — apply to both
    scaler = MinMaxScaler()
    train[feature_cols] = scaler.fit_transform(train[feature_cols])
    test[feature_cols]  = scaler.transform(test[feature_cols])

    return train, test, feature_cols, scaler


# ─────────────────────────────────────────────
# 3. TRAIN / VALIDATION SPLIT
#    Split by engine unit — avoids data leakage
# ─────────────────────────────────────────────
def split_by_unit(df, val_fraction=0.2, random_state=42):
    units = df["unit"].unique()
    np.random.seed(random_state)
    np.random.shuffle(units)
    n_val = int(len(units) * val_fraction)
    val_units   = units[:n_val]
    train_units = units[n_val:]
    return (df[df["unit"].isin(train_units)].copy(),
            df[df["unit"].isin(val_units)].copy())


# ─────────────────────────────────────────────
# 4. SLIDING WINDOW DATASET
#    Each sample = last WINDOW_SIZE cycles
#    Label = RUL at the last cycle of the window
# ─────────────────────────────────────────────
class EngineDataset(Dataset):
    def __init__(self, df, feature_cols, window=WINDOW_SIZE):
        self.X = []
        self.y = []
        for unit_id, grp in df.groupby("unit"):
            grp  = grp.sort_values("cycle")
            feat = grp[feature_cols].values
            rul  = grp["RUL"].values
            for i in range(len(grp) - window + 1):
                self.X.append(feat[i: i + window])
                self.y.append(rul[i + window - 1])
        self.X = torch.tensor(np.array(self.X), dtype=torch.float32)
        self.y = torch.tensor(np.array(self.y), dtype=torch.float32)
        print("  Dataset: %d windows, shape %s" % (len(self.y), str(self.X.shape)))

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


# ─────────────────────────────────────────────
# 5. BI-LSTM MODEL
#    Two stacked Bi-LSTM layers
#    followed by two fully connected layers
# ─────────────────────────────────────────────
class BiLSTM(nn.Module):
    def __init__(self, input_size, hidden1=128, hidden2=64, dropout=0.3):
        super(BiLSTM, self).__init__()
        self.lstm1 = nn.LSTM(
            input_size, hidden1,
            batch_first=True, bidirectional=True)
        self.lstm2 = nn.LSTM(
            hidden1 * 2, hidden2,
            batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(dropout)
        self.fc1     = nn.Linear(hidden2 * 2, 64)
        self.fc2     = nn.Linear(64, 1)
        self.relu    = nn.ReLU()

    def forward(self, x):
        out, _ = self.lstm1(x)
        out, _ = self.lstm2(out)
        out = self.dropout(out[:, -1, :])  # take last timestep only
        out = self.relu(self.fc1(out))
        out = self.fc2(out)
        return out.squeeze(1)


# ─────────────────────────────────────────────
# 6. TRAINING LOOP
# ─────────────────────────────────────────────
def train_model(train_df, val_df, feature_cols, fd="FD001"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("\n  Training on: %s" % str(device))

    print("  Building train dataset...")
    train_ds = EngineDataset(train_df, feature_cols)
    print("  Building val dataset...")
    val_ds   = EngineDataset(val_df,   feature_cols)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE)

    model     = BiLSTM(input_size=len(feature_cols)).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, patience=5, factor=0.5)
    criterion = nn.MSELoss()

    best_val_loss = float("inf")
    train_history = []
    val_history   = []

    print("\n  Epoch | Train RMSE | Val RMSE")
    print("  " + "-" * 35)

    for epoch in range(1, EPOCHS + 1):

        # ── train ──
        model.train()
        train_loss = 0.0
        for X_b, y_b in train_loader:
            X_b, y_b = X_b.to(device), y_b.to(device)
            optimizer.zero_grad()
            pred = model(X_b)
            loss = criterion(pred, y_b)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item() * len(y_b)
        train_loss /= len(train_ds)

        # ── validate ──
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for X_b, y_b in val_loader:
                X_b, y_b = X_b.to(device), y_b.to(device)
                val_loss += criterion(model(X_b), y_b).item() * len(y_b)
        val_loss /= len(val_ds)

        scheduler.step(val_loss)
        train_history.append(train_loss)
        val_history.append(val_loss)

        # Save best model weights
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(),
                       OUTPUT_DIR + "/best_lstm_" + fd + ".pt")

        if epoch % 10 == 0:
            print("  %5d | %10.3f | %8.3f" % (
                epoch, train_loss ** 0.5, val_loss ** 0.5))

    print("\n  Best val RMSE: %.3f" % best_val_loss ** 0.5)

    # Load best weights before returning
    model.load_state_dict(
        torch.load(OUTPUT_DIR + "/best_lstm_" + fd + ".pt"))
    return model, train_history, val_history, device


# ─────────────────────────────────────────────
# 7. EVALUATION
# ─────────────────────────────────────────────
def nasa_score(y_true, y_pred):
    """
    NASA asymmetric scoring function.
    Penalises late predictions more than early ones.
    Lower is better.
    """
    d = y_pred - y_true
    score = np.where(d < 0,
                     np.exp(-d / 13.0) - 1,
                     np.exp(d  / 10.0) - 1)
    return score.sum()


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


def evaluate(y_true, y_pred, model_name):
    rmse = mean_squared_error(y_true, y_pred) ** 0.5
    mae  = mean_absolute_error(y_true, y_pred)
    ns   = nasa_score(y_true, y_pred)
    print("\n" + "=" * 42)
    print("  Results: " + model_name)
    print("  RMSE       : %.3f" % rmse)
    print("  MAE        : %.3f" % mae)
    print("  NASA score : %.1f" % ns)
    print("=" * 42)
    return rmse, mae, ns


# ─────────────────────────────────────────────
# 8. PLOTS
# ─────────────────────────────────────────────
def plot_loss_curves(train_history, val_history, fd):
    epochs = range(1, len(train_history) + 1)
    plt.figure(figsize=(9, 4))
    plt.plot(epochs, [v ** 0.5 for v in train_history], label="Train RMSE")
    plt.plot(epochs, [v ** 0.5 for v in val_history],   label="Val RMSE")
    plt.xlabel("Epoch")
    plt.ylabel("RMSE")
    plt.title("LSTM Training History — " + fd)
    plt.legend()
    plt.tight_layout()
    fname = OUTPUT_DIR + "/lstm_loss_" + fd + ".png"
    plt.savefig(fname, dpi=150)
    plt.close()
    print("  Saved:", fname)


def plot_predictions(y_true, y_pred, model_name, fd):
    plt.figure(figsize=(8, 5))
    plt.scatter(y_true, y_pred, alpha=0.3, s=10, color="darkorange")
    lim = max(float(np.max(y_true)), float(np.max(y_pred)))
    plt.plot([0, lim], [0, lim], "k--", linewidth=1, label="Perfect prediction")
    plt.xlabel("Actual RUL")
    plt.ylabel("Predicted RUL")
    plt.title(model_name + " — Predicted vs Actual (" + fd + ")")
    plt.legend()
    plt.tight_layout()
    fname = OUTPUT_DIR + "/lstm_scatter_" + fd + ".png"
    plt.savefig(fname, dpi=150)
    plt.close()
    print("  Saved:", fname)


def plot_trajectory(test_df, feature_cols, model, device, unit_id, fd):
    engine = test_df[test_df["unit"] == unit_id].sort_values("cycle")
    if len(engine) < WINDOW_SIZE:
        print("  Engine %d has fewer than %d cycles, skipping." % (
            unit_id, WINDOW_SIZE))
        return

    feat = engine[feature_cols].values
    windows = np.array([
        feat[i: i + WINDOW_SIZE]
        for i in range(len(engine) - WINDOW_SIZE + 1)
    ])
    cycles = engine["cycle"].values[WINDOW_SIZE - 1:]
    actual = engine["RUL"].values[WINDOW_SIZE - 1:]

    model.eval()
    with torch.no_grad():
        preds = model(
            torch.tensor(windows, dtype=torch.float32).to(device)
        ).cpu().numpy().clip(0, RUL_CLIP)

    plt.figure(figsize=(10, 5))
    plt.plot(cycles, actual, "k-",  linewidth=2,   label="Actual RUL")
    plt.plot(cycles, preds,  "r--", linewidth=1.5, label="LSTM Predicted")
    plt.xlabel("Cycle")
    plt.ylabel("RUL")
    plt.title("Engine %d — RUL Trajectory (%s)" % (unit_id, fd))
    plt.legend()
    plt.tight_layout()
    fname = OUTPUT_DIR + "/lstm_engine%d_%s.png" % (unit_id, fd)
    plt.savefig(fname, dpi=150)
    plt.close()
    print("  Saved:", fname)


# ─────────────────────────────────────────────
# RESULTS SUMMARY TABLE
# ─────────────────────────────────────────────
def print_summary(all_results):
    print("\n" + "=" * 60)
    print("  FINAL RESULTS SUMMARY — ALL DATASETS")
    print("=" * 60)
    print("  %-8s | %-10s | %-10s | %-15s" % (
        "Dataset", "RMSE", "MAE", "NASA Score"))
    print("  " + "-" * 52)
    for r in all_results:
        print("  %-8s | %-10.3f | %-10.3f | %-15.1f" % (
            r["fd"], r["rmse"], r["mae"], r["nasa"]))
    print("=" * 60)


# ─────────────────────────────────────────────
# MAIN — runs all 4 datasets back to back
# ─────────────────────────────────────────────
def main():
    print("=" * 50)
    print("  IFRPM — Bi-LSTM RUL Prediction")
    print("  All 4 C-MAPSS Datasets, 100 Epochs")
    print("=" * 50)

    all_results = []

    for fd in ["FD001", "FD002", "FD003", "FD004"]:

        print("\n" + "#" * 50)
        print("  DATASET: " + fd)
        print("#" * 50)

        # 1. Load
        train_raw, test_raw = load_data(fd)

        # 2. Preprocess
        print("\n[1/4] Preprocessing...")
        train_proc, test_proc, feature_cols, scaler = preprocess(
            train_raw, test_raw)
        print("  Features:", len(feature_cols))

        # 3. Split by engine unit — no data leakage
        print("\n[2/4] Splitting train → 80% train / 20% validation by engine...")
        train_df, val_df = split_by_unit(train_proc, val_fraction=0.2)
        print("  Train engines : %d" % train_df["unit"].nunique())
        print("  Val engines   : %d" % val_df["unit"].nunique())
        print("  Train rows    : %d" % len(train_df))
        print("  Val rows      : %d" % len(val_df))

        # 4. Train LSTM
        print("\n[3/4] Training Bi-LSTM...")
        model, train_hist, val_hist, device = train_model(
            train_df, val_df, feature_cols, fd)

        # 5. Evaluate on test set
        print("\n[4/4] Evaluating on test set...")
        test_preds, test_actuals = get_predictions(
            model, test_proc, feature_cols, device)
        rmse, mae, nasa = evaluate(test_actuals, test_preds, "Bi-LSTM " + fd)

        # Store results for summary table
        all_results.append({
            "fd": fd, "rmse": rmse, "mae": mae, "nasa": nasa
        })

        # 6. Plots
        print("\nGenerating plots...")
        plot_loss_curves(train_hist, val_hist, fd)
        plot_predictions(test_actuals, test_preds, "Bi-LSTM", fd)

        # Plot 3 engines with enough test cycles
        # Engine 1 is skipped — only 2 test cycles visible after window
        plot_trajectory(test_proc, feature_cols, model, device, unit_id=5,  fd=fd)
        plot_trajectory(test_proc, feature_cols, model, device, unit_id=10, fd=fd)
        plot_trajectory(test_proc, feature_cols, model, device, unit_id=15, fd=fd)

    # Print final comparison across all datasets
    print_summary(all_results)

    print("\nAll done! Files saved to: " + OUTPUT_DIR)


if __name__ == "__main__":
    main()