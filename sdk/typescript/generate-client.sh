#!/bin/bash
set -e

echo "🔧 Generating TypeScript SDK from OpenAPI spec..."

# Ensure the API is running
if ! curl -s http://localhost:8200/health > /dev/null; then
    echo "❌ API not running on port 8200"
    echo "   Run 'make compose-all' first"
    exit 1
fi

# Create output directory
mkdir -p generated

# Download OpenAPI spec
echo "📥 Downloading OpenAPI spec..."
curl -s http://localhost:8200/openapi.json > openapi.json

# Generate TypeScript client using openapi-typescript-codegen
echo "🏗️  Generating client..."
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-fetch \
  -o generated \
  --additional-properties=supportsES6=true,typescriptThreePlus=true

echo "✅ SDK generated in ./generated"
echo ""
echo "📦 To use in your project:"
echo "   1. Copy ./generated to your project"
echo "   2. Import: import { DefaultApi, Configuration } from './generated'"
