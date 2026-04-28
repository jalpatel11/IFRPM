"""Model inference entry point."""

import pandas as pd

from app.ml.loader import get_model, models_loaded


def predict_rul(sensor_df: pd.DataFrame) -> float:
    """Return estimated RUL in engine cycles for the given sensor window."""
    if models_loaded():
        model = get_model("rul_model")
        return float(model.predict(sensor_df.values.reshape(1, -1))[0])
    from app.ml.stub import predict_rul as _stub
    return _stub(sensor_df)


def detect_anomaly(sensor_df: pd.DataFrame) -> bool:
    """Return True if the sensor window is anomalous."""
    if models_loaded():
        model = get_model("anomaly_model")
        return bool(model.predict(sensor_df.values.reshape(1, -1))[0] == -1)
    from app.ml.stub import detect_anomaly as _stub
    return _stub(sensor_df)
