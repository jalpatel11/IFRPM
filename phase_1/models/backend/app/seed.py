"""Dev seed — 5-aircraft dummy fleet, auto-runs on first startup.

Usage: python -m app.seed
"""

import math
import random
from datetime import datetime, timedelta

from app.database import SessionLocal, init_db
from app.models.aircraft import Aircraft
from app.models.component import Component
from app.models.rul_prediction import RULPrediction
from app.services.risk_service import classify_risk_band

random.seed(42)

FLEET = [
    {"tail_number": "N101AA", "model": "Boeing 737-800",   "fleet_id": "FLEET-A", "total_cycles": 4200},
    {"tail_number": "N202UA", "model": "Airbus A320neo",   "fleet_id": "FLEET-A", "total_cycles": 3100},
    {"tail_number": "N303DL", "model": "Boeing 757-200",   "fleet_id": "FLEET-B", "total_cycles": 6800},
    {"tail_number": "N404SW", "model": "Boeing 737 MAX 8", "fleet_id": "FLEET-B", "total_cycles": 1500},
    {"tail_number": "N505FX", "model": "Airbus A321",      "fleet_id": "FLEET-C", "total_cycles": 5200},
]

COMPONENT_TEMPLATES = [
    {"name": "Engine 1",              "component_type": "engine"},
    {"name": "Engine 2",              "component_type": "engine"},
    {"name": "Compressor Stage 1",    "component_type": "compressor"},
    {"name": "High-Pressure Turbine", "component_type": "turbine"},
    {"name": "Fuel Control Unit",     "component_type": "fuel_system"},
]


def _fake_rul(aircraft_idx: int, comp_idx: int, cycle_offset: int) -> float:
    """Return a deterministic degrading RUL for seed data."""
    base = 120.0 - (aircraft_idx * 15) - (comp_idx * 8)
    degradation = cycle_offset * (1.5 + comp_idx * 0.3)
    noise = math.sin(cycle_offset * 0.7 + comp_idx) * 3.0
    return round(max(2.0, base - degradation + noise), 2)


def run() -> None:
    """Seed all tables; no-op if data already exists."""
    init_db()
    db = SessionLocal()

    if db.query(Aircraft).count() > 0:
        db.close()
        return

    for a_idx, fleet_row in enumerate(FLEET):
        aircraft = Aircraft(**fleet_row)
        db.add(aircraft)
        db.flush()

        for c_idx, comp_template in enumerate(COMPONENT_TEMPLATES):
            latest_rul = _fake_rul(a_idx, c_idx, 20)
            component = Component(
                aircraft_id=aircraft.id,
                name=comp_template["name"],
                component_type=comp_template["component_type"],
                health_index=round(min(1.0, latest_rul / 120.0), 4),
                risk_band=classify_risk_band(latest_rul),
            )
            db.add(component)
            db.flush()

            base_time = datetime.utcnow() - timedelta(hours=20)
            for cycle in range(1, 21):
                db.add(RULPrediction(
                    component_id=component.id,
                    cycle=fleet_row["total_cycles"] - 20 + cycle,
                    predicted_rul=_fake_rul(a_idx, c_idx, cycle),
                    confidence=round(0.85 + random.uniform(0, 0.14), 3),
                    model_version="stub-v0",
                    predicted_at=base_time + timedelta(hours=cycle),
                ))

    db.commit()
    db.close()
    print(f"[seed] {len(FLEET)} aircraft / {len(COMPONENT_TEMPLATES)} components / 20 cycles")


if __name__ == "__main__":
    run()
