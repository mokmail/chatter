import json
import httpx
from typing import AsyncGenerator

async def complete(
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    system_prompt = ""
    refined_messages = []
    for m in messages:
        if m["role"] == "system":
            system_prompt += m["content"] + "\n"
        else:
            refined_messages.append(m)
    payload = {
        "model": model,
        "messages": refined_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if system_prompt:
        payload["system"] = system_prompt.strip()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if data.get("content"):
            return data["content"][0].get("text", "")
        return ""

async def stream(
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    quiet: bool = False,
) -> AsyncGenerator[str, None]:
    """Stream from Anthropic API."""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    
    # Anthropic expects 'assistant' and 'user' roles. 
    # System message must be separate.
    system_prompt = ""
    refined_messages = []
    for m in messages:
        if m["role"] == "system":
            system_prompt += m["content"] + "\n"
        else:
            refined_messages.append(m)

    payload = {
        "model": model,
        "messages": refined_messages,
        "max_tokens": 4096,
        "stream": True,
    }
    if system_prompt:
        payload["system"] = system_prompt.strip()

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            async for line in resp.aiter_lines():
                if line and line.startswith("data: "):
                    data_str = line[6:]
                    try:
                        data = json.loads(data_str)
                        if data.get("type") == "content_block_delta":
                            content = data["delta"].get("text", "")
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue

def list_models() -> list[str]:
    return ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
