import pytest
from casys_db import Database


def test_query_returns_stats(tmp_path):
    db_path = str(tmp_path / "test.db")
    db = Database(db_path, data_dir=str(tmp_path / "data"))

    # Seed minimal graph
    db.query("CREATE (:Person {name: 'Alice'})")
    db.commit()

    res = db.query("MATCH (p:Person) RETURN p.name")

    assert isinstance(res, dict)
    assert "columns" in res and "rows" in res
    # Stats should be present with elapsed_ms
    assert "stats" in res
    stats = res["stats"]
    assert isinstance(stats["elapsed_ms"], int)
    assert stats["elapsed_ms"] >= 0
    assert isinstance(stats["scanned"], int)
    assert isinstance(stats["expanded"], int)
