#!/bin/bash
# MouseAI - PostgreSQL initialization with pgvector
# Install pgvector extension from PGDG apt repository

set -e

echo "Installing pgvector extension..."

# Add PostgreSQL PGDG apt repository if not already present
if [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
    apt-get update
    apt-get install -y curl ca-certificates gnupg
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --batch --yes --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] https://apt.postgresql.org/pub/repos/apt $(grep -oE '^[0-9]+\.[0-9]+' /etc/debian_version | head -1)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    apt-get update
fi

# Install pgvector
apt-get install -y postgresql-16-pgvector

# Create extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "vector";
EOSQL

echo "PostgreSQL extensions initialized successfully"
