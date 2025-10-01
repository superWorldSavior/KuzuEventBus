#!/bin/bash
set -e

echo "🔍 === KuzuEventBus API Diagnostic Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get API key from container logs or user
echo -e "${BLUE}📋 Step 1: Extract API Key${NC}"
API_KEY=$(docker compose -f docker-compose.dev.yml logs api 2>/dev/null | grep -oP 'kb_[A-Za-z0-9_-]{40,}' | head -1 || echo "")

# Try alternative: look for recent registrations
if [ -z "$API_KEY" ]; then
    API_KEY=$(docker compose -f docker-compose.dev.yml logs api 2>/dev/null | grep "api_key" | grep -oP 'kb_[A-Za-z0-9_-]{40,}' | tail -1 || echo "")
fi

if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}⚠️  No API key found in logs.${NC}"
    echo -e "${YELLOW}   Running tests WITHOUT authentication (will test endpoints that don't require auth)${NC}"
    API_KEY=""
else
    echo -e "${GREEN}✅ Using API key: ${API_KEY:0:10}...${NC}"
fi
echo ""

# Test 1: Check if containers are running
echo -e "${BLUE}📋 Step 2: Check Docker Containers${NC}"
echo "Running containers:"
docker compose -f docker-compose.dev.yml ps
echo ""

# Test 2: Check backend directly (container-to-container)
echo -e "${BLUE}📋 Step 3: Test Backend API (Direct to api:8200)${NC}"
BACKEND_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $API_KEY" http://localhost:8200/api/v1/databases/ || echo "FAILED")
BACKEND_CODE=$(echo "$BACKEND_RESPONSE" | tail -1)
BACKEND_BODY=$(echo "$BACKEND_RESPONSE" | head -n -1)

if [ "$BACKEND_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend responds on :8200${NC}"
    echo "Response: $BACKEND_BODY"
else
    echo -e "${RED}❌ Backend failed on :8200 (HTTP $BACKEND_CODE)${NC}"
    echo "Response: $BACKEND_BODY"
fi
echo ""

# Test 3: Check Vite proxy (host to Vite dev server)
echo -e "${BLUE}📋 Step 4: Test Vite Proxy (:3100/api -> api:8000)${NC}"
VITE_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $API_KEY" http://localhost:3100/api/v1/databases/ || echo "FAILED")
VITE_CODE=$(echo "$VITE_RESPONSE" | tail -1)
VITE_BODY=$(echo "$VITE_RESPONSE" | head -n -1)

if [ "$VITE_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Vite proxy works on :3100${NC}"
    echo "Response: $VITE_BODY"
else
    echo -e "${RED}❌ Vite proxy failed on :3100 (HTTP $VITE_CODE)${NC}"
    echo "Response: $VITE_BODY"
fi
echo ""

# Test 4: Check frontend container network
echo -e "${BLUE}📋 Step 5: Check Frontend -> API Network (inside container)${NC}"
docker compose -f docker-compose.dev.yml exec -T frontend sh -c "wget -q -O - http://api:8000/api/v1/databases/ 2>&1 || echo 'NETWORK_ERROR'" > /tmp/frontend_test.txt
FRONTEND_TEST=$(cat /tmp/frontend_test.txt)
if echo "$FRONTEND_TEST" | grep -q "NETWORK_ERROR"; then
    echo -e "${RED}❌ Frontend container cannot reach api:8000${NC}"
    echo "Error: $FRONTEND_TEST"
else
    echo -e "${GREEN}✅ Frontend container can reach api:8000${NC}"
    echo "Response sample: ${FRONTEND_TEST:0:200}..."
fi
echo ""

# Test 5: Check Vite config proxy target
echo -e "${BLUE}📋 Step 6: Inspect Vite Proxy Config${NC}"
echo "Vite proxy target in vite.config.ts:"
grep -A 5 "proxy:" frontend/vite.config.ts | grep "target:" || echo "Not found"
echo ""

# Test 7: Check if 'api:8000' appears in frontend build/source
echo -e "${BLUE}📋 Step 7: Search for Hardcoded 'api:8000' in Frontend Source${NC}"
if grep -r "api:8000" frontend/src --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null; then
    echo -e "${RED}❌ Found 'api:8000' in source files!${NC}"
else
    echo -e "${GREEN}✅ No 'api:8000' found in frontend/src${NC}"
fi
echo ""

# Test 8: Check frontend logs for proxy rewrite
echo -e "${BLUE}📋 Step 8: Check Frontend Logs for Proxy Activity${NC}"
echo "Recent Vite proxy logs (last 20 lines):"
docker compose -f docker-compose.dev.yml logs --tail=20 frontend | grep -i "proxy\|rewrite\|/api" || echo "No proxy logs found"
echo ""

# Summary
echo -e "${BLUE}📋 Step 9: Summary${NC}"
echo "======================================"
if [ "$BACKEND_CODE" = "200" ] && [ "$VITE_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend and Vite proxy are both working!${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  The browser issue is likely:${NC}"
    echo "   1. Stale HMR bundle (HMR WebSocket isn't connected)"
    echo "   2. Browser cache (hard refresh: Ctrl+Shift+R)"
    echo "   3. A non-apiClient axios instance somewhere"
    echo ""
    echo -e "${BLUE}Recommended actions:${NC}"
    echo "   • Hard refresh browser (Ctrl+Shift+R)"
    echo "   • Check browser DevTools -> Network -> find the failing request"
    echo "   • Click the request -> Initiator tab to see which code path triggered it"
    echo "   • Restart frontend: docker compose -f docker-compose.dev.yml restart frontend"
elif [ "$BACKEND_CODE" != "200" ]; then
    echo -e "${RED}❌ Backend API is not responding correctly${NC}"
    echo "   • Check: docker compose -f docker-compose.dev.yml logs api"
    echo "   • Verify API is running: docker compose -f docker-compose.dev.yml ps"
elif [ "$VITE_CODE" != "200" ]; then
    echo -e "${RED}❌ Vite proxy is not working${NC}"
    echo "   • Check: docker compose -f docker-compose.dev.yml logs frontend"
    echo "   • Verify vite.config.ts proxy target is 'http://api:8000'"
    echo "   • Restart frontend: docker compose -f docker-compose.dev.yml restart frontend"
fi
echo "======================================"
