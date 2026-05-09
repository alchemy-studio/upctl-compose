#!/bin/bash
set -e

echo "[authcore] Running database migrations..."
cd /app && diesel migration run --database-url "$UC_DB_URL"

echo "[authcore] Seeding demo users..."
PGPASSWORD=upctl_dev psql -h postgres -U upctl -d upctl -f /app/seed/seed-demo-users.sql

echo "[authcore] Starting htyuc..."
exec htyuc
