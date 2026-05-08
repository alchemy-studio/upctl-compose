#!/usr/bin/env python3
"""
poll_worker.py — Polls Gitea for approved issues and processes them via DeepSeek.

Runs inside the ai-agent container. Uses upctl-svc as the Gitea API proxy.
"""
import os
import sys
import time
import json
import subprocess
from datetime import datetime, timezone

import requests

GITEA_API_BASE = os.environ.get("GITEA_API_BASE", "http://upctl-svc:3005/api/v2/ts")
GITEA_AUTH = os.environ.get("GITEA_AUTH_HEADER", "Basic YWktYm90OmFpLWJvdC1kZXYtcGFzcw==")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "300"))  # 5 min
HEADERS = {"Authorization": GITEA_AUTH, "Accept": "application/json"}

SESSION_NAME = "deepseek-agent"
WORK_DIR = "/app/workspace"


def log(msg: str):
    ts = datetime.now(timezone.utc).isoformat()
    print(f"[{ts}] {msg}", flush=True)


def list_approved_issues() -> list[dict]:
    """Fetch open approved issues from Gitea (via upctl-svc proxy)."""
    url = f"{GITEA_API_BASE}/tickets"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        issues = data if isinstance(data, list) else data.get("d", [])
        return [
            i for i in issues
            if i.get("state") == "open"
            and any(l.get("name") == "approved" for l in i.get("labels", []))
        ]
    except Exception as e:
        log(f"Error fetching issues: {e}")
        return []


def add_label(issue_num: int, label_id: int = 12):
    """Add label (default: 12 = in_progress)."""
    url = f"{GITEA_API_BASE}/tickets/{issue_num}/labels"
    try:
        resp = requests.post(url, json={"labels": [label_id]}, headers=HEADERS, timeout=15)
        log(f"add_label #{issue_num}: {resp.status_code}")
    except Exception as e:
        log(f"add_label #{issue_num} failed: {e}")


def remove_label(issue_num: int, label_id: int = 12):
    url = f"{GITEA_API_BASE}/tickets/{issue_num}/labels/{label_id}"
    try:
        resp = requests.delete(url, headers=HEADERS, timeout=15)
        log(f"remove_label #{issue_num}: {resp.status_code}")
    except Exception as e:
        log(f"remove_label #{issue_num} failed: {e}")


def add_comment(issue_num: int, body: str):
    url = f"{GITEA_API_BASE}/tickets/{issue_num}/comments"
    try:
        resp = requests.post(url, json={"body": body}, headers=HEADERS, timeout=15)
        log(f"add_comment #{issue_num}: {resp.status_code}")
        return resp.ok
    except Exception as e:
        log(f"add_comment #{issue_num} failed: {e}")
        return False


def close_issue(issue_num: int):
    url = f"{GITEA_API_BASE}/tickets/{issue_num}/close"
    try:
        resp = requests.post(url, headers=HEADERS, timeout=15)
        log(f"close #{issue_num}: {resp.status_code}")
        return resp.ok
    except Exception as e:
        log(f"close #{issue_num} failed: {e}")
        return False


def pick_and_process():
    """Pick the first approved issue and process it."""
    issues = list_approved_issues()
    if not issues:
        log("No approved issues found.")
        return False

    # Sort: urgent first, then by created desc
    def sort_key(i):
        is_urgent = any(l.get("name") == "urgent" for l in i.get("labels", []))
        created = i.get("created_at", "")
        return (0 if is_urgent else 1, created)

    issues.sort(key=sort_key)
    issue = issues[0]
    num = issue["number"]
    title = issue["title"]
    body = issue.get("body", "")

    log(f"Processing issue #{num}: {title}")

    # Skip if already in_progress
    labels = [l.get("name") for l in issue.get("labels", [])]
    if "in_progress" in labels:
        log(f"Issue #{num} already in_progress, skipping")
        return False

    # Add in_progress label
    add_label(num)

    try:
        # Build the prompt for DeepSeek
        prompt = f"""You are a software engineer working on the upctl project.
You have full access to a Linux environment with git, curl, and development tools.

Please process the following ticket:

Title: {title}

Description:
{body}

Work through this ticket step by step. When done, summarize what you did."""

        # Send to DeepSeek via the agent module
        sys.path.insert(0, os.path.dirname(__file__))
        from deepseek_agent import ask

        response = ask(prompt, system="You are a helpful software engineer.")
        log(f"DeepSeek response received ({len(response)} chars)")

        # Post result as comment
        summary = f"## Processing result\n\n{response}\n\n---\n*Processed by DeepSeek Agent*"
        add_comment(num, summary)

        # Remove in_progress and close
        remove_label(num)
        close_issue(num)
        log(f"Issue #{num} completed and closed.")
        return True

    except Exception as e:
        log(f"Error processing issue #{num}: {e}")
        add_comment(num, f"## Error\n\nFailed to process: {e}")
        remove_label(num)
        return False


def ensure_tmux_session():
    """Ensure the tmux session exists for interactive work."""
    result = subprocess.run(
        ["tmux", "has-session", "-t", SESSION_NAME],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        subprocess.run(
            ["tmux", "new-session", "-d", "-s", SESSION_NAME, "-c", WORK_DIR],
            check=True,
        )
        # Display a helpful message in the tmux status
        subprocess.run(
            ["tmux", "send-keys", "-t", SESSION_NAME,
             "echo 'DeepSeek Agent ready. Waiting for tickets...'", "Enter"],
        )
        log(f"Created tmux session '{SESSION_NAME}'")


def main():
    log(f"poll_worker started — interval={POLL_INTERVAL}s")
    os.makedirs(WORK_DIR, exist_ok=True)

    # Start tmux session
    ensure_tmux_session()

    # Main loop
    while True:
        try:
            processed = pick_and_process()
            if not processed:
                log(f"No work. Sleeping {POLL_INTERVAL}s...")
        except KeyboardInterrupt:
            log("Shutting down.")
            break
        except Exception as e:
            log(f"Unexpected error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
