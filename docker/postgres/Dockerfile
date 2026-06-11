# MouseAI PostgreSQL with pgvector extension
# Extends postgres:16 with pgvector from PGDG repository
FROM postgres:16

# Install pgvector from PostgreSQL PGDG repository
RUN apt-get update && apt-get install -y curl ca-certificates gnupg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --batch --yes --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y postgresql-16-pgvector \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
