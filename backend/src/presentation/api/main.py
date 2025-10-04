"""FastAPI main application for the presentation layer."""
from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.infrastructure.logging.config import api_logger, setup_logging
from src.presentation.api.middleware.authentication import AuthenticationMiddleware
from src.presentation.api import customers, databases, health, queries
from src.presentation.api.analytics import routes as analytics_routes
from src.presentation.api.auth import routes as auth_routes
from src.presentation.api.events import routes as events_routes
from src.presentation.api.branches import routes as branches_routes

_env_path = Path(__file__).resolve().parents[4] / "backend" / ".env"
if _env_path.exists():  # load runtime environment variables if present
    load_dotenv(dotenv_path=_env_path, override=False)

# Configure logging once based on (possibly loaded) environment
environment = os.getenv("ENVIRONMENT", "development")
# If running under pytest, force testing mode to avoid file log sinks and
# to keep side effects isolated regardless of current working directory.
if os.getenv("PYTEST_CURRENT_TEST") is not None:
    environment = "testing"
setup_logging(environment)

app = FastAPI(
    title="Kuzu Event Bus API",
    description="Multi-tenant Kuzu database service - MVP",
    version="0.1.0",
)

# Middlewares
app.add_middleware(AuthenticationMiddleware)

# CORS (allow frontend dev origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3100"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(databases.router, prefix="/api/v1/databases", tags=["databases"])
app.include_router(branches_routes.router, prefix="/api/v1", tags=["branches"])
app.include_router(queries.router, prefix="/api/v1", tags=["queries"])
app.include_router(queries.jobs_router, prefix="/api/v1", tags=["jobs"])
app.include_router(events_routes.router, prefix="/api/v1", tags=["events"])
app.include_router(auth_routes.router, prefix="/api/v1", tags=["auth"])
app.include_router(analytics_routes.router, prefix="/api/v1", tags=["analytics"])


@app.get("/")
async def root() -> dict[str, str]:
    """Simple welcome endpoint."""
    api_logger.info("Root endpoint accessed")
    return {"message": "Kuzu Event Bus API is running", "version": "0.1.0"}
