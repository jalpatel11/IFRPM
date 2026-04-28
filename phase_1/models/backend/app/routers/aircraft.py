"""Aircraft routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.aircraft import Aircraft
from app.models.component import Component
from app.schemas.aircraft import AircraftCreate, AircraftResponse
from app.schemas.component import ComponentResponse

router = APIRouter()


@router.get("/{aircraft_id}/components", response_model=list[ComponentResponse])
def get_components(aircraft_id: int, db: Session = Depends(get_db)):
    """Return all components with health index and risk band for an aircraft."""
    aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return db.query(Component).filter(Component.aircraft_id == aircraft_id).all()


@router.post("/", response_model=AircraftResponse, status_code=201)
def register_aircraft(payload: AircraftCreate, db: Session = Depends(get_db)):
    """Register a new aircraft."""
    aircraft = Aircraft(**payload.model_dump())
    db.add(aircraft)
    db.commit()
    db.refresh(aircraft)
    return aircraft
