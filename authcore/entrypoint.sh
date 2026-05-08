#!/bin/bash
set -e

echo "[authcore] Running database migrations..."
cd /app && diesel migration run --database-url "$UC_DB_URL"

echo "[authcore] Starting htyuc..."
exec htyuc
