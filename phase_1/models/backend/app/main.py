"""IFRPM FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.ml.loader import load_models
from app.routers import aircraft, alerts, fleet, rul, weather


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_models()
    from app.seed import run as seed
    seed()
    yield


app = FastAPI(
    title="IFRPM API",
    description="Intelligent Fleet Risk & Predictive Maintenance",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fleet.router,    prefix="/api/v1/fleet",    tags=["Fleet"])
app.include_router(aircraft.router, prefix="/api/v1/aircraft", tags=["Aircraft"])
app.include_router(rul.router,      prefix="/api/v1/rul",      tags=["RUL"])
app.include_router(alerts.router,   prefix="/api/v1/alerts",   tags=["Alerts"])
app.include_router(weather.router,  prefix="/api/v1/weather",  tags=["Weather"])


@app.get("/health", tags=["Meta"])
def health_check():
    return {"status": "ok", "version": "0.1.0"}
