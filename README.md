# IFRPM

Intelligent Fleet Risk and Predictive Maintenance System

## Project Structure

```
IFRPM/
├── backend/                    # Backend application (FastAPI)
│   ├── .env.example            # Environment variables template
│   └── app/
│       ├── config.py           # Application configuration
│       ├── database.py         # Database connection and session management
│       ├── main.py             # FastAPI application entry point
│       ├── seed.py             # Database seeding script
│       ├── ml/                 # Machine learning modules
│       │   ├── inference.py    # Model inference logic
│       │   ├── loader.py       # Model loading utilities
│       │   └── stub.py         # ML stub implementations
│       ├── models/             # SQLAlchemy database models
│       │   ├── aircraft.py     # Aircraft model
│       │   ├── component.py    # Component model
│       │   └── rul_prediction.py  # RUL prediction model
│       ├── routers/            # API route handlers
│       │   ├── aircraft.py     # Aircraft endpoints
│       │   ├── alerts.py       # Alerts endpoints
│       │   ├── fleet.py        # Fleet management endpoints
│       │   ├── rul.py          # RUL prediction endpoints
│       │   └── weather.py      # Weather data endpoints
│       ├── schemas/            # Pydantic schemas for validation
│       │   ├── aircraft.py     # Aircraft schemas
│       │   ├── component.py    # Component schemas
│       │   └── rul.py          # RUL schemas
│       ├── services/           # Business logic services
│       │   ├── risk_service.py      # Risk assessment service
│       │   ├── rul_service.py       # RUL calculation service
│       │   └── weather_service.py   # Weather data service
│       └── utils/              # Utility functions
│           ├── feature_engineering.py  # Feature engineering
│           └── health_index.py        # Health index calculations
├── data/                       # Data storage
│   ├── processed/              # Processed data files
│   └── raw/                    # Raw data files
├── docs/                       # Documentation
│   ├── api.md                  # API documentation
│   └── backend.md              # Backend architecture documentation
├── frontend/                   # Frontend application
├── models/                     # Trained ML model files
├── notebooks/                  # Jupyter notebooks for analysis
└── requirements.txt            # Python dependencies
```
