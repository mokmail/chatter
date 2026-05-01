"""Configuration management for CIO Intelligence Hub."""
import os
import uuid
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ProviderConfig(BaseModel):
    """Configuration for a single AI provider."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: Literal["ollama", "openai", "anthropic"]
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    is_active: bool = True


class Config(BaseModel):
    """Application configuration."""
    providers: list[ProviderConfig] = []
    active_model: str = "llama3.2"
    active_provider_id: Optional[str] = None
    enhance_provider: Optional[str] = None
    enhance_model: Optional[str] = None
    followup_auto_generate: bool = True
    followup_keep_in_chat: bool = False
    followup_insert_to_input: bool = False
    iframe_same_origin: bool = False
    artifacts_enabled: bool = True
    artifacts_auto_open: bool = True
    reasoning_enabled: bool = True
    reasoning_mode: Literal["default", "enabled", "disabled", "custom"] = "default"
    reasoning_custom_start: str = ""
    reasoning_custom_end: str = ""
    ollama_think: Optional[bool] = None
    reasoning_effort: Optional[str] = None
    rag_system_context: bool = False
    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 100
    rag_min_chunk_size: int = 0
    rag_hybrid_search: bool = True
    rag_reranking: bool = True
    rag_top_k: int = 10
    web_search_enabled: bool = True
    web_search_provider: Literal["duckduckgo", "serpapi", "searxng"] = "duckduckgo"
    web_search_api_key: Optional[str] = None
    web_search_result_count: int = 10
    web_search_serpapi_base_url: Optional[str] = None
    web_search_searxng_base_url: Optional[str] = None
    graphrag_extraction_model: Optional[str] = None
    graphrag_default_mode: Literal["local", "global", "hybrid", "path", "neighborhood"] = "local"
    graphrag_max_depth: int = 2
    graphrag_top_k: int = 5
    neo4j_uri: Optional[str] = None
    neo4j_user: Optional[str] = None
    neo4j_password: Optional[str] = None

CONFIG_DIR = Path.home() / ".cio-intelligence-hub"
CONFIG_FILE = CONFIG_DIR / "config.json"


def load_config() -> Config:
    """Load configuration from file or return defaults."""
    if CONFIG_FILE.exists():
        import json
        try:
            with open(CONFIG_FILE) as f:
                data = json.load(f)
            cfg = Config(**data)
            
            # Docker Override: If running in Docker and OLLAMA_BASE_URL is set, 
            # ensure providers pointing to localhost use the correct host address
            ollama_override = os.getenv("OLLAMA_BASE_URL")
            if ollama_override:
                for p in cfg.providers:
                    if p.type == "ollama" and ("localhost" in (p.base_url or "") or "127.0.0.1" in (p.base_url or "")):
                        p.base_url = ollama_override
            return cfg
        except Exception as e:
            print(f"Error loading config: {e}. Falling back to default.")
            # Fallback for old config format or corrupted file
            if 'data' in locals() and isinstance(data, dict):
                old_data = data
                cfg = Config()
                if "provider" in old_data:
                    p_type = old_data["provider"]
                    p_name = "Default Ollama" if p_type == "ollama" else "Default OpenAI"
                    p_id = "default-" + p_type
                    p_config = ProviderConfig(
                        id=p_id,
                        name=p_name,
                        type=p_type,
                        base_url=old_data.get("ollama_base_url") if p_type == "ollama" else old_data.get("openai_base_url"),
                        api_key=old_data.get("openai_api_key"),
                    )
                    cfg.providers = [p_config]
                    cfg.active_provider_id = p_id
                    cfg.active_model = old_data.get("model", "llama3.2")
            return cfg
    
    # Default initial config
    cfg = Config()
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    cfg.providers = [
        ProviderConfig(id="default-ollama", name="Ollama Local", type="ollama", base_url=ollama_url),
    ]
    cfg.active_provider_id = "default-ollama"
    return cfg


def save_config(config: Config) -> None:
    """Save configuration to file."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    import json
    with open(CONFIG_FILE, "w") as f:
        json.dump(config.model_dump(), f, indent=2)


_current_config = load_config()


def get_config() -> Config:
    """Get current configuration."""
    return _current_config


def update_config(**kwargs) -> Config:
    """Update configuration fields."""
    global _current_config
    data = _current_config.model_dump()
    data.update(kwargs)
    _current_config = Config(**data)
    save_config(_current_config)
    return _current_config


def add_provider(name: str, p_type: str, base_url: str = None, api_key: str = None) -> ProviderConfig:
    """Add a new provider."""
    global _current_config
    p = ProviderConfig(name=name, type=p_type, base_url=base_url, api_key=api_key)
    _current_config.providers.append(p)
    save_config(_current_config)
    return p


def remove_provider(provider_id: str) -> bool:
    """Remove a provider."""
    global _current_config
    initial_len = len(_current_config.providers)
    _current_config.providers = [p for p in _current_config.providers if p.id != provider_id]
    if len(_current_config.providers) < initial_len:
        save_config(_current_config)
        return True
    return False
