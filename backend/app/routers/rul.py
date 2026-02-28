"""RUL inference routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.rul import RULResponse, SensorWindow
from app.services.rul_service import run_rul_inference

router = APIRouter()


@router.post("/predict", response_model=RULResponse)
def predict_rul(payload: SensorWindow, db: Session = Depends(get_db)):
    """Run RUL inference and return a risk-classified prediction."""
    return run_rul_inference(payload, db)
