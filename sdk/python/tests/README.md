# Tests du SDK Python Casys

Tests automatisés pour valider les fonctionnalités du SDK Python.

## Structure

```
tests/
├── conftest.py                                      # Fixtures pytest communes
├── test_gql_basic_queries_match_where_orderby.py   # Tests GQL basiques (MATCH/WHERE/ORDER BY/LIMIT)
└── test_gql_variable_length_paths_iso_syntax.py    # Tests chemins variable-length ISO GQL (*N, *N..M, etc.)
```

## Exécuter les tests

### Tous les tests
```bash
cd sdk/python
source venv/bin/activate
pytest tests/ -v
```

### Tests spécifiques
```bash
# Tests GQL basiques uniquement
pytest tests/test_gql_basic_queries_match_where_orderby.py -v

# Tests variable-length uniquement
pytest tests/test_gql_variable_length_paths_iso_syntax.py -v

# Un test spécifique
pytest tests/test_gql_variable_length_paths_iso_syntax.py::TestVariableLengthPaths::test_exact_depth -v
```

### Avec couverture
```bash
pytest tests/ --cov=casys_db --cov-report=html
# Ouvrir htmlcov/index.html dans un navigateur
```

## Conventions de nommage

Les fichiers de tests suivent cette convention:
- `test_<domaine>_<fonctionnalite>_<details>.py`

Exemples:
- `test_gql_basic_queries_match_where_orderby.py` - Tests GQL basiques avec MATCH, WHERE, ORDER BY
- `test_gql_variable_length_paths_iso_syntax.py` - Tests de la syntaxe ISO GQL pour variable-length paths
- `test_orm_query_builder_linq_style.py` - Tests du QueryBuilder ORM (à venir)
- `test_orm_relationships_lazy_loading.py` - Tests des relations ORM (à venir)

## Fixtures disponibles

Définies dans `conftest.py`:

- `temp_dir`: Répertoire temporaire nettoyé après le test
- `engine`: Instance `CasysEngine` dans un répertoire temporaire
- `branch`: Base `testdb` + branche `main` prête à l'emploi
- `social_graph`: Graphe de test pré-rempli (Alice → Bob → Charlie → David)

## Ajouter de nouveaux tests

1. Créer un fichier `test_<domaine>_<fonctionnalite>_<details>.py`
2. Utiliser les fixtures de `conftest.py`
3. Documenter chaque test avec une docstring claire
4. Tester localement: `pytest tests/test_<fichier>.py -v`

Exemple:
```python
"""
Tests pour [fonctionnalité]
"""

class TestMaFonctionnalite:
    """Description de la fonctionnalité testée."""
    
    def test_cas_nominal(self, branch):
        """Test le cas nominal avec [condition]"""
        # Given
        node_id = branch.add_node(["Label"], {"prop": "value"})
        
        # When
        result = branch.query("MATCH (n:Label) RETURN n.prop")
        
        # Then
        assert result['rows'][0][0] == "value"
```

## CI/CD

Les tests sont exécutés automatiquement sur:
- Chaque PR vers `main`
- Chaque commit sur `main`
- Tags de release

Configuration: `.github/workflows/sdk-python-tests.yml` (à créer)
