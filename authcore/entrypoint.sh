#!/bin/bash
set -e

echo "[authcore] Running database migrations..."
diesel migration run --database-url "$UC_DB_URL" --dir /app/migrations

echo "[authcore] Starting htyuc..."
exec htyuc
