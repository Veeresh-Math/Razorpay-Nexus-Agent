from fastapi import APIRouter, Depends
from app.core.config import get_settings, Settings
from app.core.rate_limiter import get_redis_client
from upstash_redis import Redis


router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "nexus-agent"}


@router.get("/healthz")
async def healthz():
    return {"status": "ok"}


@router.get("/ready")
async def readiness_check(redis: Redis = Depends(get_redis_client)):
    try:
        # Test Redis connection
        await redis.ping()
        return {"status": "ready", "dependencies": {"redis": "connected"}}
    except Exception as e:
        return {"status": "not ready", "dependencies": {"redis": f"error: {e}"}}


@router.get("/config")
async def get_config(settings: Settings = Depends(get_settings)):
    """Return non-sensitive config for debugging"""
    return {
        "app_env": settings.app_env,
        "rate_limit_requests": settings.rate_limit_requests,
        "rate_limit_window_seconds": settings.rate_limit_window_seconds,
        "circuit_breaker_threshold": settings.circuit_breaker_threshold,
        "circuit_breaker_timeout_seconds": settings.circuit_breaker_timeout_seconds,
    }