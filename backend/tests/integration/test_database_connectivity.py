import os
import pytest
from sqlalchemy import text

from src.infrastructure.database.session import SessionFactory, DATABASE_URL


@pytest.mark.integration
def test_postgres_connectivity():
    # Allow override via env
    url = os.getenv("DATABASE_URL", DATABASE_URL)
    assert "postgresql" in url
    with SessionFactory() as session:
        value = session.execute(text("SELECT 1")).scalar()
        assert value == 1
