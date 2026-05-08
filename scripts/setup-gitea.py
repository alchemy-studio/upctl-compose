#!/usr/bin/env python3
"""
Setup Gitea with required organization, repository, and labels.

Runs inside the Docker network (ai-agent container). Tries multiple
ways to reach Gitea: directly (gitea:3000), through nginx (upctl-web:80),
and with sub-path prefix.

If Gitea is not yet installed (root redirects to /install), the
auto-install form is submitted using the env var credentials.
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


def log(msg):
    print(f"  {msg}", flush=True)


def request(url, method="GET", data=None, headers=None, timeout=10):
    """Make an HTTP request and return (status_code, body_bytes)."""
    req = urllib.request.Request(url, data=data, method=method,
                                  headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return 0, str(e).encode()


def gitea_api(gitea_url, path, data=None):
    """Call Gitea REST API."""
    url = f"{gitea_url}/api/v1{path}"
    method = "POST" if data else "GET"
    body = json.dumps(data).encode() if data else None
    status, resp_body = request(url, method=method, data=body,
                                 headers=HEADERS)
    if status >= 200 and status < 300:
        try:
            return json.loads(resp_body) if resp_body else {}
        except json.JSONDecodeError:
            log(f"  JSON parse error for {path}: {resp_body[:100]}")
            return None
    else:
        log(f"  HTTP {status} for {method} {path}: {resp_body[:120].decode(errors='replace')}")
        return None


def check_gitea_root(gitea_url):
    """Check Gitea's root URL to determine install state."""
    status, body = request(gitea_url, timeout=5)
    body_str = body.decode(errors="replace")[:500]
    if status == 200:
        if "install" in body_str.lower():
            log("  Gitea needs install (install page)")
            return "needs_install"
        log("  Gitea root: 200 OK (installed)")
        return "installed"
    elif status in (302, 301):
        log(f"  Gitea redirect (status={status})")
        return "redirect"
    elif status == 404:
        # Try install page at /install
        install_status, install_body = request(f"{gitea_url}/install", timeout=5)
        log(f"  /install: HTTP {install_status}")
        if install_status == 200:
            return "needs_install"
        # Try /user/sign_up as an alternative
        signup_status, signup_body = request(f"{gitea_url}/user/sign_up", timeout=5)
        log(f"  /user/sign_up: HTTP {signup_status}")
        return "unknown"
    else:
        log(f"  Gitea root: status={status}")
        return "unknown"


def auto_install_gitea(gitea_url):
    """Submit Gitea install form with admin credentials."""
    log("  Attempting auto-install...")

    # First, dump the root page to understand what we're dealing with
    root_status, root_body = request(f"{gitea_url}/", timeout=5)
    root_text = root_body.decode(errors="replace")[:1000]
    log(f"  Root page snippet: {root_text[:200]}")

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
    status, body = request(f"{gitea_url}/install", method="POST",
                           data=params, headers=FORM_HEADERS, timeout=30)
    body_str = body.decode(errors="replace")[:200]
    log(f"  Install post to /install: HTTP {status}")
    if status in (200, 302, 303):
        log("  Install successful")
        return True
    else:
        log(f"  /install POST failed: {body_str}")

    # Try install at root path
    status2, body2 = request(gitea_url, method="POST",
                              data=params, headers=FORM_HEADERS, timeout=30)
    body2_str = body2.decode(errors="replace")[:200]
    log(f"  Install post to /: HTTP {status2}")
    if status2 in (200, 302, 303):
        log("  Install successful at root")
        return True
    else:
        log(f"  / POST failed: {body2_str}")
        return False


def wait_for_url(url, max_retries=30, timeout=5):
    """Wait until a URL returns any response."""
    for i in range(max_retries):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return True, resp.status
        except urllib.error.HTTPError as e:
            # HTTP errors still mean the server is responding
            return True, e.code
        except Exception as e:
            if i == 0:
                log(f"  waiting for {url}: {e}")
        time.sleep(2)
    return False, 0


def main():
    print("=== Setting up Gitea ===", flush=True)
    gitea_url = "http://gitea:3000"

    # Wait for Gitea to be reachable
    log(f"Waiting for {gitea_url}...")
    ok, status = wait_for_url(gitea_url)
    if not ok:
        log("ERROR: Cannot reach Gitea")
        return False
    log(f"Gitea reachable (status={status})")

    # Check install state
    state = check_gitea_root(gitea_url)
    if state == "needs_install":
        auto_install_gitea(gitea_url)
        # Wait for install to take effect
        time.sleep(5)
        state = check_gitea_root(gitea_url)

    # Wait for API
    log("Waiting for API...")
    for i in range(30):
        version = gitea_api(gitea_url, "/version")
        if version and "version" in version:
            log(f"API ready (v{version['version']})")
            break
        time.sleep(2)
    else:
        log("WARNING: API not responding, continuing anyway")

    # Wait for admin user
    log("Checking admin user...")
    for i in range(15):
        user = gitea_api(gitea_url, "/user")
        if user and user.get("login"):
            log(f"Admin user: {user['login']}")
            break
        time.sleep(2)
    else:
        log("WARNING: Admin user check failed, continuing anyway")

    # Create the weli organization
    log("Creating 'weli' organization...")
    org = gitea_api(gitea_url, "/orgs", {
        "username": "weli",
        "full_name": "Huiwing",
        "visibility": "public",
    })
    if org and org.get("id"):
        log(f"Organization 'weli' created (id={org['id']})")

    # Create the tickets repository
    log("Creating 'weli/tickets' repository...")
    repo = gitea_api(gitea_url, "/orgs/weli/repos", {
        "name": "tickets",
        "description": "Ticket management repository",
        "auto_init": True,
        "private": False,
    })
    if repo and repo.get("id"):
        log(f"Repository 'weli/tickets' created (id={repo['id']})")
    elif repo and repo.get("name"):
        log(f"Repository already exists: {repo['name']}")

    # Create ticket labels
    log("Creating labels...")
    for label in [
        {"name": "approved", "color": "00ff00", "description": "Approved for processing"},
        {"name": "in_progress", "color": "ffcc00", "description": "Currently being processed"},
        {"name": "blocked", "color": "ff0000", "description": "Blocked - needs attention"},
    ]:
        resp = gitea_api(gitea_url, "/repos/weli/tickets/labels", label)
        if resp and resp.get("name"):
            log(f"  Label '{resp['name']}' created")

    print("=== Gitea setup complete ===", flush=True)
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
