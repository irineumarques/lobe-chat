-- MouseAI - PostgreSQL initialization script
-- This script runs on first startup of the PostgreSQL container
-- LobeChat manages its own schema via Drizzle migrations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types for MouseAI if needed
DO $$
BEGIN
    -- Ensure jsonb is available (default in PostgreSQL 9.4+)
    RAISE NOTICE 'PostgreSQL extensions initialized';
END $$;

-- Grant usage on public schema (handled by LobeChat migrations)
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'MouseAI database initialization complete';
END $$;
