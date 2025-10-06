"""
Tests pour les chemins à longueur variable (ISO GQL *min..max)
"""


class TestVariableLengthPaths:
    """Tests des patterns *N, *N..M, *..M, *N.., * dans les requêtes GQL."""
    
    def test_exact_depth(self, social_graph):
        """Test *N (exactement N sauts)"""
        branch = social_graph["branch"]
        
        # *2 = exactement 2 sauts (Alice -> Bob -> Charlie)
        result = branch.query(
            "MATCH (a:Person)-[:KNOWS*2]->(p:Person) "
            "WHERE a.name = 'Alice' "
            "RETURN p.name"
        )
        
        assert result['columns'] == ['p.name']
        assert len(result['rows']) == 1
        assert result['rows'][0] == ['Charlie']
    
    def test_range_depth(self, social_graph):
        """Test *N..M (de N à M sauts)"""
        branch = social_graph["branch"]
        
        # *1..3 = de 1 à 3 sauts
        result = branch.query(
            "MATCH (a:Person)-[:KNOWS*1..3]->(p:Person) "
            "WHERE a.name = 'Alice' "
            "RETURN p.name"
        )
        
        assert result['columns'] == ['p.name']
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Bob', 'Charlie', 'David'}
        assert len(names) == 3
    
    def test_up_to_depth(self, social_graph):
        """Test *..M (de 0 à M sauts)"""
        branch = social_graph["branch"]
        
        # *..2 = de 0 à 2 sauts (ici juste 1 et 2 car le filtre p:Person != a)
        result = branch.query(
            "MATCH (a:Person)-[:KNOWS*..2]->(p:Person) "
            "WHERE a.name = 'Alice' "
            "RETURN p.name"
        )
        
        assert result['columns'] == ['p.name']
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Bob', 'Charlie'}
    
    def test_at_least_depth(self, social_graph):
        """Test *N.. (au moins N sauts)"""
        branch = social_graph["branch"]
        
        # *2.. = au moins 2 sauts
        result = branch.query(
            "MATCH (a:Person)-[:KNOWS*2..]->(p:Person) "
            "WHERE a.name = 'Alice' "
            "RETURN p.name"
        )
        
        assert result['columns'] == ['p.name']
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Charlie', 'David'}
    
    def test_any_depth(self, social_graph):
        """Test * (1 à infini sauts)"""
        branch = social_graph["branch"]
        
        # * = 1 à ∞
        result = branch.query(
            "MATCH (a:Person)-[:KNOWS*]->(p:Person) "
            "WHERE a.name = 'Alice' "
            "RETURN p.name"
        )
        
        assert result['columns'] == ['p.name']
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Bob', 'Charlie', 'David'}
    
    def test_different_start_nodes(self, social_graph):
        """Test avec différents nœuds de départ"""
        branch = social_graph["branch"]
        
        # Depuis Bob, *1..2
        result = branch.query(
            "MATCH (a:Person)-[:KNOWS*1..2]->(p:Person) "
            "WHERE a.name = 'Bob' "
            "RETURN p.name"
        )
        
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Charlie', 'David'}
    
    def test_no_type_specified(self, social_graph):
        """Test sans type de relation spécifié [*2] (syntaxe sans :)"""
        branch = social_graph["branch"]
        
        # [*2] (type omis, pas de :)
        result = branch.query(
            "MATCH (a:Person)-[*2]->(p:Person) "
            "WHERE a.name = 'Alice' "
            "RETURN p.name"
        )
        
        assert len(result['rows']) == 1
        assert result['rows'][0] == ['Charlie']
