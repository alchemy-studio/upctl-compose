#!/usr/bin/env python3
"""Test that agent prompt content appears exactly once in tmux pane.

Usage (from upctl-compose root):
  docker compose cp tests/agent_dup_test.py ai-agent:/app/agent_dup_test.py
  docker compose exec -T ai-agent python3 /app/agent_dup_test.py <ticket_num> <jwt_token>
"""
import json, sys, os, time, subprocess

ticket_num = int(sys.argv[1])
jwt = sys.argv[2]

GITEA_API_BASE = os.environ.get("GITEA_API_BASE", "http://upctl-svc:3005/api/v2/upctl/api")
HEADERS = {"Authorization": jwt, "Content-Type": "application/json"}

import requests

# Fetch ticket details
resp = requests.get(f"{GITEA_API_BASE}/tickets/{ticket_num}", headers=HEADERS, timeout=15)
resp.raise_for_status()
d = resp.json().get("d", {})
issue = d.get("issue", {})
title = issue.get("title", "")
body_text = issue.get("body", "")
labels = [l["name"] for l in issue.get("labels", [])]
state = issue.get("state", "")

# Ensure deepseek-tui is running in the tmux session
# (simulating what poll_worker.ensure_tmux_session does)
has_session = subprocess.run(
    ["tmux", "has-session", "-t", "deepseek-agent"],
    capture_output=True
)
if has_session.returncode != 0:
    subprocess.run(["tmux", "new-session", "-d", "-s", "deepseek-agent", "-c", "/app/workspace"], check=True)
    subprocess.run(["tmux", "send-keys", "-t", "deepseek-agent", "deepseek-tui", "Enter"], check=True)
    time.sleep(3)
    print("Started deepseek-tui in new tmux session")
else:
    # Check if deepseek-tui is running in the session
    result = subprocess.run(
        ["tmux", "capture-pane", "-t", "deepseek-agent", "-p", "-S", "-20"],
        capture_output=True, text=True
    )
    pane = result.stdout
    if "deepseek" not in pane.lower() and "chat" not in pane.lower() and "?" not in pane.lower():
        # Session exists but deepseek-tui may not be running; send Ctrl+C then start it
        subprocess.run(["tmux", "send-keys", "-t", "deepseek-agent", "C-c"], check=True)
        time.sleep(1)
        subprocess.run(["tmux", "send-keys", "-t", "deepseek-agent", "deepseek-tui", "Enter"], check=True)
        time.sleep(3)
        print("Started deepseek-tui in existing tmux session")

# Extract unique marker from body (set by Playwright test)
marker = body_text.strip()

# Build prompt (same structure as agent_prompt handler, but with our marker)
prompt = f"## 当前工单 #{ticket_num}\n标题: {title}\n状态: {state}\n"
if labels:
    prompt += f"标签: {', '.join(labels)}\n"
prompt += f"\n## 工单内容\n{body_text}\n"
prompt += f"\n请处理以上工单。\n"

print(f"PROMPT_LEN:{len(prompt)}")
print(f"MARKER_IN_PROMPT:{marker in prompt}")

# Capture pane BEFORE
result_before = subprocess.run(
    ["tmux", "capture-pane", "-t", "deepseek-agent", "-p", "-S", "-200"],
    capture_output=True, text=True
)
before = result_before.stdout
print(f"BEFORE_LEN:{len(before)}")

# Send prompt text (literal mode)
subprocess.run(["tmux", "send-keys", "-l", "-t", "deepseek-agent", "--", prompt], check=True)
time.sleep(1)

# Send first Enter
subprocess.run(["tmux", "send-keys", "-t", "deepseek-agent", "Enter"], check=True)
time.sleep(0.5)

# Send second Enter (as send_prompt does)
subprocess.run(["tmux", "send-keys", "-t", "deepseek-agent", "Enter"], check=True)
time.sleep(2)

# Capture pane AFTER
result_after = subprocess.run(
    ["tmux", "capture-pane", "-t", "deepseek-agent", "-p", "-S", "-200"],
    capture_output=True, text=True
)
after = result_after.stdout

# Find new content (everything after the previous capture)
new_content = after[len(before):] if len(after) > len(before) else after
print(f"NEW_CONTENT_LEN:{len(new_content)}")

# Count marker and ticket ref in new content
marker_count = new_content.count(marker)
ticket_ref_count = new_content.count(f"#{ticket_num}")
title_count = new_content.count(title)

print(f"MARKER_COUNT:{marker_count}")
print(f"TICKET_REF_COUNT:{ticket_ref_count}")
print(f"TITLE_COUNT:{title_count}")
print(f"NEW_CONTENT_PREVIEW:{new_content[:300]!r}")
print("DONE")
