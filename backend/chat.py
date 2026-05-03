# backend/chat.py
from typing import AsyncGenerator, Optional

from config import get_config, ProviderConfig
from providers import ollama, openai, anthropic


async def complete_chat(
    messages: list[dict[str, str]],
    model: str | None = None,
    provider_id: str | None = None,
    reasoning_config: dict | None = None,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    """Get a non-streaming chat completion from the selected provider."""
    cfg = get_config()

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
        return await ollama.complete(provider.base_url, model, messages, reasoning_config, temperature, max_tokens)
    elif provider.type == "openai":
        return await openai.complete(provider.base_url, provider.api_key, model, messages, temperature, max_tokens)
    elif provider.type == "anthropic":
        return await anthropic.complete(provider.api_key, model, messages, temperature, max_tokens)
    else:
        raise ValueError(f"Unsupported provider type: {provider.type}")


async def stream_chat(
    messages: list[dict[str, str]],
    model: str | None = None,
    provider_id: str | None = None,
    reasoning_config: dict | None = None,
    quiet: bool = False,
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
        async for chunk in ollama.stream(provider.base_url, model, messages, reasoning_config, quiet=quiet):
            yield chunk
    elif provider.type == "openai":
        async for chunk in openai.stream(provider.base_url, provider.api_key, model, messages, quiet=quiet):
            yield chunk
    elif provider.type == "anthropic":
        async for chunk in anthropic.stream(provider.api_key, model, messages, quiet=quiet):
            yield chunk


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
        try:
            if provider.type == "ollama":
                models = await ollama.list_models(provider.base_url)
            elif provider.type == "openai":
                models = await openai.list_models(provider.base_url, provider.api_key)
            elif provider.type == "anthropic":
                models = anthropic.list_models()
        except Exception as e:
            print(f"Error listing models for provider {provider.name}: {e}")
            continue

        for m_name in models:
            all_models.append({
                "id": m_name,
                "name": m_name,
                "provider_id": provider.id,
                "provider_name": provider.name,
                "provider_type": provider.type
            })
            
    return all_models


async def embed_text(text: str, provider_id: str | None = None, model: str | None = None) -> list[float]:
    """Get embeddings for a piece of text via LangChain's embedding interface."""
    from vectorstore import ProviderEmbeddings

    cfg = get_config()

    if provider_id:
        provider = next((p for p in cfg.providers if p.id == provider_id), None)
    elif cfg.active_provider_id:
        provider = next((p for p in cfg.providers if p.id == cfg.active_provider_id), None)
    else:
        provider = cfg.providers[0] if cfg.providers else None

    if not provider:
        raise ValueError("No providers configured")

    embeddings = ProviderEmbeddings(provider_id=provider.id, model=model)
    return embeddings.embed_query(text)
