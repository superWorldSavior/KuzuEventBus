"""
Tests pour la clause WITH (pipeline de transformations ISO GQL)
"""


class TestGQLWithClause:
    """Tests de la clause WITH pour les transformations pipeline."""
    
    def test_with_simple_projection(self, branch):
        """Test WITH simple avec projection"""
        branch.add_node(["Person"], {"name": "Alice", "age": 25})
        branch.add_node(["Person"], {"name": "Bob", "age": 30})
        branch.add_node(["Person"], {"name": "Charlie", "age": 28})
        
        # WITH projette p.age AS age, puis WHERE filtre
        result = branch.query(
            "MATCH (p:Person) WITH p.age AS age WHERE age > 26 RETURN age"
        )
        
        ages = [row[0] for row in result['rows']]
        assert set(ages) == {30, 28}, "Devrait retourner Bob et Charlie"
    
    def test_with_arithmetic_expression(self, branch):
        """Test WITH avec expression arithmétique"""
        branch.add_node(["Product"], {"name": "Item1", "price": 10})
        branch.add_node(["Product"], {"name": "Item2", "price": 20})
        branch.add_node(["Product"], {"name": "Item3", "price": 15})
        
        # WITH calcule price * 2, puis WHERE filtre
        result = branch.query(
            "MATCH (p:Product) WITH p.price * 2 AS doubled WHERE doubled > 25 RETURN doubled"
        )
        
        doubled_prices = [row[0] for row in result['rows']]
        assert set(doubled_prices) == {40, 30}, "Item2: 20*2=40, Item3: 15*2=30"
    
    def test_with_multiple_items(self, branch):
        """Test WITH avec plusieurs projections"""
        branch.add_node(["Person"], {"name": "Alice", "age": 25, "city": "Paris"})
        branch.add_node(["Person"], {"name": "Bob", "age": 30, "city": "London"})
        
        # WITH projette plusieurs propriétés
        result = branch.query(
            "MATCH (p:Person) WITH p.name AS name, p.age AS age, p.city AS city RETURN name, age, city"
        )
        
        assert set(result['columns']) == {'name', 'age', 'city'}
        assert len(result['rows']) == 2
    
    def test_with_addition_subtraction(self, branch):
        """Test WITH avec addition et soustraction"""
        branch.add_node(["Account"], {"name": "Alice", "balance": 100, "fees": 10})
        branch.add_node(["Account"], {"name": "Bob", "balance": 200, "fees": 15})
        
        # WITH calcule balance - fees
        result = branch.query(
            "MATCH (a:Account) WITH a.balance - a.fees AS net WHERE net > 150 RETURN net"
        )
        
        net_balances = [row[0] for row in result['rows']]
        assert net_balances == [185], "Bob: 200-15=185 > 150"
    
    def test_with_division(self, branch):
        """Test WITH avec division"""
        branch.add_node(["Stats"], {"total": 100, "count": 4})
        branch.add_node(["Stats"], {"total": 150, "count": 5})
        
        # WITH calcule la moyenne
        result = branch.query(
            "MATCH (s:Stats) WITH s.total / s.count AS avg RETURN avg"
        )
        
        averages = [row[0] for row in result['rows']]
        assert set(averages) == {25, 30}, "100/4=25, 150/5=30"
    
    def test_with_parameter(self, branch):
        """Test WITH avec paramètre nommé"""
        branch.add_node(["Person"], {"name": "Alice", "score": 50})
        branch.add_node(["Person"], {"name": "Bob", "score": 70})
        branch.add_node(["Person"], {"name": "Charlie", "score": 60})
        
        # WITH utilise un paramètre pour ajouter un bonus
        result = branch.query(
            "MATCH (p:Person) WITH p.score + $bonus AS total WHERE total > 65 RETURN total",
            {"bonus": 10}
        )
        
        totals = [row[0] for row in result['rows']]
        assert set(totals) == {80, 70}, "Bob: 70+10=80, Charlie: 60+10=70"
    
    def test_with_complex_expression(self, branch):
        """Test WITH avec expression complexe"""
        branch.add_node(["Product"], {"price": 100, "tax_rate": 20})
        branch.add_node(["Product"], {"price": 50, "tax_rate": 10})
        
        # WITH calcule (price * (1 + tax_rate / 100))
        # Note: Il faudrait des parenthèses pour la précédence correcte
        # Pour l'instant on teste: price + price * tax_rate / 100
        result = branch.query(
            "MATCH (p:Product) WITH p.price + p.price * p.tax_rate / 100 AS total_price RETURN total_price"
        )
        
        total_prices = [row[0] for row in result['rows']]
        # 100 + 100*20/100 = 100 + 20 = 120
        # 50 + 50*10/100 = 50 + 5 = 55
        assert set(total_prices) == {120, 55}
    
    def test_with_and_return_different_fields(self, branch):
        """Test WITH transforme, puis RETURN sélectionne différemment"""
        branch.add_node(["Person"], {"name": "Alice", "age": 25})
        branch.add_node(["Person"], {"name": "Bob", "age": 30})
        
        # WITH crée 'age' alias, RETURN l'utilise
        result = branch.query(
            "MATCH (p:Person) WITH p.name AS name, p.age AS age WHERE age > 26 RETURN name"
        )
        
        names = [row[0] for row in result['rows']]
        assert names == ['Bob'], "Seulement Bob a age > 26"
    
    def test_with_preserves_columns(self, branch):
        """Test que WITH projette toutes les colonnes demandées"""
        branch.add_node(["Person"], {"name": "Alice", "age": 25, "city": "Paris"})
        
        result = branch.query(
            "MATCH (p:Person) WITH p.age AS age, p.name AS name, p.city AS city RETURN age, name, city"
        )
        
        # Toutes les colonnes doivent être présentes (l'ordre peut varier avec HashMap)
        assert set(result['columns']) == {'age', 'name', 'city'}
        assert len(result['rows']) == 1
        
        # Vérifier que les valeurs sont correctes
        row = result['rows'][0]
        age_idx = result['columns'].index('age')
        name_idx = result['columns'].index('name')
        city_idx = result['columns'].index('city')
        
        assert row[age_idx] == 25
        assert row[name_idx] == 'Alice'
        assert row[city_idx] == 'Paris'


class TestGQLWithClauseAdvanced:
    """Tests avancés WITH + autres clauses"""
    
    def test_with_and_order_by(self, branch):
        """Test WITH suivi de ORDER BY"""
        branch.add_node(["Person"], {"name": "Alice", "age": 25})
        branch.add_node(["Person"], {"name": "Bob", "age": 30})
        branch.add_node(["Person"], {"name": "Charlie", "age": 28})
        
        result = branch.query(
            "MATCH (p:Person) WITH p.age AS age RETURN age ORDER BY age DESC"
        )
        
        ages = [row[0] for row in result['rows']]
        assert ages == [30, 28, 25], "Doit être trié DESC"
    
    def test_with_and_limit(self, branch):
        """Test WITH suivi de LIMIT"""
        for i in range(5):
            branch.add_node(["Person"], {"name": f"Person{i}", "age": 20 + i})
        
        result = branch.query(
            "MATCH (p:Person) WITH p.age AS age RETURN age LIMIT 3"
        )
        
        assert len(result['rows']) == 3
