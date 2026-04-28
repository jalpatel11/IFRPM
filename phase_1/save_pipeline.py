"""
save_pipeline.py
Team Kansas IFRPM — Phase 1

Loads the trained best_lstm_FDx.pt checkpoints and saves a complete
inference pipeline as a .pkl file per dataset.

Each .pkl contains everything needed to make predictions:
  - model weights (state_dict)
  - model config (input_size, hidden sizes)
  - per-regime scalers
  - feature column names
  - KMeans regime clusterer
  - window size and RUL clip

Usage
-----
    cd /home/dmohile/capstone/phase_1
    PYTHONPATH=/home/dmohile/capstone/phase_1 python models/phase_1/save_pipeline.py

Output
------
    /home/dmohile/capstone/phase_1/models/pipeline_FD001.pkl
    /home/dmohile/capstone/phase_1/models/pipeline_FD002.pkl
    /home/dmohile/capstone/phase_1/models/pipeline_FD003.pkl
    /home/dmohile/capstone/phase_1/models/pipeline_FD004.pkl
"""

import os
import pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings("ignore")

from utils.logger import get_logger

logger = get_logger("save_pipeline")

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
DATA_DIR       = "/home/dmohile/capstone/data"
MODEL_DIR      = "/home/dmohile/capstone/phase_1/models"
PIPELINE_DIR   = "/home/dmohile/capstone/phase_1/models"

os.makedirs(PIPELINE_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# CONSTANTS — must match lstm_rul.py exactly
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
OP_COLS         = ["op1", "op2"]
RUL_CLIP        = 125
WINDOW_SIZE     = 30
N_REGIMES       = 6


# ─────────────────────────────────────────────
# MODEL — identical to lstm_rul.py
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
# REBUILD PREPROCESSING ARTIFACTS
# Re-runs the same preprocessing as lstm_rul.py
# to get the fitted KMeans + per-regime scalers
# ─────────────────────────────────────────────
def rebuild_artifacts(fd):
    """
    Load training data and refit KMeans + scalers.
    Returns: feature_cols, kmeans, scalers dict, regime_list
    """
    logger.info(f"  Rebuilding preprocessing artifacts for {fd}...")

    train = pd.read_csv(f"{DATA_DIR}/train_{fd}.txt",
                        sep=r"\s+", header=None, names=COLS, engine="python")

    # RUL labels
    max_cycle = train.groupby("unit")["cycle"].max().rename("max_cycle")
    train = train.merge(max_cycle, on="unit")
    train["RUL"] = (train["max_cycle"] - train["cycle"]).clip(upper=RUL_CLIP)
    train.drop(columns=["max_cycle"], inplace=True)

    # Drop unused columns
    train = train.drop(columns=DROP_COLS, errors="ignore")

    # Regime clustering
    kmeans = KMeans(n_clusters=N_REGIMES, random_state=42, n_init=10)
    kmeans.fit(train[OP_COLS].values)
    train["regime"] = kmeans.predict(train[OP_COLS].values)

    # Rolling features
    new_cols = {}
    for s in FEATURE_SENSORS:
        grp = train.groupby("unit")[s]
        new_cols[f"{s}_mean"] = grp.transform(lambda x: x.rolling(5, min_periods=1).mean())
        new_cols[f"{s}_std"]  = grp.transform(lambda x: x.rolling(5, min_periods=1).std().fillna(0))
        new_cols[f"{s}_min"]  = grp.transform(lambda x: x.rolling(5, min_periods=1).min())
        new_cols[f"{s}_max"]  = grp.transform(lambda x: x.rolling(5, min_periods=1).max())
    train = pd.concat([train, pd.DataFrame(new_cols, index=train.index)], axis=1)

    exclude      = {"unit", "cycle", "RUL", "regime"}
    feature_cols = [c for c in train.columns if c not in exclude]

    # Per-regime scalers
    train[feature_cols] = train[feature_cols].astype(float)
    scalers = {}
    for regime in sorted(train["regime"].unique()):
        scaler = MinMaxScaler()
        mask   = train["regime"] == regime
        scaler.fit(train.loc[mask, feature_cols])
        scalers[regime] = scaler

    # Final feature list with regime one-hots
    regime_list      = sorted(train["regime"].unique())
    final_feat_cols  = feature_cols + [f"regime_{r}" for r in regime_list]

    logger.info(f"  Features: {len(final_feat_cols)} | Regimes: {len(regime_list)}")
    return final_feat_cols, kmeans, scalers, regime_list


# ─────────────────────────────────────────────
# SAVE PIPELINE
# ─────────────────────────────────────────────
def save_pipeline(fd):
    logger.info(f"\n{'='*50}\nSaving pipeline for {fd}\n{'='*50}")

    # 1. Rebuild preprocessing artifacts
    feature_cols, kmeans, scalers, regime_list = rebuild_artifacts(fd)

    # 2. Load trained model weights
    model_path = os.path.join(MODEL_DIR, f"best_lstm_{fd}.pt")
    if not os.path.exists(model_path):
        logger.warning(f"  No checkpoint at {model_path} — skipping {fd}")
        return

    model = BiLSTM(input_size=len(feature_cols))
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()
    logger.info(f"  Loaded: {model_path}")

    # 3. Bundle everything into one dict
    pipeline = {
        "model_state_dict": model.state_dict(),
        "model_config": {
            "input_size": len(feature_cols),
            "hidden1":    128,
            "hidden2":    64,
            "dropout":    0.3,
        },
        "feature_cols":  feature_cols,
        "kmeans":        kmeans,
        "scalers":       scalers,
        "regime_list":   regime_list,
        "window_size":   WINDOW_SIZE,
        "rul_clip":      RUL_CLIP,
        "dataset":       fd,
    }

    # 4. Save as pkl
    pkl_path = os.path.join(PIPELINE_DIR, f"pipeline_{fd}.pkl")
    with open(pkl_path, "wb") as f:
        pickle.dump(pipeline, f)

    size_mb = os.path.getsize(pkl_path) / 1024 / 1024
    logger.info(f"  Saved: {pkl_path} ({size_mb:.2f} MB)")
    return pkl_path


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    logger.info("Saving inference pipelines for all datasets...")
    saved = []
    for fd in ["FD001", "FD002", "FD003", "FD004"]:
        path = save_pipeline(fd)
        if path:
            saved.append(path)

    logger.info("\n" + "="*50)
    logger.info("Saved pipelines:")
    for p in saved:
        logger.info(f"  {p}")
    logger.info("="*50)


if __name__ == "__main__":
    main()