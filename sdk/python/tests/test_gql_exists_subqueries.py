"""
Tests for EXISTS subqueries (correlated subqueries).
Mirrors engine/tests/gql_exists_subqueries.rs
"""
import pytest
from casys_db import Database


@pytest.fixture
def db(tmp_path):
    """Create a temporary database."""
    db_path = str(tmp_path / "test.db")
    db = Database(db_path, data_dir=str(tmp_path / "data"))
    yield db


def test_exists_with_results(db):
    """Test EXISTS returns nodes that match the subquery."""
    # Create articles and tags (separate statements)
    db.query("CREATE (a1:Article {title: 'Article1'})")
    db.query("CREATE (a2:Article {title: 'Article2'})")
    db.query("CREATE (t:Tag {name: 'Tech'})")
    
    # Article1 has a tag, Article2 doesn't
    db.query("MATCH (a:Article {title: 'Article1'}), (t:Tag) CREATE (a)-[:HAS_TAG]->(t)")
    db.commit()
    
    # Query: return articles that have at least one tag
    result = db.query("""
        MATCH (a:Article)
        WHERE EXISTS {
            MATCH (a)-[:HAS_TAG]->(:Tag)
            RETURN a
        }
        RETURN a.title
    """)
    
    # Should return only Article1
    assert len(result['rows']) == 1
    assert result['rows'][0][0] == 'Article1'


def test_exists_no_results(db):
    """Test EXISTS returns empty when no nodes match."""
    # Create an article without tags
    db.query("CREATE (:Article {title: 'Article1'})")
    db.commit()
    
    # Query: return articles that have a tag
    result = db.query("""
        MATCH (a:Article)
        WHERE EXISTS {
            MATCH (a)-[:HAS_TAG]->(:Tag)
            RETURN a
        }
        RETURN a.title
    """)
    
    # Should return 0 results
    assert len(result['rows']) == 0


def test_exists_with_not(db):
    """Test NOT EXISTS returns nodes that don't match the subquery."""
    # Create two articles, only one has a tag
    db.query("CREATE (:Article {title: 'Article1'})")
    db.query("CREATE (:Article {title: 'Article2'})")
    db.query("CREATE (:Tag {name: 'Tech'})")
    
    db.query("MATCH (a:Article {title: 'Article1'}), (t:Tag) CREATE (a)-[:HAS_TAG]->(t)")
    db.commit()
    
    # Query: articles that DON'T have a tag
    result = db.query("""
        MATCH (a:Article)
        WHERE NOT EXISTS {
            MATCH (a)-[:HAS_TAG]->(:Tag)
            RETURN a
        }
        RETURN a.title
    """)
    
    # Should return Article2 (which has no tag)
    assert len(result['rows']) == 1
    assert result['rows'][0][0] == 'Article2'


def test_exists_with_parameter(db):
    """Test EXISTS with parameters in both main query and subquery."""
    # Create article with status and tag
    db.query("CREATE (:Article {title: 'Article1', status: 'published'})")
    db.query("CREATE (:Tag {name: 'Tech'})")
    
    db.query("MATCH (a:Article), (t:Tag) CREATE (a)-[:HAS_TAG]->(t)")
    db.commit()
    
    # Query with parameter in WHERE and EXISTS
    result = db.query("""
        MATCH (a:Article)
        WHERE a.status = $status AND EXISTS {
            MATCH (a)-[:HAS_TAG]->(:Tag)
            RETURN a
        }
        RETURN a.title
    """, {'status': 'published'})
    
    assert len(result['rows']) == 1
    assert result['rows'][0][0] == 'Article1'


def test_exists_with_filter_in_subquery(db):
    """Test EXISTS with WHERE clause inside the subquery."""
    # Create articles with different tag counts
    db.query("CREATE (:Article {title: 'Article1'})")
    db.query("CREATE (:Article {title: 'Article2'})")
    db.query("CREATE (:Tag {name: 'Tech', priority: 10})")
    db.query("CREATE (:Tag {name: 'News', priority: 5})")
    
    db.query("MATCH (a1:Article {title: 'Article1'}), (t1:Tag {name: 'Tech'}) CREATE (a1)-[:HAS_TAG]->(t1)")
    db.query("MATCH (a2:Article {title: 'Article2'}), (t2:Tag {name: 'News'}) CREATE (a2)-[:HAS_TAG]->(t2)")
    db.commit()
    
    # Query: articles that have a high-priority tag (priority > 8)
    result = db.query("""
        MATCH (a:Article)
        WHERE EXISTS {
            MATCH (a)-[:HAS_TAG]->(t:Tag)
            WHERE t.priority > 8
            RETURN a
        }
        RETURN a.title
    """)
    
    # Should return only Article1 (has Tech tag with priority 10)
    assert len(result['rows']) == 1
    assert result['rows'][0][0] == 'Article1'


def test_exists_multiple_patterns(db):
    """Test EXISTS with multiple patterns in subquery."""
    # Create a chain: Person -> Article -> Tag
    db.query("CREATE (:Person {name: 'Alice'})")
    db.query("CREATE (:Article {title: 'Article1'})")
    db.query("CREATE (:Tag {name: 'Tech'})")
    
    db.query("MATCH (p:Person), (a:Article) CREATE (p)-[:WROTE]->(a)")
    db.query("MATCH (a:Article), (t:Tag) CREATE (a)-[:HAS_TAG]->(t)")
    db.commit()
    
    # Query: people who wrote articles that have tags
    result = db.query("""
        MATCH (p:Person)
        WHERE EXISTS {
            MATCH (p)-[:WROTE]->(a:Article)-[:HAS_TAG]->(:Tag)
            RETURN p
        }
        RETURN p.name
    """)
    
    assert len(result['rows']) == 1
    assert result['rows'][0][0] == 'Alice'
