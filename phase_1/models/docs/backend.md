# Backend — Setup & Structure

**Stack:** Python 3.10 · FastAPI · SQLAlchemy · PostgreSQL 18 · Uvicorn

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10 | Virtual env at `backend/.venv` |
| PostgreSQL | 18 | Installed via EDB / pgAdmin 4 |
| psql binary | — | `/Library/PostgreSQL/18/bin/psql` |

---

## First-Time Setup

### 1. Create the database

```bash
PGPASSWORD=<postgres_password> /Library/PostgreSQL/18/bin/psql \
  -U postgres -h localhost -p 5432 \
  -c "CREATE USER ifrpm WITH PASSWORD 'ifrpm';"

PGPASSWORD=<postgres_password> /Library/PostgreSQL/18/bin/psql \
  -U postgres -h localhost -p 5432 \
  -c "CREATE DATABASE ifrpm_dev OWNER ifrpm;"
```

### 2. Configure the environment

Copy the example file and edit if needed:

```bash
cp backend/.env.example backend/.env
```

Default `.env` (works out of the box with the setup above):

```
DATABASE_URL=postgresql+psycopg2://ifrpm:ifrpm@localhost:5432/ifrpm_dev
MODEL_DIR=../../models
```

### 3. Install dependencies

```bash
cd backend
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
```

---

## Starting the Server

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

On first startup the server will:
1. Create all database tables via `init_db()`
2. Load any `.pkl` model files from `models/` (or activate stub inference)
3. Seed the database with dummy fleet data via `seed.run()`

Server is ready when you see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

| URL | Description |
|---|---|
| `http://localhost:8000/docs` | Swagger UI (interactive API docs) |
| `http://localhost:8000/openapi.json` | Raw OpenAPI schema |
| `http://localhost:8000/health` | Liveness check |

---

## Re-seeding

The seed only runs once. To reset with fresh data:

```bash
PGPASSWORD=ifrpm /Library/PostgreSQL/18/bin/psql \
  -U ifrpm -h localhost -p 5432 -d ifrpm_dev \
  -c "DROP TABLE rul_predictions, components, aircraft CASCADE;"
```

Then restart the server — tables and seed data are recreated automatically.

Or run the seed script directly:

```bash
cd backend
source .venv/bin/activate
python -m app.seed
```

---

## Directory Structure

```
backend/
├── .env                        # Local environment config (gitignored)
├── .env.example                # Template — copy to .env
├── .venv/                      # Python virtual environment (gitignored)
└── app/
    ├── main.py                 # FastAPI app, middleware, router registration
    ├── config.py               # Settings (pydantic-settings, reads .env)
    ├── database.py             # SQLAlchemy engine, session, Base
    ├── seed.py                 # Dummy fleet data — runs once at startup
    │
    ├── models/                 # SQLAlchemy ORM table definitions
    │   ├── aircraft.py         # aircraft table
    │   ├── component.py        # components table
    │   └── rul_prediction.py   # rul_predictions table
    │
    ├── schemas/                # Pydantic request / response contracts
    │   ├── aircraft.py         # AircraftCreate, AircraftResponse
    │   ├── component.py        # ComponentResponse
    │   └── rul.py              # SensorWindow, RULResponse, FleetSummaryItem
    │
    ├── routers/                # Route handlers — one file per domain
    │   ├── fleet.py            # GET /fleet/summary, GET /fleet/{id}/history
    │   ├── aircraft.py         # GET /aircraft/{id}/components, POST /aircraft/
    │   ├── rul.py              # POST /rul/predict
    │   ├── alerts.py           # GET /alerts
    │   └── weather.py          # GET /weather/metar, /pirep, /stress
    │
    ├── services/               # Business logic, decoupled from routes
    │   ├── rul_service.py      # Inference pipeline + DB persistence
    │   ├── risk_service.py     # Risk band classification
    │   └── weather_service.py  # aviationweather.gov API client
    │
    ├── ml/                     # Model loading and inference
    │   ├── loader.py           # Deserializes .pkl files at startup
    │   ├── inference.py        # predict_rul(), detect_anomaly()
    │   └── stub.py             # Deterministic stubs (no models required)
    │
    └── utils/                  # Shared computation helpers
        ├── feature_engineering.py   # Rolling stats, trend slope, normalization
        └── health_index.py          # Weighted composite health score (0–1)
```

---

## Database Schema

```
aircraft
├── id            PK
├── tail_number   unique
├── model
├── fleet_id
├── total_cycles
└── created_at

components
├── id            PK
├── aircraft_id   FK → aircraft.id
├── name
├── component_type
├── health_index  float  0.0–1.0
├── risk_band     CRITICAL | HIGH | MEDIUM | LOW
└── updated_at

rul_predictions
├── id            PK
├── component_id  FK → components.id
├── cycle         int
├── predicted_rul float
├── confidence    float  0.0–1.0
├── model_version string
└── predicted_at
```

---

## Configuration Reference

All values can be set in `backend/.env` or as shell environment variables.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://ifrpm:ifrpm@localhost:5432/ifrpm_dev` | SQLAlchemy connection string |
| `MODEL_DIR` | `models` | Path to directory containing `.pkl` model files |
| `RUL_CRITICAL_THRESHOLD` | `10` | RUL cycles below which risk band = CRITICAL |
| `RUL_HIGH_THRESHOLD` | `30` | RUL cycles below which risk band = HIGH |
| `RUL_MEDIUM_THRESHOLD` | `80` | RUL cycles below which risk band = MEDIUM |

---

## ML Model Integration

The backend supports two modes:

**Stub mode** (default, no files needed)
- Active when `models/` is empty or missing
- `ml/stub.py` returns deterministic values derived from sensor input
- All endpoints respond normally — safe for frontend development

**Production mode**
- Place `rul_model.pkl` and `anomaly_model.pkl` in the `models/` directory
- Models are loaded once at startup via `ml/loader.py`
- `ml/inference.py` automatically switches to real inference

Expected model interface:
```python
# rul_model.pkl
model.predict(X)   # X shape: (1, n_features) → returns [float]

# anomaly_model.pkl  (sklearn IsolationForest convention)
model.predict(X)   # returns [-1] for anomaly, [1] for normal
```

---

## Request Flow

```
HTTP Request
    ↓
routers/          ← validates input (Pydantic), calls service
    ↓
services/         ← business logic, calls ml/ and database
    ↓
ml/               ← inference (stub or real model)
    ↓
database.py       ← persists result via SQLAlchemy session
    ↓
HTTP Response
```

---

## API Quick Reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/v1/fleet/summary` | Fleet-wide health overview |
| GET | `/api/v1/fleet/{id}/history` | Historical RUL for all components |
| GET | `/api/v1/aircraft/{id}/components` | Component list with health scores |
| POST | `/api/v1/aircraft/` | Register a new aircraft |
| POST | `/api/v1/rul/predict` | Run RUL inference on sensor data |
| GET | `/api/v1/alerts` | Active maintenance alerts |
| GET | `/api/v1/weather/metar/{icao}` | Live surface weather features |
| GET | `/api/v1/weather/pirep/{icao}` | Live turbulence / icing data |
| GET | `/api/v1/weather/stress/{icao}` | Combined METAR + PIREP vector |

Full request/response documentation: `docs/api.md`
