# Multi-tenant Kuzu Event Bus - API and Worker image
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System deps (psycopg2 and others may need headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy repo
COPY . /app

# Install backend package (editable dev extras for now)
RUN python -m pip install -U pip && \
    pip install -e ./.[dev]

# Ensure Python can import src/* without install side effects
ENV PYTHONPATH=/app/backend

# Default command: API server (can be overridden in docker-compose for worker)
EXPOSE 8000
CMD ["uvicorn", "src.presentation.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
