#!/bin/bash
set -e

# KuzuEventBus Development Environment with Hot Reload
echo "🚀 Starting KuzuEventBus Development Environment with Hot Reload..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans || true

# Build development images
print_status "Building development images..."
docker-compose -f docker-compose.dev.yml build --no-cache

# Start the development environment
print_status "Starting development environment..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check PostgreSQL
if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U kuzu_user -d kuzu_eventbus &> /dev/null; then
    print_status "✅ PostgreSQL is ready"
else
    print_warning "⚠️  PostgreSQL is not ready yet"
fi

# Check Redis
if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping | grep -q PONG; then
    print_status "✅ Redis is ready"
else
    print_warning "⚠️  Redis is not ready yet"
fi

# Check MinIO
if curl -s http://localhost:9000/minio/health/live &> /dev/null; then
    print_status "✅ MinIO is ready"
else
    print_warning "⚠️  MinIO is not ready yet"
fi

# Check Backend API
sleep 5
if curl -s http://localhost:8000/health &> /dev/null; then
    print_status "✅ Backend API is ready"
else
    print_warning "⚠️  Backend API is not ready yet (this is normal, it may take a minute to start)"
fi

# Check Frontend
if curl -s http://localhost:3000 &> /dev/null; then
    print_status "✅ Frontend is ready"
else
    print_warning "⚠️  Frontend is not ready yet (this is normal, it may take a minute to start)"
fi

echo ""
print_status "🎉 Development environment is starting up!"
echo ""
echo -e "${BLUE}📱 Application URLs:${NC}"
echo "  Frontend (with HMR):   http://localhost:3000"
echo "  Backend API:           http://localhost:8000"
echo "  API Docs:              http://localhost:8000/docs"
echo "  PostgreSQL (Adminer):  http://localhost:8080"
echo "  Redis Insight:         http://localhost:8001"
echo "  MinIO Console:         http://localhost:9001"
echo ""
echo -e "${BLUE}🔥 Hot Reload Features:${NC}"
echo "  ✅ Backend Python files reload automatically"
echo "  ✅ Frontend React/TS files reload automatically with HMR"
echo "  ✅ Worker processes restart on code changes"
echo ""
echo -e "${YELLOW}📝 Development Tips:${NC}"
echo "  • Backend logs:    docker-compose -f docker-compose.dev.yml logs -f api"
echo "  • Frontend logs:   docker-compose -f docker-compose.dev.yml logs -f frontend"
echo "  • Worker logs:     docker-compose -f docker-compose.dev.yml logs -f worker"
echo "  • All logs:        docker-compose -f docker-compose.dev.yml logs -f"
echo "  • Stop all:        docker-compose -f docker-compose.dev.yml down"
echo ""
echo -e "${GREEN}🚀 Happy coding! Your changes will be reflected immediately.${NC}"