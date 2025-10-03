-- Migration: Add timezone support to all timestamp columns
-- Run this ONCE after updating models.py to use DateTime(timezone=True)

BEGIN;

-- customers table
ALTER TABLE customers 
  ALTER COLUMN api_key_created_at TYPE timestamptz USING api_key_created_at AT TIME ZONE 'UTC',
  ALTER COLUMN api_key_last_used TYPE timestamptz USING api_key_last_used AT TIME ZONE 'UTC',
  ALTER COLUMN subscription_started_at TYPE timestamptz USING subscription_started_at AT TIME ZONE 'UTC',
  ALTER COLUMN subscription_expires_at TYPE timestamptz USING subscription_expires_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_login TYPE timestamptz USING last_login AT TIME ZONE 'UTC';

-- kuzu_databases table
ALTER TABLE kuzu_databases
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- query_usage table
ALTER TABLE query_usage
  ALTER COLUMN last_used_at TYPE timestamptz USING last_used_at AT TIME ZONE 'UTC';

-- query_favorites table
ALTER TABLE query_favorites
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- kuzu_db_snapshots table (the critical one for PITR)
ALTER TABLE kuzu_db_snapshots
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

COMMIT;
