"""
DeepSeek agent module — interacts with DeepSeek API (OpenAI-compatible).
"""
import os
from openai import OpenAI

DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "deepseek-v4-flash")

_client: OpenAI | None = None


def get_client() -> OpenAI | None:
    """Return the DeepSeek client, or None if API key is missing."""
    global _client
    if _client is None:
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        if not api_key:
            return None
        base_url = os.environ.get("DEEPSEEK_API_BASE", "https://api.deepseek.com")
        _client = OpenAI(api_key=api_key, base_url=base_url)
    return _client


def ask(prompt: str, system: str = "", model: str = DEFAULT_MODEL) -> str:
    """Send a prompt to DeepSeek and return the response text.
    Returns empty string if DEEPSEEK_API_KEY is not configured.
    """
    client = get_client()
    if client is None:
        return ""

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
    )
    return resp.choices[0].message.content or ""
