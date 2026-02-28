"""Aircraft ORM model."""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Aircraft(Base):
    __tablename__ = "aircraft"

    id           = Column(Integer, primary_key=True, index=True)
    tail_number  = Column(String, unique=True, nullable=False, index=True)
    model        = Column(String, nullable=False)
    fleet_id     = Column(String, nullable=True)
    total_cycles = Column(Integer, default=0)
    created_at   = Column(DateTime, server_default=func.now())

    components = relationship("Component", back_populates="aircraft")
