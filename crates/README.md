# Crates Casys — Architecture proposée

Objectif: clarifier la séparation des responsabilités entre cœur du moteur, adaptateurs de stockage et wrappers FFI, tout en préparant l’extension multi-SDK (Python/TypeScript) et des binaires optionnels (CLI/HTTP).

## 1) État actuel (workspace)

- Workspace (`Cargo.toml` racine):
  - `engine/` (crate `casys`) — contient des deps serveur (Axum/Tokio)
  - `crates/casys_core/`
  - `crates/casys_engine/`
  - `crates/casys_ffi/` (FFI actuel)
  - `crates/casys_storage_mem/`
  - `crates/casys_storage_fs/`
- SDK Python (`sdk/python/`) pointe aujourd’hui vers `engine/` (crate `casys`).

Limitation: les wrappers FFI et le SDK Python dépendent du crate `engine/`, qui inclut des concerns HTTP/serveur. On souhaite isoler le moteur pur Rust et rendre les wrappers FFI minces et stables.

## 2) Cible (architecture « carrée »)

```
KuzuEventBus/
├── crates/
│   ├── casys_core/          # Domain pur: AST, types, erreurs, traits/ports, algos
│   ├── casys_storage_mem/   # Adapter stockage en mémoire (feature: mem)
│   ├── casys_storage_fs/    # Adapter stockage FS (feature: fs)
│   ├── casys_engine/        # Moteur pur Rust: parser, planner, executor, API publique
│   ├── casys_pyo3/          # Wrapper pyo3 (FFI Python) — cdylib, dépend de casys_engine
│   └── casys_napi/          # Wrapper napi-rs (SDK TS) — plus tard
├── apps/
│   ├── casys-cli/           # Binaire CLI (debug/maintenance)
│   └── casys-http/          # Service HTTP Axum (optionnel)
│   └── casysdb/             # Application web (à déplacer)
└── sdk/
    ├── python/              # Wheel maturin pointant sur crates/casys_pyo3
    └── typescript/          # NPM (plus tard) pointant sur crates/casys_napi
```

Notes:
- `crates/casys_ffi/` → renommage recommandé en `crates/casys_pyo3/` (wrapper Python explicite).
- `engine/` → déplacé vers `apps/casys-http/` (facultatif). Les apps dépendent de `casys_engine`.

## 3) Rôles et dépendances

- `casys_core`: invariants de domaine, structures, erreurs, traits; aucune dépendance FFI/HTTP.
- `casys_storage_mem` / `casys_storage_fs`: adaptateurs de stockage interchangeables.
- `casys_engine`: orchestre parser → planner → executor, expose l’API moteur pure Rust.
- `casys_pyo3` (ex-`casys_ffi`): couche FFI mince vers Python (pyo3/abi3), dépend de `casys_engine` uniquement.
- `casys_napi`: couche FFI pour TypeScript via `napi-rs` (plus tard), dépend de `casys_engine`.
- Apps (`casys-cli`, `casys-http`): binaire(s) consommant `casys_engine` + features de stockage.

### Graphe de dépendances (cible)

```
casys_core → casys_engine ← casys_storage_mem
                        └─ casys_storage_fs
casys_engine → casys_pyo3 → sdk/python
casys_engine → casys_napi → sdk/typescript
apps/* → casys_engine
```

## 4) Features & builds

- Features workspace proposées:
  - `default = ["mem"]`
  - `mem`: active `casys_storage_mem`
  - `fs`: active `casys_storage_fs`
- Wrappers FFI (Python): `pyo3` avec `abi3` (p.ex. `abi3-py38`) pour wheels compatibles.
- CI: matrice par crate et par feature, `cargo test` (workspace), `maturin build` (SDK Python), lint.

## 5) Plan minimal de migration (sans casser le build)

1. Re-câbler `crates/casys_engine` pour dépendre de `casys_core` + `casys_storage_*` (retirer lien vers `engine/`).
2. Faire dépendre `crates/casys_ffi` (bientôt `casys_pyo3`) de `casys_engine` (retirer lien vers `engine/`).
3. Pointer `sdk/python` vers `crates/casys_ffi` (ou `casys_pyo3` après renommage) dans `Cargo.toml`/`pyproject.toml`.
4. Optionnel: déplacer `engine/` sous `apps/casys-http/` et l’exclure des wrappers FFI/SDK.
5. Tests: `cargo test` (workspace), `maturin develop` (SDK Python), exécuter les tests existants Python/Rust.

## 6) Bonnes pratiques

- Moteur (`casys_engine`) sans dépendance pyo3/HTTP.
- Wrappers FFI minces et stables; versionnement semver aligné moteur/SDK.
- Stockage sélectionné par features (YAGNI: mémoire par défaut, FS optionnel).
- TDD: tests Rust (engine + storage) et tests SDK (Python) miroirs.

## 7) Statut

- Ce document décrit la cible et le chemin de migration. Aucune modification de code n’est effectuée ici.
- Voir la TODO du repo pour le suivi des étapes (re-câblage deps, renommage FFI, déplacement `engine/`, MAJ SDK Python).
