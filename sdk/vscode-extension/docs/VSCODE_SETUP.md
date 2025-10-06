# VSCode Setup for Casys SDK

This guide helps you set up VSCode for optimal development experience with the Casys Python SDK.

## 🎯 Features Included

- ✅ **Type hints** for autocompletion (`.pyi` stubs)
- ✅ **IntelliSense** with detailed docstrings
- ✅ **Code snippets** for common patterns
- ✅ **GQL syntax highlighting** (optional)

## 📦 1. Type Stubs (Already Included)

The SDK includes type stubs for the native `casys_engine` module:

- `python/casys_db/py.typed` - Marks the package as typed
- `python/casys_db/casys_engine.pyi` - Type definitions for native bindings

These are automatically installed with the package and provide:
- Autocompletion for `CasysEngine` and `CasysBranch`
- Parameter hints and return types
- Inline documentation in your IDE

## 🎨 2. Code Snippets

### Installation

Copy the snippets to your VSCode user snippets:

**Option A: Global snippets (all Python projects)**
```bash
# Linux/Mac
cp .vscode-snippets.json ~/.config/Code/User/snippets/casys.code-snippets

# Windows
copy .vscode-snippets.json %APPDATA%\Code\User\snippets\casys.code-snippets
```

**Option B: Workspace snippets (this project only)**
```bash
mkdir -p .vscode
cp .vscode-snippets.json .vscode/casys.code-snippets
```

### Available Snippets

| Prefix | Description | Example |
|--------|-------------|---------|
| `casys-entity` | Create a NodeEntity class | `class Person(NodeEntity): ...` |
| `casys-hasmany` | Define HasMany relation | `friends = HasMany("Person", via="KNOWS")` |
| `casys-hasone` | Define HasOne relation | `city = HasOne("City", via="LIVES_IN")` |
| `casys-query` | ORM query with filters | `session.query(Person).where(...).all()` |
| `casys-session` | Initialize engine and session | `engine = CasysEngine(...)` |
| `casys-gql` | Raw GQL query | `branch.query("MATCH (n) RETURN n")` |
| `casys-add-node` | Add node (low-level) | `branch.add_node(["Label"], {...})` |
| `casys-add-edge` | Add edge (low-level) | `branch.add_edge(from_id, to_id, ...)` |

### Usage

1. Start typing the prefix (e.g., `casys-entity`)
2. Press `Tab` or `Enter` to expand
3. Use `Tab` to jump between placeholders

## 🌈 3. GQL Syntax Highlighting (Optional)

### Option A: Neo4j Cypher Extension (Recommended)

Install the Neo4j extension for Cypher syntax highlighting (very similar to ISO GQL):

```bash
code --install-extension neo4j.neo4j-vscode-extension
```

Then use language hints in your Python code:

```python
# gql: language=cypher
query = """
MATCH (p:Person {name: 'Alice'})
WHERE p.age > 18
RETURN p.name, p.age
ORDER BY p.age DESC
"""
```

### Option B: GraphQL Extension

```bash
code --install-extension GraphQL.vscode-graphql
```

Use `# gql: language=graphql` for basic syntax highlighting.

## ⚙️ 4. Recommended VSCode Settings

Add to your `.vscode/settings.json`:

```json
{
  // Python
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  
  // Pylance
  "python.languageServer": "Pylance",
  
  // Format on save
  "editor.formatOnSave": true,
  "python.formatting.provider": "black",
  
  // IntelliSense
  "editor.quickSuggestions": {
    "strings": true
  },
  "editor.suggest.showWords": false,
  
  // File associations
  "files.associations": {
    "*.gql": "cypher"
  }
}
```

## 🔍 5. Verify Setup

Test autocompletion in a Python file:

```python
from casys_db import CasysEngine, NodeEntity, HasMany, Session

# Type 'engine.' and you should see:
# - open_database()
# - open_branch()
# - create_branch()
engine = CasysEngine("/tmp/test")

# Type 'branch.' and you should see:
# - query()
# - add_node()
# - add_edge()
# - flush()
# - load()
branch = engine.open_branch("db", "main")

# Type 'casys-' and press Ctrl+Space to see all snippets
```

## 📚 6. Documentation Access

Hover over any method to see inline documentation:

```python
# Hover over 'query' to see:
# - Parameter types
# - Return type
# - Usage examples
result = branch.query("MATCH (n) RETURN n")
```

## 🐛 Troubleshooting

### Autocompletion not working?

1. **Restart Pylance**: `Cmd/Ctrl+Shift+P` → "Pylance: Restart Server"
2. **Check Python interpreter**: Make sure you're using the venv with casys-db installed
3. **Verify installation**: `pip show casys-db` should show version 0.1.0

### Snippets not appearing?

1. Check snippet file location
2. Restart VSCode
3. Try `Ctrl+Space` to manually trigger suggestions

### Type hints missing?

1. Ensure `py.typed` exists in `site-packages/casys_db/`
2. Check `casys_engine.pyi` exists in the same directory
3. Reinstall: `pip install -e . --force-reinstall`

## 🚀 Next Steps

- Explore the [examples](./examples/) directory
- Read the [API documentation](./README.md)
- Check out [ORM patterns](./python/casys_db/orm.py)

---

**Need help?** Open an issue on GitHub or check the documentation.
