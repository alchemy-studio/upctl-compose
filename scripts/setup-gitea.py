#!/usr/bin/env python3
"""
Setup Gitea with required organization, repository, and labels.
Runs inside the Docker network (ai-agent container) and tries multiple
ways to reach Gitea: directly (gitea:3000) and through nginx (upctl-web:80).
"""
import json
import os
import time
import urllib.request
import urllib.error

GITEA_URLS = [
    os.environ.get("GITEA_URL", "http://gitea:3000"),
    "http://upctl-web:80/gitea",
]
AUTH_HEADER = os.environ.get(
    "GITEA_AUTH_HEADER", "Basic YWktYm90OmFpLWJvdC1kZXYtcGFzcw=="
)
HEADERS = {
    "Authorization": AUTH_HEADER,
    "Content-Type": "application/json",
}


def log(msg):
    print(f"  {msg}", flush=True)


def gitea_get(base_url, path):
    """Make GET request to Gitea API."""
    url = f"{base_url}/api/v1{path}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        log(f"  HTTP {e.code} for GET {path}: {body}")
        return None
    except Exception as e:
        log(f"  Error GET {path}: {e}")
        return None


def gitea_post(base_url, path, data):
    """Make POST request to Gitea API."""
    url = f"{base_url}/api/v1{path}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_body = resp.read().decode()
            return json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        log(f"  HTTP {e.code} for POST {path}: {body}")
        return None
    except Exception as e:
        log(f"  Error POST {path}: {e}")
        return None


def wait_for_gitea(gitea_url, max_retries=30):
    """Wait until Gitea API responds."""
    log(f"Waiting for Gitea API at {gitea_url}...")
    for i in range(max_retries):
        version = gitea_get(gitea_url, "/version")
        if version and "version" in version:
            log(f"Gitea ready (v{version['version']}) at {gitea_url}")
            return True
        log(f"  retry {i+1}/{max_retries}")
        time.sleep(2)
    return False


def wait_for_admin(gitea_url, max_retries=15):
    """Wait until admin user is available."""
    log("Checking admin user...")
    for i in range(max_retries):
        user = gitea_get(gitea_url, "/user")
        if user and user.get("login"):
            log(f"Admin user: {user['login']}")
            return True
        log(f"  retry {i+1}/{max_retries}")
        time.sleep(2)
    return False


def main():
    print("=== Setting up Gitea ===", flush=True)

    # Find a working URL
    working_url = None
    for url in GITEA_URLS:
        log(f"Trying {url}...")
        if wait_for_gitea(url, max_retries=5):
            working_url = url
            break

    if not working_url:
        log("Trying with longer wait...")
        for url in GITEA_URLS:
            if wait_for_gitea(url):
                working_url = url
                break

    if not working_url:
        log("ERROR: Cannot reach Gitea API. Giving up.")
        return False

    log(f"Using Gitea URL: {working_url}")

    wait_for_admin(working_url)

    # Create the weli organization
    log("Creating 'weli' organization...")
    org = gitea_post(working_url, "/orgs", {
        "username": "weli",
        "full_name": "Huiwing",
        "visibility": "public",
    })
    if org and org.get("id"):
        log(f"Organization 'weli' created (id={org['id']})")
    elif org and "already" in str(org).lower():
        log("Organization already exists")

    # Create the tickets repository
    log("Creating 'weli/tickets' repository...")
    repo = gitea_post(working_url, "/orgs/weli/repos", {
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
        resp = gitea_post(working_url, "/repos/weli/tickets/labels", label)
        if resp and resp.get("name"):
            log(f"  Label '{resp['name']}' created")

    print("=== Gitea setup complete ===", flush=True)
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
