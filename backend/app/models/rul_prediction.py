"""RUL prediction ORM model."""

from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RULPrediction(Base):
    __tablename__ = "rul_predictions"

    id            = Column(Integer, primary_key=True, index=True)
    component_id  = Column(Integer, ForeignKey("components.id"), nullable=False)
    cycle         = Column(Integer, nullable=False)
    predicted_rul = Column(Float, nullable=False)
    confidence    = Column(Float, default=1.0)
    model_version = Column(String, default="v1")
    predicted_at  = Column(DateTime, server_default=func.now())

    component = relationship("Component", back_populates="rul_predictions")
