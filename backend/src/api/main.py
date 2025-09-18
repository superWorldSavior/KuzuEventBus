"""
FastAPI main application.
YAGNI implementation - minimal endpoints to get started.
"""
import os
from fastapi import FastAPI

from .routers import customers, health, databases
from .middleware.authentication import AuthenticationMiddleware
from src.infrastructure.logging.config import setup_logging, api_logger

# Setup logging based on environment
environment = os.getenv("ENVIRONMENT", "development")
setup_logging(environment)

app = FastAPI(
    title="Kuzu Event Bus API",
    description="Multi-tenant Kuzu database service - YAGNI MVP",
    version="0.1.0",
)

# Add authentication middleware
app.add_middleware(AuthenticationMiddleware)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(databases.router, prefix="/api/v1/databases", tags=["databases"])


@app.get("/")
async def root():
    """Health check endpoint."""
    api_logger.info("Root endpoint accessed")
    return {"message": "Kuzu Event Bus API is running", "version": "0.1.0"}