"""
DeepSeek agent module — interacts with DeepSeek API (OpenAI-compatible).
"""
import os
from openai import OpenAI

DEFAULT_MODEL = "deepseek-chat"  # DeepSeek V4

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        base_url = os.environ.get("DEEPSEEK_API_BASE", "https://api.deepseek.com")
        _client = OpenAI(api_key=api_key, base_url=base_url)
    return _client


def ask(prompt: str, system: str = "", model: str = DEFAULT_MODEL) -> str:
    """Send a prompt to DeepSeek and return the response text."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = get_client().chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
    )
    return resp.choices[0].message.content or ""
