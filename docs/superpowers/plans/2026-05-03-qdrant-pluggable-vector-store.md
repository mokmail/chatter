# Qdrant Pluggable Vector Store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Qdrant as a pluggable vector database backend alongside ChromaDB, with an abstract interface, registry pattern, and GraphRAG refactoring.

**Architecture:** Adapter Registry pattern — `VectorStoreBase` abstract class with `ChromaAdapter` (extracted from existing code) and `QdrantAdapter` (new). A `registry.py` resolves which backend to use based on KB config. `vectorstore.py` becomes a thin facade that delegates vector operations to adapters while retaining BM25/reranker logic. GraphRAG community summary embeddings also route through the registry.

**Tech Stack:** Python 3.12, FastAPI, qdrant-client, ChromaDB (existing), networkx, Pydantic

---

### Task 1: Create VectorStoreBase abstract interface and data types

**Files:**
- Create: `backend/vector_stores/__init__.py`
- Create: `backend/vector_stores/base.py`

- [ ] **Step 1: Create the `vector_stores` package directory**

```bash
mkdir -p backend/vector_stores
```

- [ ] **Step 2: Create `backend/vector_stores/__init__.py`**

```python
"""Pluggable vector store backends for knowledge base embeddings."""
from vector_stores.base import VectorStoreBase, QueryResult, ChunkRecord
from vector_stores.registry import get_vector_store

__all__ = ["VectorStoreBase", "QueryResult", "ChunkRecord", "get_vector_store"]
```

- [ ] **Step 3: Create `backend/vector_stores/base.py` with the abstract interface and data types**

```python
"""Abstract base class for vector store backends."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ChunkRecord:
    """A single chunk stored in a vector store collection."""
    id: str
    text: str
    metadata: dict = field(default_factory=dict)


@dataclass
class QueryResult:
    """Result from a vector store similarity query."""
    ids: list[str] = field(default_factory=list)
    texts: list[str] = field(default_factory=list)
    distances: list[float] = field(default_factory=list)
    metadatas: list[dict] = field(default_factory=list)


class VectorStoreBase(ABC):
    """Abstract interface for vector store operations.

    Each backend (ChromaDB, Qdrant, etc.) implements this interface.
    Collections are identified by kb_id and named with the prefix 'kb_'.
    """

    @abstractmethod
    async def create_collection(self, kb_id: str, dimension: int) -> None:
        """Create a new collection for a knowledge base.

        Args:
            kb_id: Knowledge base ID (used to derive collection name).
            dimension: Embedding vector dimension (required by some backends like Qdrant).
        """
        ...

    @abstractmethod
    async def add_embeddings(
        self,
        kb_id: str,
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict],
        ids: list[str],
    ) -> None:
        """Add embedded documents to a collection.

        Args:
            kb_id: Knowledge base ID.
            texts: Original text for each chunk.
            embeddings: Pre-computed embedding vectors.
            metadatas: Metadata dicts for each chunk.
            ids: Unique IDs for each chunk.
        """
        ...

    @abstractmethod
    async def query(
        self,
        kb_id: str,
        query_embedding: list[float],
        n_results: int = 10,
        where: dict | None = None,
    ) -> QueryResult:
        """Query a collection for similar vectors.

        Args:
            kb_id: Knowledge base ID.
            query_embedding: The query vector.
            n_results: Maximum number of results to return.
            where: Optional metadata filter (e.g., {"source_id": "abc"}).

        Returns:
            QueryResult with ids, texts, distances, and metadatas.
        """
        ...

    @abstractmethod
    async def delete_collection(self, kb_id: str) -> None:
        """Delete an entire collection for a knowledge base."""
        ...

    @abstractmethod
    async def delete_source_chunks(self, kb_id: str, source_id: str) -> int:
        """Delete all chunks matching a source_id metadata filter.

        Args:
            kb_id: Knowledge base ID.
            source_id: Source ID to match in metadata.

        Returns:
            Number of chunks deleted.
        """
        ...

    @abstractmethod
    async def get_all_embeddings(self, kb_id: str) -> list[ChunkRecord]:
        """Get all chunks and their metadata from a collection.

        Args:
            kb_id: Knowledge base ID.

        Returns:
            List of ChunkRecord objects.
        """
        ...

    @abstractmethod
    async def collection_exists(self, kb_id: str) -> bool:
        """Check if a collection exists for the given kb_id."""
        ...

    @abstractmethod
    async def get_collection_count(self, kb_id: str) -> int:
        """Get the number of documents in a collection."""
        ...
```

- [ ] **Step 4: Verify the module is importable**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from vector_stores.base import VectorStoreBase, QueryResult, ChunkRecord; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/vector_stores/__init__.py backend/vector_stores/base.py
git commit -m "feat: add VectorStoreBase abstract interface and data types"
```

---

### Task 2: Create the registry module

**Files:**
- Create: `backend/vector_stores/registry.py`

- [ ] **Step 1: Create `backend/vector_stores/registry.py`**

```python
"""Registry for vector store backends.

Usage:
    from vector_stores import get_vector_store

    store = get_vector_store("chroma")  # returns ChromaAdapter
    store = get_vector_store("qdrant")  # returns QdrantAdapter
"""
from vector_stores.base import VectorStoreBase

_backends: dict[str, type[VectorStoreBase]] = {}


def register_backend(name: str, cls: type[VectorStoreBase]) -> None:
    """Register a vector store backend class under a given name."""
    if not issubclass(cls, VectorStoreBase):
        raise TypeError(f"{cls} is not a subclass of VectorStoreBase")
    _backends[name] = cls


def get_vector_store(backend: str = "chroma", **kwargs) -> VectorStoreBase:
    """Instantiate a vector store backend by name.

    Args:
        backend: Backend name (e.g., "chroma", "qdrant").
        **kwargs: Additional arguments passed to the backend constructor.

    Returns:
        An instance of the requested VectorStoreBase subclass.

    Raises:
        ValueError: If the backend name is not registered.
    """
    cls = _backends.get(backend)
    if cls is None:
        available = ", ".join(_backends.keys()) if _backends else "none registered"
        raise ValueError(f"Unknown vector store backend: '{backend}'. Available: {available}")
    return cls(**kwargs)


def list_backends() -> list[str]:
    """Return names of all registered backends."""
    return list(_backends.keys())
```

- [ ] **Step 2: Verify the registry module imports**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from vector_stores.registry import get_vector_store, list_backends; print(list_backends())"`
Expected: `[]` (no backends registered yet)

- [ ] **Step 3: Commit**

```bash
git add backend/vector_stores/registry.py
git commit -m "feat: add vector store backend registry"
```

---

### Task 3: Extract ChromaDB code into ChromaAdapter

**Files:**
- Create: `backend/vector_stores/chroma_adapter.py`
- Modify: `backend/vector_stores/__init__.py` (add auto-registration)

This task extracts all direct ChromaDB calls from `vectorstore.py` into a `ChromaAdapter` class that implements `VectorStoreBase`. The existing `vectorstore.py` will be refactored in Task 5.

- [ ] **Step 1: Create `backend/vector_stores/chroma_adapter.py`**

```python
"""ChromaDB adapter for the vector store interface."""
from pathlib import Path
from typing import Any

import chromadb
from chromadb.config import Settings

from vector_stores.base import VectorStoreBase, ChunkRecord, QueryResult

STORAGE_PATH = Path.home() / ".cio-intelligence-hub" / "chroma"
STORAGE_PATH.mkdir(parents=True, exist_ok=True)

_client = chromadb.PersistentClient(
    path=str(STORAGE_PATH),
    settings=Settings(allow_reset=True),
)


def _collection_name(kb_id: str) -> str:
    """Derive ChromaDB collection name from kb_id."""
    return f"kb_{kb_id}"


class ChromaAdapter(VectorStoreBase):
    """ChromaDB vector store backend using PersistentClient."""

    async def create_collection(self, kb_id: str, dimension: int) -> None:
        """Get or create a ChromaDB collection. Dimension is ignored (ChromaDB auto-detects)."""
        _client.get_or_create_collection(name=_collection_name(kb_id))

    async def add_embeddings(
        self,
        kb_id: str,
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict],
        ids: list[str],
    ) -> None:
        collection = _client.get_or_create_collection(name=_collection_name(kb_id))
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts,
        )

    async def query(
        self,
        kb_id: str,
        query_embedding: list[float],
        n_results: int = 10,
        where: dict | None = None,
    ) -> QueryResult:
        collection = _client.get_or_create_collection(name=_collection_name(kb_id))
        kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
        }
        if where:
            kwargs["where"] = where
        results = collection.query(**kwargs)

        ids = results.get("ids", [[]])[0]
        texts = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        return QueryResult(
            ids=ids,
            texts=texts,
            distances=distances,
            metadatas=metadatas,
        )

    async def delete_collection(self, kb_id: str) -> None:
        try:
            _client.delete_collection(name=_collection_name(kb_id))
        except Exception:
            pass

    async def delete_source_chunks(self, kb_id: str, source_id: str) -> int:
        try:
            collection = _client.get_or_create_collection(name=_collection_name(kb_id))
            results = collection.get(where={"source_id": source_id})
            if results and results.get("ids"):
                collection.delete(ids=results["ids"])
                return len(results["ids"])
            return 0
        except Exception:
            return 0

    async def get_all_embeddings(self, kb_id: str) -> list[ChunkRecord]:
        collection = _client.get_collection(name=_collection_name(kb_id))
        results = collection.get()
        items = []
        if results and results.get("ids"):
            for i in range(len(results["ids"])):
                items.append(ChunkRecord(
                    id=results["ids"][i],
                    text=results["documents"][i],
                    metadata=results["metadatas"][i],
                ))
        return items

    async def collection_exists(self, kb_id: str) -> bool:
        try:
            _client.get_collection(name=_collection_name(kb_id))
            return True
        except Exception:
            return False

    async def get_collection_count(self, kb_id: str) -> int:
        try:
            collection = _client.get_collection(name=_collection_name(kb_id))
            return collection.count()
        except Exception:
            return 0
```

- [ ] **Step 2: Update `backend/vector_stores/__init__.py` to auto-register the ChromaAdapter**

```python
"""Pluggable vector store backends for knowledge base embeddings."""
from vector_stores.base import VectorStoreBase, QueryResult, ChunkRecord
from vector_stores.registry import get_vector_store, register_backend, list_backends

# Auto-register built-in backends
from vector_stores.chroma_adapter import ChromaAdapter
register_backend("chroma", ChromaAdapter)

__all__ = [
    "VectorStoreBase",
    "QueryResult",
    "ChunkRecord",
    "get_vector_store",
    "register_backend",
    "list_backends",
]
```

- [ ] **Step 3: Verify ChromaAdapter is registered and importable**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from vector_stores import get_vector_store, list_backends; print(list_backends()); store = get_vector_store('chroma'); print(type(store).__name__)"`
Expected: `['chroma']` and `ChromaAdapter`

- [ ] **Step 4: Commit**

```bash
git add backend/vector_stores/chroma_adapter.py backend/vector_stores/__init__.py
git commit -m "feat: add ChromaAdapter implementing VectorStoreBase"
```

---

### Task 4: Implement QdrantAdapter

**Files:**
- Create: `backend/vector_stores/qdrant_adapter.py`
- Modify: `backend/vector_stores/__init__.py` (add auto-registration)
- Modify: `backend/requirements.txt` (add qdrant-client)
- Modify: `backend/config.py` (add qdrant_url and qdrant_api_key)

- [ ] **Step 1: Add `qdrant-client` to `backend/requirements.txt`**

Add this line at the end of the file:
```
qdrant-client>=1.9.0
```

- [ ] **Step 2: Add Qdrant config fields to `backend/config.py`**

Add two new fields to the `Config` class (after the `neo4j_password` field, around line 58):

```python
    qdrant_url: str = "http://qdrant:6333"
    qdrant_api_key: str | None = None
```

- [ ] **Step 3: Create `backend/vector_stores/qdrant_adapter.py`**

```python
"""Qdrant adapter for the vector store interface."""
import os
from typing import Any

from vector_stores.base import VectorStoreBase, ChunkRecord, QueryResult


def _get_qdrant_client():
    """Lazy-load and return a QdrantClient instance from config."""
    from qdrant_client import QdrantClient
    from config import get_config

    cfg = get_config()
    url = os.environ.get("QDRANT_URL", cfg.qdrant_url)
    api_key = cfg.qdrant_api_key or None

    kwargs: dict[str, Any] = {"url": url}
    if api_key:
        kwargs["api_key"] = api_key

    return QdrantClient(**kwargs)


def _collection_name(kb_id: str) -> str:
    """Derive Qdrant collection name from kb_id."""
    return f"kb_{kb_id}"


class QdrantAdapter(VectorStoreBase):
    """Qdrant vector store backend using qdrant-client."""

    async def create_collection(self, kb_id: str, dimension: int) -> None:
        """Create a Qdrant collection with the given vector dimension."""
        from qdrant_client.models import Distance, VectorParams

        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

        # Check if collection already exists
        collections = client.get_collections().collections
        existing_names = [c.name for c in collections]
        if collection_name not in existing_names:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=dimension,
                    distance=Distance.COSINE,
                ),
            )

    async def add_embeddings(
        self,
        kb_id: str,
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict],
        ids: list[str],
    ) -> None:
        from qdrant_client.models import PointStruct

        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

        points = []
        for i in range(len(texts)):
            # Qdrant metadata values must be simple types (str, int, float, bool)
            clean_meta = {}
            for k, v in metadatas[i].items():
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                else:
                    clean_meta[k] = str(v)

            points.append(PointStruct(
                id=ids[i],
                vector=embeddings[i],
                payload={
                    "text": texts[i],
                    **clean_meta,
                },
            ))

        client.upsert(collection_name=collection_name, points=points)

    async def query(
        self,
        kb_id: str,
        query_embedding: list[float],
        n_results: int = 10,
        where: dict | None = None,
    ) -> QueryResult:
        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

        # Build filter from where dict
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        query_filter = None
        if where:
            conditions = []
            for key, value in where.items():
                conditions.append(FieldCondition(
                    key=key,
                    match=MatchValue(value=value),
                ))
            query_filter = Filter(must=conditions)

        results = client.query_points(
            collection_name=collection_name,
            query=query_embedding,
            limit=n_results,
            query_filter=query_filter,
            with_payload=True,
        )

        ids = []
        texts = []
        distances = []
        metadatas = []

        for point in results.points:
            ids.append(str(point.id))
            payload = point.payload or {}
            texts.append(payload.pop("text", ""))
            score = point.score if hasattr(point, "score") else 0.0
            # Qdrant cosine similarity: higher is better, convert to distance
            distances.append(1.0 - score)
            metadatas.append(payload)

        return QueryResult(
            ids=ids,
            texts=texts,
            distances=distances,
            metadatas=metadatas,
        )

    async def delete_collection(self, kb_id: str) -> None:
        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)
        try:
            client.delete_collection(collection_name=collection_name)
        except Exception:
            pass

    async def delete_source_chunks(self, kb_id: str, source_id: str) -> int:
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

        # First count matching points
        try:
            count_result = client.count(
                collection_name=collection_name,
                count_filter=Filter(must=[
                    FieldCondition(key="source_id", match=MatchValue(value=source_id)),
                ]),
            )
            deleted_count = count_result.count
        except Exception:
            deleted_count = 0

        # Then delete them
        try:
            client.delete(
                collection_name=collection_name,
                points_filter=Filter(must=[
                    FieldCondition(key="source_id", match=MatchValue(value=source_id)),
                ]),
            )
        except Exception:
            pass

        return deleted_count

    async def get_all_embeddings(self, kb_id: str) -> list[ChunkRecord]:
        from qdrant_client.models import Filter

        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

        # Scroll through all points
        items = []
        offset = None
        while True:
            results, next_offset = client.scroll(
                collection_name=collection_name,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            for point in results:
                payload = point.payload or {}
                text = payload.pop("text", "")
                items.append(ChunkRecord(
                    id=str(point.id),
                    text=text,
                    metadata=payload,
                ))
            if next_offset is None:
                break
            offset = next_offset

        return items

    async def collection_exists(self, kb_id: str) -> bool:
        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)
        try:
            collections = client.get_collections().collections
            return collection_name in [c.name for c in collections]
        except Exception:
            return False

    async def get_collection_count(self, kb_id: str) -> int:
        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)
        try:
            info = client.get_collection(collection_name=collection_name)
            return info.points_count
        except Exception:
            return 0
```

- [ ] **Step 4: Update `backend/vector_stores/__init__.py` to register QdrantAdapter**

```python
"""Pluggable vector store backends for knowledge base embeddings."""
from vector_stores.base import VectorStoreBase, QueryResult, ChunkRecord
from vector_stores.registry import get_vector_store, register_backend, list_backends

# Auto-register built-in backends
from vector_stores.chroma_adapter import ChromaAdapter
register_backend("chroma", ChromaAdapter)

# Qdrant is optional — only register if qdrant-client is installed
try:
    from vector_stores.qdrant_adapter import QdrantAdapter
    register_backend("qdrant", QdrantAdapter)
except ImportError:
    pass

__all__ = [
    "VectorStoreBase",
    "QueryResult",
    "ChunkRecord",
    "get_vector_store",
    "register_backend",
    "list_backends",
]
```

- [ ] **Step 5: Verify both backends register**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from vector_stores import list_backends; print(list_backends())"`
Expected: `['chroma', 'qdrant']` (if qdrant-client is installed) or `['chroma']` (if not yet installed)

- [ ] **Step 6: Install qdrant-client and verify**

```bash
cd /Users/kmail/devops/forschung/chatter/backend && pip install qdrant-client>=1.9.0 && python -c "from vector_stores import list_backends; print(list_backends())"
```

Expected: `['chroma', 'qdrant']`

- [ ] **Step 7: Commit**

```bash
git add backend/vector_stores/qdrant_adapter.py backend/vector_stores/__init__.py backend/requirements.txt backend/config.py
git commit -m "feat: add QdrantAdapter and config fields"
```

---

### Task 5: Refactor vectorstore.py facade to use the registry

**Files:**
- Modify: `backend/vectorstore.py`

This is the critical refactoring step. `vectorstore.py` becomes a facade that delegates all ChromaDB operations to `ChromaAdapter` while keeping BM25 caching and CrossEncoder reranking (which are backend-agnostic).

- [ ] **Step 1: Rewrite `backend/vectorstore.py` as a facade**

Replace the entire content of `backend/vectorstore.py` with:

```python
"""Vector store management using pluggable backends + LangChain embeddings for RAG.

This module provides the public API for vector store operations. All actual
vector DB operations are delegated to registered backends via the registry.
BM25 caching and CrossEncoder reranking are handled here (backend-agnostic).
"""
from typing import Any
from uuid import uuid4

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.embeddings import Embeddings
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder

from config import get_config
from vector_stores import get_vector_store, list_backends
from vector_stores.base import VectorStoreBase

# ── ProviderEmbeddings (stays here — it's embedding-provider logic, not vector-store logic) ──

class ProviderEmbeddings(Embeddings):
    """LangChain-compatible embeddings wrapper that routes to Ollama or OpenAI."""

    def __init__(self, provider_id: str | None = None, model: str | None = None):
        self.provider_id = provider_id
        self.model = model
        self._cfg = get_config()

        if provider_id:
            self._provider = next(
                (p for p in self._cfg.providers if p.id == provider_id), None
            )
        elif self._cfg.active_provider_id:
            self._provider = next(
                (p for p in self._cfg.providers if p.id == self._cfg.active_provider_id),
                self._cfg.providers[0] if self._cfg.providers else None,
            )
        else:
            self._provider = self._cfg.providers[0] if self._cfg.providers else None

        if self._provider and not model:
            self.model = model or (
                "nomic-embed-text"
                if self._provider.type == "ollama"
                else "text-embedding-3-small"
            )

    def _get_langchain_embeddings(self) -> Embeddings:
        """Return the appropriate LangChain embeddings instance."""
        from langchain_ollama import OllamaEmbeddings
        from langchain_openai import OpenAIEmbeddings

        if self._provider is None:
            raise ValueError("No provider configured for embeddings")

        if self._provider.type == "ollama":
            return OllamaEmbeddings(
                model=self.model,
                base_url=self._provider.base_url,
            )
        elif self._provider.type == "openai":
            kwargs: dict[str, Any] = {"model": self.model}
            if self._provider.api_key:
                kwargs["api_key"] = self._provider.api_key
            if self._provider.base_url and "openai.com" not in self._provider.base_url:
                kwargs["base_url"] = self._provider.base_url
            return OpenAIEmbeddings(**kwargs)
        else:
            raise ValueError(
                f"Provider {self._provider.type} does not support embeddings"
            )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts using LangChain's embedding interface."""
        return self._get_langchain_embeddings().embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        """Embed a query string using LangChain's embedding interface."""
        return self._get_langchain_embeddings().embed_query(text)


# ── Reranker (backend-agnostic) ──

_reranker = None

def get_reranker():
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker


# ── BM25 Cache (backend-agnostic) ──

_bm25_cache: dict[str, BM25Okapi] = {}


# ── Backend Resolution ──

def _resolve_backend(kb_id: str, backend_name: str | None = None) -> VectorStoreBase:
    """Resolve the vector store backend for a given knowledge base.

    Args:
        kb_id: Knowledge base ID (used to look up KB config if backend_name not given).
        backend_name: Explicit backend name override. If None, uses KB config.

    Returns:
        An instance of the appropriate VectorStoreBase subclass.
    """
    if backend_name is None:
        # Try to read backend from KB config
        from knowledge import get_knowledge_base
        kb = get_knowledge_base(kb_id)
        if kb and kb.config:
            backend_name = kb.config.get("vectorDb", "chroma")
        else:
            backend_name = "chroma"

    return get_vector_store(backend_name)


def _get_embedding_dimension(provider_id: str | None = None, model: str | None = None) -> int:
    """Determine embedding dimension by embedding a short test string.

    Falls back to common defaults if embedding fails.
    """
    try:
        embeddings = ProviderEmbeddings(provider_id=provider_id, model=model)
        test_vec = embeddings.embed_query("dimension probe")
        return len(test_vec)
    except Exception:
        # Default dimensions for common models
        if model and "nomic" in model:
            return 768
        if model and "ada" in model:
            return 1536
        return 1536  # OpenAI text-embedding-3-small default


# ── Public API (delegates to backends + BM25/reranker) ──

async def add_to_vectorstore(
    kb_id: str,
    text: str,
    metadata: dict[str, Any] = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 100,
    provider_id: str | None = None,
    embedding_model: str | None = None,
):
    """Chunk text, embed it, and add to the vector store using the configured backend."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    chunks = splitter.split_text(text)

    base_metadata = (metadata or {}).copy()
    backend = _resolve_backend(kb_id)

    # Ensure collection exists with correct dimensions
    dimension = _get_embedding_dimension(provider_id, embedding_model)
    await backend.create_collection(kb_id, dimension=dimension)

    embeddings_provider = ProviderEmbeddings(provider_id=provider_id, model=embedding_model)
    embedded = embeddings_provider.embed_documents(chunks)

    ids = [str(uuid4()) for _ in chunks]
    chunk_metadatas = [
        {**base_metadata, "chunk_index": i, "total_chunks": len(chunks)}
        for i in range(len(chunks))
    ]

    await backend.add_embeddings(
        kb_id=kb_id,
        texts=chunks,
        embeddings=embedded,
        metadatas=chunk_metadatas,
        ids=ids,
    )

    # Invalidate BM25 cache for this KB
    if kb_id in _bm25_cache:
        del _bm25_cache[kb_id]

    return len(chunks)


async def retrieve_relevant_chunks(
    kb_id: str,
    query_text: str,
    n_results: int = 10,
    provider_id: str | None = None,
    embedding_model: str | None = None,
    hybrid: bool = True,
    rerank: bool = True,
) -> list[str]:
    """Retrieve relevant chunks using the configured backend + optional hybrid search + reranking."""
    import numpy as np

    embeddings_provider = ProviderEmbeddings(provider_id=provider_id, model=embedding_model)
    query_embedding = embeddings_provider.embed_query(query_text)

    backend = _resolve_backend(kb_id)
    n_fetch = n_results * 3 if rerank else n_results

    # Vector search via the backend
    results = await backend.query(
        kb_id=kb_id,
        query_embedding=query_embedding,
        n_results=n_fetch,
    )

    candidate_chunks = []
    seen_contents = set()
    for text in results.texts:
        if text not in seen_contents:
            candidate_chunks.append(text)
            seen_contents.add(text)

    # Hybrid BM25 search (backend-agnostic)
    if hybrid:
        bm25 = _get_bm25_index(kb_id)
        if bm25:
            tokenized_query = query_text.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            top_indices = np.argsort(bm25_scores)[::-1][:n_results]

            all_items = await backend.get_all_embeddings(kb_id)
            for idx in top_indices:
                if idx < len(all_items):
                    doc = all_items[idx].text
                    if doc not in seen_contents:
                        candidate_chunks.append(doc)
                        seen_contents.add(doc)

    # CrossEncoder reranking (backend-agnostic)
    if rerank and candidate_chunks:
        reranker = get_reranker()
        sentence_pairs = [[query_text, chunk] for chunk in candidate_chunks]
        scores = reranker.predict(sentence_pairs)
        ranked_chunks = [
            chunk
            for _, chunk in sorted(
                zip(scores, candidate_chunks), key=lambda x: x[0], reverse=True
            )
        ]
        return ranked_chunks[:n_results]

    return candidate_chunks[:n_results]


def _get_bm25_index(kb_id: str) -> BM25Okapi | None:
    """Lazily build BM25 index for a KB from the vector store backend."""
    import asyncio

    if kb_id in _bm25_cache:
        return _bm25_cache[kb_id]

    # Synchronous helper to get all docs
    async def _fetch_docs():
        backend = _resolve_backend(kb_id)
        items = await backend.get_all_embeddings(kb_id)
        return [item.text for item in items]

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside an async context already — can't call async from sync
            # Fallback: use ChromaDB directly for BM25 index building
            import chromadb
            from chromadb.config import Settings
            from pathlib import Path
            storage_path = Path.home() / ".cio-intelligence-hub" / "chroma"
            client = chromadb.PersistentClient(path=str(storage_path), settings=Settings(allow_reset=True))
            collection = client.get_collection(name=f"kb_{kb_id}")
            results = collection.get()
            if not results or not results.get("documents"):
                return None
            tokenized_docs = [doc.lower().split() for doc in results["documents"]]
            return BM25Okapi(tokenized_docs)
        else:
            docs = loop.run_until_complete(_fetch_docs())
    except Exception:
        try:
            docs = asyncio.run(_fetch_docs())
        except Exception:
            return None

    if not docs:
        return None
    tokenized_docs = [doc.lower().split() for doc in docs]
    bm25 = BM25Okapi(tokenized_docs)
    _bm25_cache[kb_id] = bm25
    return bm25


async def delete_source_chunks(kb_id: str, source_id: str) -> int:
    """Delete all chunks belonging to a source from the vector store."""
    backend = _resolve_backend(kb_id)
    count = await backend.delete_source_chunks(kb_id, source_id)
    if kb_id in _bm25_cache:
        del _bm25_cache[kb_id]
    return count


async def delete_vectorstore(kb_id: str) -> bool:
    """Delete a collection for a knowledge base."""
    backend = _resolve_backend(kb_id)
    await backend.delete_collection(kb_id)
    if kb_id in _bm25_cache:
        del _bm25_cache[kb_id]
    return True


async def get_kb_embeddings(kb_id: str) -> list[dict[str, Any]]:
    """Get all chunks and metadata for a knowledge base."""
    backend = _resolve_backend(kb_id)
    items = await backend.get_all_embeddings(kb_id)
    return [
        {"id": item.id, "content": item.text, "metadata": item.metadata}
        for item in items
    ]


def get_collection(kb_id: str):
    """Get or create a ChromaDB collection for backward compatibility.

    This function is kept for any code that still needs direct ChromaDB access.
    New code should use the vector_stores abstraction instead.
    """
    import chromadb
    from chromadb.config import Settings
    from pathlib import Path

    storage_path = Path.home() / ".cio-intelligence-hub" / "chroma"
    storage_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=str(storage_path),
        settings=Settings(allow_reset=True),
    )
    return client.get_or_create_collection(name=f"kb_{kb_id}")
```

- [ ] **Step 2: Verify the refactored vectorstore.py imports and runs**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from vectorstore import add_to_vectorstore, retrieve_relevant_chunks, get_kb_embeddings, delete_vectorstore, delete_source_chunks, ProviderEmbeddings; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Verify backends are registered**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from vector_stores import list_backends; print(list_backends())"`
Expected: `['chroma', 'qdrant']`

- [ ] **Step 4: Commit**

```bash
git add backend/vectorstore.py
git commit -m "refactor: vectorstore.py becomes facade delegating to pluggable backends"
```

---

### Task 6: Refactor GraphRAG to use VectorStoreBase for community summary embeddings

**Files:**
- Modify: `backend/graphrag_engine.py`

Currently, `graphrag_engine.py` uses `ProviderEmbeddings` directly and stores community summary embeddings in the JSON index file. It does NOT use ChromaDB for community summaries — it stores them inline in `index.json`. The refactoring here is minimal: just update the import and ensure the `_vector_search_chunks` function uses the backend-agnostic `retrieve_relevant_chunks`.

Looking at the code, `graphrag_engine.py` imports `ProviderEmbeddings` and `retrieve_relevant_chunks` from `vectorstore`. The `_vector_search_chunks` function at line 1301 already calls `retrieve_relevant_chunks` from the facade. The community summary embeddings at lines 710-725 and 1050-1064 use `ProviderEmbeddings` directly — they embed summaries and store them in the JSON index, NOT in ChromaDB.

So the refactoring needed is:
1. The import stays the same (still from `vectorstore`)
2. `_vector_search_chunks` at line 1301 already uses `retrieve_relevant_chunks` from the facade — no change needed
3. The `ProviderEmbeddings` usage for community summaries is correct — it's just embedding text, not storing in a vector DB

**Actually, after review:** GraphRAG doesn't use ChromaDB directly. It uses `ProviderEmbeddings` for embedding and stores embeddings inline in JSON. The `_vector_search_chunks` function uses `retrieve_relevant_chunks` from `vectorstore.py`. No changes needed to `graphrag_engine.py` — it already goes through the facade.

- [ ] **Step 1: Verify GraphRAG imports still work after refactor**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from graphrag_engine import build_graph_for_kb, retrieve_graph_context; print('OK')"`
Expected: `OK`

- [ ] **Step 2: Commit (no changes needed — verify only)**

This step is a verification step. No code changes to `graphrag_engine.py` are needed since it already uses the `vectorstore` facade.

---

### Task 7: Update main.py to use async vectorstore calls and pass backend config

**Files:**
- Modify: `backend/main.py`

The key changes:
1. The `embed_kb` endpoint and `_build_messages_with_rag` need to work with the now-async `add_to_vectorstore`, `retrieve_relevant_chunks`, etc.
2. KB routes need to pass `vectorDb` config through
3. Add a Qdrant health check endpoint

- [ ] **Step 1: Update imports in main.py**

At the top of `main.py`, the existing import on line 37:
```python
from vectorstore import add_to_vectorstore, get_kb_embeddings, delete_vectorstore, delete_source_chunks, get_collection, retrieve_relevant_chunks
```

Add `list_backends`:
```python
from vectorstore import add_to_vectorstore, get_kb_embeddings, delete_vectorstore, delete_source_chunks, get_collection, retrieve_relevant_chunks
from vector_stores import list_backends
```

- [ ] **Step 2: Add Qdrant health check endpoint**

Add after the existing knowledge base routes (after the `/api/knowledge/{kb_id}/graph-status` route, around line 1090):

```python
@app.get("/api/qdrant/status")
async def qdrant_status():
    """Check Qdrant connection status."""
    if "qdrant" not in list_backends():
        return {"available": False, "error": "qdrant-client not installed"}
    try:
        from vector_stores.qdrant_adapter import _get_qdrant_client
        client = _get_qdrant_client()
        collections = client.get_collections()
        return {
            "available": True,
            "collections_count": len(collections.collections),
            "backends": list_backends(),
        }
    except Exception as e:
        return {"available": False, "error": str(e), "backends": list_backends()}
```

- [ ] **Step 3: Add `vectorDb` to KB creation and update response**

In the `create_kb` route (around line 897), the handler already passes `config` through. The frontend will send `config: { vectorDb: "qdrant" }` which gets stored. No change needed to creation — it already stores the full `config` dict.

In the `list_kb` route (around line 872), add `vector_db` to the response:
After the line with `"config": kb.config,`, add:
```python
                "vector_db": kb.config.get("vectorDb", "chroma"),
```

Similarly in the `get_kb` route (around line 923), after `"config": kb.config,`:
```python
        "vector_db": kb.config.get("vectorDb", "chroma"),
```

And in the `update_kb` route (around line 963), after `"config": kb.config,`:
```python
        "vector_db": kb.config.get("vectorDb", "chroma"),
```

- [ ] **Step 4: Verify main.py starts without import errors**

Run: `cd /Users/kmail/devops/forschung/chatter/backend && python -c "from main import app; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/main.py
git commit -m "feat: add Qdrant health check endpoint and vector_db field to KB responses"
```

---

### Task 8: Add Qdrant service to Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.dev.yml`

- [ ] **Step 1: Add Qdrant service to `docker-compose.yml`**

Add the Qdrant service before the `backend` service, and add `depends_on` + env vars:

```yaml
  qdrant:
    image: qdrant/qdrant:latest
    container_name: cio-intelligence-hub-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant-data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

Add `QDRANT_URL=http://qdrant:6333` to the backend service environment, and add `qdrant` to `depends_on`:

```yaml
  backend:
    # ... existing config ...
    environment:
      # ... existing env vars ...
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - neo4j
      - qdrant
```

Add `qdrant-data` to the volumes section at the bottom:

```yaml
volumes:
  cio-intelligence-hub-data:
  neo4j-data:
  neo4j-logs:
  qdrant-data:
```

- [ ] **Step 2: Add Qdrant to `docker-compose.dev.yml`**

Add the Qdrant service (with `-dev` suffix):

```yaml
  qdrant:
    image: qdrant/qdrant:latest
    container_name: cio-intelligence-hub-qdrant-dev
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant-data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

Add `QDRANT_URL=http://qdrant:6333` to the backend service environment, and add `qdrant` to `depends_on`:

```yaml
  backend:
    # ... existing config ...
    environment:
      # ... existing env vars ...
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - neo4j
      - qdrant
```

Add `qdrant-data` to the volumes section.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml
git commit -m "feat: add Qdrant service to docker-compose"
```

---

### Task 9: Add vector DB selector to the frontend

**Files:**
- Modify: `frontend/src/components/KnowledgeBase.jsx`

The frontend needs two changes:
1. Add a "Vector Database" dropdown to the vectorstore KB type settings
2. Add the `vectorDb` field to the `KB_TYPES` definition for vectorstore type
3. Show Qdrant connection status in settings

- [ ] **Step 1: Add `vectorDb` field to the vectorstore KB type settings**

In `KnowledgeBase.jsx`, find the `KB_TYPES` array (around line 162). In the vectorstore type definition (around line 182), add a new setting field:

```js
{ key: 'vectorDb', label: 'Vector Database', type: 'select', default: 'chroma', help: 'Backend for storing and querying embeddings', options: [
  { value: 'chroma', label: 'ChromaDB' },
  { value: 'qdrant', label: 'Qdrant' },
]},
```

This should be the first field in the vectorstore settings array.

- [ ] **Step 2: Ensure `SettingRow` handles the `select` type**

Check that the `SettingRow` component (around line 236) handles `type: 'select'`. If it doesn't already, add a case for rendering a `<select>` dropdown when `field.type === 'select'` using `field.options` for the option list.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/KnowledgeBase.jsx
git commit -m "feat: add vector DB selector to KnowledgeBase settings UI"
```

---

### Task 10: Write tests for VectorStoreBase conformance

**Files:**
- Create: `backend/tests/test_vector_stores.py`

- [ ] **Step 1: Create the conformance test file**

```python
"""Conformance tests for VectorStoreBase implementations.

Each adapter (ChromaAdapter, QdrantAdapter) must pass these tests.
"""
import asyncio
import pytest
import uuid

from vector_stores.base import VectorStoreBase, QueryResult, ChunkRecord
from vector_stores import get_vector_store, list_backends


def _generate_kb_id() -> str:
    """Generate a unique test kb_id."""
    return f"test_{uuid.uuid4().hex[:8]}"


async def _test_full_lifecycle(backend: VectorStoreBase, kb_id: str):
    """Test create → add → query → get_all → delete_source → delete_collection lifecycle."""
    dimension = 4  # Small dimension for tests

    # Create collection
    await backend.create_collection(kb_id, dimension=dimension)
    assert await backend.collection_exists(kb_id), f"Collection {kb_id} should exist after creation"

    # Add embeddings
    texts = ["hello world", "foo bar baz", "test document"]
    embeddings = [[0.1, 0.2, 0.3, 0.4], [0.5, 0.6, 0.7, 0.8], [0.1, 0.1, 0.1, 0.1]]
    metadatas = [
        {"source_id": "src1", "chunk_index": 0},
        {"source_id": "src1", "chunk_index": 1},
        {"source_id": "src2", "chunk_index": 0},
    ]
    ids = [f"id_{i}" for i in range(3)]

    await backend.add_embeddings(kb_id, texts, embeddings, metadatas, ids)

    # Query
    results = await backend.query(kb_id, query_embedding=[0.1, 0.2, 0.3, 0.4], n_results=2)
    assert isinstance(results, QueryResult)
    assert len(results.ids) <= 2
    assert len(results.texts) <= 2

    # Get all embeddings
    all_items = await backend.get_all_embeddings(kb_id)
    assert len(all_items) == 3
    assert all(isinstance(item, ChunkRecord) for item in all_items)

    # Get count
    count = await backend.get_collection_count(kb_id)
    assert count == 3

    # Delete source chunks
    deleted = await backend.delete_source_chunks(kb_id, source_id="src1")
    assert deleted == 2

    # Verify deletion
    remaining = await backend.get_all_embeddings(kb_id)
    assert len(remaining) == 1

    # Delete collection
    await backend.delete_collection(kb_id)
    assert not await backend.collection_exists(kb_id)


@pytest.mark.asyncio
async def test_chroma_adapter_lifecycle():
    """Test ChromaAdapter full lifecycle."""
    if "chroma" not in list_backends():
        pytest.skip("ChromaDB not available")

    backend = get_vector_store("chroma")
    kb_id = _generate_kb_id()
    await _test_full_lifecycle(backend, kb_id)


@pytest.mark.asyncio
async def test_qdrant_adapter_lifecycle():
    """Test QdrantAdapter full lifecycle."""
    if "qdrant" not in list_backends():
        pytest.skip("qdrant-client not installed or Qdrant not available")

    try:
        backend = get_vector_store("qdrant")
    except Exception as e:
        pytest.skip(f"Cannot connect to Qdrant: {e}")

    kb_id = _generate_kb_id()
    await _test_full_lifecycle(backend, kb_id)


@pytest.mark.asyncio
async def test_registry_unknown_backend():
    """Test that requesting an unknown backend raises ValueError."""
    with pytest.raises(ValueError, match="Unknown vector store backend"):
        get_vector_store("nonexistent")
```

- [ ] **Step 2: Run ChromaDB conformance test**

```bash
cd /Users/kmail/devops/forschung/chatter/backend && python -m pytest tests/test_vector_stores.py::test_chroma_adapter_lifecycle -v
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_vector_stores.py
git commit -m "test: add VectorStoreBase conformance tests for ChromaAdapter and QdrantAdapter"
```

---

### Task 11: Integration test — verify existing ChromaDB KBs still work

**Files:**
- Create: `backend/tests/test_chromadb_backward_compat.py`

- [ ] **Step 1: Create backward compatibility test**

```python
"""Test that existing ChromaDB-based KB workflows still work after the refactor."""
import asyncio
import uuid
import pytest

from vectorstore import (
    add_to_vectorstore,
    retrieve_relevant_chunks,
    delete_vectorstore,
    delete_source_chunks,
    get_kb_embeddings,
)


@pytest.mark.asyncio
async def test_add_and_retrieve_via_facade():
    """Verify the vectorstore.py facade works end-to-end with ChromaDB (default backend)."""
    kb_id = f"test_facade_{uuid.uuid4().hex[:8]}"
    try:
        # Add text
        count = await add_to_vectorstore(
            kb_id=kb_id,
            text="ChromaDB backward compatibility test document content.",
            metadata={"source_id": "test_src"},
            chunk_size=50,
            chunk_overlap=10,
        )
        assert count > 0, "Should have created at least one chunk"

        # Retrieve
        results = await retrieve_relevant_chunks(
            kb_id=kb_id,
            query_text="compatibility test",
            n_results=5,
            hybrid=False,
            rerank=False,
        )
        assert len(results) > 0, "Should retrieve at least one chunk"

        # Get all embeddings
        embeddings = await get_kb_embeddings(kb_id)
        assert len(embeddings) > 0, "Should have at least one embedding"

    finally:
        # Cleanup
        await delete_vectorstore(kb_id)


@pytest.mark.asyncio
async def test_delete_source_chunks_facade():
    """Verify delete_source_chunks works through the facade."""
    kb_id = f"test_delete_{uuid.uuid4().hex[:8]}"
    try:
        await add_to_vectorstore(
            kb_id=kb_id,
            text="Chunk one content.",
            metadata={"source_id": "src_alpha"},
        )
        await add_to_vectorstore(
            kb_id=kb_id,
            text="Chunk two content.",
            metadata={"source_id": "src_beta"},
        )

        deleted = await delete_source_chunks(kb_id, source_id="src_alpha")
        assert deleted >= 1, "Should delete at least one chunk"

        remaining = await get_kb_embeddings(kb_id)
        assert all(e["metadata"].get("source_id") != "src_alpha" for e in remaining), \
            "No chunks from src_alpha should remain"

    finally:
        await delete_vectorstore(kb_id)
```

- [ ] **Step 2: Run the backward compatibility tests**

```bash
cd /Users/kmail/devops/forschung/chatter/backend && python -m pytest tests/test_chromadb_backward_compat.py -v
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_chromadb_backward_compat.py
git commit -m "test: add ChromaDB backward compatibility tests via vectorstore facade"
```

---

## Implementation Order Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | VectorStoreBase abstract interface + data types | — |
| 2 | Registry module | Task 1 |
| 3 | ChromaAdapter (extract from vectorstore.py) | Tasks 1, 2 |
| 4 | QdrantAdapter + config + requirements | Tasks 1, 2 |
| 5 | Refactor vectorstore.py facade | Tasks 3, 4 |
| 6 | Verify GraphRAG still works | Task 5 |
| 7 | Update main.py routes + Qdrant health check | Task 5 |
| 8 | Docker Compose Qdrant service | — |
| 9 | Frontend vector DB selector | Task 7 |
| 10 | VectorStoreBase conformance tests | Tasks 3, 4 |
| 11 | ChromaDB backward compat tests | Task 5 |

Tasks 1-2 can be done sequentially. Tasks 3 and 4 can be done in parallel after Task 2. Task 5 depends on both 3 and 4. Tasks 6, 7, 8 can be done in parallel after Task 5. Tasks 9, 10, 11 can be done in parallel after Task 7.