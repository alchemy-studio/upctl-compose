"""
Quick smoke test to verify DeepSeek API connectivity.
Skips gracefully if DEEPSEEK_API_KEY is not configured (CI without secrets).
"""
import os
from deepseek_agent import ask

api_key = os.environ.get("DEEPSEEK_API_KEY", "")
if not api_key:
    print("DEEPSEEK_API_KEY not set — skipping DeepSeek smoke test")
    exit(0)

resp = ask("Say hello in one word")
if resp:
    print(f"ai-agent: DeepSeek API OK, response={resp!r}")
else:
    print("ai-agent: DeepSeek API returned empty response (may need API key)")
    exit(1)
