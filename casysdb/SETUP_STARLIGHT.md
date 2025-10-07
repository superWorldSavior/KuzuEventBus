# Setup Starlight - Instructions

## 1. Installer les dépendances

```bash
cd casysdb
pnpm install
```

Cela va installer `@astrojs/starlight@^0.31.4` ajouté au package.json.

## 2. Lancer le dev server

```bash
## 3. Accéder aux pages

- **Landing page** (existante): http://localhost:4322/
- **Documentation Starlight**: http://localhost:4322/docs/

> **Note**: Le port 4322 évite les conflits avec d'autres apps Astro du projet.

## 4. Structure créée

```
src/
{{ ... }}
│   └── docs/
│       ├── index.mdx                    # Homepage docs (splash page)
│       ├── getting-started/
│       │   ├── installation.md
│       │   └── quickstart.md
│       ├── gql/
│       │   └── basics.md
│       └── sdk/
│           └── python/
│               └── basics.md (à créer)
└── styles/
    └── starlight.css                     # Theme Starlight avec vos couleurs Cassis
```

## 5. Prochains fichiers à créer

### Documentation Python SDK
- `src/content/docs/sdk/python/basics.md`
- `src/content/docs/sdk/python/orm.md`
- `src/content/docs/sdk/python/advanced.md`

### Documentation TypeScript SDK
- `src/content/docs/sdk/typescript/basics.md`
- `src/content/docs/sdk/typescript/api.md`

### Exemples
- `src/content/docs/examples/social-network.md`
- `src/content/docs/examples/knowledge-graph.md`

### GQL avancé
- `src/content/docs/gql/transactions.md`
- `src/content/docs/gql/patterns.md`
- `src/content/docs/gql/functions.md`

## 6. Couleurs utilisées

Starlight utilise maintenant vos variables CSS existantes :
- **Accent**: `--acc` (#5B2E7E violet Cassis)
- **Accent strong**: `--acc-strong` (#6C3A94)
- **Accent soft**: `--acc-soft` (#F5EFFA)
- **Text**: `--ink` (#0F172A)
- **Muted**: `--muted` (#64748B)
- **Borders**: `--border`, `--border-strong`

## 7. Navigation

La sidebar Starlight est configurée pour auto-générer la navigation depuis la structure des fichiers dans `src/content/docs/`.

Ajoutez simplement des fichiers `.md` ou `.mdx` dans les dossiers appropriés et ils apparaîtront automatiquement dans la sidebar.

## 8. Personnalisation

Pour modifier la config Starlight, éditer `astro.config.mjs` section `starlight({...})`.

Documentation officielle : https://starlight.astro.build/
