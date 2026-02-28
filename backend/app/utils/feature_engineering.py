"""Sensor feature engineering for CMAPSS-style data."""

import numpy as np
import pandas as pd


def rolling_stats(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    """Append rolling mean and std columns for each numeric sensor.

    @param df     - Sensor DataFrame (rows = cycles).
    @param window - Rolling window size.
    """
    stats = {}
    for col in df.select_dtypes(include=np.number).columns:
        stats[f"{col}_mean_{window}"] = df[col].rolling(window, min_periods=1).mean()
        stats[f"{col}_std_{window}"]  = df[col].rolling(window, min_periods=1).std().fillna(0)
    return pd.concat([df, pd.DataFrame(stats, index=df.index)], axis=1)


def trend_slope(series: pd.Series, window: int = 10) -> pd.Series:
    """Compute OLS slope over a rolling window for a sensor series.

    @param series - Single sensor time series.
    @param window - Rolling window size.
    """
    def _slope(x: np.ndarray) -> float:
        if len(x) < 2:
            return 0.0
        return float(np.polyfit(np.arange(len(x)), x, 1)[0])

    return series.rolling(window, min_periods=2).apply(_slope, raw=True)


def normalize_operating_conditions(df: pd.DataFrame, condition_cols: list[str]) -> pd.DataFrame:
    """Z-score normalize operating condition columns in place.

    @param df             - Input DataFrame.
    @param condition_cols - Column names to normalize.
    """
    for col in condition_cols:
        std = df[col].std()
        if std > 0:
            df[col] = (df[col] - df[col].mean()) / std
    return df
