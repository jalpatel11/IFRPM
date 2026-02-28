"""Component ORM model."""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Component(Base):
    __tablename__ = "components"

    id             = Column(Integer, primary_key=True, index=True)
    aircraft_id    = Column(Integer, ForeignKey("aircraft.id"), nullable=False)
    name           = Column(String, nullable=False)
    component_type = Column(String, nullable=False)
    health_index   = Column(Float, default=1.0)
    risk_band      = Column(String, default="LOW")
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())

    aircraft        = relationship("Aircraft", back_populates="components")
    rul_predictions = relationship("RULPrediction", back_populates="component")
