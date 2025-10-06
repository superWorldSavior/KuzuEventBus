# Casys VSCode Extension

Extension VSCode officielle pour le SDK Python Casys - Support complet pour le développement avec Casys graph database.

## ✨ Fonctionnalités

### 🎨 Coloration Syntaxique
- **Classes Casys** colorées en **bleu/vert gras**: `CasysEngine`, `NodeEntity`, `HasMany`, `HasOne`
- **Méthodes Casys** colorées en **jaune italique**: `open_branch`, `query`, `add_node`, `add_edge`
- **Mots-clés GQL** colorés dans les strings: `MATCH`, `WHERE`, `RETURN`, `ORDER BY`

### 📝 Snippets
- `casys-entity` → Créer une classe NodeEntity
- `casys-query` → Requête ORM complète
- `casys-gql` → Requête GQL brute
- `casys-session` → Initialiser engine + session
- Et 4 autres snippets...

### 💡 IntelliSense Amélioré
- Documentation hover enrichie pour toutes les classes/méthodes
- Autocomplétion intelligente (nécessite les type stubs du SDK)
- Détection d'erreurs en temps réel

## 📦 Installation

### Option 1: Depuis le fichier VSIX
```bash
cd sdk/vscode-extension
npm install
npm run compile
npm run package
code --install-extension casys-vscode-0.1.0.vsix
```

### Option 2: Mode développement
```bash
cd sdk/vscode-extension
npm install
npm run compile
# Puis F5 dans VSCode pour lancer en mode debug
```

## 🚀 Utilisation

1. **Installer l'extension** (voir ci-dessus)
2. **Activer le thème** (optionnel): `Cmd/Ctrl+K Cmd/Ctrl+T` → "Casys SDK Colors"
3. **Ouvrir un fichier Python** avec du code Casys
4. **Profiter** de la coloration et des snippets!

### Exemple

```python
from casys_db import CasysEngine, NodeEntity, HasMany

# CasysEngine, NodeEntity, HasMany sont colorés en bleu/vert gras
class Person(NodeEntity):
    labels = ["Person"]
    friends = HasMany("Person", via="KNOWS")

engine = CasysEngine("/tmp/test")
# open_branch est coloré en jaune italique
branch = engine.open_branch("db", "main")

# query est coloré en jaune italique
# MATCH, WHERE, RETURN sont colorés en violet gras
result = branch.query("""
    MATCH (p:Person)
    WHERE p.age > 18
    RETURN p.name
""")
```

## ⚙️ Configuration

### Activer/Désactiver le Semantic Highlighting

Dans `settings.json`:
```json
{
  "casys.enableSemanticHighlighting": true
}
```

### Utiliser le Thème Casys

1. `Cmd/Ctrl+K Cmd/Ctrl+T`
2. Sélectionner "Casys SDK Colors"

Ou dans `settings.json`:
```json
{
  "workbench.colorTheme": "Casys SDK Colors"
}
```

## 🎨 Couleurs Personnalisées

Les couleurs par défaut:
- **Classes Casys**: `#4EC9B0` (cyan) - gras
- **Méthodes Casys**: `#DCDCAA` (jaune) - italique
- **Mots-clés GQL**: `#C586C0` (violet) - gras

Pour personnaliser, ajoutez dans `settings.json`:
```json
{
  "editor.tokenColorCustomizations": {
    "[Casys SDK Colors]": {
      "textMateRules": [
        {
          "scope": "support.class.casys",
          "settings": {
            "foreground": "#FF0000"
          }
        }
      ]
    }
  }
}
```

## 📚 Documentation

- [Guide d'installation complet](./docs/VSCODE_SETUP.md)
- [Outils de développement](./docs/DEVTOOLS.md)
- [Documentation SDK Python](../python/README.md)
- [Exemples SDK](../python/examples/)

## 🐛 Problèmes Connus

- L'autocomplétion nécessite les type stubs du SDK Python installés
- Le semantic highlighting peut être lent sur de très gros fichiers

## 🤝 Contribution

Contributions bienvenues! Voir le repo principal.

## 📄 Licence

MIT OR Apache-2.0
