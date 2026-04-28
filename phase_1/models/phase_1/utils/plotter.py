import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def plot_losses(train_losses, val_losses, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    plt.figure(figsize=(10, 6))
    epochs = range(1, len(train_losses) + 1)
    plt.plot(epochs, train_losses, label="Training Loss", marker="o")
    if val_losses and len(val_losses) == len(train_losses):
        plt.plot(epochs, val_losses, label="Validation Loss", marker="x")
    plt.title("Training and Validation Loss")
    plt.xlabel("Epochs")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True)
    plt.savefig(filepath)
    plt.close()


def plot_predictions(y_true, y_pred, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.scatter(y_true, y_pred, alpha=0.4, s=8, color="steelblue")
    lim = max(y_true.max(), y_pred.max()) + 5
    ax.plot([0, lim], [0, lim], "r--", linewidth=1, label="Perfect prediction")
    ax.set_xlabel("Actual RUL")
    ax.set_ylabel("Predicted RUL")
    ax.set_title("Predicted vs actual RUL")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(filepath, dpi=150)
    plt.close(fig)


def plot_trajectory(test_df, feature_cols, model, device, unit_id, fd, window_size, rul_clip, save_dir):
    import torch
    engine_df = test_df[test_df["unit"] == unit_id].copy()
    if len(engine_df) < window_size:
        return
    windows, actuals = [], []
    for i in range(window_size, len(engine_df) + 1):
        w = engine_df.iloc[i - window_size: i][feature_cols].values
        windows.append(w)
        actuals.append(engine_df.iloc[i - 1]["RUL"])
    X = torch.tensor(np.array(windows), dtype=torch.float32).to(device)
    model.eval()
    with torch.no_grad():
        preds = model(X).squeeze(-1).cpu().numpy()
    preds = np.clip(preds, 0, rul_clip)
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(actuals, label="Actual RUL", linewidth=2, color="steelblue")
    ax.plot(preds, label="Predicted RUL", linewidth=1.5, color="darkorange", linestyle="--")
    ax.set_xlabel("Cycle index")
    ax.set_ylabel("RUL")
    ax.set_title(f"Engine {unit_id} — {fd}")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    os.makedirs(save_dir, exist_ok=True)
    fig.savefig(os.path.join(save_dir, f"trajectory_{fd}_engine{unit_id}.png"), dpi=150)
    plt.close(fig)


def print_summary(results):
    print("\n" + "=" * 60)
    print("  FINAL RESULTS SUMMARY — ALL DATASETS")
    print("=" * 60)
    print(f"  {'Dataset':<10} | {'RMSE':<10} | {'MAE':<10} | {'NASA Score':<15}")
    print("  " + "-" * 52)
    for r in results:
        print(f"  {r['fd']:<10} | {r['rmse']:<10.3f} | {r['mae']:<10.3f} | {r['nasa_score']:<15,.1f}")
    print("=" * 60)
