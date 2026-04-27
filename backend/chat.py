"""LLM integration for Ollama, OpenAI, and Anthropic APIs."""
import json
from typing import AsyncGenerator, Optional

import httpx

from config import get_config, ProviderConfig


async def stream_chat(
    messages: list[dict[str, str]],
    model: str | None = None,
    provider_id: str | None = None,
    reasoning_config: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream a chat completion from the selected provider."""
    cfg = get_config()

    # Resolve provider and model
    provider: Optional[ProviderConfig] = None
    if provider_id:
        provider = next((p for p in cfg.providers if p.id == provider_id), None)

    if not provider and cfg.active_provider_id:
        provider = next((p for p in cfg.providers if p.id == cfg.active_provider_id), None)

    if not provider:
        if cfg.providers:
            provider = cfg.providers[0]
        else:
            raise ValueError("No providers configured")

    model = model or cfg.active_model

    if provider.type == "ollama":
        async for chunk in _stream_ollama(provider.base_url, model, messages, reasoning_config):
            yield chunk
    elif provider.type == "openai":
        async for chunk in _stream_openai(provider.base_url, provider.api_key, model, messages):
            yield chunk
    elif provider.type == "anthropic":
        async for chunk in _stream_anthropic(provider.api_key, model, messages):
            yield chunk


async def _stream_ollama(
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    reasoning_config: dict | None = None,
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
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue


async def _stream_openai(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    """Stream from OpenAI-compatible API."""
    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST", url, json={"model": model, "messages": messages, "stream": True}, headers=headers
        ) as resp:
            async for line in resp.aiter_lines():
                if line and line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        choices = data.get("choices", [])
                        if choices and "delta" in choices[0]:
                            content = choices[0]["delta"].get("content", "")
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue


async def _stream_anthropic(
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
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


async def list_models(provider_id: str | None = None) -> list[dict]:
    """List available models from all providers or a specific one."""
    cfg = get_config()
    
    providers_to_query = cfg.providers
    if provider_id:
        providers_to_query = [p for p in cfg.providers if p.id == provider_id]

    all_models = []
    for provider in providers_to_query:
        if not provider.is_active:
            continue
            
        models = []
        if provider.type == "ollama":
            models = await _list_ollama_models(provider.base_url)
        elif provider.type == "openai":
            models = await _list_openai_models(provider.base_url, provider.api_key)
        elif provider.type == "anthropic":
            models = ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]

        for m_name in models:
            all_models.append({
                "id": m_name,
                "name": m_name,
                "provider_id": provider.id,
                "provider_name": provider.name,
                "provider_type": provider.type
            })
            
    return all_models


async def _list_ollama_models(base_url: str) -> list[str]:
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


async def _list_openai_models(base_url: str, api_key: str) -> list[str]:
    """List OpenAI-compatible models."""
    url = f"{base_url}/models"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return [m["id"] for m in data.get("data", [])]
    except Exception:
        if "openai.com" in base_url:
            return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
        return []


async def embed_text(text: str, provider_id: str | None = None, model: str | None = None) -> list[float]:
    """Get embeddings for a piece of text."""
    cfg = get_config()
    
    provider = None
    if provider_id:
        provider = next((p for p in cfg.providers if p.id == provider_id), None)
    
    if not provider and cfg.active_provider_id:
        provider = next((p for p in cfg.providers if p.id == cfg.active_provider_id), None)
        
    if not provider:
        if cfg.providers:
            provider = cfg.providers[0]
        else:
            raise ValueError("No providers configured")

    if not model:
        model = "nomic-embed-text" if provider.type == "ollama" else "text-embedding-3-small"

    if provider.type == "ollama":
        return await _embed_ollama(provider.base_url, model, text)
    elif provider.type == "openai":
        return await _embed_openai(provider.base_url, provider.api_key, model, text)
    else:
        raise ValueError(f"Provider {provider.type} does not support embeddings yet")


async def _embed_ollama(base_url: str, model: str, text: str) -> list[float]:
    """Get embeddings from Ollama."""
    url = f"{base_url}/api/embed"
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(url, json={"model": model, "input": text})
            if resp.status_code == 404:
                url = f"{base_url}/api/embeddings"
                resp = await client.post(url, json={"model": model, "prompt": text})
            
            resp.raise_for_status()
            data = resp.json()
            
            if "embeddings" in data:
                return data["embeddings"][0]
            return data.get("embedding", [])
        except Exception as e:
            print(f"Error embedding with Ollama: {e}")
            raise


async def _embed_openai(base_url: str, api_key: str, model: str, text: str) -> list[float]:
    """Get embeddings from OpenAI-compatible API."""
    url = f"{base_url}/embeddings"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    emb_model = "text-embedding-3-small" if "gpt" in model.lower() and "openai.com" in base_url else model

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            json={"model": emb_model, "input": text},
            headers=headers
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [{}])[0].get("embedding", [])
