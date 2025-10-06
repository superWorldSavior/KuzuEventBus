# Installation de l'Extension Casys VSCode

## 📦 Fichier Généré

✅ **`casys-vscode-0.1.0.vsix`** - Extension packagée prête à installer

## 🚀 Installation

### Méthode 1: Ligne de Commande (Recommandé)

```bash
# Depuis le dossier vscode-extension/
code --install-extension casys-vscode-0.1.0.vsix
```

### Méthode 2: Interface VSCode

1. Ouvrir VSCode
2. `Cmd/Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Sélectionner `casys-vscode-0.1.0.vsix`
4. Recharger VSCode

### Méthode 3: Drag & Drop

1. Ouvrir VSCode
2. Aller dans l'onglet Extensions (`Cmd/Ctrl+Shift+X`)
3. Glisser-déposer `casys-vscode-0.1.0.vsix` dans la fenêtre

## ✅ Vérification

Après installation:

1. **Ouvrir** `../python/test_ide_features.py`
2. **Vérifier** que:
   - `CasysEngine`, `NodeEntity`, `HasMany` sont colorés en **cyan gras**
   - `open_branch`, `query`, `add_node` sont colorés en **jaune italique**
   - Les snippets fonctionnent: tapez `casys-` puis `Ctrl+Space`

## 🎨 Activer le Thème (Optionnel)

Pour utiliser le thème de couleurs optimisé:

1. `Cmd/Ctrl+K Cmd/Ctrl+T`
2. Sélectionner **"Casys SDK Colors"**

Ou dans `settings.json`:
```json
{
  "workbench.colorTheme": "Casys SDK Colors"
}
```

## 🔧 Désinstallation

```bash
code --uninstall-extension casys.casys-vscode
```

Ou via l'interface VSCode: Extensions → Casys Python SDK → Désinstaller

## 🐛 Problèmes

### Extension non visible?
- Recharger VSCode: `Cmd/Ctrl+Shift+P` → "Developer: Reload Window"

### Coloration ne fonctionne pas?
- Vérifier que l'extension est activée: Extensions → Casys Python SDK → Enabled
- Vérifier le langage du fichier: Python (en bas à droite de VSCode)

### Snippets ne s'affichent pas?
- Vérifier que vous êtes dans un fichier `.py`
- Essayer `Ctrl+Space` pour forcer l'autocomplétion

## 📚 Documentation

- [README Extension](./README.md)
- [Guide Complet](./docs/VSCODE_SETUP.md)
- [Outils de Développement](./docs/DEVTOOLS.md)
