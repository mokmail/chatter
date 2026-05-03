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
        from qdrant_client.models import Distance, VectorParams

        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

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
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

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
        client = _get_qdrant_client()
        collection_name = _collection_name(kb_id)

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