import json
import httpx
from typing import AsyncGenerator

async def complete(
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    reasoning_config: dict | None = None,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    url = f"{base_url}/api/chat"
    payload = {"model": model, "messages": messages, "stream": False, "options": {"temperature": temperature, "num_predict": max_tokens}}
    if reasoning_config and reasoning_config.get("ollama_think") is not None:
        payload["think"] = reasoning_config["ollama_think"]
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")

async def stream(
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    reasoning_config: dict | None = None,
    quiet: bool = False,
) -> AsyncGenerator[str, None]:
    """Stream from Ollama."""
    url = f"{base_url}/api/chat"
    payload = {"model": model, "messages": messages, "stream": True}
    if reasoning_config and reasoning_config.get("ollama_think") is not None:
        payload["think"] = reasoning_config["ollama_think"]
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload) as resp:
            async for line in resp.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        if "message" in data:
                            content = data["message"].get("content", "")
                            if not quiet:
                                print(f"OLLAMA_CHUNK: {content!r}", flush=True)
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue

async def list_models(base_url: str) -> list[str]:
    """List Ollama models."""
    url = f"{base_url}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []
