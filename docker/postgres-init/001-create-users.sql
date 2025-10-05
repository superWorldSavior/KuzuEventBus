-- Initialize application roles and ownership for Kuzu Event Bus
-- This script is executed by the official Postgres image on first DB init,
-- connecting as $POSTGRES_USER to $POSTGRES_DB (kuzu_eventbus).

-- 1) Create application user (non-superuser)
CREATE ROLE kuzu_user WITH LOGIN PASSWORD 'kuzu_password';

-- 2) Ensure the database is owned by the application user
--    (the entrypoint created DB owned by $POSTGRES_USER=postgres)
ALTER DATABASE kuzu_eventbus OWNER TO kuzu_user;

-- 3) Give kuzu_user ownership of the public schema so it can create objects
ALTER SCHEMA public OWNER TO kuzu_user;

-- 4) Grant privileges (redundant with ownership but explicit)
GRANT ALL PRIVILEGES ON DATABASE kuzu_eventbus TO kuzu_user;
GRANT ALL ON SCHEMA public TO kuzu_user;
