"""SQLAlchemy models for persisted customer accounts."""
from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    BigInteger,
    Index,
    UniqueConstraint,
    PrimaryKeyConstraint,
)
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
    password_hash = Column(String(255), nullable=False)
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
    organization_name = Column(String(100), nullable=True, default="default")

    __table_args__ = (
        UniqueConstraint("admin_email", name="uq_customers_admin_email"),
    )


class KuzuDatabaseModel(Base):
    """Catalog table for tenant databases (ORM).

    Matches previous DDL for kuzu_databases.
    """

    __tablename__ = "kuzu_databases"

    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    tenant_id = Column(PG_UUID(as_uuid=True), nullable=False)
    name = Column(Text, nullable=False)
    filesystem_path = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_kuzu_databases_tenant_name"),
    )


class QueryUsageModel(Base):
    """Track usage counts and recency of queries per (tenant,database,hash)."""

    __tablename__ = "query_usage"

    tenant_id = Column(PG_UUID(as_uuid=True), nullable=False)
    database_id = Column(PG_UUID(as_uuid=True), nullable=False)
    query_hash = Column(Text, nullable=False)
    query_text = Column(Text, nullable=False)
    usage_count = Column(Integer, nullable=False, default=0)
    last_used_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        PrimaryKeyConstraint("tenant_id", "database_id", "query_hash", name="pk_query_usage"),
        Index(
            "idx_query_usage_rank",
            "tenant_id",
            "database_id",
            usage_count.desc(),
            last_used_at.desc(),
        ),
    )


class QueryFavoriteModel(Base):
    """Saved queries per (tenant,database), capped in repo logic to max 10."""

    __tablename__ = "query_favorites"

    tenant_id = Column(PG_UUID(as_uuid=True), nullable=False)
    database_id = Column(PG_UUID(as_uuid=True), nullable=False)
    query_hash = Column(Text, nullable=False)
    query_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        PrimaryKeyConstraint("tenant_id", "database_id", "query_hash", name="pk_query_favorites"),
        Index("idx_query_favorites_list", "tenant_id", "database_id", created_at.desc()),
    )


class KuzuDbSnapshotModel(Base):
    """Snapshot metadata for kuzu databases."""

    __tablename__ = "kuzu_db_snapshots"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PG_UUID(as_uuid=True), nullable=False)
    database_id = Column(PG_UUID(as_uuid=True), nullable=False)
    object_key = Column(Text, nullable=False)
    checksum = Column(Text, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("database_id", "object_key", name="uq_snapshots_db_key"),
    )
