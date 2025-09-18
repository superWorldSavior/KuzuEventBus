"""
FastAPI main application.
YAGNI implementation - minimal endpoints to get started.
"""
from fastapi import FastAPI

from .routers import customers, health

app = FastAPI(
    title="Kuzu Event Bus API",
    description="Multi-tenant Kuzu database service - YAGNI MVP",
    version="0.1.0",
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Kuzu Event Bus API is running", "version": "0.1.0"}