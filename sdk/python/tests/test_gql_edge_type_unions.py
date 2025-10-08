import pytest
from casys_db import Database


@pytest.fixture
def db(tmp_path):
    db_path = str(tmp_path / "test.db")
    db = Database(db_path, data_dir=str(tmp_path / "data"))
    yield db


def test_edge_type_unions_one_hop(db):
    # Create nodes
    db.query("CREATE (:Person {name: 'Alice'})")
    db.query("CREATE (:Person {name: 'Bob'})")
    db.query("CREATE (:Person {name: 'Carol'})")
    db.commit()

    # Create edges of different types
    db.query("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS]->(b)")
    db.query("MATCH (a:Person {name: 'Alice'}), (c:Person {name: 'Carol'}) CREATE (a)-[:LIKES]->(c)")
    db.commit()

    # Query using union of edge types
    result = db.query("MATCH (a:Person {name: 'Alice'})-[e:KNOWS|LIKES]->(x:Person) RETURN x.name, e.edge_type ORDER BY x.name")

    rows = result["rows"]
    # Expect two rows: Bob (KNOWS), Carol (LIKES)
    assert len(rows) == 2
    # Sorted by x.name: Bob, Carol
    assert rows[0][0] == "Bob"
    assert rows[0][1] == "KNOWS"
    assert rows[1][0] == "Carol"
    assert rows[1][1] == "LIKES"
