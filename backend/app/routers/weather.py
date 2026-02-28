"""Weather routes — proxies aviationweather.gov Data API.

Docs: https://aviationweather.gov/data/api/
No API key required. Rate limit: 100 req/min.
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.weather_service import get_metar_features, get_pirep_features

router = APIRouter()


@router.get("/metar/{icao}")
async def metar(icao: str):
    """Return METAR-derived stress features for an ICAO station.

    @param icao - Four-letter ICAO code (e.g. KLAX, KJFK).
    """
    try:
        return await get_metar_features(icao.upper())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/pirep/{icao}")
async def pirep(icao: str, distance: int = Query(50, ge=10, le=500)):
    """Return turbulence and icing intensity from nearby PIREPs.

    @param icao     - Four-letter ICAO code.
    @param distance - Search radius in nautical miles (10–500).
    """
    try:
        return await get_pirep_features(icao.upper(), distance)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/stress/{icao}")
async def combined_stress(icao: str):
    """Return merged METAR + PIREP stress vector for a station.

    @param icao - Four-letter ICAO code.
    """
    icao = icao.upper()
    try:
        metar_data = await get_metar_features(icao)
        pirep_data = await get_pirep_features(icao)
        return {**metar_data, **pirep_data, "icao": icao}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
