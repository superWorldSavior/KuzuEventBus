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
    gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy repo
COPY . /app

# Install backend package (editable dev extras for now)
RUN python -m pip install -U pip && \
    pip install -e ./.[dev]

# Ensure Python can import src/* without install side effects
ENV PYTHONPATH=/app/backend

# Create non-root user for security
RUN groupadd -r -g 1000 appuser && useradd -r -u 1000 -g appuser appuser
RUN mkdir -p /app/logs && chown -R appuser:appuser /app

# Copy entrypoint script and make it executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default command: API server (can be overridden in docker-compose for worker)
EXPOSE 8000

# Use entrypoint to fix permissions before running as appuser
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "src.presentation.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
