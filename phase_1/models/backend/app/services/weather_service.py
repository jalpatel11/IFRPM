"""Fetch and normalize aviation weather data for environmental stress modeling.

Data source: aviationweather.gov Data API
Docs: https://aviationweather.gov/data/api/

Rate limit: 100 requests / minute. No API key required.
"""

import re
import httpx

_BASE_URL = "https://aviationweather.gov/api/data"


async def get_metar_features(icao: str) -> dict:
    """Return environmental stress features from the latest METAR for an ICAO station.

    @param icao - Four-letter ICAO airport code (e.g. 'KLAX', 'KJFK').
    @returns    - Dict with temp_c, dewpoint_c, wind_kt, wind_gust_kt, visibility_sm.
    """
    params = {"ids": icao, "format": "json"}
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{_BASE_URL}/metar", params=params, timeout=10.0)
        r.raise_for_status()
        data = r.json()

    if not data:
        return _empty_metar()

    latest = data[0] if isinstance(data, list) else data
    return _parse_metar(latest)


async def get_pirep_features(icao: str, distance: int = 50) -> dict:
    """Return turbulence and icing data from nearby PIREPs.

    @param icao     - Four-letter ICAO airport code.
    @param distance - Search radius in nautical miles.
    @returns        - Dict with turbulence_intensity and icing_intensity (0-8 scale).
                      Returns zeros when no recent PIREPs exist in the area.
    """
    params = {"id": icao, "format": "json", "distance": distance}
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{_BASE_URL}/pirep", params=params, timeout=10.0)
        # 204 = no PIREPs in range — not an error
        if r.status_code == 204 or not r.content:
            return _empty_pirep()
        r.raise_for_status()
        data = r.json()

    if not data:
        return _empty_pirep()

    latest = data[0] if isinstance(data, list) else data
    return {
        "turbulence_intensity": int(latest.get("tbInt") or 0),
        "icing_intensity":      int(latest.get("iceInt") or 0),
    }


def _parse_metar(obs: dict) -> dict:
    """Extract wear-relevant fields from a METAR JSON observation.

    aviationweather.gov METAR JSON fields:
      temp  -> temperature (Celsius)
      dewp  -> dewpoint (Celsius)
      wspd  -> wind speed (knots)
      wgst  -> wind gust speed (knots)
      visib -> visibility (statute miles) — may be string e.g. "10+"
    """
    return {
        "temp_c":        float(obs.get("temp") or 0.0),
        "dewpoint_c":    float(obs.get("dewp") or 0.0),
        "wind_kt":       float(obs.get("wspd") or 0.0),
        "wind_gust_kt":  float(obs.get("wgst") or 0.0),
        "visibility_sm": _parse_visibility(obs.get("visib")),
        "station":       obs.get("icaoId", ""),
        "raw_metar":     obs.get("rawOb", ""),
    }


def _parse_visibility(raw) -> float:
    """Coerce visibility to float; strips trailing '+' or 'SM' suffixes."""
    if raw is None:
        return 10.0
    stripped = re.sub(r"[^\d.]", "", str(raw))
    return float(stripped) if stripped else 10.0


def _empty_metar() -> dict:
    """Return zero-value METAR features when no observation is available."""
    return {
        "temp_c": 0.0, "dewpoint_c": 0.0,
        "wind_kt": 0.0, "wind_gust_kt": 0.0,
        "visibility_sm": 10.0, "station": "", "raw_metar": "",
    }


def _empty_pirep() -> dict:
    """Return zero-value PIREP features when no reports are in range."""
    return {"turbulence_intensity": 0, "icing_intensity": 0}
