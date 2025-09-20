# Auth Infrastructure

Services d'authentification et d'autorisation pour sécuriser les endpoints et contextualiser les requêtes (tenant, permissions).

## 🗂️ Cheatsheet (état actuel)

- **Adapters actifs**
  - `AllowAllAuthorizationService` (MVP) — autorise toutes les actions; sert de garde-fou minimal pour avancer vite.
  - `ApiKeyAuthenticationService` (in-memory) — émet et valide des clés API lors de l'enregistrement client.

- **Ports implémentés**
  - `AuthenticationService` — émission/validation/révocation de clés API.
  - `AuthorizationService` — vérification d'un droit donné (ex: `database:backup`).

- **Dependency Injection** (voir `src/infrastructure/dependencies.py`)
  - `auth_service()` → `ApiKeyAuthenticationService`
  - `authorization_service()` → `AllowAllAuthorizationService`

- **Variables d'environnement**
  - Aucune requise au MVP (clé API en mémoire). La persistance Postgres des API keys viendra ensuite.

## 🔎 Contexte fonctionnel

- À l'inscription (`POST /api/v1/customers/register`), une clé API est générée par `AuthenticationService` et retournée au client.
- Les appels protégés portent le header `Authorization: Bearer kb_<api_key>`; le middleware valide et construit un `RequestContext` (incluant `tenant_id`).
- `AuthorizationService` est aujourd'hui permissif (MVP). Il sera substitué par des politiques (RBAC/quotas) sans impacter le domaine.

## 🔭 Prochaines étapes

- Persister les API keys (Postgres) et offrir la rotation/révocation multi-clés par tenant.
- Politique d'autorisations basée sur le `RequestContext.permissions` (ex: `database:create`, `database:backup`).
- Rate limiting par clé et audit des accès (observabilité). 