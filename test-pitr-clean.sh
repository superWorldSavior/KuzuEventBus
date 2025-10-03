#!/bin/bash
set -e

API=http://localhost:8200
MINIO_ENDPOINT=127.0.0.1:9100

echo "=== PITR Clean Test Script ==="
echo ""

# 1. Clean shutdown and volume removal
echo "🧹 [1/9] Cleaning up Docker volumes..."
docker compose down -v
docker system prune -f

echo ""
echo "🔨 [2/9] Rebuilding services..."
docker compose build api worker

echo ""
echo "🚀 [3/9] Starting services..."
docker compose up -d

echo ""
echo "⏳ [4/9] Waiting for services to be healthy (30s)..."
sleep 30

docker compose ps

echo ""
echo "👤 [5/9] Creating customer and getting API key..."
CUSTOMER_RESPONSE=$(curl -s -X POST "$API/api/v1/customers/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@pitr.local",
    "company_name": "PITR Test Co",
    "full_name": "Test User"
  }')

echo "$CUSTOMER_RESPONSE" | jq -C

API_KEY=$(echo "$CUSTOMER_RESPONSE" | jq -r '.api_key')
TENANT_ID=$(echo "$CUSTOMER_RESPONSE" | jq -r '.tenant_id')

if [ "$API_KEY" == "null" ] || [ -z "$API_KEY" ]; then
  echo "❌ Failed to get API key. Response:"
  echo "$CUSTOMER_RESPONSE"
  exit 1
fi

echo ""
echo "✅ API Key: $API_KEY"
echo "✅ Tenant ID: $TENANT_ID"

echo ""
echo "🗄️  [6/9] Provisioning database..."
DB_RESPONSE=$(curl -s -H "Authorization: Bearer $API_KEY" -X POST \
  "$API/api/v1/databases/provision/$TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"database_name": "pitr-test"}')

echo "$DB_RESPONSE" | jq -C

DB_ID=$(echo "$DB_RESPONSE" | jq -r '.database_id')

if [ "$DB_ID" == "null" ] || [ -z "$DB_ID" ]; then
  echo "❌ Failed to provision database. Response:"
  echo "$DB_RESPONSE"
  exit 1
fi

echo ""
echo "✅ Database ID: $DB_ID"

# Insert some data for testing
echo ""
echo "📝 Inserting test data..."
curl -s -H "Authorization: Bearer $API_KEY" -X POST \
  "$API/api/v1/queries/submit" \
  -H "Content-Type: application/json" \
  -d "{
    \"database_id\": \"$DB_ID\",
    \"query\": \"CREATE NODE TABLE Person(name STRING, age INT64, PRIMARY KEY(name))\"
  }" > /dev/null

sleep 2

curl -s -H "Authorization: Bearer $API_KEY" -X POST \
  "$API/api/v1/queries/submit" \
  -H "Content-Type: application/json" \
  -d "{
    \"database_id\": \"$DB_ID\",
    \"query\": \"CREATE (p:Person {name: 'Alice', age: 30})\"
  }" > /dev/null

sleep 2

echo ""
echo "📸 [7/9] Creating snapshot..."
SNAP_RESPONSE=$(curl -s -H "Authorization: Bearer $API_KEY" -X POST \
  "$API/api/v1/databases/$DB_ID/snapshots")

echo "$SNAP_RESPONSE" | jq -C

SNAP_ID=$(echo "$SNAP_RESPONSE" | jq -r '.id // .snapshot_id')
SNAP_URL=$(echo "$SNAP_RESPONSE" | jq -r '.object_key')

if [ "$SNAP_URL" == "null" ] || [ -z "$SNAP_URL" ]; then
  echo "❌ Failed to create snapshot. Response:"
  echo "$SNAP_RESPONSE"
  exit 1
fi

echo ""
echo "✅ Snapshot created: $SNAP_ID"
echo "✅ Object key: $SNAP_URL"

echo ""
echo "🔍 [8/9] Inspecting snapshot archive in MinIO..."
export MINIO_ENDPOINT=$MINIO_ENDPOINT
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_SECURE=false

python3 backend/scripts/inspect_snapshot.py "$SNAP_URL"

echo ""
echo "🔄 [9/9] Testing PITR restore..."
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Target timestamp: $TS"

echo ""
echo "📋 Getting PITR plan..."
curl -s -H "Authorization: Bearer $API_KEY" \
  "$API/api/v1/databases/$DB_ID/pitr?target=$TS" | jq -C

echo ""
echo "⚡ Attempting PITR restore..."
RESTORE_RESPONSE=$(curl -s -H "Authorization: Bearer $API_KEY" -X POST \
  "$API/api/v1/databases/$DB_ID/restore-pitr?target_timestamp=$TS")

echo "$RESTORE_RESPONSE" | jq -C

if echo "$RESTORE_RESPONSE" | jq -e '.restored == true' > /dev/null 2>&1; then
  echo ""
  echo "✅ ✅ ✅ PITR RESTORE SUCCESSFUL! ✅ ✅ ✅"
elif echo "$RESTORE_RESPONSE" | jq -e '.detail' > /dev/null 2>&1; then
  echo ""
  echo "❌ PITR restore failed with error:"
  echo "$RESTORE_RESPONSE" | jq -r '.detail'
  exit 1
else
  echo ""
  echo "⚠️  Unexpected response:"
  echo "$RESTORE_RESPONSE"
  exit 1
fi

echo ""
echo "=== Test Summary ==="
echo "API Key: $API_KEY"
echo "Tenant ID: $TENANT_ID"
echo "Database ID: $DB_ID"
echo "Snapshot ID: $SNAP_ID"
echo ""
echo "✅ All tests passed!"
