"""Risk band classification."""

from app.config import settings


def classify_risk_band(rul: float) -> str:
    """Map a RUL value (cycles) to a maintenance urgency band."""
    if rul < settings.rul_critical_threshold:
        return "CRITICAL"
    if rul < settings.rul_high_threshold:
        return "HIGH"
    if rul < settings.rul_medium_threshold:
        return "MEDIUM"
    return "LOW"


def should_alert(rul: float) -> bool:
    """Return True when RUL is within the actionable threshold."""
    return rul < settings.rul_medium_threshold
