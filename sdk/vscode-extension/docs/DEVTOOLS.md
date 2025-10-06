# Outils de Développement Casys SDK

## 📦 Fichiers Embarqués dans le SDK

Le SDK Casys inclut plusieurs fichiers pour améliorer l'expérience de développement:

### 1. **Type Stubs** (Autocomplétion)

```
python/casys_db/
├── py.typed                # Marque le package comme typé
└── casys_engine.pyi        # Définitions de types pour le module natif
```

**Bénéfices:**
- ✅ Autocomplétion complète dans VSCode/PyCharm
- ✅ Type checking avec Pylance/Pyright/MyPy
- ✅ Documentation inline (hover)
- ✅ Détection d'erreurs avant l'exécution

**Exemple:**
```python
from casys_db import CasysEngine

engine = CasysEngine("/tmp/data")
# Tapez 'engine.' → VSCode affiche:
#   - open_database(name: str) -> str
#   - open_branch(db_name: str, branch_name: str) -> CasysBranch
#   - create_branch(db_name: str, branch_name: str) -> None
```

### 2. **Docstrings Améliorées** (IntelliSense)

Toutes les classes ORM ont des docstrings détaillées avec exemples:

```python
from casys_db import NodeEntity, HasMany

# Hover sur NodeEntity → affiche la doc complète
class Person(NodeEntity):
    labels = ["Person"]
    friends = HasMany("Person", via="KNOWS")
```

### 3. **Snippets VSCode** (Productivité)

Fichier: `.vscode-snippets.json`

**Installation:**
```bash
# Global (tous les projets Python)
cp .vscode-snippets.json ~/.config/Code/User/snippets/casys.code-snippets

# Workspace (ce projet uniquement)
mkdir -p .vscode
cp .vscode-snippets.json .vscode/casys.code-snippets
```

**Snippets disponibles:**

| Prefix | Description |
|--------|-------------|
| `casys-entity` | Créer une classe NodeEntity |
| `casys-hasmany` | Relation HasMany |
| `casys-hasone` | Relation HasOne |
| `casys-query` | Requête ORM complète |
| `casys-session` | Initialiser engine + session |
| `casys-gql` | Requête GQL brute |
| `casys-add-node` | Ajouter un nœud (low-level) |
| `casys-add-edge` | Ajouter une edge (low-level) |

**Usage:**
1. Tapez `casys-` puis `Ctrl+Space`
2. Sélectionnez le snippet
3. `Tab` pour naviguer entre les placeholders

## 🎨 Configuration VSCode Recommandée

### Extension Neo4j (Syntax Highlighting GQL)

```bash
code --install-extension neo4j.neo4j-vscode-extension
```

Puis dans votre code Python:

```python
# gql: language=cypher
query = """
MATCH (p:Person {name: 'Alice'})
WHERE p.age > 18
RETURN p.name, p.age
ORDER BY p.age DESC
"""
```

### Settings VSCode

`.vscode/settings.json`:
```json
{
  "python.analysis.typeCheckingMode": "basic",
  "python.languageServer": "Pylance",
  "editor.formatOnSave": true,
  "files.associations": {
    "*.gql": "cypher"
  }
}
```

## 🧪 Vérifier l'Installation

```python
from casys_db import CasysEngine, NodeEntity, HasMany, Session

# Test 1: Autocomplétion
engine = CasysEngine("/tmp/test")
# Tapez 'engine.' → devrait afficher les méthodes

# Test 2: Type hints
branch = engine.open_branch("db", "main")
# Hover sur 'open_branch' → devrait afficher la signature

# Test 3: Documentation
class Person(NodeEntity):
    pass
# Hover sur 'NodeEntity' → devrait afficher la doc
```

## 📚 Fichiers de Documentation

- **`VSCODE_SETUP.md`** - Guide complet d'installation VSCode
- **`DEVTOOLS.md`** (ce fichier) - Vue d'ensemble des outils
- **`.vscode-snippets.json`** - Snippets pour VSCode
- **`python/casys_db/casys_engine.pyi`** - Type stubs (auto-installé)

## 🔧 Développement

### Rebuilder avec les nouveaux types

```bash
cd sdk/python
source venv/bin/activate
maturin develop --release
```

### Vérifier que les types sont installés

```bash
python3 -c "
import casys_db
import os
pkg = casys_db.__file__.rsplit('/', 1)[0]
print('py.typed:', os.path.exists(f'{pkg}/py.typed'))
print('casys_engine.pyi:', os.path.exists(f'{pkg}/casys_engine.pyi'))
"
```

### Tester l'autocomplétion

Ouvrez VSCode, créez un fichier Python et testez:

```python
from casys_db import CasysEngine

engine = CasysEngine("/tmp/test")
engine.  # ← Tapez le point et attendez l'autocomplétion
```

## 🎯 Résumé

**Embarqué dans le SDK:**
- ✅ Type stubs (`.pyi`) pour autocomplétion
- ✅ `py.typed` pour type checking
- ✅ Docstrings détaillées avec exemples
- ✅ Support ORM complet (NodeEntity, HasMany, HasOne)

**Fichiers optionnels (à installer manuellement):**
- 📄 `.vscode-snippets.json` - Snippets VSCode
- 📄 `VSCODE_SETUP.md` - Guide d'installation

**Extensions VSCode recommandées:**
- 🔌 Neo4j (syntax highlighting GQL)
- 🔌 Pylance (type checking Python)

---

**Prochaines étapes:**
1. Installer les snippets VSCode (voir `VSCODE_SETUP.md`)
2. Installer l'extension Neo4j pour GQL highlighting
3. Tester l'autocomplétion dans votre IDE
