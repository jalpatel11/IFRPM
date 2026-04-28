import pandas as pd
import numpy as np

def clean_data(df, numeric_cols, rolling_window=5):
    """
    Impute missings, clean data, and apply low-pass filtering to reduce noise.
    """
    df = df.copy()
    
    # 1. Forward fill and backward fill for missings in numeric columns
    for col in numeric_cols:
        df[col] = df[col].ffill().bfill()
        # Fill any remaining NaNs with column mean
        if df[col].isnull().any():
            df[col] = df[col].fillna(df[col].mean())
            
        # 2. Apply rolling mean as low-pass filter (noise handling)
        # We group by nothing here because we assume it's done flight-by-flight 
        # or we accept minor cross-boundary smoothing, but ideally it's per flight
        # For simplicity, we just apply it directly if we do it in dataloader per group
    
    return df

def apply_smoothing_per_group(df, group_col, numeric_cols, window=5):
    """
    Applies smoothing grouped by flight to prevent sequence crossover.
    """
    for col in numeric_cols:
        df[col] = df.groupby(group_col)[col].transform(lambda x: x.rolling(window, min_periods=1).mean())
    return df
