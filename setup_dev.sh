#!/bin/bash
set -e

echo "🧹 Nettoyage des anciens venvs..."
rm -rf .venv venv backend/venv sdk/python/venv

echo "🐍 Création du venv unifié..."
python3 -m venv .venv
source .venv/bin/activate

echo "📦 Installation des dépendances backend..."
if [ -f backend/pyproject.toml ]; then
    pip install -e backend[dev]
elif [ -f backend/requirements.txt ]; then
    pip install -r backend/requirements.txt
fi

echo "🔧 Installation du SDK en mode éditable..."
pip install -e sdk/python[dev]

echo "✅ Setup terminé !"
echo ""
echo "Pour activer l'environnement :"
echo "  source .venv/bin/activate"
echo ""
echo "Tests SDK :"
echo "  cd sdk/python && pytest tests/ -v"
echo ""
echo "Tests backend :"
echo "  cd backend && pytest tests/ -v"
