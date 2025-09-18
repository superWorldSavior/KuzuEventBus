"""SQLAlchemy models for persisted customer accounts."""
from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class CustomerAccountModel(Base):
    """Relational representation of a customer account."""

    __tablename__ = "customers"

    customer_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_name = Column(String(50), unique=True, nullable=False, index=True)
    admin_email = Column(String(255), nullable=False, index=True)
    api_key = Column(String(255), unique=True, nullable=False, index=True)
    api_key_created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    api_key_last_used = Column(DateTime(timezone=False), nullable=True)
    api_key_active = Column(Boolean, nullable=False, default=True)
    status = Column(String(20), nullable=False, default="trial")
    subscription_plan = Column(String(32), nullable=False, default="trial")
    storage_quota_mb = Column(Float, nullable=False, default=100.0)
    max_databases = Column(Integer, nullable=False, default=3)
    max_concurrent_queries = Column(Integer, nullable=False, default=5)
    subscription_started_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    subscription_expires_at = Column(DateTime(timezone=False), nullable=True)
    current_storage_usage_mb = Column(Float, nullable=False, default=0.0)
    database_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    last_login = Column(DateTime(timezone=False), nullable=True)
    organization_name = Column(String(100), nullable=True)
