"""Component response schema."""

from pydantic import BaseModel


class ComponentResponse(BaseModel):
    id: int
    aircraft_id: int
    name: str
    component_type: str
    health_index: float
    risk_band: str

    model_config = {"from_attributes": True}
