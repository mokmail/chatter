"""Conformance tests for VectorStoreBase implementations.

Each adapter (ChromaAdapter, QdrantAdapter) must pass these tests.
"""
import pytest
import uuid

from vector_stores.base import VectorStoreBase, QueryResult, ChunkRecord
from vector_stores import get_vector_store, list_backends


def _generate_kb_id() -> str:
    """Generate a unique test kb_id."""
    return f"test_{uuid.uuid4().hex[:8]}"


async def _test_full_lifecycle(backend: VectorStoreBase, kb_id: str):
    """Test create -> add -> query -> get_all -> delete_source -> delete_collection lifecycle."""
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
        # Quick connectivity check
        await backend.collection_exists("_test_connectivity_check_")
    except Exception as e:
        pytest.skip(f"Cannot connect to Qdrant: {e}")

    kb_id = _generate_kb_id()
    await _test_full_lifecycle(backend, kb_id)


@pytest.mark.asyncio
async def test_registry_unknown_backend():
    """Test that requesting an unknown backend raises ValueError."""
    with pytest.raises(ValueError, match="Unknown vector store backend"):
        get_vector_store("nonexistent")