FROM python:3.12-slim

# Install system dependencies: tmux, git, curl, jq, nodejs for agent workflow
RUN apt-get update && apt-get install -y \
    tmux \
    git \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install deepseek-tui (terminal UI for DeepSeek, YOLO mode for agent tools)
RUN npm install -g deepseek-tui@0.8.22

# Install Python packages for DeepSeek API and HTTP
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Copy agent scripts
COPY deepseek_agent.py poll_worker.py test_deepseek.py entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

WORKDIR /app/workspace

# Health check: verify tmux session exists
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD tmux has-session -t deepseek-agent 2>/dev/null || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
