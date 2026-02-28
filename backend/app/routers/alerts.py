"""Maintenance alert routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.component import Component
from app.services.risk_service import should_alert

router = APIRouter()


@router.get("", include_in_schema=False)
@router.get("/")
def get_alerts(db: Session = Depends(get_db)):
    """Return all components in an actionable risk band (MEDIUM / HIGH / CRITICAL)."""
    return [
        {
            "component_id": c.id,
            "aircraft_id": c.aircraft_id,
            "name": c.name,
            "risk_band": c.risk_band,
            "health_index": c.health_index,
        }
        for c in db.query(Component).all()
        if should_alert(c.health_index)
    ]
