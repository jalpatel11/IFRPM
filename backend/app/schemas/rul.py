"""RUL inference request / response schemas."""

from pydantic import BaseModel


class SensorWindow(BaseModel):
    unit_id: str
    cycle: int
    sensors: dict[str, list[float]]  # sensor_name -> readings


class RULResponse(BaseModel):
    unit_id: str
    cycle: int
    predicted_rul: float
    risk_band: str
    confidence: float


class FleetSummaryItem(BaseModel):
    aircraft_id: int
    tail_number: str
    min_rul: float
    worst_risk_band: str
    component_count: int
