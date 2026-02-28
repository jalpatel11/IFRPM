# IFRPM API Documentation

**Base URL:** `http://localhost:8000`
**Interactive docs:** `http://localhost:8000/docs` (Swagger UI)
**OpenAPI schema:** `http://localhost:8000/openapi.json`

All endpoints return JSON. All list responses return arrays.

---

## Meta

### `GET /health`
Service liveness check.

**Response** `200`
```json
{ "status": "ok", "version": "0.1.0" }
```

---

## Fleet  `/api/v1/fleet`

### `GET /api/v1/fleet/summary`
Aggregate health status for every aircraft in the fleet.

**Response** `200` — array of fleet summary items
```json
[
  {
    "aircraft_id": 1,
    "tail_number": "N101AA",
    "min_rul": 0.2646,
    "worst_risk_band": "MEDIUM",
    "component_count": 5
  }
]
```

| Field | Type | Description |
|---|---|---|
| `aircraft_id` | int | Database ID |
| `tail_number` | string | ICAO tail number |
| `min_rul` | float | Lowest health index across all components (0–1) |
| `worst_risk_band` | string | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` |
| `component_count` | int | Total tracked components on this aircraft |

---

### `GET /api/v1/fleet/{aircraft_id}/history`
Historical RUL prediction records for all components on an aircraft,
ordered chronologically.

**Path params**
| Param | Type | Description |
|---|---|---|
| `aircraft_id` | int | Aircraft database ID |

**Response** `200` — array of RUL prediction records
```json
[
  {
    "id": 1,
    "component_id": 1,
    "cycle": 4181,
    "predicted_rul": 120.43,
    "confidence": 0.94,
    "model_version": "stub-v0",
    "predicted_at": "2026-02-27T12:40:18.364577"
  }
]
```

| Field | Type | Description |
|---|---|---|
| `cycle` | int | Engine cycle number at time of prediction |
| `predicted_rul` | float | Estimated cycles remaining at that cycle |
| `confidence` | float | Model confidence 0–1 |
| `model_version` | string | `stub-v0` until real models are loaded |

**Errors**
| Code | Reason |
|---|---|
| `404` | Aircraft not found |

---

## Aircraft  `/api/v1/aircraft`

### `GET /api/v1/aircraft/{aircraft_id}/components`
All components for an aircraft with current health index and risk band.

**Path params**
| Param | Type | Description |
|---|---|---|
| `aircraft_id` | int | Aircraft database ID |

**Response** `200`
```json
[
  {
    "id": 1,
    "aircraft_id": 1,
    "name": "Engine 1",
    "component_type": "engine",
    "health_index": 0.7747,
    "risk_band": "LOW"
  }
]
```

| Field | Type | Description |
|---|---|---|
| `health_index` | float | 0.0 (failed) → 1.0 (healthy) |
| `risk_band` | string | Urgency classification based on health index |
| `component_type` | string | `engine` / `compressor` / `turbine` / `fuel_system` |

**Errors**
| Code | Reason |
|---|---|
| `404` | Aircraft not found |

---

### `POST /api/v1/aircraft/`
Register a new aircraft in the fleet.

**Request body**
```json
{
  "tail_number": "N606AA",
  "model": "Boeing 787-9",
  "fleet_id": "FLEET-A",
  "total_cycles": 800
}
```

| Field | Required | Description |
|---|---|---|
| `tail_number` | yes | Unique ICAO tail number |
| `model` | yes | Aircraft model string |
| `fleet_id` | no | Logical fleet grouping label |
| `total_cycles` | no | Cumulative flight cycles (default 0) |

**Response** `201`
```json
{
  "id": 6,
  "tail_number": "N606AA",
  "model": "Boeing 787-9",
  "fleet_id": "FLEET-A",
  "total_cycles": 800
}
```

**Errors**
| Code | Reason |
|---|---|
| `422` | Validation error (missing required fields) |

---

## RUL  `/api/v1/rul`

### `POST /api/v1/rul/predict`
Run RUL inference on a raw sensor window. Returns predicted remaining useful
life in engine cycles plus a risk classification.

> **Stub mode:** When no `.pkl` model files are present in `models/`, the stub
> inference function returns a deterministic value derived from the sensor mean.
> Output range is 5–120 cycles. Replace with real models by placing
> `rul_model.pkl` and `anomaly_model.pkl` in the `models/` directory.

**Request body**
```json
{
  "unit_id": "3",
  "cycle": 4220,
  "sensors": {
    "T24":  [445.0, 446.2, 447.1],
    "T30":  [1580.3, 1581.0, 1579.8],
    "P30":  [553.1, 554.0, 553.7],
    "Nf":   [2388.0, 2389.5, 2390.1],
    "Ps30": [47.5, 47.6, 47.4]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `unit_id` | string | Component database ID (maps to `component_id`) |
| `cycle` | int | Current engine cycle number |
| `sensors` | object | Map of sensor name → list of readings for the window |

Sensor names follow NASA CMAPSS conventions (`T24`, `T30`, `P30`, `Nf`, `Ps30`, etc.).
Any sensor keys are accepted; the model uses whatever it was trained on.

**Response** `200`
```json
{
  "unit_id": "3",
  "cycle": 4220,
  "predicted_rul": 118.07,
  "risk_band": "LOW",
  "confidence": 1.0
}
```

| Field | Type | Description |
|---|---|---|
| `predicted_rul` | float | Estimated cycles until failure |
| `risk_band` | string | `CRITICAL` (<10) / `HIGH` (10–30) / `MEDIUM` (30–80) / `LOW` (>80) |
| `confidence` | float | Model confidence 0–1 (stub always returns `1.0`) |

**Errors**
| Code | Reason |
|---|---|
| `422` | Malformed sensor payload |

---

## Alerts  `/api/v1/alerts`

### `GET /api/v1/alerts`
Return all components currently in an actionable risk band
(`CRITICAL`, `HIGH`, or `MEDIUM`). Components with `LOW` risk are excluded.

Both `/api/v1/alerts` and `/api/v1/alerts/` are accepted (no redirect).

**Response** `200`
```json
[
  {
    "component_id": 10,
    "aircraft_id": 2,
    "name": "Fuel Control Unit",
    "risk_band": "HIGH",
    "health_index": 0.1396
  },
  {
    "component_id": 15,
    "aircraft_id": 3,
    "name": "Fuel Control Unit",
    "risk_band": "CRITICAL",
    "health_index": 0.0167
  }
]
```

Returns an empty array `[]` when no components require attention.

---

## Weather  `/api/v1/weather`

Live proxy to the [aviationweather.gov Data API](https://aviationweather.gov/data/api/).
No API key required. Rate limit: **100 req/min** (upstream constraint).

ICAO codes are case-insensitive — `klax` and `KLAX` both work.

---

### `GET /api/v1/weather/metar/{icao}`
Surface weather stress features from the latest METAR observation.

**Path params**
| Param | Type | Description |
|---|---|---|
| `icao` | string | Four-letter ICAO station code |

**Example:** `GET /api/v1/weather/metar/KLAX`

**Response** `200`
```json
{
  "temp_c": 21.7,
  "dewpoint_c": 12.2,
  "wind_kt": 0.0,
  "wind_gust_kt": 0.0,
  "visibility_sm": 10.0,
  "station": "KLAX",
  "raw_metar": "METAR KLAX 280653Z 00000KT 10SM SCT220 22/12 A2990 RMK AO2 SLP122 T02170122"
}
```

| Field | Unit | Stress relevance |
|---|---|---|
| `temp_c` | °C | Thermal expansion / material stress |
| `dewpoint_c` | °C | Corrosion / moisture ingestion risk |
| `wind_kt` | knots | Sustained wind loading |
| `wind_gust_kt` | knots | Peak aerodynamic stress |
| `visibility_sm` | statute miles | Approach complexity proxy |
| `station` | string | Confirmed ICAO identifier from upstream |
| `raw_metar` | string | Full raw METAR string for reference |

> **Note:** `visibility_sm` values like `"10+"` from the upstream API are
> automatically normalized to `10.0`.

**Errors**
| Code | Reason |
|---|---|
| `502` | Upstream aviationweather.gov unreachable or returned an error |

---

### `GET /api/v1/weather/pirep/{icao}`
Turbulence and icing intensity from nearby pilot reports (PIREPs).

**Path params**
| Param | Type | Description |
|---|---|---|
| `icao` | string | Four-letter ICAO station code |

**Query params**
| Param | Type | Default | Range | Description |
|---|---|---|---|---|
| `distance` | int | 50 | 10–500 | Search radius in nautical miles |

**Example:** `GET /api/v1/weather/pirep/KJFK?distance=100`

**Response** `200`
```json
{
  "turbulence_intensity": 3,
  "icing_intensity": 1
}
```

Intensity scale (0–8) follows standard PIREP encoding:

| Value | Severity |
|---|---|
| 0 | None |
| 1–2 | Light |
| 3–4 | Moderate |
| 5–6 | Severe |
| 7–8 | Extreme |

> **Note:** Returns `{"turbulence_intensity": 0, "icing_intensity": 0}` when
> no PIREPs exist within the search radius (upstream returns HTTP 204 — not an error).

**Errors**
| Code | Reason |
|---|---|
| `502` | Upstream aviationweather.gov unreachable |

---

### `GET /api/v1/weather/stress/{icao}`
Combined METAR + PIREP stress vector — single call suitable for direct
injection into feature engineering pipelines.

**Example:** `GET /api/v1/weather/stress/KJFK`

**Response** `200`
```json
{
  "icao": "KJFK",
  "temp_c": 0.0,
  "dewpoint_c": -0.6,
  "wind_kt": 0.0,
  "wind_gust_kt": 0.0,
  "visibility_sm": 10.0,
  "station": "KJFK",
  "raw_metar": "METAR KJFK 280651Z 00000KT 10SM FEW250 00/M01 A3015 RMK AO2 SLP209 T00001006",
  "turbulence_intensity": 0,
  "icing_intensity": 0
}
```

All fields from `/metar/{icao}` and `/pirep/{icao}` are merged into one object,
with an additional `icao` confirmation field.

**Errors**
| Code | Reason |
|---|---|
| `502` | Upstream aviationweather.gov unreachable |

---

## Risk Band Reference

Thresholds are configurable via `.env` (`RUL_CRITICAL_THRESHOLD`, etc.).

| Band | Health Index / RUL | Recommended Action |
|---|---|---|
| `CRITICAL` | < 10 cycles | Ground aircraft immediately |
| `HIGH` | 10–30 cycles | Schedule maintenance within 48 h |
| `MEDIUM` | 30–80 cycles | Plan for next scheduled slot |
| `LOW` | > 80 cycles | Continue monitoring |

---

## PostgreSQL Setup (local dev)

Requires PostgreSQL 18 installed via the EDB installer (pgAdmin 4).
The `psql` binary is at `/Library/PostgreSQL/18/bin/psql`.

```bash
PGPASSWORD=<your_postgres_password> /Library/PostgreSQL/18/bin/psql \
  -U postgres -h localhost -p 5432 \
  -c "CREATE USER ifrpm WITH PASSWORD 'ifrpm';"

PGPASSWORD=<your_postgres_password> /Library/PostgreSQL/18/bin/psql \
  -U postgres -h localhost -p 5432 \
  -c "CREATE DATABASE ifrpm_dev OWNER ifrpm;"
```

Tables and seed data are created automatically on first `uvicorn` startup.

**`.env` file** (place in `backend/`):
```
DATABASE_URL=postgresql+psycopg2://ifrpm:ifrpm@localhost:5432/ifrpm_dev
MODEL_DIR=../../models
```

**Start the server:**
```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

---

## Seed Data

On first startup the backend auto-populates the database with dummy fleet data.
Subsequent startups detect existing data and skip re-seeding.

| Entity | Count | Detail |
|---|---|---|
| Aircraft | 5 | Mixed Boeing / Airbus fleet across 3 fleet groups |
| Components per aircraft | 5 | Engine 1 & 2, Compressor Stage 1, HP Turbine, Fuel Control Unit |
| RUL history cycles | 20 per component | Deterministic degradation curve per unit |

**Total:** 25 components, 500 historical RUL records.

Seed aircraft tail numbers: `N101AA`, `N202UA`, `N303DL`, `N404SW`, `N505FX`

---

## Known Behaviours

| Behaviour | Detail |
|---|---|
| Stub inference | `predicted_rul` range is 5–120 cycles until real `.pkl` models are present |
| Alerts threshold | Components with `health_index < 0.8` (i.e. RUL < 80 cycles equivalent) appear in alerts |
| PIREP zero response | No PIREPs in range is normal; returns zeros, not an error |
| Visibility `"10+"` | Normalized to `10.0` — upstream METAR encodes unlimited vis as `"10+"` |
| Re-seeding | Drop and recreate the DB to re-run seed with fresh data |
