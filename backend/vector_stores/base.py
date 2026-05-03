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