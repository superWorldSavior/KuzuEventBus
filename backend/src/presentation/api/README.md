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


Exemple rapide (avec Authorization Bearer):

```bash
curl -H "Authorization: Bearer kb_xxx" \
  http://localhost:8000/api/v1/databases/<db_id>/queries/popular

curl -H "Authorization: Bearer kb_xxx" -H "Content-Type: application/json" \
  -d '{"query":"MATCH (n) RETURN n"}' \
  http://localhost:8000/api/v1/databases/<db_id>/queries/favorites

curl -X DELETE -H "Authorization: Bearer kb_xxx" \
  http://localhost:8000/api/v1/databases/<db_id>/queries/favorites/<query_hash>