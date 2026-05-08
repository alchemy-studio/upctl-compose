#!/bin/bash
# Setup Gitea with required organization, repository, and labels.
# Run after docker compose up -d when Gitea is first created.
#
# Uses the ai-agent container for curl (has it installed) to reach
# Gitea via the internal Docker network (gitea:3000).
#
# Usage: bash scripts/setup-gitea.sh
set -e

GITEA_INTERNAL_URL="${GITEA_INTERNAL_URL:-http://gitea:3000}"
AUTH_HEADER="${GITEA_AUTH_HEADER:-Basic YWktYm90OmFpLWJvdC1kZXYtcGFzcw==}"

# Use ai-agent container for curl since it has curl installed
CURL="docker compose exec -T ai-agent curl -s"

echo "=== Setting up Gitea ==="

# Wait for Gitea API to be ready
echo ">>> Waiting for Gitea API..."
for i in $(seq 1 30); do
  status=$($CURL -o /dev/null -w "%{http_code}" "${GITEA_INTERNAL_URL}/api/v1/version" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "Gitea API ready (status=$status)"
    break
  fi
  echo "  status=$status, waiting..."
  sleep 2
done

# Check if admin user exists
echo ">>> Checking admin user..."
for i in $(seq 1 15); do
  admin_check=$($CURL -H "Authorization: ${AUTH_HEADER}" "${GITEA_INTERNAL_URL}/api/v1/user")
  login=$(echo "$admin_check" | python3 -c "import sys,json; print(json.load(sys.stdin).get('login',''))" 2>/dev/null || echo "")
  if [ -n "$login" ]; then
    echo "Admin user: $login"
    break
  fi
  echo "  waiting for admin user... (attempt $i)"
  sleep 2
done

# Create the weli organization
echo ">>> Creating 'weli' organization..."
org_resp=$($CURL -X POST "${GITEA_INTERNAL_URL}/api/v1/orgs" \
  -H "Authorization: ${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"username": "weli", "full_name": "Huiwing", "visibility": "public"}')
org_status=$(echo "$org_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
if [ -n "$org_status" ]; then
  echo "Organization 'weli' created (id=$org_status)"
else
  echo "Organization response: $(echo $org_resp | head -c 200)"
fi

# Create the tickets repository
echo ">>> Creating 'weli/tickets' repository..."
repo_resp=$($CURL -X POST "${GITEA_INTERNAL_URL}/api/v1/orgs/weli/repos" \
  -H "Authorization: ${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"name": "tickets", "description": "Ticket management repository", "auto_init": true, "private": false}')
repo_status=$(echo "$repo_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
if [ -n "$repo_status" ]; then
  echo "Repository 'weli/tickets' created (id=$repo_status)"
else
  repo_name=$(echo "$repo_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null || echo "")
  if [ -n "$repo_name" ]; then
    echo "Repository already exists: $repo_name"
  else
    echo "Repository creation response: $(echo $repo_resp | head -c 300)"
  fi
fi

# Create the ticket labels
echo ">>> Creating labels..."
for label_data in \
  '{"name":"approved","color":"00ff00","description":"Approved for processing"}' \
  '{"name":"in_progress","color":"ffcc00","description":"Currently being processed"}' \
  '{"name":"blocked","color":"ff0000","description":"Blocked - needs attention"}'; do

  label_resp=$($CURL -X POST "${GITEA_INTERNAL_URL}/api/v1/repos/weli/tickets/labels" \
    -H "Authorization: ${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d "$label_data")
  label_name=$(echo "$label_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null || echo "")
  if [ -n "$label_name" ]; then
    echo "  Label '$label_name' created"
  fi
done

echo "=== Gitea setup complete ==="
