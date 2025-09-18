# Kuzu Infrastructure

Adaptateurs pour l'intégration avec la **base de données Kuzu**.

## 📂 Structure Actuelle

```
kuzu/
├── __init__.py
└── simple_adapter.py          # Adaptateur basique Kuzu
```

## 🎯 Responsabilité

**Implémente les interfaces** pour interagir avec Kuzu Database :
- Connexion à Kuzu
- Exécution de requêtes Cypher
- Gestion des bases de données par tenant

## 📋 Implémentation Actuelle

### `simple_adapter.py` - SimpleKuzuAdapter

**État actuel :** Adaptateur minimal préparé pour l'intégration Kuzu

```python
# Structure basique attendue :
class SimpleKuzuAdapter:
    def __init__(self, database_path: str):
        # Initialisation connexion Kuzu
        
    def execute_query(self, cypher_query: str, parameters: dict):
        # Exécution requête Cypher
        
    def create_database(self, tenant_name: str):
        # Création base tenant-specific
```

**Intégration avec :**
- Port `IDatabaseEngine` du domain
- Port `IQueryExecutor` pour les requêtes
- Configuration des chemins de base par tenant

## 🔧 Configuration

**Gestion des bases par tenant :**
```
databases/
├── tenant-a/           # Base isolée pour tenant A
├── tenant-b/           # Base isolée pour tenant B
└── shared/             # Données partagées (si nécessaire)
```

**Isolation :** Chaque tenant a sa propre base Kuzu physiquement séparée.

## 📦 Dépendances

**Kuzu Python SDK :**
```python
# requirements.txt
kuzu>=0.1.0  # Version SDK Python officielle
```

**Installation :**
```bash
pip install kuzu
```

## 🧪 Tests

**Tests d'intégration attendus :**
- Connexion à Kuzu
- Création/suppression de bases
- Exécution de requêtes simples
- Isolation entre tenants

## 🔄 Évolution

**Phase actuelle :** Adaptateur simple pour POC

**Évolutions futures :**
- Pool de connexions
- Optimisation des requêtes
- Monitoring des performances
- Backup/restore par tenant

---

**Rôle :** Pont technique entre l'application et la base de données Kuzu, avec isolation par tenant.