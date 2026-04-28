import json
import os
from sklearn.metrics import f1_score, roc_auc_score, mean_squared_error, mean_absolute_error
import numpy as np

def calculate_classification_metrics(y_true, y_prob):
    y_pred = (y_prob >= 0.5).astype(int)
    metrics = {}
    try:
        metrics['f1'] = f1_score(y_true, y_pred)
    except:
        metrics['f1'] = 0.0
    try:
        # ROC AUC requires both classes in y_true, otherwise it throws ValueError
        if len(np.unique(y_true)) > 1:
            metrics['roc_auc'] = roc_auc_score(y_true, y_prob)
        else:
            metrics['roc_auc'] = 0.5
    except Exception as e:
        metrics['roc_auc'] = 0.5
    return metrics

def calculate_regression_metrics(y_true, y_pred):
    metrics = {
        'rmse': float(np.sqrt(mean_squared_error(y_true, y_pred))),
        'mae': float(mean_absolute_error(y_true, y_pred))
    }
    return metrics

def save_metrics(metrics, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(metrics, f, indent=4)
