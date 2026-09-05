import logging
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "shared"))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.rate_limiter import RateLimitMiddleware, get_redis_client
from app.api.v1 import checkout, webhooks, reconciliation, health, mcp, contextual


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Razorpay Nexus-Agent backend...")
    redis_client = get_redis_client()
    app.state.redis = redis_client
    logger.info("Redis client initialized")

    yield

    # Shutdown
    logger.info("Shutting down Razorpay Nexus-Agent backend...")


app = FastAPI(
    title="Razorpay Nexus-Agent API",
    description="Multi-track payment optimization engine for Agentic Commerce, Revenue Recovery, and Finance Controller",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
app.add_middleware(
    RateLimitMiddleware,
    redis_client=get_redis_client(),
    requests_per_window=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc) if settings.app_env == "development" else "Internal server error"},
    )


# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(checkout.router, prefix="/api/v1", tags=["Checkout"])
app.include_router(webhooks.router, prefix="/api/v1", tags=["Webhooks"])
app.include_router(reconciliation.router, prefix="/api/v1", tags=["Reconciliation"])
app.include_router(mcp.router, prefix="/api/v1", tags=["MCP Server"])
app.include_router(contextual.router, prefix="/api/v1", tags=["Contextual Payments"])


@app.get("/")
async def root():
    return {
        "service": "Razorpay Nexus-Agent",
        "version": "1.0.0",
        "status": "operational",
        "tracks": ["Agentic Commerce (Track 01)", "Revenue Recovery (Track 03)", "Finance Controller (Track 04)"],
    }