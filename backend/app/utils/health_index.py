"""Composite Health Index via weighted sensor fusion."""

import numpy as np
import pandas as pd


def compute_health_index(sensor_df: pd.DataFrame, weights: dict[str, float]) -> float:
    """Return a 0–1 health score (1.0 = healthy) using weighted sensor fusion.

    @param sensor_df - DataFrame of sensor readings; uses the last row.
    @param weights   - Sensor name → importance weight mapping.
    """
    score = 0.0
    total_weight = sum(weights.values())

    for sensor, weight in weights.items():
        if sensor not in sensor_df.columns:
            continue
        val = sensor_df[sensor].iloc[-1]
        normalized = _min_max_normalize(val, sensor_df[sensor].min(), sensor_df[sensor].max())
        score += (normalized * weight) / total_weight

    return round(float(np.clip(score, 0.0, 1.0)), 4)


def _min_max_normalize(value: float, min_val: float, max_val: float) -> float:
    """Scale a value to [0, 1]."""
    if max_val == min_val:
        return 0.0
    return (value - min_val) / (max_val - min_val)
