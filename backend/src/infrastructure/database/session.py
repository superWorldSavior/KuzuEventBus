"""SQLAlchemy session management for PostgreSQL persistence."""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DEFAULT_DB_URL = (
    "postgresql+psycopg2://kuzu_user:kuzu_password@localhost:5432/kuzu_eventbus"
)

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

_engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
SessionFactory = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)


def get_engine():
    """Expose configured engine."""
    return _engine


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a transactional scope around a series of operations."""
    session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:  # noqa: BLE001 - re-raise after rollback
        session.rollback()
        raise
    finally:
        session.close()

# Create database schema from ORM models (single source of truth)
try:
    # Import here to avoid circular import issues
    from src.infrastructure.database.models import Base

    Base.metadata.create_all(_engine)
except Exception as _e:  # noqa: BLE001 - best effort creation, infra will log failures elsewhere
    pass
