# Qdrant Pluggable Vector Store — Design Spec

**Date:** 2026-05-03
**Status:** Approved

## 1. Overview

Add Qdrant as a pluggable vector database backend alongside the existing ChromaDB implementation. This includes:

1. A `VectorStoreBase` abstract interface with `ChromaAdapter` and `QdrantAdapter` implementations
2. A registry that resolves which backend to use based on knowledge base config
3. A Qdrant Docker container in docker-compose
4. Refactoring GraphRAG's internal ChromaDB usage to go through the same abstraction
5. Frontend settings to select the vector DB when creating/editing a vectorstore KB

## 2. Architecture

### Module Structure

```
backend/
├── vector_stores/              # NEW module
│   ├── __init__.py             # Public API: get_vector_store(kb_id, config)
│   ├── base.py                 # VectorStoreBase abstract class, QueryResult, ChunkRecord
│   ├── chroma_adapter.py       # ChromaDB implementation (extracted from current vectorstore.py)
│   ├── qdrant_adapter.py       # Qdrant implementation
│   └── registry.py             # Backend resolution: config string → adapter class
├── vectorstore.py              # SIMPLIFIED: re-exports from vector_stores + BM25/reranker
├── graphrag_engine.py          # REFACTORED: uses vector_stores instead of chroma directly
├── knowledge.py                # UPDATED: vectorstore KB config gains vectorDb field
└── ...
```

### VectorStoreBase Interface

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class ChunkRecord:
    id: str
    text: str
    metadata: dict

@dataclass
class QueryResult:
    ids: list[str]
    texts: list[str]
    distances: list[float]
    metadatas: list[dict]

class VectorStoreBase(ABC):
    @abstractmethod
    async def create_collection(self, kb_id: str, dimension: int) -> None: ...

    @abstractmethod
    async def add_embeddings(self, kb_id: str, texts: list[str],
                              embeddings: list[list[float]],
                              metadatas: list[dict], ids: list[str]) -> None: ...

    @abstractmethod
    async def query(self, kb_id: str, query_embedding: list[float],
                     n_results: int, where: dict | None = None) -> QueryResult: ...

    @abstractmethod
    async def delete_collection(self, kb_id: str) -> None: ...

    @abstractmethod
    async def delete_source_chunks(self, kb_id: str, source_id: str) -> None: ...

    @abstractmethod
    async def get_all_embeddings(self, kb_id: str) -> list[ChunkRecord]: ...

    @abstractmethod
    async def collection_exists(self, kb_id: str) -> bool: ...

    @abstractmethod
    async def get_collection_count(self, kb_id: str) -> int: ...
```

### Registry

```python
# registry.py
_backends: dict[str, type[VectorStoreBase]] = {
    "chroma": ChromaAdapter,
    "qdrant": QdrantAdapter,
}

def get_vector_store(backend: str = "chroma", **kwargs) -> VectorStoreBase:
    cls = _backends.get(backend)
    if not cls:
        raise ValueError(f"Unknown vector store backend: {backend}")
    return cls(**kwargs)
```

### ChromaAdapter

- Extracted from current `vectorstore.py`
- Uses `chromadb.PersistentClient` with storage at `~/.cio-intelligence-hub/chroma/`
- Collection naming: `kb_{kb_id}` (unchanged)
- All ChromaDB-specific code moves here

### QdrantAdapter

- Uses `qdrant-client` Python SDK
- Connects to `QDRANT_URL` (default: `http://qdrant:6333`)
- Collection naming: `kb_{kb_id}` (same convention)
- Uses Qdrant's built-in HNSW index with cosine distance (configurable via KB config)
- Supports both REST and gRPC connections
- No local file storage — all data in the Qdrant container

### vectorstore.py (Simplified Facade)

After refactoring, `vectorstore.py` retains:
- `ProviderEmbeddings` class (embedding provider resolution)
- `add_to_vectorstore()` — chunks text, embeds via `ProviderEmbeddings`, then delegates to adapter
- `retrieve_relevant_chunks()` — delegates query to adapter, then applies BM25 merge + CrossEncoder rerank
- `delete_source_chunks()`, `delete_vectorstore()`, `get_kb_embeddings()` — delegate to adapter
- BM25 cache (`_bm25_cache`) and reranker (`_reranker`) — backend-agnostic, stay in facade

All direct `_chroma_client` calls are removed from `vectorstore.py`. The facade resolves the backend from KB config and delegates vector operations to the appropriate adapter.

## 3. KnowledgeBase Model Changes

The `config` dict for `kb_type="vectorstore"` gains:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `vectorDb` | `"chroma"` \| `"qdrant"` | `"chroma"` | Which vector database backend to use |
| `qdrantCollectionName` | `str \| null` | `null` | Override collection name (default: `kb_{id}`) |
| `embeddingDimensions` | `int \| null` | `null` | Explicit embedding dimensions (required for Qdrant collection creation) |

Backward compatibility: existing KBs with no `vectorDb` field default to `"chroma"`.

## 4. GraphRAG Refactoring

`graphrag_engine.py` currently imports `_chroma_client` directly from `vectorstore.py` and uses it for community summary embeddings in global search.

Changes:
- Remove direct `_chroma_client` usage
- Accept a `VectorStoreBase` instance via parameter in `GraphRAGEngine.__init__()` or via a factory function
- The GraphRAG config gains a `vector_store_backend` field (default: `"chroma"`)
- All ChromaDB calls in GraphRAG are replaced with `VectorStoreBase` method calls
- The `graphrag_neo4j.py` adapter follows the same pattern

## 5. Docker Compose Changes

### docker-compose.yml

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"   # REST API
      - "6334:6334"   # gRPC
    volumes:
      - qdrant-data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    # ... existing config ...
    environment:
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      qdrant:
        condition: service_healthy

volumes:
  qdrant-data:
```

### docker-compose.dev.yml

- Add `QDRANT_URL=http://localhost:6333` for local development
- Backend dev container depends on Qdrant service

### config.py

Add to the `Config` model:
```python
qdrant_url: str = "http://qdrant:6333"
qdrant_api_key: str | None = None
```

## 6. Data Flow

### Embedding a Knowledge Base

1. Frontend: `POST /api/knowledge/{kb_id}/embed`
2. `main.py` reads KB config → resolves `vectorDb` (defaults to `"chroma"`)
3. `vectorstore.add_to_vectorstore(kb_id, ...)` internally calls `registry.get_vector_store(backend)`
4. Text chunking via `RecursiveCharacterTextSplitter` (stays in facade)
5. Embedding via `ProviderEmbeddings` (stays in facade)
6. Adapter's `add_embeddings()` stores vectors + metadata in the chosen backend
7. BM25 cache invalidated (stays in facade)

### Querying (RAG Retrieval)

1. Chat pipeline resolves KB config → backend type
2. `vectorstore.retrieve_relevant_chunks(kb_id, ...)` resolves adapter via registry
3. Adapter's `query()` returns top-N candidates as `QueryResult`
4. BM25 merge + CrossEncoder rerank (unchanged, backend-agnostic)

### GraphRAG Global Search

1. `graphrag_engine.py` resolves vector store via registry (using `vector_store_backend` config)
2. Uses `add_embeddings` for community summaries, `query` for retrieval
3. Falls back to ChromaDB if config is missing (backward compat)

## 7. Error Handling

- **Qdrant unreachable**: If `QDRANT_URL` is set but Qdrant is not reachable, log a warning. KBs without explicit `vectorDb="qdrant"` fall back to ChromaDB. KBs that require Qdrant return a clear error: `"Qdrant service is unavailable"`.
- **Collection not found**: `QdrantAdapter.query()` catches "collection not found" and returns empty results (matching ChromaDB behavior).
- **Dimension mismatch**: Qdrant requires dimensions at collection creation time. If the embedding model dimensions don't match the collection, return a descriptive error.
- **No data migration**: Existing ChromaDB KBs continue working unchanged. No migration tool needed — users create new KBs with Qdrant or re-embed into a new Qdrant KB.

## 8. Frontend Changes

### Settings Page — Vectorstore KB Creation/Edit

When `kb_type === "vectorstore"`:
- Add "Vector Database" dropdown: ChromaDB (default) / Qdrant
- When Qdrant is selected, show "Embedding Dimensions" field (auto-detected when possible)
- Show Qdrant connection status indicator in global settings

### API Response Changes

- `GET /api/knowledge/{kb_id}` response now includes `config.vectorDb` field
- `POST /api/knowledge` accepts `config.vectorDb` in the request body
- New endpoint: `GET /api/qdrant/status` — health check for Qdrant connection

## 9. Testing Strategy

- **Unit tests**: `VectorStoreBase` conformance tests that both adapters pass (create, add, query, delete, get_all)
- **Integration tests**: `QdrantAdapter` tested against a real Qdrant container (docker-compose test profile)
- **Backward compatibility tests**: Existing ChromaDB KBs work unchanged after refactoring
- **GraphRAG tests**: Global search works with both ChromaDB and Qdrant backends

## 10. Dependencies

New Python packages (add to `backend/requirements.txt`):
- `qdrant-client>=1.9.0`

New Docker service:
- `qdrant/qdrant:latest`

## 11. Implementation Order

1. Create `vector_stores/` module: base.py, registry.py
2. Extract ChromaDB code from `vectorstore.py` into `chroma_adapter.py`
3. Implement `QdrantAdapter` in `qdrant_adapter.py`
4. Refactor `vectorstore.py` facade to use registry
5. Refactor `graphrag_engine.py` to use VectorStoreBase
6. Update `knowledge.py` model with vectorDb config
7. Update `main.py` routes to pass backend config
8. Add Qdrant to docker-compose files
9. Update `config.py` with Qdrant settings
10. Frontend: add vector DB selector to KB settings
11. Add health check endpoint for Qdrant
12. Write tests