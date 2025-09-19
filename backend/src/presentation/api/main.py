"""FastAPI main application for the presentation layer."""
from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI

from src.infrastructure.logging.config import api_logger, setup_logging
from src.presentation.api.middleware.authentication import AuthenticationMiddleware
from src.presentation.api import customers, databases, health, queries
from src.presentation.api import provisioning

_env_path = Path(__file__).resolve().parents[4] / "backend" / ".env"
if _env_path.exists():  # load runtime environment variables if present
    load_dotenv(dotenv_path=_env_path, override=False)

# Configure logging once based on (possibly loaded) environment
environment = os.getenv("ENVIRONMENT", "development")
setup_logging(environment)

app = FastAPI(
    title="Kuzu Event Bus API",
    description="Multi-tenant Kuzu database service - MVP",
    version="0.1.0",
)

# Middlewares
app.add_middleware(AuthenticationMiddleware)

# Routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(databases.router, prefix="/api/v1/databases", tags=["databases"])
app.include_router(queries.router, prefix="/api/v1", tags=["queries"])
app.include_router(provisioning.router, prefix="/api/v1", tags=["provisioning"])


@app.get("/")
async def root() -> dict[str, str]:
    """Simple welcome endpoint."""
    api_logger.info("Root endpoint accessed")
    return {"message": "Kuzu Event Bus API is running", "version": "0.1.0"}
