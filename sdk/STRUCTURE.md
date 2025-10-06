# Structure du SDK Casys

## 📁 Organisation

```
sdk/
├── python/                      # SDK Python (package principal)
│   ├── python/casys_db/        # Code source Python
│   │   ├── __init__.py
│   │   ├── orm.py              # ORM Entity Framework-style
│   │   ├── session.py          # Session management
│   │   ├── query.py            # Query builder
│   │   ├── py.typed            # Marker PEP 561 (type hints)
│   │   └── casys_engine.pyi    # Type stubs pour module natif
│   ├── src/                    # Bindings Rust (pyo3)
│   │   └── lib.rs
│   ├── examples/               # Notebooks Jupyter
│   ├── pyproject.toml          # Configuration package
│   ├── Cargo.toml              # Configuration Rust
│   ├── README.md               # Documentation SDK
│   └── IDE_SUPPORT.md          # Guide support IDE
│
├── vscode-extension/           # Extension VSCode officielle
│   ├── src/                    # Code TypeScript
│   │   └── extension.ts        # Semantic highlighting + hover
│   ├── syntaxes/               # Grammaire TextMate
│   │   └── casys-python.tmLanguage.json
│   ├── snippets/               # Code snippets
│   │   └── casys.json
│   ├── themes/                 # Thème de couleurs
│   │   └── casys-color-theme.json
│   ├── docs/                   # Documentation
│   │   ├── VSCODE_SETUP.md     # Guide d'installation
│   │   └── DEVTOOLS.md         # Vue d'ensemble outils
│   ├── package.json            # Manifest extension
│   ├── tsconfig.json           # Config TypeScript
│   └── README.md               # Documentation extension
│
└── STRUCTURE.md                # Ce fichier
```

## 🎯 Séparation des Responsabilités

### SDK Python (`python/`)
**Responsabilité**: Package Python installable via pip/maturin

**Contient**:
- ✅ Code Python (ORM, Session, QueryBuilder)
- ✅ Bindings Rust (pyo3)
- ✅ Type stubs (`.pyi`) pour autocomplétion
- ✅ Exemples et documentation

**Installation**:
```bash
cd sdk/python
pip install -e .
```

### Extension VSCode (`vscode-extension/`)
**Responsabilité**: Améliorer l'expérience de développement dans VSCode

**Contient**:
- ✅ Coloration syntaxique (TextMate grammar)
- ✅ Semantic highlighting (TypeScript)
- ✅ Snippets de code
- ✅ Thème de couleurs personnalisé
- ✅ Documentation d'installation

**Installation**:
```bash
cd sdk/vscode-extension
npm install
npm run compile
npm run package
code --install-extension casys-vscode-0.1.0.vsix
```

## 📦 Workflow de Distribution

### SDK Python
1. Développer dans `python/`
2. Builder avec `maturin build --release`
3. Publier sur PyPI: `maturin publish`
4. Installer: `pip install casys-db`

### Extension VSCode
1. Développer dans `vscode-extension/`
2. Compiler avec `npm run compile`
3. Packager avec `npm run package`
4. Publier sur VSCode Marketplace: `vsce publish`
5. Installer: Depuis le Marketplace ou `code --install-extension casys-vscode-X.X.X.vsix`

## 🔗 Dépendances

```
Extension VSCode
    ↓ (utilise)
Type Stubs (.pyi)
    ↓ (inclus dans)
SDK Python
    ↓ (bindings)
Moteur Rust (../engine/)
```

**Important**: L'extension VSCode **ne dépend pas** du SDK Python installé. Elle fonctionne avec n'importe quelle version du SDK qui a les type stubs.

## 🚀 Pour les Développeurs

### Développer le SDK Python
```bash
cd sdk/python
source venv/bin/activate
maturin develop --release
pytest
```

### Développer l'Extension VSCode
```bash
cd sdk/vscode-extension
npm install
npm run compile
# Puis F5 dans VSCode pour debug
```

### Tester l'Intégration
1. Installer le SDK Python: `cd sdk/python && pip install -e .`
2. Installer l'extension: `cd sdk/vscode-extension && code --install-extension casys-vscode-0.1.0.vsix`
3. Ouvrir `sdk/python/test_ide_features.py`
4. Vérifier coloration + autocomplétion

## 📝 Notes

- Les **type stubs** (`.pyi`) sont dans le SDK Python car ils sont nécessaires pour Pylance/Pyright
- Les **snippets** sont dans l'extension VSCode car ils sont spécifiques à l'éditeur
- La **documentation** est dupliquée entre les deux pour faciliter la découverte
