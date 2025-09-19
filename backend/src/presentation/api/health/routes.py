"""
Health check endpoints.
YAGNI implementation - just basic status.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health_check():
    """Basic health check."""
    return {"status": "healthy", "service": "kuzu-event-bus"}


@router.get("/ready")
async def readiness_check():
    """Readiness check."""
    return {"status": "ready", "service": "kuzu-event-bus"}