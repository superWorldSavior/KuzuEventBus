# Hooks partagés (temps réel & API)

Ce dossier contient les hooks partagés de l’application. Cette note décrit la stratégie SSE (Server-Sent Events) mise en place, et le rôle de chaque hook.

## Règle d’or: une SEULE connexion SSE

- Une seule connexion SSE doit être ouverte dans toute l’application.
- Toute connexion supplémentaire peut provoquer des boucles de reconnexion, des 401 en cascade et des crashs navigateur.

## Hooks clés

- `useSSE`
  - Rôle: transport bas niveau EventSource.
  - Ce hook gère la connexion réseau (connect/disconnect), la politique de reconnexion, et le mint du JWT SSE via `POST /api/v1/auth/sse-token` (puis `?token=<jwt>` ajouté à l’URL EventSource).
  - Il ne contient AUCUNE logique métier. Il expose des callbacks `onOpen`, `onError`, `onMessage`.
  - Bonnes pratiques: ne l’appelez qu’à un seul endroit central.

- `useSSENotifications`
  - Rôle: orchestrateur métier (connexion unique) et point d’entrée applicatif.
  - C’est le SEUL endroit où l’on appelle `useSSE`.
  - Responsabilités:
    - Ouvrir la connexion SSE unique vers `/api/v1/events/stream` (uniquement si l’utilisateur est authentifié avec une API key `kb_...`).
    - Transformer les événements en UI (toasts) et invalider les caches React Query pertinents (`queryKeys.dashboardStats`, `recentQueries`, `recentActivity`, `database(...)`, `databaseMetrics(...)`).
    - Diffuser un événement global DOM: `window.dispatchEvent(new CustomEvent('sse:event', { detail }))` pour permettre à des composants d’écouter le flux sans ouvrir de nouvelle connexion.

## Comment consommer le flux SSE dans un composant

- Injecter les données via React Query (recommandé):
  - Les invalidations effectuées dans `useSSENotifications` rafraîchissent automatiquement les pages comme `DashboardPage`.
- S’abonner au flux (sans ouvrir de connexion):
  - Pour les cas spécifiques (ex: suivre une transaction précise dans `QueryExecutor`), écouter le CustomEvent:

```ts
useEffect(() => {
  const handler = (evt: Event) => {
    const { detail } = evt as CustomEvent<{ event_type: string; transaction_id?: string }>
    if (!detail) return
    // Filtrer ici sur transaction_id, etc.
  }
  window.addEventListener('sse:event', handler as EventListener)
  return () => window.removeEventListener('sse:event', handler as EventListener)
}, [])
```

## À ne pas faire

- Ouvrir `useSSE` directement dans des pages ou composants (`DashboardPage`, `QueryExecutor`, etc.).
- Multiplier les connexions SSE vers le même endpoint.

## Authentification SSE (rappel)

- REST: `Authorization: Bearer kb_<api_key>`.
- SSE: `useSSE` mint un JWT court-vécu via `POST /api/v1/auth/sse-token` (auth REST requise), puis ouvre `GET /api/v1/events/stream?token=<jwt>`.
- Aucune API key en query string n’est acceptée côté backend.

## Dépannage

- Boucles/reconnexions ou crashs navigateur: cherchez des appels multiples à `useSSE`. Il ne doit apparaître que dans `useSSENotifications`.
- 401 sur `POST /api/v1/auth/sse-token`: l’utilisateur n’est pas authentifié (pas d’API key `kb_...`).
- CORS: backend autorise `http://localhost:3000` dans `src/presentation/api/main.py`.

## FAQ

- Pourquoi un CustomEvent global et pas un store ?
  - Léger, sans dépendance, et suffisant pour des signaux ciblés (ex: filtrer par `transaction_id`). Un store Zustand pourrait être introduit plus tard si des besoins de persistance/inspection apparaissent.

- Et si je veux des effets immédiats dans un composant ?
  - Soit via les invalidations React Query, soit via l’abonnement au `CustomEvent('sse:event')` comme montré ci-dessus.
