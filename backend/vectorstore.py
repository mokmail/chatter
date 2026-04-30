"""Vector store management using LangChain embeddings + ChromaDB for RAG."""
from pathlib import Path
from typing import Any

import chromadb
from chromadb.config import Settings
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_openai import OpenAIEmbeddings
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder
import numpy as np

from config import get_config

STORAGE_PATH = Path.home() / ".cio-intelligence-hub" / "chroma"
STORAGE_PATH.mkdir(parents=True, exist_ok=True)

_chroma_client = chromadb.PersistentClient(
    path=str(STORAGE_PATH),
    settings=Settings(allow_reset=True),
)

_reranker = None
_bm25_cache: dict[str, BM25Okapi] = {}


def get_collection(kb_id: str):
    """Get or create a Chroma collection for a knowledge base."""
    return _chroma_client.get_or_create_collection(name=f"kb_{kb_id}")


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


def get_reranker():
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker


async def add_to_vectorstore(
    kb_id: str,
    text: str,
    metadata: dict[str, Any] = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 100,
    provider_id: str | None = None,
    embedding_model: str | None = None,
):
    """Chunk text, embed it, and add to Chroma using LangChain embeddings."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    chunks = splitter.split_text(text)

    base_metadata = (metadata or {}).copy()
    collection = _chroma_client.get_or_create_collection(name=f"kb_{kb_id}")

    embeddings = ProviderEmbeddings(provider_id=provider_id, model=embedding_model)
    embedded = embeddings.embed_documents(chunks)

    for i, (chunk, embedding) in enumerate(zip(chunks, embedded)):
        from uuid import uuid4

        chunk_metadata = {
            **base_metadata,
            "chunk_index": i,
            "total_chunks": len(chunks),
        }
        collection.add(
            ids=[str(uuid4())],
            embeddings=[embedding],
            metadatas=[chunk_metadata],
            documents=[chunk],
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
    """Retrieve relevant chunks using LangChain embeddings + Chroma + optional hybrid search + reranking."""
    embeddings = ProviderEmbeddings(provider_id=provider_id, model=embedding_model)
    query_embedding = embeddings.embed_query(query_text)

    collection = _chroma_client.get_or_create_collection(name=f"kb_{kb_id}")
    n_fetch = n_results * 3 if rerank else n_results

    vector_results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_fetch,
    )

    candidate_chunks = []
    seen_contents = set()

    if vector_results and vector_results.get("documents"):
        for doc in vector_results["documents"][0]:
            if doc not in seen_contents:
                candidate_chunks.append(doc)
                seen_contents.add(doc)

    if hybrid:
        bm25 = _get_bm25_index(kb_id)
        if bm25:
            tokenized_query = query_text.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            top_indices = np.argsort(bm25_scores)[::-1][:n_results]

            all_docs = collection.get()["documents"]
            for idx in top_indices:
                if idx < len(all_docs):
                    doc = all_docs[idx]
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
    """Lazily load or create BM25 index for a KB."""
    if kb_id in _bm25_cache:
        return _bm25_cache[kb_id]

    collection = _chroma_client.get_collection(name=f"kb_{kb_id}")
    results = collection.get()

    if not results or not results.get("documents"):
        return None

    tokenized_docs = [doc.lower().split() for doc in results["documents"]]
    bm25 = BM25Okapi(tokenized_docs)
    _bm25_cache[kb_id] = bm25
    return bm25


def delete_source_chunks(kb_id: str, source_id: str):
    """Delete all chunks belonging to a source from the vector store."""
    try:
        collection = _chroma_client.get_or_create_collection(name=f"kb_{kb_id}")
        results = collection.get(where={"source_id": source_id})
        if results and results.get("ids"):
            collection.delete(ids=results["ids"])
        if kb_id in _bm25_cache:
            del _bm25_cache[kb_id]
        return len(results.get("ids", []))
    except Exception:
        return 0


def delete_vectorstore(kb_id: str):
    """Delete a collection for a knowledge base."""
    try:
        _chroma_client.delete_collection(name=f"kb_{kb_id}")
        if kb_id in _bm25_cache:
            del _bm25_cache[kb_id]
        return True
    except Exception:
        return False


def get_kb_embeddings(kb_id: str) -> list[dict[str, Any]]:
    """Get all chunks and metadata for a knowledge base."""
    collection = _chroma_client.get_collection(name=f"kb_{kb_id}")
    results = collection.get()

    items = []
    if results and results.get("ids"):
        for i in range(len(results["ids"])):
            items.append(
                {
                    "id": results["ids"][i],
                    "content": results["documents"][i],
                    "metadata": results["metadatas"][i],
                }
            )
    return items
