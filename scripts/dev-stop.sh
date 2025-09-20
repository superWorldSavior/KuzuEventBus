#!/bin/bash
set -e

# KuzuEventBus Development Environment Stop Script
echo "🛑 Stopping KuzuEventBus Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if docker-compose.dev.yml exists
if [ ! -f "docker-compose.dev.yml" ]; then
    print_warning "docker-compose.dev.yml not found. Make sure you're in the project root directory."
    exit 1
fi

# Stop and remove containers
print_status "Stopping all development containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans

# Clean up any dangling containers from the dev network
print_status "Cleaning up development network..."
docker network rm kuzu_eventbus_dev_network 2>/dev/null || true

# Optional: Clean up unused images and volumes
read -p "Do you want to clean up unused Docker images and volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleaning up unused Docker resources..."
    docker system prune -f
    print_status "✅ Cleanup completed"
fi

echo ""
print_status "✅ Development environment stopped successfully"
echo ""
echo -e "${GREEN}💡 To start again, run: ./scripts/dev-start.sh${NC}"