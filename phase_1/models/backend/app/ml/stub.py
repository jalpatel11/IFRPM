"""Stub inference — used when no .pkl models are present."""

import hashlib
import math

import pandas as pd


def predict_rul(sensor_df: pd.DataFrame) -> float:
    """Return a deterministic RUL estimate (5–120 cycles) derived from sensor mean.

    @param sensor_df - Sensor readings DataFrame.
    """
    mean_val = float(sensor_df.mean().mean()) if not sensor_df.empty else 50.0
    return round(5.0 + abs(math.sin(mean_val)) * 115.0, 2)


def detect_anomaly(sensor_df: pd.DataFrame) -> bool:
    """Return a hash-based anomaly flag (~12.5% positive rate).

    @param sensor_df - Sensor readings DataFrame.
    """
    digest = hashlib.md5(sensor_df.to_string().encode()).hexdigest()
    return int(digest[0], 16) < 2
