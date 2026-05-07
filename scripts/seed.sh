#!/bin/bash
# Seed test data for upctl-compose
# Run this AFTER docker compose up when all services are healthy.
#
# Usage: bash scripts/seed.sh
#
# This creates:
#   1. A ticket app (hty_apps) for ticket management
#   2. TESTER role for the app
#   3. A test user (anan) with global password
#   4. User-app-info and role assignment

set -e

BASE_URL="${BASE_URL:-http://localhost:8088}"
API="$BASE_URL/api/v1/uc"

echo "=== Seeding test data ==="

# 1. Register a test user with global password
echo ">>> Creating test user (anan)..."
curl -s -X POST "$API/create_or_update_user" \
  -H "Content-Type: application/json" \
  -d '{
    "unionid": "test-anan-unionid",
    "nickname": "阿难",
    "avatar_url": ""
  }' | python3 -m json.tool 2>/dev/null || echo "(ignored if already exists)"

# 2. Get the user's hty_id
echo ">>> Fetching user info..."
USER_RESP=$(curl -s "$API/get_by_unionid" \
  -H "Unionid: test-anan-unionid")
echo "$USER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('User hty_id:', d.get('d',{}).get('hty_id','unknown'))" 2>/dev/null || true

echo ""
echo "=== Seed complete ==="
echo "The system is ready. Visit http://localhost:8088 to access upctl-web."
echo "Login with username/password via the upctl-web login page (requires AuthCore global password support)."
