"""
Preprocess all processed datasets: handle missing values, outliers, and duplicates.
"""

from pathlib import Path
import pandas as pd
import numpy as np
import os

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    # Drop duplicates
    df = df.drop_duplicates()
    # Fill missing values (simple strategy: forward fill, then backfill, then drop remaining)
    df = df.fillna(method='ffill').fillna(method='bfill')
    df = df.dropna()
    # Remove outliers (z-score > 4 for numeric columns)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if not numeric_cols.empty:
        z_scores = np.abs((df[numeric_cols] - df[numeric_cols].mean()) / df[numeric_cols].std(ddof=0))
        df = df[(z_scores < 4).all(axis=1)]
    return df

def preprocess_all(processed_dir: Path):
    for file in os.listdir(processed_dir):
        if file.endswith('.pkl'):
            path = processed_dir / file
            df = pd.read_pickle(path)
            cleaned = clean_dataframe(df)
            cleaned.to_pickle(path)
            # Also update sample CSV if exists
            sample_csv = processed_dir / (file.replace('.pkl', '_sample.csv'))
            if sample_csv.exists():
                cleaned.sample(frac=0.05, random_state=42).to_csv(sample_csv, index=False)
            print(f"Cleaned {file}: {len(df)} -> {len(cleaned)} rows")

if __name__ == "__main__":
    processed_dir = Path(__file__).parent / "data" / "processed"
    preprocess_all(processed_dir)
