#!/usr/bin/env python3
"""
Migration script: Move existing snapshots into snapshots/ subfolder.

This script:
1. Finds all snapshots without 'snapshots/' in their object_key
2. Copies them to the new location with 'snapshots/' prefix
3. Updates the database with new object_keys
4. Deletes old objects from MinIO
"""
import asyncio
from uuid import UUID
import re

from sqlalchemy import text
from src.infrastructure.database.session import SessionFactory
from src.infrastructure.dependencies import file_storage_service


async def migrate_snapshots():
    print("🔄 Starting snapshot migration...")
    
    storage = file_storage_service()
    migrated_count = 0
    
    with SessionFactory() as session:
        # Find all snapshots without 'snapshots/' in path
        rows = session.execute(
            text("""
                SELECT id, tenant_id, database_id, object_key
                FROM kuzu_db_snapshots
                WHERE object_key NOT LIKE '%/snapshots/%'
                  AND object_key LIKE '%/snapshot-%'
            """)
        ).fetchall()
        
        print(f"📊 Found {len(rows)} snapshots to migrate")
        
        for row in rows:
            snapshot_id, tenant_id, database_id, old_key = row
            
            # Extract filename from old key
            # Format: s3://bucket/tenants/{tenant}/{db}/snapshot-*.tar.gz
            match = re.search(r'/([^/]+)/(snapshot-[^/]+\.tar\.gz)$', old_key)
            if not match:
                print(f"⚠️  Skipping {old_key} - unexpected format")
                continue
            
            db_id_in_path, filename = match.groups()
            
            # New key with snapshots/ folder
            new_key = old_key.replace(
                f"/{db_id_in_path}/{filename}",
                f"/{db_id_in_path}/snapshots/{filename}"
            )
            
            print(f"  📦 Migrating: {filename}")
            print(f"     From: {old_key}")
            print(f"     To:   {new_key}")
            
            try:
                # Download from old location
                data = await storage.download_database(old_key)
                
                # Upload to new location
                await storage.upload_database(
                    tenant_id=UUID(str(tenant_id)),
                    database_id=UUID(str(database_id)),
                    file_content=data,
                    filename=f"snapshots/{filename}"
                )
                
                # Update database with new key
                session.execute(
                    text("UPDATE kuzu_db_snapshots SET object_key = :new_key WHERE id = :id"),
                    {"new_key": new_key, "id": snapshot_id}
                )
                session.commit()
                
                # Delete old object from MinIO
                # Extract path after bucket name
                old_path = old_key.replace("s3://kuzu-databases/", "")
                try:
                    await storage._client.remove_object("kuzu-databases", old_path)
                except Exception as e:
                    print(f"     ⚠️  Could not delete old object: {e}")
                
                migrated_count += 1
                print(f"     ✅ Migrated successfully")
                
            except Exception as e:
                print(f"     ❌ Error: {e}")
                session.rollback()
    
    print(f"\n✅ Migration complete: {migrated_count}/{len(rows)} snapshots migrated")


if __name__ == "__main__":
    asyncio.run(migrate_snapshots())
