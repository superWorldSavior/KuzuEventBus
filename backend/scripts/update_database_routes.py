#!/usr/bin/env python3
"""Update all database routes to accept database name or UUID."""
import re

routes_file = "src/presentation/api/databases/routes.py"

# Read the file
with open(routes_file, 'r') as f:
    content = f.read()

# Pattern to match: dbid = UUID(database_id)
# Replace with: dbid = await resolve_database_id(database_id, ctx.tenant_id)
pattern = r'(\s+)dbid = UUID\(database_id\)'
replacement = r'\1# Accept UUID or database name\n\1dbid = await resolve_database_id(database_id, ctx.tenant_id)'

# Apply the replacement
updated_content = re.sub(pattern, replacement, content)

# Count how many replacements were made
count = content.count('dbid = UUID(database_id)')
print(f"Found {count} occurrences of 'dbid = UUID(database_id)'")
print(f"Applying replacements...")

# Write back
with open(routes_file, 'w') as f:
    f.write(updated_content)

print(f"✅ Updated {routes_file}")
print(f"Replaced {count} occurrences")
