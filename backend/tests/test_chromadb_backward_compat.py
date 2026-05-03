"""Test that existing ChromaDB-based KB workflows still work after the refactor.

These tests require a live embedding provider (Ollama or OpenAI) to be running.
They are skipped automatically if no provider is available.
"""
import uuid
import pytest

from vectorstore import (
    add_to_vectorstore,
    retrieve_relevant_chunks,
    delete_vectorstore,
    delete_source_chunks,
    get_kb_embeddings,
    ProviderEmbeddings,
)


def _embedding_provider_available():
    """Check if an embedding provider is available."""
    try:
        emb = ProviderEmbeddings()
        emb.embed_query("test")
        return True
    except Exception:
        return False


requires_embedding = pytest.mark.skipif(
    not _embedding_provider_available(),
    reason="No embedding provider available (requires Ollama or OpenAI)",
)


@pytest.mark.asyncio
@requires_embedding
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
@requires_embedding
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