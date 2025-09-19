# Notifications Infrastructure

Service de notifications orienté développeur pour tracer les événements système utiles (sans email/SMS au MVP).

## 🗂️ Cheatsheet (état actuel)

- **Adapter actif**
  - `LoggingNotificationService` — journalise les événements (création/suppression base, snapshot, restore, uploads)

- **Dependency Injection** (voir `src/infrastructure/dependencies.py`)
  - `notification_service()` → `LoggingNotificationService`

- **Environnement**
  - Aucun requis (MVP). Câblage vers email/SMS possible plus tard.

- **Événements typiques**
  - `database_deleted`, `database_uploaded`, `snapshot_created`, `database_restored`, `query_submitted`

## 🔎 Contexte fonctionnel

- Objectif: donner de la visibilité aux équipes sur les opérations critiques sans dépendances externes.
- Les messages sont visibles dans les logs applicatifs et peuvent être capturés par l’observabilité.
- En production future, ce service sera swappable pour: email (SendGrid), Slack, webhook d’audit, etc.

## 🔭 Prochaines étapes

- Ajout de canaux (webhook) pour remonter les événements vers des SI externes.
- Sévérisation (levels) et corrélation (request_id / tenant_id / database_id).
