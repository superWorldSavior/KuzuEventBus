# Configuration des Ports

> **IMPORTANT** : Ce projet utilise des ports non-standard pour éviter les conflits avec d'autres services locaux.

## 🔌 Mapping des Ports

| Service | Host (ton machine) | Container | Usage |
|---------|-------------------|-----------|-------|
| **PostgreSQL** | `5433` | `5432` | Base de données principale |
| **Redis** | `6380` | `6379` | Cache & Queues |
| **MinIO API** | `9100` | `9000` | Object Storage (S3) |
| **MinIO Console** | `9101` | `9001` | Interface MinIO |
| **FastAPI** | `8200` | `8000` | **API principale** |
| **Frontend** | `3100` | `80` | Interface React |
| **Adminer** | `8180` | `8080` | UI PostgreSQL (dev) |
| **Redis Insight** | `8101` | `5540` | UI Redis (dev) |

## 🎯 URLs d'accès

```bash
# API Backend (FastAPI)
http://localhost:8200/docs       # Swagger UI
http://localhost:8200/redoc      # ReDoc
http://localhost:8200/health     # Health check

# Frontend (React + Vite)
http://localhost:5173            # Mode dev (npm run dev)
http://localhost:3100            # Mode Docker (docker-compose)

# Dev Tools
http://localhost:8180            # Adminer (PostgreSQL)
http://localhost:8101            # Redis Insight
http://localhost:9101            # MinIO Console
```

## 🔧 Configuration pour TypeScript

Utilise ces URLs dans ton projet TypeScript :

```typescript
// config.ts
export const KUZU_EVENT_BUS_CONFIG = {
  apiUrl: 'http://localhost:8200',
  apiKey: 'kb_YOUR_API_KEY_HERE'
};

// client.ts
const response = await fetch(`${KUZU_EVENT_BUS_CONFIG.apiUrl}/api/v1/databases`, {
  headers: {
    'Authorization': `Bearer ${KUZU_EVENT_BUS_CONFIG.apiKey}`
  }
});
```

## 🐳 Commandes Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f api

# Arrêter proprement
docker-compose down

# Rebuild si changements
docker-compose up -d --build
```

## ⚠️ Notes

- Les ports **à l'intérieur** des containers restent standards (5432, 6379, etc.)
- Les services Docker communiquent entre eux via le réseau `kuzu_eventbus_network`
- Seuls les ports **exposés** sur l'hôte ont changé
- Si tu as encore des conflits, modifie les ports dans `docker-compose.yml` (colonne de gauche)

## 📝 Personnalisation

Pour changer un port, édite `docker-compose.yml` :

```yaml
ports:
  - "TON_PORT:PORT_CONTAINER"
  # Exemple: "5555:5432" pour exposer Postgres sur le port 5555
```

Puis relance :
```bash
docker-compose down
docker-compose up -d
```
