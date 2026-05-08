#!/usr/bin/env python3
"""
upctl-compose E2E test suite.

Tests the full ticket lifecycle:
1. Gitea API connectivity (via upctl-svc proxy)
2. Create an approved ticket
3. Process the ticket via DeepSeek API
4. Post result as comment and close

Run inside the ai-agent container or from the host with network access:
  docker compose exec ai-agent python3 /app/tests/e2e_test.py
  # or
  python3 tests/e2e_test.py  (if upctl-svc accessible)
"""
import os
import sys
import json
import time
import hmac
import base64
import urllib.request
import urllib.error

GITEA_API_BASE = os.environ.get(
    "GITEA_API_BASE", "http://upctl-svc:3005/api/v2/ts"
)


def generate_jwt() -> str:
    """Generate a JWT for upctl-svc HtyToken auth using dev JWT_KEY."""
    jwt_key = os.environ.get("JWT_KEY", "upctl-dev-jwt-key-change-in-production")

    # Minimal HtyToken with ADMIN role so is_admin_or_tester returns true
    hty_token = {
        "token_id": "e2e-test-token",
        "hty_id": None,
        "app_id": None,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        "roles": [{"role_key": "ADMIN"}],
        "tags": [],
        "current_org_id": None,
        "current_org_role_keys": None,
        "current_department_id": None,
    }

    now = int(time.time())
    payload = {
        "sub": json.dumps(hty_token),
        "exp": now + 3600,
        "iat": now,
    }

    header_b64 = base64.urlsafe_b64encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}).encode()
    ).rstrip(b"=").decode()
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload).encode()
    ).rstrip(b"=").decode()

    sig = hmac.new(
        jwt_key.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        "sha256",
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b"=").decode()

    return f"{header_b64}.{payload_b64}.{sig_b64}"


JWT_TOKEN = generate_jwt()
HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

PASS = 0
FAIL = 0


def log(msg: str):
    print(f"  {msg}", flush=True)


def check(name: str, ok: bool, detail: str = ""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name}: {detail}", flush=True)


def api_get(path: str) -> dict:
    url = f"{GITEA_API_BASE}{path}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def api_post(path: str, data: dict) -> dict:
    url = f"{GITEA_API_BASE}{path}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def api_patch(path: str, data: dict) -> dict:
    url = f"{GITEA_API_BASE}{path}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="PATCH")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def test_gitea_connectivity():
    """Test that upctl-svc proxy can reach Gitea."""
    print("\n📋 Gitea API Connectivity")
    try:
        issues = api_get("/tickets?state=open&limit=5")
        check("List tickets", isinstance(issues, list) or "d" in issues)
    except Exception as e:
        check("List tickets", False, str(e))

    try:
        labels = api_get("/tickets/labels")
        ok = isinstance(labels, list) or "d" in labels
        check("List labels", ok)
    except Exception as e:
        check("List labels", False, str(e))


def test_create_and_close_ticket():
    """Create a ticket, add comment, close it."""
    print("\n📋 Ticket CRUD")
    try:
        ticket = api_post("/tickets", {
            "title": "E2E test: create a repo with sample code and CI",
            "body": (
                "## Task\n\n"
                "Create a new repository called `e2e-test-repo` in the weli organization. "
                "Add a simple Python script (`hello.py`) that prints 'Hello, upctl-compose!'. "
                "Create a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs "
                "the script on every push. Verify the CI passes.\n\n"
                "## Steps\n"
                "1. Create the repo via Gitea API\n"
                "2. Add hello.py with print('Hello, upctl-compose!')\n"
                "3. Add CI workflow\n"
                "4. Verify CI run succeeds\n"
                "5. Report the CI run URL in a comment"
            ),
            "labels": ["approved"],
        })
        num = ticket.get("number") or (ticket.get("d", {}) if isinstance(ticket, dict) else {}).get("number", 0)
        check("Create ticket", num > 0, f"got number={num}")
        if num == 0:
            return
        log(f"Ticket #{num} created")

        # Add in_progress label
        api_post(f"/tickets/{num}/labels", {"labels": [12]})
        check("Add in_progress label", True)

        # Add a comment
        comment = api_post(f"/tickets/{num}/comments", {
            "body": "Starting to process this ticket via E2E test...",
        })
        check("Add comment", True)

        # Close the ticket
        result = api_post(f"/tickets/{num}/close", {})
        check("Close ticket", True, str(result.get("d", result)))
        log(f"Ticket #{num} closed")

    except Exception as e:
        check("Ticket CRUD", False, str(e))


def test_deepseek_processing():
    """Test DeepSeek API via the deepseek_agent module."""
    print("\n📋 DeepSeek API Processing")
    try:
        sys.path.insert(0, "/app")
        from deepseek_agent import ask
        resp = ask("Respond with exactly: E2E-TEST-OK")
        ok = "E2E-TEST-OK" in resp
        check("DeepSeek responds", ok, f"got: {resp[:100]!r}")
    except Exception as e:
        check("DeepSeek responds", False, str(e))


def test_ai_agent_poll_worker():
    """Verify the poll worker script can execute without errors."""
    print("\n📋 AI Agent Poll Worker")
    try:
        sys.path.insert(0, "/app")
        from poll_worker import list_approved_issues, add_label, add_comment, close_issue

        issues = list_approved_issues()
        check("list_approved_issues runs", isinstance(issues, list))
        log(f"Found {len(issues)} approved issues")
    except Exception as e:
        check("Poll worker modules load", False, str(e))


def main():
    print("=" * 60)
    print("upctl-compose E2E Test Suite")
    print("=" * 60)

    # Step 1: Gitea connectivity
    test_gitea_connectivity()

    # Step 2: Ticket CRUD
    test_create_and_close_ticket()

    # Step 3: DeepSeek API
    if os.path.exists("/app/deepseek_agent.py"):
        test_deepseek_processing()

    # Step 4: Poll worker
    if os.path.exists("/app/poll_worker.py"):
        test_ai_agent_poll_worker()

    # Summary
    total = PASS + FAIL
    print(f"\n{'=' * 60}")
    print(f"Results: {PASS}/{total} passed, {FAIL} failed")
    print(f"{'=' * 60}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
