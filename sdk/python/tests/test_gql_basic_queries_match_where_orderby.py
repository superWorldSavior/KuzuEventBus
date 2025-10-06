"""
Tests basiques du moteur Casys
"""
class TestEngineBasics:
    """Tests des fonctionnalités de base du moteur."""
    
    def test_engine_init(self, engine):
        """Test l'initialisation du moteur"""
        assert engine is not None
    
    def test_create_database(self, engine):
        """Test la création d'une base"""
        db = engine.open_database("testdb")
        assert db == "testdb"
    
    def test_create_branch(self, engine):
        """Test la création d'une branche"""
        engine.open_database("testdb")
        branch = engine.open_branch("testdb", "main")
        assert branch is not None
    
    def test_add_node(self, branch):
        """Test l'ajout d'un nœud"""
        node_id = branch.add_node(["Person"], {"name": "Alice", "age": 30})
        assert isinstance(node_id, int)
        assert node_id >= 0
    
    def test_add_edge(self, branch):
        """Test l'ajout d'une relation"""
        alice = branch.add_node(["Person"], {"name": "Alice"})
        bob = branch.add_node(["Person"], {"name": "Bob"})
        edge_id = branch.add_edge(alice, bob, "KNOWS", {})
        assert isinstance(edge_id, int)
        assert edge_id >= 0
    
    def test_simple_query(self, branch):
        """Test une requête simple MATCH"""
        branch.add_node(["Person"], {"name": "Alice", "age": 30})
        branch.add_node(["Person"], {"name": "Bob", "age": 25})
        
        result = branch.query("MATCH (p:Person) RETURN p.name, p.age")
        
        assert 'columns' in result
        assert 'rows' in result
        # L'ordre des colonnes peut varier
        assert set(result['columns']) == {'p.name', 'p.age'}
        assert len(result['rows']) == 2
    
    def test_query_with_where(self, branch):
        """Test une requête avec WHERE"""
        branch.add_node(["Person"], {"name": "Alice", "age": 30})
        branch.add_node(["Person"], {"name": "Bob", "age": 25})
        
        result = branch.query(
            "MATCH (p:Person) WHERE p.age > 26 RETURN p.name"
        )
        
        assert len(result['rows']) == 1
        assert result['rows'][0] == ['Alice']
    
    def test_query_with_order_by(self, branch):
        """Test une requête avec ORDER BY"""
        branch.add_node(["Person"], {"name": "Alice", "age": 30})
        branch.add_node(["Person"], {"name": "Bob", "age": 25})
        branch.add_node(["Person"], {"name": "Charlie", "age": 28})
        
        result = branch.query(
            "MATCH (p:Person) RETURN p.name, p.age ORDER BY p.age DESC"
        )
        
        ages = [row[1] for row in result['rows']]
        assert ages == [30, 28, 25]
    
    def test_query_with_limit(self, branch):
        """Test une requête avec LIMIT"""
        for i in range(5):
            branch.add_node(["Person"], {"name": f"Person{i}", "age": 20 + i})
        
        result = branch.query(
            "MATCH (p:Person) RETURN p.name LIMIT 3"
        )
        
        assert len(result['rows']) == 3
    
    def test_relationship_query(self, branch):
        """Test une requête avec relation"""
        alice = branch.add_node(["Person"], {"name": "Alice"})
        bob = branch.add_node(["Person"], {"name": "Bob"})
        branch.add_edge(alice, bob, "KNOWS", {})
        
        result = branch.query(
            "MATCH (a:Person)-[:KNOWS]->(b:Person) "
            "WHERE a.name = 'Alice' "
            "RETURN b.name"
        )
        
        assert len(result['rows']) == 1
        assert result['rows'][0] == ['Bob']
