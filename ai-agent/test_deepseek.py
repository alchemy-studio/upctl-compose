"""
Quick smoke test to verify DeepSeek API connectivity.
"""
from deepseek_agent import ask

resp = ask("Say hello in one word")
print(f"ai-agent: DeepSeek API OK, response={resp!r}")
