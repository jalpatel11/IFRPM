"""
Intelligent Flight Readiness Prediction System
Team Kansas — Phase 1: XGBoost RUL Prediction
Datasets: NASA C-MAPSS FD001, FD002, FD003, FD004
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import xgboost as xgb
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
DATA_DIR   = "/home/dmohile/capstone/data"
OUTPUT_DIR = "/home/dmohile/capstone/phase_1/xgboost_outputs"

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────
COLS = (
    ["unit", "cycle"]
    + ["op1", "op2", "op3"]
    + ["s" + str(i) for i in range(1, 22)]
)

DROP_SENSORS = ["s1", "s5", "s6", "s10", "s16", "s18", "s19"]
DROP_COLS    = DROP_SENSORS + ["op3"]

FEATURE_SENSORS = [s for s in ["s" + str(i) for i in range(1, 22)]
                   if s not in DROP_SENSORS]

RUL_CLIP    = 125
WINDOW_SIZE = 5


# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
def load_data(fd):
    print("\n  Loading %s..." % fd)

    train = pd.read_csv(
        DATA_DIR + "/train_" + fd + ".txt",
        sep=r"\s+", header=None, names=COLS, engine="python")
    test = pd.read_csv(
        DATA_DIR + "/test_" + fd + ".txt",
        sep=r"\s+", header=None, names=COLS, engine="python")
    rul = pd.read_csv(
        DATA_DIR + "/RUL_" + fd + ".txt",
        sep=r"\s+", header=None, names=["RUL"], engine="python")

    # Training RUL: run-to-failure
    max_cycle = train.groupby("unit")["cycle"].max().rename("max_cycle")
    train = train.merge(max_cycle, on="unit")
    train["RUL"] = (train["max_cycle"] - train["cycle"]).clip(upper=RUL_CLIP)
    train.drop(columns=["max_cycle"], inplace=True)

    # Test RUL: from RUL file
    last_cycles = test.groupby("unit")["cycle"].max().reset_index()
    last_cycles.columns = ["unit", "last_cycle"]
    rul["unit"] = last_cycles["unit"].values
    test = test.merge(last_cycles, on="unit")
    test = test.merge(rul, on="unit")
    test["RUL"] = (test["RUL"] + test["last_cycle"] - test["cycle"]).clip(0, RUL_CLIP)
    test.drop(columns=["last_cycle"], inplace=True)

    print("  Train shape: %s  Test shape: %s" % (str(train.shape), str(test.shape)))
    print("  Engines — train: %d  test: %d" % (
        train["unit"].nunique(), test["unit"].nunique()))
    return train, test


# ─────────────────────────────────────────────
# 2. FEATURE ENGINEERING
# ─────────────────────────────────────────────
def add_rolling_features(df):
    df = df.copy()
    new_cols = {}
    for s in FEATURE_SENSORS:
        grp = df.groupby("unit")[s]
        new_cols[s + "_mean"] = grp.transform(
            lambda x: x.rolling(WINDOW_SIZE, min_periods=1).mean())
        new_cols[s + "_std"] = grp.transform(
            lambda x: x.rolling(WINDOW_SIZE, min_periods=1).std().fillna(0))
        new_cols[s + "_min"] = grp.transform(
            lambda x: x.rolling(WINDOW_SIZE, min_periods=1).min())
        new_cols[s + "_max"] = grp.transform(
            lambda x: x.rolling(WINDOW_SIZE, min_periods=1).max())
    return pd.concat([df, pd.DataFrame(new_cols, index=df.index)], axis=1)


def preprocess(train, test):
    train = train.drop(columns=DROP_COLS, errors="ignore")
    test  = test.drop(columns=DROP_COLS,  errors="ignore")

    print("  Computing rolling features for train...")
    train = add_rolling_features(train)
    print("  Computing rolling features for test...")
    test  = add_rolling_features(test)

    exclude = {"unit", "cycle", "RUL"}
    feature_cols = [c for c in train.columns if c not in exclude]

    scaler = MinMaxScaler()
    train[feature_cols] = scaler.fit_transform(train[feature_cols])
    test[feature_cols]  = scaler.transform(test[feature_cols])

    X_train = train[feature_cols].values
    y_train = train["RUL"].values
    X_test  = test[feature_cols].values
    y_test  = test["RUL"].values

    print("  Features   : %d" % len(feature_cols))
    print("  Train rows : %d" % len(y_train))
    print("  Test rows  : %d" % len(y_test))
    return X_train, y_train, X_test, y_test, feature_cols, test


# ─────────────────────────────────────────────
# 3. XGBOOST
# ─────────────────────────────────────────────
def train_xgboost(X_train, y_train, X_test, y_test):
    print("\n  Training XGBoost...")
    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X_train, y_train,
              eval_set=[(X_test, y_test)],
              verbose=False)
    preds = model.predict(X_test).clip(0, RUL_CLIP)
    return model, preds


# ─────────────────────────────────────────────
# 4. EVALUATION
# ─────────────────────────────────────────────
def nasa_score(y_true, y_pred):
    d = y_pred - y_true
    score = np.where(d < 0,
                     np.exp(-d / 13.0) - 1,
                     np.exp(d  / 10.0) - 1)
    return score.sum()


def evaluate(y_true, y_pred, model_name):
    rmse = mean_squared_error(y_true, y_pred) ** 0.5
    mae  = mean_absolute_error(y_true, y_pred)
    ns   = nasa_score(y_true, y_pred)
    print("\n" + "=" * 42)
    print("  Results: " + model_name)
    print("  RMSE       : %.3f" % rmse)
    print("  MAE        : %.3f" % mae)
    print("  NASA score : %.1f" % ns)
    print("=" * 42)
    return rmse, mae, ns


# ─────────────────────────────────────────────
# 5. PLOTS
# ─────────────────────────────────────────────
def plot_predictions(y_true, y_pred, fd):
    plt.figure(figsize=(8, 5))
    plt.scatter(y_true, y_pred, alpha=0.3, s=10, color="steelblue")
    lim = max(float(np.max(y_true)), float(np.max(y_pred)))
    plt.plot([0, lim], [0, lim], "k--", linewidth=1, label="Perfect prediction")
    plt.xlabel("Actual RUL")
    plt.ylabel("Predicted RUL")
    plt.title("XGBoost — Predicted vs Actual (" + fd + ")")
    plt.legend()
    plt.tight_layout()
    fname = OUTPUT_DIR + "/xgb_scatter_" + fd + ".png"
    plt.savefig(fname, dpi=150)
    plt.close()
    print("  Saved:", fname)


def plot_feature_importance(model, feature_cols, fd):
    imp = pd.Series(model.feature_importances_, index=feature_cols)
    top = imp.nlargest(20).sort_values()
    plt.figure(figsize=(8, 7))
    top.plot(kind="barh", color="steelblue")
    plt.title("Top 20 Feature Importances — XGBoost (" + fd + ")")
    plt.xlabel("Importance")
    plt.tight_layout()
    fname = OUTPUT_DIR + "/xgb_feature_importance_" + fd + ".png"
    plt.savefig(fname, dpi=150)
    plt.close()
    print("  Saved:", fname)


def plot_trajectory(test_df, feature_cols, model, unit_id, fd):
    engine = test_df[test_df["unit"] == unit_id].sort_values("cycle")
    if len(engine) == 0:
        print("  Engine %d not found, skipping." % unit_id)
        return

    X_eng = engine[feature_cols].values
    preds = model.predict(X_eng).clip(0, RUL_CLIP)

    plt.figure(figsize=(9, 5))
    plt.plot(engine["cycle"].values, engine["RUL"].values,
             "k-", linewidth=2, label="Actual RUL")
    plt.plot(engine["cycle"].values, preds,
             "b--", linewidth=1.5, label="XGBoost Predicted")
    plt.xlabel("Cycle")
    plt.ylabel("RUL")
    plt.title("Engine %d — RUL Trajectory (%s)" % (unit_id, fd))
    plt.legend()
    plt.tight_layout()
    fname = OUTPUT_DIR + "/xgb_engine%d_%s.png" % (unit_id, fd)
    plt.savefig(fname, dpi=150)
    plt.close()
    print("  Saved:", fname)


# ─────────────────────────────────────────────
# RESULTS SUMMARY TABLE
# ─────────────────────────────────────────────
def print_summary(all_results):
    print("\n" + "=" * 60)
    print("  XGBOOST FINAL RESULTS — ALL DATASETS")
    print("=" * 60)
    print("  %-8s | %-10s | %-10s | %-15s" % (
        "Dataset", "RMSE", "MAE", "NASA Score"))
    print("  " + "-" * 52)
    for r in all_results:
        print("  %-8s | %-10.3f | %-10.3f | %-15.1f" % (
            r["fd"], r["rmse"], r["mae"], r["nasa"]))
    print("=" * 60)


# ─────────────────────────────────────────────
# MAIN — runs all 4 datasets
# ─────────────────────────────────────────────
def main():
    print("=" * 50)
    print("  IFRPM — XGBoost RUL Prediction")
    print("  All 4 C-MAPSS Datasets")
    print("=" * 50)

    all_results = []

    for fd in ["FD001", "FD002", "FD003", "FD004"]:

        print("\n" + "#" * 50)
        print("  DATASET: " + fd)
        print("#" * 50)

        # 1. Load
        train, test = load_data(fd)

        # 2. Preprocess
        print("\n[1/3] Preprocessing...")
        X_train, y_train, X_test, y_test, feature_cols, test_proc = preprocess(
            train, test)

        # 3. Train XGBoost
        print("\n[2/3] Training...")
        model, preds = train_xgboost(X_train, y_train, X_test, y_test)

        # 4. Evaluate
        print("\n[3/3] Evaluating...")
        rmse, mae, nasa = evaluate(y_test, preds, "XGBoost " + fd)

        all_results.append({
            "fd": fd, "rmse": rmse, "mae": mae, "nasa": nasa
        })

        # 5. Plots
        print("\n  Generating plots...")
        plot_predictions(y_test, preds, fd)
        plot_feature_importance(model, feature_cols, fd)
        plot_trajectory(test_proc, feature_cols, model, unit_id=5,  fd=fd)
        plot_trajectory(test_proc, feature_cols, model, unit_id=10, fd=fd)
        plot_trajectory(test_proc, feature_cols, model, unit_id=15, fd=fd)

    # Final summary table
    print_summary(all_results)

    print("\nAll done! Files saved to: " + OUTPUT_DIR)


if __name__ == "__main__":
    main()