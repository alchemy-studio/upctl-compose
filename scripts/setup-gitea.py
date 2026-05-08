#!/usr/bin/env python3
"""
Setup Gitea with required organization, repository, and labels.
Runs inside the Docker network (ai-agent container).

Gitea 1.22.6 serves on sub-path /gitea/ (derived from ROOT_URL).
API endpoints: http://gitea:3000/gitea/api/v1/...
"""
import json
import os
import time
import urllib.parse
import urllib.request
import urllib.error

AUTH_HEADER = os.environ.get(
    "GITEA_AUTH_HEADER", "Basic YWktYm90OmFpLWJvdC1kZXYtcGFzcw=="
)
HEADERS = {
    "Authorization": AUTH_HEADER,
    "Content-Type": "application/json",
}
FORM_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
}

GITEA_BASE = "http://gitea:3000/gitea"


def log(msg):
    print(f"  {msg}", flush=True)


def request(url, method="GET", data=None, headers=None, timeout=15):
    req = urllib.request.Request(url, data=data, method=method,
                                  headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return 0, str(e).encode()


def api(path, data=None):
    """Call Gitea REST API at /gitea/api/v1/..."""
    url = f"{GITEA_BASE}/api/v1{path}"
    method = "POST" if data else "GET"
    body = json.dumps(data).encode() if data else None
    status, resp_body = request(url, method=method, data=body, headers=HEADERS)
    if 200 <= status < 300:
        try:
            return json.loads(resp_body) if resp_body else {}
        except json.JSONDecodeError:
            log(f"  JSON parse error: {resp_body[:100]}")
            return None
    else:
        log(f"  HTTP {status} {method} {path}: {resp_body[:120].decode(errors='replace')}")
        return None


def main():
    print("=== Setting up Gitea ===", flush=True)

    # Wait for Gitea to be reachable
    log(f"Waiting for {GITEA_BASE}...")
    for i in range(30):
        status, body = request(GITEA_BASE, timeout=5)
        if status in (200, 302):
            body_str = body.decode(errors="replace")[:200]
            log(f"  Gitea reachable (HTTP {status})")
            if "Installation" in body_str or "install" in body_str.lower():
                log("  Install page detected, submitting install form...")
                # Submit install form at /gitea/install
                params = urllib.parse.urlencode({
                    "db_type": "postgres",
                    "db_host": "postgres:5432",
                    "db_user": "gitea",
                    "db_passwd": "gitea_dev",
                    "db_name": "gitea",
                    "ssl_mode": "disable",
                    "app_name": "Huiwing Ticket System",
                    "repo_root_path": "/data/git/repositories",
                    "lfs_root_path": "/data/git/lfs",
                    "run_user": "git",
                    "domain": "localhost:8088",
                    "ssh_port": "2222",
                    "http_port": "3000",
                    "app_url": "http://localhost:8088/gitea/",
                    "admin_name": "ai-bot",
                    "admin_passwd": "ai-bot-dev-pass",
                    "admin_confirm_passwd": "ai-bot-dev-pass",
                    "admin_email": "ai-bot@example.com",
                }).encode()
                s, b = request(f"{GITEA_BASE}/install", method="POST",
                                data=params, headers=FORM_HEADERS, timeout=30)
                log(f"  Install POST: HTTP {s}")
                if s in (302, 303):
                    log("  Install successful (redirect)")
                    time.sleep(5)
                    break
                elif s == 200:
                    # Check if it's the success page or the form again
                    b_str = b.decode(errors="replace")[:300]
                    if "Installation" not in b_str:
                        log("  Install seems successful")
                        time.sleep(5)
                        break
                    log(f"  Install page again, form may have errors")
                else:
                    log(f"  Install failed: {b.decode(errors='replace')[:200]}")
            else:
                log("  Gitea already installed or in unexpected state")
                break
        log(f"  status={status}, retry {i+1}/30")
        time.sleep(2)
    else:
        log("  WARNING: Gitea not reachable after 30 retries")

    # Wait for API to be ready
    log("Waiting for API...")
    for i in range(30):
        version = api("/version")
        if version and "version" in version:
            log(f"API ready (v{version['version']})")
            break
        time.sleep(2)
    else:
        log("WARNING: API not responding after 30s, may need CLI setup")
        return True  # Don't fail, E2E test will show appropriate errors

    # Wait for admin user
    log("Checking admin user...")
    for i in range(15):
        user = api("/user")
        if user and user.get("login"):
            log(f"Admin user: {user['login']}")
            break
        time.sleep(2)
    else:
        log("WARNING: Admin user not found")

    # Create org
    log("Creating 'weli' organization...")
    org = api("/orgs", {"username": "weli", "full_name": "Huiwing", "visibility": "public"})
    if org and org.get("id"):
        log(f"Organization created (id={org['id']})")

    # Create repo
    log("Creating 'weli/tickets' repository...")
    repo = api("/orgs/weli/repos", {
        "name": "tickets", "description": "Ticket management repository",
        "auto_init": True, "private": False,
    })
    if repo and repo.get("id"):
        log(f"Repository created (id={repo['id']})")

    # Create labels
    log("Creating labels...")
    for label in [
        {"name": "approved", "color": "00ff00", "description": "Approved for processing"},
        {"name": "in_progress", "color": "ffcc00", "description": "Currently being processed"},
        {"name": "blocked", "color": "ff0000", "description": "Blocked - needs attention"},
    ]:
        resp = api("/repos/weli/tickets/labels", label)
        if resp and resp.get("name"):
            log(f"  Label '{resp['name']}' created")

    print("=== Gitea setup complete ===", flush=True)
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
