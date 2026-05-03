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