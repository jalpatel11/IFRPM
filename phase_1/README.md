# How to use the unified dataset loader and preprocessor

## Download and process all datasets

Run:

    python download.py

This will extract, convert, and validate all datasets (battery, cmapss, electrical, ngafid) into the `data/processed/` folder.

- Battery, CMAPSS, Electrical: output as CSV and PKL
- NGAFID: output as PKL only

## Preprocess (clean) all datasets

Run:

    python preprocess.py

This will:
- Remove duplicates
- Fill missing values (forward/backward fill, then drop remaining)
- Remove outliers (z-score > 4)
- Overwrite the PKL and sample CSV files in `data/processed/`

## Notes
- Place all required ZIPs in `data/` as before.
- The scripts are modular and can be extended for more advanced cleaning.
