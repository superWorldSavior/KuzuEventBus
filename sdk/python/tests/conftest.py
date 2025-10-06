"""
Pytest fixtures communes pour les tests du SDK Casys
"""
import pytest
import tempfile
import shutil
from pathlib import Path
from casys_db import CasysEngine


@pytest.fixture
def temp_dir():
    """Crée un répertoire temporaire pour les tests."""
    tmpdir = tempfile.mkdtemp()
    yield tmpdir
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture
def engine(temp_dir):
    """Initialise un moteur Casys dans un répertoire temporaire."""
    return CasysEngine(temp_dir)


@pytest.fixture
def branch(engine):
    """Crée une base et une branche de test."""
    db = engine.open_database("testdb")
    branch = engine.open_branch("testdb", "main")
    return branch


@pytest.fixture
def social_graph(branch):
    """
    Crée un graphe social de test:
    Alice -> Bob -> Charlie -> David
    """
    alice = branch.add_node(["Person"], {"name": "Alice", "age": 30})
    bob = branch.add_node(["Person"], {"name": "Bob", "age": 25})
    charlie = branch.add_node(["Person"], {"name": "Charlie", "age": 28})
    david = branch.add_node(["Person"], {"name": "David", "age": 35})
    
    branch.add_edge(alice, bob, "KNOWS", {})
    branch.add_edge(bob, charlie, "KNOWS", {})
    branch.add_edge(charlie, david, "KNOWS", {})
    
    return {
        "branch": branch,
        "nodes": {
            "alice": alice,
            "bob": bob,
            "charlie": charlie,
            "david": david
        }
    }
