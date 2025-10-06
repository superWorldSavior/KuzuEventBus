#!/bin/bash
# Script pour exécuter les tests du SDK Python Casys

set -e

cd "$(dirname "$0")"

# Activer l'environnement virtuel
if [ ! -d "venv" ]; then
    echo "❌ venv introuvable. Créez-le avec: python3 -m venv venv && source venv/bin/activate && pip install -e '.[dev]'"
    exit 1
fi

source venv/bin/activate

# Rebuild le package si demandé
if [ "$1" = "--rebuild" ]; then
    echo "🔨 Rebuild du package avec maturin..."
    maturin develop --release
    shift
fi

# Exécuter les tests
if [ -z "$1" ]; then
    echo "🧪 Exécution de tous les tests..."
    pytest tests/ -v
elif [ "$1" = "--cov" ]; then
    echo "🧪 Exécution avec couverture de code..."
    pytest tests/ --cov=casys_db --cov-report=term-missing --cov-report=html
    echo "📊 Rapport HTML généré dans htmlcov/index.html"
elif [ "$1" = "--watch" ]; then
    echo "👀 Mode watch (tests en continu)..."
    pytest-watch tests/ -v
else
    echo "🧪 Exécution des tests: $@"
    pytest "$@"
fi
