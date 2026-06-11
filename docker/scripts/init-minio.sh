#!/bin/bash
# MouseAI - MinIO initialization script
# Creates the default bucket for file uploads

set -e

echo "Waiting for MinIO to be ready..."
sleep 5

# Configure mc client
mc alias set mouseai-minio http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

# Create bucket if it doesn't exist
if ! mc ls mouseai-minio/${S3_BUCKET} 2>/dev/null; then
  mc mb mouseai-minio/${S3_BUCKET}
  echo "Bucket '${S3_BUCKET}' created successfully"
else
  echo "Bucket '${S3_BUCKET}' already exists"
fi

# Set bucket policy to allow public read (for file serving)
mc anonymous set download mouseai-minio/${S3_BUCKET}

echo "MinIO initialization complete"
