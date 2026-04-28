import pandas as pd
import numpy as np

def determine_group_col(df):
    columns = df.columns
    if "flight_id" in columns:
        return "flight_id"
    elif "Master Index" in columns:
        return "Master Index"
    elif "source_file" in columns:
        return "source_file"
    else:
        # Fallback to creating a dummy group
        df['auto_group'] = 0
        return "auto_group"

def create_future_failure_label(df, group_col, horizon=100):
    df["failure_flag"] = df["label"].notna().astype(int)
    
    # Also treat empty string as not failure, any text as failure
    if df["label"].dtype == object:
        df["failure_flag"] = (df["label"].notna() & (df["label"] != "")).astype(int)

    df["target"] = 0

    for _, group in df.groupby(group_col):
        idx = group.index
        failure_positions = group["failure_flag"].values

        future_labels = []
        for i in range(len(group)):
            future_window = failure_positions[i:i+horizon]
            future_labels.append(1 if future_window.sum() > 0 else 0)

        df.loc[idx, "target"] = future_labels

    return df

def create_rul_label(df, group_col):
    """
    Create Remaining Useful Life target logic
    """
    df["failure_flag"] = df["label"].notna().astype(int)
    if df["label"].dtype == object:
        df["failure_flag"] = (df["label"].notna() & (df["label"] != "")).astype(int)
        
    df["target_rul"] = 0
    
    for _, group in df.groupby(group_col):
        idx = group.index
        # Get index of first failure in this group
        failure_idx = group[group["failure_flag"] == 1].index
        
        rul_values = []
        if len(failure_idx) == 0:
            # no failure, RUL is max possible or length of flight
            max_rul = len(group)
            rul_values = list(range(max_rul, 0, -1))
        else:
            first_fail = failure_idx[0]
            # row loc position
            fail_pos = group.index.get_loc(first_fail)
            
            for i in range(len(group)):
                val = fail_pos - i
                rul_values.append(max(val, 0)) # cap at 0 after failure
                
        df.loc[idx, "target_rul"] = rul_values
        
    return df

def add_delta_features(df, group_col, numeric_cols):
    """
    Feature Engineering: Add delta (rate of change) to numeric columns
    to handle weak signals.
    """
    new_cols = []
    for col in numeric_cols:
        delta_col = f"{col}_delta"
        df[delta_col] = df.groupby(group_col)[col].diff().fillna(0)
        new_cols.append(delta_col)
    return df, new_cols
