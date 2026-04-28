"""
utils/rul_metrics.py
Regression metrics for RUL prediction.
Kept separate from metrics.py (which handles classification for the battery pipeline).
"""

import json
import os
import numpy as np


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_pred - y_true) ** 2)))


def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_pred - y_true)))


def nasa_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    diff   = y_pred - y_true
    scores = np.where(diff < 0, np.exp(-diff / 13) - 1, np.exp(diff / 10) - 1)
    return float(np.sum(scores))


def compute_all(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    return {
        "rmse":       rmse(y_true, y_pred),
        "mae":        mae(y_true, y_pred),
        "nasa_score": nasa_score(y_true, y_pred),
    }


def save_metrics(metrics: dict, filepath: str):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(metrics, f, indent=4)
