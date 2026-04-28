"""RUL prediction and persistence service."""

import pandas as pd
from sqlalchemy.orm import Session

from app.ml.inference import predict_rul
from app.models.rul_prediction import RULPrediction
from app.schemas.rul import RULResponse, SensorWindow
from app.services.risk_service import classify_risk_band


def run_rul_inference(payload: SensorWindow, db: Session) -> RULResponse:
    """Run RUL inference, persist the result, and return the response."""
    sensor_df = pd.DataFrame(payload.sensors)
    rul = predict_rul(sensor_df)
    band = classify_risk_band(rul)

    db.add(RULPrediction(
        component_id=int(payload.unit_id),
        cycle=payload.cycle,
        predicted_rul=rul,
    ))
    db.commit()

    return RULResponse(
        unit_id=payload.unit_id,
        cycle=payload.cycle,
        predicted_rul=rul,
        risk_band=band,
        confidence=1.0,
    )


def get_component_history(component_id: int, db: Session) -> list[RULPrediction]:
    """Return RUL records for a component ordered by cycle."""
    return (
        db.query(RULPrediction)
        .filter(RULPrediction.component_id == component_id)
        .order_by(RULPrediction.cycle)
        .all()
    )
