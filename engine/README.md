# Cassis (Rust) — ISO GQL Engine Skeleton

Ce dossier contient le squelette du futur moteur graphe (Rust) orienté ISO GQL, nommé Cassis, pensé pour s’intégrer proprement avec l’API FastAPI via un port/adaptateur, et pour porter nativement vos fonctionnalités clés: branches, snapshots (PITR), multi-tenant, et à terme GDS/Vector.

## Objectifs

- **ISO GQL (profil pragmatique)**: support d’un sous-ensemble utile (MATCH/WHERE/RETURN/LIMIT/ORDER BY, expansions bornées, filtres props). Extensible.
- **Branches/Snapshots en primitives**: copy‑on‑write (COW) sur segments/fichiers pour des branches quasi instantanées, PITR naturel, filiation explicite.
- **Multi-tenant isolé**: séparation stricte par base et branche (catalogue + métadonnées). Aligné avec l’UX actuelle (rails PROD/BRANCH).
- **Intégration hexagonale**: l’API Python ne dépend que d’un port `GraphStore`; bascule Kùzu ↔ moteur Rust par feature flag.

## Architecture (vue d’ensemble)

```
engine/
├── Cargo.toml
├── README.md
└── src/
   ├── lib.rs                 // Surface publique (Engine, types, traits)
   ├── main.rs                // Option service HTTP (facultatif)
   ├── api/                   // Handlers HTTP/gRPC (si mode service)
   │  └── mod.rs
   ├── exec/                  // ISO GQL: parser → AST → plan → exécution (itérateurs)
   │  ├── mod.rs
   │  ├── ast.rs
   │  ├── parser.rs
   │  ├── planner.rs
   │  └── executor.rs
   ├── storage/               // Segments, WAL, manifestes, GC
   │  ├── mod.rs
   │  ├── wal.rs
   │  ├── segments.rs
   │  ├── manifest.rs
   │  ├── catalog.rs          // bases/branches, ouverture/checkout
   │  └── gc.rs
   ├── index/                 // Index labels/props, adjacency (out/in)
   │  ├── mod.rs
   │  ├── label_index.rs
   │  ├── property_index.rs
   │  └── adjacency.rs
   ├── txn/                   // Concurrence SW-MR, verrous, CAS manifest, IDs de tx
   │  └── mod.rs
   ├── types/                 // IDs, errors, Timestamp, BranchName, etc.
   │  └── mod.rs
   ├── util/                  // fs atomique (rename), checksum, path utils
   │  └── mod.rs
   ├── gds/                   // Plus tard: PageRank, CC, Louvain…
   │  └── mod.rs
   └── ann/                   // Plus tard: HNSW, vecteur
      └── mod.rs
```
Règles de dépendances internes:

- exec/ (moteur de requêtes) ne connaît pas HTTP. Il s’appuie sur storage/, index/, txn/, types/.
- storage/ ne dépend pas de exec/.
- api/ est une mince façade qui appelle lib.rs/Engine.
- gds/ et ann/ s’adossent à storage/ et index/ via interfaces.


- **Stockage**: segments immuables + WAL; readers par snapshots; single‑writer au départ (simple et robuste). Branches = nouvelles vues du catalogue qui partagent les segments (COW), deltas par branche.
- **Exécution**: itérateurs paresseux, heuristiques simples (utilisation d’index si dispo). Optimiseur coûté plus tard.
- **Index**: labels, propriétés (sélectivité), adjacency (out/in). ANN (HNSW) ultérieurement pour vectoriel.

## Endpoints (squelette actuel)

- `GET /health` → `{"status":"ok"}`
- `GET /` → métadonnées service/version
- `POST /gql` → 501 (placeholder ISO GQL)

Fichier d’entrée: `engine/src/main.rs`.

## Modes d’exploitation

- **Embarqué (par défaut recommandé)**
  - L’engine est utilisé comme librairie Rust (pyo3/FFI côté Python) ou binaire local.
  - Stockage « style fichiers » dans un répertoire (segments immuables + WAL + manifestes).
  - Latence minimale, aucune dépendance externe requise.

- **Service réseau (optionnel)**
  - Même moteur, exposé en HTTP/gRPC avec les mêmes endpoints (`/health`, `/gql`, etc.).
  - Utile pour démo, multi‑langage ou isolation process. Docker est possible mais non requis.

## Intégration Backend (hexagone)

- Ajouter un port côté Python: `src/domain/shared/ports/graph_store.py` (contrat minimal: exécuter requêtes, gérer branches/snapshots).
- Implémenter un adaptateur:
  - Embarqué: `RustGraphStoreAdapter` via pyo3 (latence la plus basse).
  - Ou HTTP/gRPC: `RustGraphStoreHttpAdapter` vers un `ENGINE_ENDPOINT` si vous choisissez le mode service.
  
Variables d’environnement (si mode service) à prévoir côté API:
  - `GRAPH_ENGINE=kuzu|rust`
  - `ENGINE_ENDPOINT=http://localhost:9400`

## ISO GQL — Profil MVP visé

- Clauses: `MATCH`, `WHERE`, `RETURN`, `LIMIT`, `ORDER BY`.
- Patterns: expansions bornées (1..K), filtres sur propriétés et labels.
- Exécution: scans label/prop (index seek si possible), adjacency expand, filtres, projection, tri/limite.
- Extensions ultérieures: agrégats, shortest path borné, procédures utilitaires.

## Branches, Snapshots, PITR

- **Branches**: entrées de catalogue qui référencent les mêmes segments (COW). Création quasi instantanée.
- **Snapshots/PITR**: lecture au timestamp d’ancrage; journaux/deltas horodatés → vue cohérente.
- **Merge**: op de catalogue/segments (à définir) + événements SSE pour le frontend.

Avantage: vos écrans (`PitrTimeline.tsx`) mappent 1:1 à l’état interne du moteur (rails PROD/BRANCH, HEAD/LAST, actions).

## Vectoriel (ANN) — plus tard

- Propriété d’embedding sur nœuds/relations (`float32[n]`), dimension fixée par dataset.
- Index ANN (HNSW) par label/prop; fonctions `cosine_similarity`, `cosine_distance` utilisables en `WHERE`/`ORDER BY`.
- Base+delta par branche → compactions périodiques pour fusionner.

## Graph Data Science (GDS) — plus tard

- Algorithmes batch sur snapshot: PageRank, Connected Components, Louvain, shortest paths bornés.
- Résultats écrits en propriétés (ex: `n.pagerank`) dans une branche dédiée; provenance (snapshot-id) conservée.

## Démarrage local (sans Docker)

- Lancer le serveur local (mode service facultatif):

```bash
cargo run -p cassis

curl http://localhost:9400/health
# => {"status":"ok"}
```

- Utilisation embarquée: exposition de fonctions Rust via pyo3 (bindings Python) – à ajouter. L’API appellera directement la librairie, sans réseau.

> Docker reste possible plus tard (un `Dockerfile` est fourni), mais n’est pas nécessaire pour développer/tester.

## Stockage « style fichiers » (layout proposé)

Arborescence exemple (par tenant/base/branche):

```
data/
  {tenant}/
    {db}/
      segments/
        {sha256_prefix}/{sha256}.seg
      branches/
        main/
          wal/wal-{epoch}-{seq}.wal
          manifest-{ts}.json
        feature-x/
          wal/wal-{epoch}-{seq}.wal
          manifest-{ts}.json
```

## Concurrence (MVP SW‑MR)

- **Single‑Writer / Multi‑Reader (SW‑MR)**
  - Un seul écrivain actif par base/branche; lecteurs illimités lisant des snapshots immuables (manifestes versionnés).
  - Objectif: lectures non bloquantes, écriture prédictible, simplicité et robustesse.

- **Isolation: Snapshot Isolation**
  - Chaque requête lit un manifest cohérent à t0. Pas de dirty reads, pas de non‑repeatable au sein du même snapshot.
  - Anomalie possible: write‑skew (classique SI) → atténuable par validations/contrasintes applicatives au commit si besoin.

- **Lecteurs**
  - Ouvrent un `Arc<Manifest>` pour toute la durée de la requête.
  - Zéro blocage: l’écrivain ajoute de nouveaux segments et publie un nouveau manifest; les anciens restent lisibles.
  - PITR: lecture d’un manifest ≤ timestamp ciblé (vue historique).

- **Protocole de commit (écrivain)**
  1. Verrou d’écriture (par branche): writer unique (Mutex/RwLock; file‑lock OS si multi‑process embedded).
  2. Begin Tx: allouer `tx_id`, charger `base_manifest_id`.
  3. WAL append: écrire séquentiellement + fsync.
  4. Matérialiser: flush en segments immuables (SSTables/colonne) + fsync.
  5. Nouveau manifest: écrire `manifest-{ts}.json` (fichier temp + checksum), fsync du répertoire, rename atomique.
  6. CAS manifest: valider que `base_manifest_id` n’a pas changé; sinon conflit → retry.
  7. Publish: swap pointeur (`Arc<Manifest>`) → visible par les lecteurs; émettre événements (branch/snapshot/merge).

## Segments (format minimal)

- **Header**: magic `CASS`, version, `node_count`, `edge_count`, `checksum` (CRC32 des données).
- **Chemin**: `data/{tenant}/{db}/segments/{prefix}/{segment_id}.seg` (`prefix` = 2 premiers caractères pour sharder).
- **API**: `storage/segments::{write_segment, read_segment}` (tests: round‑trip, corruption → erreur checksum).

## Chemin de commit (`commit_tx`)

- **Signature**: `Engine::commit_tx(branch, records: &[Vec<u8>]) -> Timestamp`.
- **Étapes**:
  - Verrou SW‑MR par branche (writer unique).
  - Append dans le WAL (records length‑prefixed, rotation ~4 MiB par défaut) + `fsync`.
  - Publication d’un nouveau manifest via `snapshot()` (lectures non bloquantes).
- **Garanties**: crash‑safety (fsync + rename atomique du manifest), lecteurs sur snapshots immuables.

## Intégrations optionnelles

- **S3/MinIO**: plugin de stockage objet pour backups/restauration/HA. Désactivé par défaut (filesystem local suffisant).
- **Redis**: inutile en embarqué; events émis directement par l’engine (callbacks) et relayés par l’API vers le frontend.
- **PostgreSQL (control plane métier)**: facultatif si vous voulez un mode PaaS (customers, subscriptions, API keys). La donnée graphe reste dans l’engine.
## Avertissements

- Cette branche est un **squelette**: `/gql` renvoie 501 pour l’instant.
- Aucun changement côté API Python tant que l’adaptateur n’est pas branché et que `GRAPH_ENGINE=rust` n’est pas activé.

---

Questions ou besoins de précisions sur le profil ISO GQL ou la modélisation des branches/snapshots ? Ouvrir une issue dans ce dossier `engine/` pour tracer les décisions (profil de syntaxe, index par défaut, événements SSE attendus).