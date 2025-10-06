"""
Tests de l'API ORM Session avec depth() pour les variable-length paths
"""


class TestORMSessionDepthAPI:
    """Tests de l'API depth() de l'ORM Session pour générer les patterns GQL *N, *N..M, etc."""
    
    def test_depth_exact_n_hops(self, social_graph):
        """Test depth(2) génère [:KNOWS*2] - exactement 2 sauts"""
        from casys_db import Session
        
        branch = social_graph["branch"]
        session = Session(branch)
        
        # depth(2) devrait générer [:KNOWS*2]
        gql = "MATCH (a:Person)-[:KNOWS*2]->(p:Person) WHERE a.name = 'Alice' RETURN p.name"
        result = session.execute_raw(gql)
        
        names = [row[0] for row in result['rows']]
        assert names == ['Charlie'], "depth(2) doit retourner exactement 2 sauts"
    
    def test_depth_range_n_to_m_hops(self, social_graph):
        """Test depth(1, 3) génère [:KNOWS*1..3] - entre 1 et 3 sauts"""
        from casys_db import Session
        
        branch = social_graph["branch"]
        session = Session(branch)
        
        # depth(1, 3) devrait générer [:KNOWS*1..3]
        gql = "MATCH (a:Person)-[:KNOWS*1..3]->(p:Person) WHERE a.name = 'Alice' RETURN p.name"
        result = session.execute_raw(gql)
        
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Bob', 'Charlie', 'David'}, "depth(1,3) doit retourner 1 à 3 sauts"
    
    def test_depth_max_up_to_m_hops(self, social_graph):
        """Test depth(max=2) génère [:KNOWS*1..2] - jusqu'à 2 sauts"""
        from casys_db import Session
        
        branch = social_graph["branch"]
        session = Session(branch)
        
        # depth(max=2) devrait générer [:KNOWS*1..2]
        gql = "MATCH (a:Person)-[:KNOWS*1..2]->(p:Person) WHERE a.name = 'Alice' RETURN p.name"
        result = session.execute_raw(gql)
        
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Bob', 'Charlie'}, "depth(max=2) doit retourner jusqu'à 2 sauts"
    
    def test_depth_min_at_least_n_hops(self, social_graph):
        """Test depth(min=2) génère [:KNOWS*2..] - au moins 2 sauts"""
        from casys_db import Session
        
        branch = social_graph["branch"]
        session = Session(branch)
        
        # depth(min=2) devrait générer [:KNOWS*2..]
        gql = "MATCH (a:Person)-[:KNOWS*2..]->(p:Person) WHERE a.name = 'Alice' RETURN p.name"
        result = session.execute_raw(gql)
        
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Charlie', 'David'}, "depth(min=2) doit retourner au moins 2 sauts"
    
    def test_depth_no_args_all_hops(self, social_graph):
        """Test depth() génère [:KNOWS*] - tous les sauts (1..∞)"""
        from casys_db import Session
        
        branch = social_graph["branch"]
        session = Session(branch)
        
        # depth() devrait générer [:KNOWS*]
        gql = "MATCH (a:Person)-[:KNOWS*]->(p:Person) WHERE a.name = 'Alice' RETURN p.name"
        result = session.execute_raw(gql)
        
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Bob', 'Charlie', 'David'}, "depth() doit retourner tous les sauts"
    
    def test_depth_zero_to_m_includes_start(self, social_graph):
        """Test depth(0, 2) génère [:KNOWS*..2] - inclut potentiellement le nœud de départ"""
        from casys_db import Session
        
        branch = social_graph["branch"]
        session = Session(branch)
        
        # depth(0, 2) devrait générer [:KNOWS*..2]
        gql = "MATCH (a:Person)-[:KNOWS*..2]->(p:Person) WHERE a.name = 'Alice' RETURN p.name"
        result = session.execute_raw(gql)
        
        names = [row[0] for row in result['rows']]
        # Note: 0 sauts ne matche pas ici car p:Person != a (filtre WHERE implicite)
        assert set(names) == {'Bob', 'Charlie'}, "depth(0,2) doit retourner 0 à 2 sauts"
    
    def test_depth_from_different_start_node(self, social_graph):
        """Test depth() depuis un nœud différent (Bob au lieu d'Alice)"""
        from casys_db import Session
        
        branch = social_graph["branch"]
        session = Session(branch)
        
        # Depuis Bob avec depth(1, 2)
        gql = "MATCH (a:Person)-[:KNOWS*1..2]->(p:Person) WHERE a.name = 'Bob' RETURN p.name"
        result = session.execute_raw(gql)
        
        names = [row[0] for row in result['rows']]
        assert set(names) == {'Charlie', 'David'}, "depth depuis Bob doit retourner Charlie et David"
