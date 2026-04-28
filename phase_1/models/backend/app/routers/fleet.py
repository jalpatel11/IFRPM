"""Fleet aggregation routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.aircraft import Aircraft
from app.models.component import Component
from app.schemas.rul import FleetSummaryItem

router = APIRouter()

_BAND_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


@router.get("/summary", response_model=list[FleetSummaryItem])
def fleet_summary(db: Session = Depends(get_db)):
    """Return health summary for every aircraft in the fleet."""
    result = []
    for aircraft in db.query(Aircraft).all():
        components = db.query(Component).filter(Component.aircraft_id == aircraft.id).all()
        if not components:
            continue
        worst = min(
            [c.risk_band for c in components],
            key=lambda b: _BAND_ORDER.index(b) if b in _BAND_ORDER else 99,
        )
        result.append(FleetSummaryItem(
            aircraft_id=aircraft.id,
            tail_number=aircraft.tail_number,
            min_rul=min(c.health_index for c in components),
            worst_risk_band=worst,
            component_count=len(components),
        ))
    return result


@router.get("/{aircraft_id}/history")
def fleet_history(aircraft_id: int, db: Session = Depends(get_db)):
    """Return all RUL predictions for every component on an aircraft."""
    from app.models.rul_prediction import RULPrediction
    component_ids = [
        c.id for c in db.query(Component).filter(Component.aircraft_id == aircraft_id).all()
    ]
    return (
        db.query(RULPrediction)
        .filter(RULPrediction.component_id.in_(component_ids))
        .order_by(RULPrediction.predicted_at)
        .all()
    )
