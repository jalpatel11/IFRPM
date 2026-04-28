"""
IFRPM — Team Kansas
RUL Prediction Pipeline
Phase 1 → Phase 2 handoff

Accepts input two ways:
  1. REST API  — POST /predict        (single engine, JSON body)
  2. Batch     — POST /predict/batch  (CSV file upload)
               — GET  /predict/file   (process a file already on Sol)

Output (full JSON):
  {
    "component_id": 5,
    "dataset": "FD001",
    "predicted_rul": 42.3,
    "risk": "YELLOW",
    "confidence": 0.87,
    "top_sensors": [
      {"sensor": "s14_min", "importance": 0.127},
      ...
    ],
    "interpretation": "Engine 5 has ~42 cycles remaining. Maintenance recommended within 20 cycles."
  }

Run
---
    cd /home/dmohile/capstone/phase_1
    PYTHONPATH=/home/dmohile/capstone/phase_1 python pipeline.py
"""

import os
import io
import json
import pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings("ignore")

from utils.logger import get_logger

logger = get_logger("pipeline")

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
CHECKPOINT_DIR = "/home/dmohile/capstone/phase_1/models"
DATA_DIR       = "/home/dmohile/capstone/data"
SHAP_DIR       = "/home/dmohile/capstone/phase_1/results"
PORT           = int(os.environ.get("PORT", 5050))

COLS = (
    ["unit", "cycle"]
    + ["op1", "op2", "op3"]
    + ["s" + str(i) for i in range(1, 22)]
)
DROP_SENSORS    = ["s1", "s5", "s6", "s10", "s16", "s18", "s19"]
DROP_COLS       = DROP_SENSORS + ["op3"]
FEATURE_SENSORS = [s for s in ["s" + str(i) for i in range(1, 22)]
                   if s not in DROP_SENSORS]
OP_COLS     = ["op1", "op2"]
RUL_CLIP    = 125
WINDOW_SIZE = 30
N_REGIMES   = 6


# ─────────────────────────────────────────────
# MODEL  — identical to lstm_rul.py
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
# MODEL REGISTRY  — loads all 4 datasets on startup
# ─────────────────────────────────────────────
class ModelRegistry:
    """
    Holds one trained model + fitted scalers + kmeans per dataset.
    Loaded once on startup, reused for every request.
    """
    def __init__(self):
        self.models   = {}   # fd -> BiLSTM
        self.kmeans   = {}   # fd -> KMeans
        self.scalers  = {}   # fd -> {regime_id -> MinMaxScaler}
        self.features = {}   # fd -> list of feature column names
        self.device   = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.shap     = {}   # fd -> list of {sensor, importance}

    def load_all(self):
        for fd in ["FD001", "FD002", "FD003", "FD004"]:
            self._load_dataset(fd)
        logger.info(f"Registry loaded: {list(self.models.keys())}")

    def _load_dataset(self, fd):
        model_path = os.path.join(CHECKPOINT_DIR, f"best_lstm_{fd}.pt")
        if not os.path.exists(model_path):
            logger.warning(f"No checkpoint for {fd} at {model_path} — skipping")
            return

        # Refit KMeans + scalers from training data so we can preprocess live inputs
        logger.info(f"Fitting preprocessors for {fd}...")
        train = pd.read_csv(f"{DATA_DIR}/train_{fd}.txt",
                            sep=r"\s+", header=None, names=COLS, engine="python")
        train = train.drop(columns=DROP_COLS, errors="ignore")

        # KMeans on operating conditions
        kmeans = KMeans(n_clusters=N_REGIMES, random_state=42, n_init=10)
        kmeans.fit(train[OP_COLS].values)
        train["regime"] = kmeans.predict(train[OP_COLS].values)

        # Rolling features
        train = _add_rolling(train)

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

        # Add regime one-hots to feature list
        regime_cols  = [f"regime_{r}" for r in sorted(train["regime"].unique())]
        final_feats  = feature_cols + regime_cols
        n_features   = len(final_feats)

        # Load model weights
        model = BiLSTM(input_size=n_features).to(self.device)
        model.load_state_dict(torch.load(model_path, map_location=self.device))
        model.eval()

        self.models[fd]   = model
        self.kmeans[fd]   = kmeans
        self.scalers[fd]  = scalers
        self.features[fd] = final_feats

        # Load SHAP top features if available
        shap_path = os.path.join(SHAP_DIR, f"shap_top_features_{fd}.json")
        if os.path.exists(shap_path):
            with open(shap_path) as f:
                self.shap[fd] = json.load(f)[:5]   # top 5 only
        else:
            self.shap[fd] = []

        logger.info(f"  {fd} ready — {n_features} features, device={self.device}")


# ─────────────────────────────────────────────
# PREPROCESSING HELPERS
# ─────────────────────────────────────────────
def _add_rolling(df, window=5):
    new_cols = {}
    for s in FEATURE_SENSORS:
        if s not in df.columns:
            continue
        grp = df.groupby("unit")[s]
        new_cols[f"{s}_mean"] = grp.transform(lambda x: x.rolling(window, min_periods=1).mean())
        new_cols[f"{s}_std"]  = grp.transform(lambda x: x.rolling(window, min_periods=1).std().fillna(0))
        new_cols[f"{s}_min"]  = grp.transform(lambda x: x.rolling(window, min_periods=1).min())
        new_cols[f"{s}_max"]  = grp.transform(lambda x: x.rolling(window, min_periods=1).max())
    return pd.concat([df, pd.DataFrame(new_cols, index=df.index)], axis=1)


def preprocess_input(df: pd.DataFrame, fd: str, registry: ModelRegistry) -> np.ndarray:
    """
    Takes raw sensor DataFrame, returns scaled feature windows ready for the model.
    Shape: (n_engines, WINDOW_SIZE, n_features)
    """
    df = df.copy()
    df = df.drop(columns=DROP_COLS, errors="ignore")

    kmeans  = registry.kmeans[fd]
    scalers = registry.scalers[fd]
    feats   = registry.features[fd]

    # Regime labels
    df["regime"] = kmeans.predict(df[OP_COLS].values)

    # Rolling features
    df = _add_rolling(df)

    # Base feature cols (without regime one-hots)
    base_feats = [f for f in feats if not f.startswith("regime_")]
    df[base_feats] = df[base_feats].astype(float)

    # Per-regime scaling
    df_scaled = df.copy()
    for regime, scaler in scalers.items():
        mask = df["regime"] == regime
        if mask.sum() > 0:
            cols_present = [c for c in base_feats if c in df.columns]
            df_scaled.loc[mask, cols_present] = scaler.transform(
                df.loc[mask, cols_present]
            )

    # Regime one-hots
    for r in sorted(df["regime"].unique()):
        df_scaled[f"regime_{r}"] = (df_scaled["regime"] == r).astype(float)

    # Ensure all expected feature columns exist
    for f in feats:
        if f not in df_scaled.columns:
            df_scaled[f] = 0.0

    # Build sliding windows — one per engine (last WINDOW_SIZE cycles)
    windows = []
    units   = []
    for uid, grp in df_scaled.groupby("unit"):
        grp = grp.sort_values("cycle")
        if len(grp) < WINDOW_SIZE:
            # Pad with first row if not enough cycles
            pad = pd.concat([grp.iloc[[0]] * (WINDOW_SIZE - len(grp)), grp])
            grp = pad.reset_index(drop=True)
        window = grp[feats].values[-WINDOW_SIZE:]
        windows.append(window)
        units.append(uid)

    return np.array(windows, dtype=np.float32), units


# ─────────────────────────────────────────────
# INFERENCE
# ─────────────────────────────────────────────
def run_inference(windows: np.ndarray, fd: str, registry: ModelRegistry) -> np.ndarray:
    model  = registry.models[fd]
    device = registry.device
    X      = torch.tensor(windows, dtype=torch.float32).to(device)
    with torch.no_grad():
        preds = model(X).cpu().numpy()
    return np.clip(preds, 0, RUL_CLIP)


# ─────────────────────────────────────────────
# RESPONSE BUILDER
# ─────────────────────────────────────────────
def _risk(rul: float) -> str:
    if rul <= 20:  return "RED"
    if rul <= 50:  return "YELLOW"
    return "GREEN"


def _confidence(rul: float) -> float:
    """
    Simple confidence heuristic:
    - Engines far from failure (high RUL) → high confidence
    - Engines near failure → slightly lower (model is less certain near threshold)
    """
    if rul > 80:   return 0.95
    if rul > 50:   return 0.90
    if rul > 20:   return 0.85
    return 0.78


def _interpretation(uid, rul: float, risk: str) -> str:
    rul_r = round(rul)
    if risk == "RED":
        return (f"Engine {uid} has approximately {rul_r} cycles remaining. "
                f"Immediate maintenance inspection recommended.")
    if risk == "YELLOW":
        return (f"Engine {uid} has approximately {rul_r} cycles remaining. "
                f"Schedule maintenance within the next 20 cycles.")
    return (f"Engine {uid} has approximately {rul_r} cycles remaining. "
            f"No immediate action required.")


def build_response(units, preds, fd, registry) -> list:
    top_sensors = registry.shap.get(fd, [])
    results = []
    for uid, rul in zip(units, preds):
        risk = _risk(float(rul))
        results.append({
            "component_id":  int(uid),
            "dataset":       fd,
            "predicted_rul": round(float(rul), 2),
            "risk":          risk,
            "confidence":    _confidence(float(rul)),
            "top_sensors":   top_sensors,
            "interpretation": _interpretation(uid, float(rul), risk),
        })
    return results


# ─────────────────────────────────────────────
# FLASK ENDPOINTS
# ─────────────────────────────────────────────
registry = ModelRegistry()


@app.get("/health")
def health():
    return jsonify({
        "status":   "ok",
        "datasets": list(registry.models.keys()),
        "device":   str(registry.device),
    })


@app.post("/predict")
def predict_single():
    """
    POST /predict
    Body:
    {
        "dataset": "FD001",
        "unit": 5,
        "cycles": [
            {"cycle": 1, "op1": 0.0, "op2": 0.0, "s2": 641.8, ...},
            ...   (send at least 30 cycles for best accuracy)
        ]
    }
    """
    body = request.get_json(force=True)

    fd   = body.get("dataset", "FD001")
    unit = body.get("unit", 1)

    if fd not in registry.models:
        return jsonify({"error": f"Dataset {fd} not loaded"}), 400
    if "cycles" not in body or len(body["cycles"]) == 0:
        return jsonify({"error": "cycles array required"}), 400

    try:
        df = pd.DataFrame(body["cycles"])
        df["unit"] = unit
        if "cycle" not in df.columns:
            df["cycle"] = range(1, len(df) + 1)

        windows, units = preprocess_input(df, fd, registry)
        preds          = run_inference(windows, fd, registry)
        results        = build_response(units, preds, fd, registry)
        return jsonify(results[0])   # single engine → single result

    except Exception as e:
        logger.error(f"Predict error: {e}")
        return jsonify({"error": str(e)}), 500


@app.post("/predict/batch")
def predict_batch():
    """
    POST /predict/batch
    Form data:
        file   = CSV file (C-MAPSS format, space-separated, no header)
        dataset = FD001 / FD002 / FD003 / FD004

    Returns array of predictions — one per engine unit in the file.
    """
    fd = request.form.get("dataset", "FD001")

    if fd not in registry.models:
        return jsonify({"error": f"Dataset {fd} not loaded"}), 400
    if "file" not in request.files:
        return jsonify({"error": "file required"}), 400

    try:
        f   = request.files["file"]
        raw = f.read().decode("utf-8")
        df  = pd.read_csv(io.StringIO(raw), sep=r"\s+", header=None,
                          names=COLS, engine="python")

        windows, units = preprocess_input(df, fd, registry)
        preds          = run_inference(windows, fd, registry)
        results        = build_response(units, preds, fd, registry)

        summary = {
            "dataset":       fd,
            "total_engines": len(results),
            "red_count":     sum(1 for r in results if r["risk"] == "RED"),
            "yellow_count":  sum(1 for r in results if r["risk"] == "YELLOW"),
            "green_count":   sum(1 for r in results if r["risk"] == "GREEN"),
            "predictions":   results,
        }
        return jsonify(summary)

    except Exception as e:
        logger.error(f"Batch error: {e}")
        return jsonify({"error": str(e)}), 500


@app.get("/predict/file")
def predict_file():
    """
    GET /predict/file?dataset=FD001&split=test
    Runs inference on a file already on Sol (test_FD001.txt).
    Useful for quick evaluation without uploading anything.
    split = test (default) or train
    """
    fd    = request.args.get("dataset", "FD001")
    split = request.args.get("split",   "test")

    if fd not in registry.models:
        return jsonify({"error": f"Dataset {fd} not loaded"}), 400

    path = os.path.join(DATA_DIR, f"{split}_{fd}.txt")
    if not os.path.exists(path):
        return jsonify({"error": f"File not found: {path}"}), 404

    try:
        df             = pd.read_csv(path, sep=r"\s+", header=None,
                                     names=COLS, engine="python")
        windows, units = preprocess_input(df, fd, registry)
        preds          = run_inference(windows, fd, registry)
        results        = build_response(units, preds, fd, registry)

        summary = {
            "dataset":       fd,
            "split":         split,
            "total_engines": len(results),
            "red_count":     sum(1 for r in results if r["risk"] == "RED"),
            "yellow_count":  sum(1 for r in results if r["risk"] == "YELLOW"),
            "green_count":   sum(1 for r in results if r["risk"] == "GREEN"),
            "predictions":   results,
        }
        return jsonify(summary)

    except Exception as e:
        logger.error(f"File predict error: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("Loading models into registry...")
    registry.load_all()

    logger.info(f"\nStarting pipeline on http://0.0.0.0:{PORT}")
    logger.info("Endpoints:")
    logger.info(f"  GET  /health")
    logger.info(f"  POST /predict          — single engine (JSON body)")
    logger.info(f"  POST /predict/batch    — CSV file upload")
    logger.info(f"  GET  /predict/file?dataset=FD001&split=test  — file on Sol")

    app.run(host="0.0.0.0", port=PORT, debug=False)