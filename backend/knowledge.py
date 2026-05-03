"""Knowledge base management for RAG."""
import json
import time
import uuid
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, model_validator


class KBFile(BaseModel):
    """A file within a knowledge base."""
    id: str = ""
    name: str
    content: str = ""
    content_url: str = ""  # For URL type KBs - the actual URL
    metadata: dict = {}   # For storing chunk info, embeddings, etc.
    file_type: str = "text"
    size_bytes: int = 0
    token_count: int = 0
    chunks_count: int = 0
    is_embedded: bool = False
    created_at: float = time.time()

    @model_validator(mode='before')
    @classmethod
    def set_uuid_if_missing_kbfile(cls, data):
        """Generate a UUID if id is not provided or empty."""
        if isinstance(data, dict):
            if not data.get('id') or data.get('id') == "":
                data['id'] = str(uuid.uuid4())
        return data


class KnowledgeBase(BaseModel):
    """A knowledge base containing files for RAG."""
    id: str = ""
    name: str
    description: str = ""
    kb_type: Literal["knowledge", "vectorstore", "graphrag"] = "knowledge"
    retrieval_mode: Literal["focused", "full"] = "focused"
    hybrid_search: bool = True
    reranking: bool = True
    chunk_size: int = 1000
    chunk_overlap: int = 100
    storage_path: str = ""
    embedding_model: str = ""
    embedding_dimensions: int = 0
    last_embedded_at: float = 0.0
    total_tokens: int = 0
    total_chunks: int = 0
    total_size_bytes: int = 0
    files: list[KBFile] = []
    config: dict = {}  # Type-specific config (embeddings path, API endpoint, etc.)
    created_at: float = time.time()
    updated_at: float = time.time()

    @model_validator(mode='before')
    @classmethod
    def set_uuid_if_missing_kb(cls, data):
        """Generate a UUID if id is not provided or empty."""
        if isinstance(data, dict):
            if not data.get('id') or data.get('id') == "":
                data['id'] = str(uuid.uuid4())
        return data


class KnowledgeStore:
    """File-based knowledge base storage."""

    def __init__(self):
        self.dir_path = Path.home() / ".cio-intelligence-hub" / "knowledge"
        self.dir_path.mkdir(parents=True, exist_ok=True)

    def _kb_file(self, kb_id: str) -> Path:
        return self.dir_path / f"{kb_id}.json"

    def list_all(self) -> list[KnowledgeBase]:
        """List all knowledge bases."""
        kbs = []
        for f in self.dir_path.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                # Migration: Convert old types to new unified type
                old_types = {"text", "files", "web", "api", "notes", "document"}
                if data.get("kb_type") in old_types:
                    data["kb_type"] = "knowledge"
                    f.write_text(json.dumps(data, indent=2))
                kbs.append(KnowledgeBase(**data))
            except Exception as e:
                print(f"Error loading knowledge base from {f}: {e}")
        return sorted(kbs, key=lambda x: x.updated_at, reverse=True)

    def get(self, kb_id: str) -> KnowledgeBase | None:
        """Get a knowledge base by ID."""
        path = self._kb_file(kb_id)
        if not path.exists():
            return None
        return KnowledgeBase(**json.loads(path.read_text()))

    def create(self, name: str, description: str = "", kb_type: str = "knowledge", config: dict = None, kb_id: str = None) -> KnowledgeBase:
        """Create a new knowledge base."""
        kwargs = {"name": name, "description": description, "kb_type": kb_type, "config": config or {}}
        if kb_id:
            kwargs["id"] = kb_id
        
        # Migration: Convert old types to new unified type
        old_types = {"text", "files", "web", "api", "notes", "document"}
        if kwargs.get("kb_type") in old_types:
            kwargs["kb_type"] = "knowledge"
        
        kb = KnowledgeBase(**kwargs)
        self._save(kb)
        return kb

    def update(self, kb: KnowledgeBase) -> KnowledgeBase:
        """Update a knowledge base."""
        kb.updated_at = time.time()
        kb.total_tokens = sum(f.token_count for f in kb.files)
        kb.total_chunks = sum(f.chunks_count for f in kb.files)
        kb.total_size_bytes = sum(f.size_bytes for f in kb.files)
        self._save(kb)
        return kb

    def delete(self, kb_id: str) -> bool:
        """Delete a knowledge base."""
        path = self._kb_file(kb_id)
        if path.exists():
            path.unlink()
            return True
        return False

    def add_file(self, kb_id: str, name: str, content: str = "", file_type: str = "text", content_url: str = "", metadata: dict = None) -> KBFile | None:
        """Add a file to a knowledge base."""
        kb = self.get(kb_id)
        if not kb:
            return None
        file = KBFile(name=name, content=content, file_type=file_type, content_url=content_url, metadata=metadata or {})
        kb.files.append(file)
        self.update(kb)
        return file

    def update_file(self, kb_id: str, file_id: str, updates: dict) -> KBFile | None:
        """Update a file's content or metadata."""
        kb = self.get(kb_id)
        if not kb:
            return None
        for f in kb.files:
            if f.id == file_id:
                for key, value in updates.items():
                    if hasattr(f, key):
                        setattr(f, key, value)
                self.update(kb)
                return f
        return None

    def remove_file(self, kb_id: str, file_id: str) -> bool:
        """Remove a file from a knowledge base."""
        kb = self.get(kb_id)
        if not kb:
            return False
        kb.files = [f for f in kb.files if f.id != file_id]
        self.update(kb)
        return True

    def remove_files_by_source(self, kb_id: str, source_id: str) -> list[str]:
        """Remove all files belonging to a source. Returns list of removed file IDs."""
        kb = self.get(kb_id)
        if not kb:
            return []
        removed_ids = [f.id for f in kb.files if f.metadata.get("source_id") == source_id]
        if removed_ids:
            kb.files = [f for f in kb.files if f.metadata.get("source_id") != source_id]
            self.update(kb)
        return removed_ids

    def _save(self, kb: KnowledgeBase) -> None:
        """Save knowledge base to file."""
        path = self._kb_file(kb.id)
        data = kb.model_dump()
        # Don't serialize empty string IDs - skip to avoid overwriting
        if not data.get('id'):
            return
        path.write_text(json.dumps(data, indent=2))


_store = KnowledgeStore()


def list_knowledge_bases() -> list[KnowledgeBase]:
    """List all knowledge bases."""
    return _store.list_all()


def get_knowledge_base(kb_id: str) -> KnowledgeBase | None:
    """Get a knowledge base by ID."""
    return _store.get(kb_id)


def create_knowledge_base(name: str, description: str = "", kb_type: str = "knowledge", config: dict = None, kb_id: str = None) -> KnowledgeBase:
    """Create a new knowledge base."""
    return _store.create(name, description, kb_type, config, kb_id)


def update_knowledge_base(kb: KnowledgeBase) -> KnowledgeBase:
    """Update a knowledge base."""
    return _store.update(kb)


def delete_knowledge_base(kb_id: str) -> bool:
    """Delete a knowledge base."""
    return _store.delete(kb_id)


def add_file_to_knowledge_base(kb_id: str, name: str, content: str = "", file_type: str = "text", content_url: str = "", metadata: dict = None) -> KBFile | None:
    """Add a file to a knowledge base."""
    return _store.add_file(kb_id, name, content, file_type, content_url, metadata)


def update_file_in_knowledge_base(kb_id: str, file_id: str, updates: dict) -> KBFile | None:
    """Update a file in a knowledge base."""
    return _store.update_file(kb_id, file_id, updates)


def remove_file_from_knowledge_base(kb_id: str, file_id: str) -> bool:
    """Remove a file from a knowledge base."""
    return _store.remove_file(kb_id, file_id)


def remove_files_by_source(kb_id: str, source_id: str) -> list[str]:
    """Remove all files belonging to a source from a knowledge base."""
    return _store.remove_files_by_source(kb_id, source_id)
