"""Aircraft request / response schemas."""

from pydantic import BaseModel


class AircraftBase(BaseModel):
    tail_number: str
    model: str
    fleet_id: str | None = None
    total_cycles: int = 0


class AircraftCreate(AircraftBase):
    pass


class AircraftResponse(AircraftBase):
    id: int
    model_config = {"from_attributes": True}
