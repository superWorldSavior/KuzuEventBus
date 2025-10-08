"""Simple test for CREATE"""
import pytest
from casys_db import Database


@pytest.fixture
def db(tmp_path):
    """Create a temporary database."""
    db_path = str(tmp_path / "test.db")
    db = Database(db_path, data_dir=str(tmp_path / "data"))
    yield db


def test_create_single_node(db):
    """Test creating a single node with CREATE."""
    result = db.query("CREATE (:Person {name: 'Alice', age: 30})")
    print(f"CREATE result: {result}")
    
    db.commit()
    
    # Try to find it
    result = db.query("MATCH (p:Person) RETURN p.name, p.age")
    print(f"MATCH result: {result}")
    
    assert len(result['rows']) == 1
    assert result['rows'][0][0] == 'Alice'
    assert result['rows'][0][1] == 30


def test_match_create_edge(db):
    """Test MATCH ... CREATE to create edges between existing nodes."""
    # Create two nodes
    db.query("CREATE (:Person {name: 'Alice'})")
    db.query("CREATE (:Person {name: 'Bob'})")
    db.commit()
    
    # Create edge between them using MATCH ... CREATE
    result = db.query("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS]->(b)")
    print(f"MATCH CREATE result: {result}")
    db.commit()
    
    # Verify edge exists
    result = db.query("MATCH (a:Person)-[:KNOWS]->(b:Person) RETURN a.name, b.name")
    print(f"Edge query result: {result}")
    
    assert len(result['rows']) == 1
    assert result['rows'][0][0] == 'Alice'
    assert result['rows'][0][1] == 'Bob'
