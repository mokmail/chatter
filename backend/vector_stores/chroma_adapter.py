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