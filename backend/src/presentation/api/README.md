# API Layer – Référence minimale

L’API est entièrement documentée via OpenAPI. Utilisez les pages interactives pour la référence à jour des endpoints.

## 🔐 Authentification

- Header: `Authorization: Bearer kb_<api_key>`
- Obtenir une clé: `POST /api/v1/customers/register` (public)

## 🔎 Documentation interactive

- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## ℹ️ Notes

- Les descriptions, schémas de requêtes/réponses et codes d’erreur sont maintenus directement dans les décorateurs FastAPI (summary/description/responses).
- Pour une vue d’ensemble (Quickstart & endpoints), voir le `README.md` racine et `backend/README.md`.

## 📚 Query Catalog (Popular & Favorites)

Routes sous `/api/v1/databases/{database_id}`:

- `GET  /queries/popular` → liste les requêtes les plus utilisées (hors favoris)
- `GET  /queries/favorites` → liste les requêtes favorites (max 10)
- `POST /queries/favorites` → ajoute un favori, body `{ "query": "MATCH (n) RETURN n" }`
- `DELETE /queries/favorites/{query_hash}` → supprime un favori

Exemple rapide (avec Authorization Bearer):

```bash
curl -H "Authorization: Bearer kb_xxx" \
  http://localhost:8000/api/v1/databases/<db_id>/queries/popular

curl -H "Authorization: Bearer kb_xxx" -H "Content-Type: application/json" \
  -d '{"query":"MATCH (n) RETURN n"}' \
  http://localhost:8000/api/v1/databases/<db_id>/queries/favorites

curl -X DELETE -H "Authorization: Bearer kb_xxx" \
  http://localhost:8000/api/v1/databases/<db_id>/queries/favorites/<query_hash>