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
        if model and "nomic" in model:
            return 768
        if model and "ada" in model:
            return 1536
        return 1536


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

    # Synchronous helper — try async backend first, fall back to ChromaDB directly
    async def _fetch_docs():
        backend = _resolve_backend(kb_id)
        items = await backend.get_all_embeddings(kb_id)
        return [item.text for item in items]

    # When called from sync context, try async approach
    # But BM25 is typically called from within async retrieve_relevant_chunks,
    # so we use ChromaDB directly as a fast path
    try:
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
        bm25 = BM25Okapi(tokenized_docs)
        _bm25_cache[kb_id] = bm25
        return bm25
    except Exception:
        return None


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