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