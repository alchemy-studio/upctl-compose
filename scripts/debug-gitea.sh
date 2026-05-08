#!/bin/bash
# Debug Gitea API connectivity
set -e

echo "=== Gitea Debug at $(date -u) ==="

echo ""
echo "=== Via nginx proxy (localhost:8088/gitea/) ==="
for url in \
  "http://localhost:8088/gitea/api/v1/version" \
  "http://localhost:8088/gitea/" \
  "http://localhost:8088/gitea/api/v1/user"; do
  echo ">>> GET $url"
  curl -sv "$url" 2>&1 | tail -5
  echo ""
done

echo ""
echo "=== Via direct port (localhost:3001) ==="
for url in \
  "http://localhost:3001/api/v1/version" \
  "http://localhost:3001/" \
  "http://localhost:3001/api/v1/user"; do
  echo ">>> GET $url"
  curl -sv "$url" 2>&1 | tail -5
  echo ""
done

echo ""
echo "=== Via ai-agent container -> gitea:3000 ==="
for url in \
  "http://gitea:3000/api/v1/version" \
  "http://gitea:3000/" \
  "http://gitea:3000/api/v1/user"; do
  echo ">>> GET $url"
  docker compose exec -T ai-agent curl -sv "$url" 2>&1 | tail -5
  echo ""
done

echo "=== Done ==="
