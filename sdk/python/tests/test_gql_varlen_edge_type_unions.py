import pytest
from casys_db import Database


@pytest.fixture
def db(tmp_path):
    db_path = str(tmp_path / "test.db")
    db = Database(db_path, data_dir=str(tmp_path / "data"))
    yield db


def test_varlen_edge_type_unions_both(db):
    # Nodes
    db.query("CREATE (:Person {name: 'Alice'})")
    db.query("CREATE (:Person {name: 'Bob'})")
    db.query("CREATE (:Person {name: 'Carol'})")
    db.commit()

    # Edges: Alice -KNOWS-> Bob, Bob -LIKES-> Carol
    db.query("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS]->(b)")
    db.query("MATCH (b:Person {name: 'Bob'}), (c:Person {name: 'Carol'}) CREATE (b)-[:LIKES]->(c)")
    db.commit()

    # Variable-length with unions and BOTH direction (undirected path semantics via Both)
    result = db.query(
        "MATCH (a:Person {name: 'Alice'})-[:KNOWS|LIKES]*1..2-(p:Person) RETURN p.name ORDER BY p.name"
    )

    names = [row[0] for row in result["rows"]]
    assert names == ["Bob", "Carol"]
