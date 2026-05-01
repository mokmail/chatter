import json
import os
import tempfile
import shutil
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

# Mock heavy ML dependencies BEFORE importing graphrag_engine
_mock_vectorstore = MagicMock()

class _MockEmbeddings:
    def __init__(self, provider_id=None, model=None):
        pass
    def embed_query(self, text: str):
        return [1.0, 0.0, 0.0]
    def embed_documents(self, texts: list[str]):
        return [[1.0, 0.0, 0.0] for _ in texts]
    async def similarity_search(self, *args, **kwargs):
        return []

_mock_vectorstore.ProviderEmbeddings = _MockEmbeddings
sys.modules['vectorstore'] = _mock_vectorstore

_mock_langchain = MagicMock()
_mock_langchain.text_splitter = MagicMock()
_mock_langchain.text_splitter.RecursiveCharacterTextSplitter = MagicMock()
sys.modules['langchain'] = _mock_langchain
sys.modules['langchain.text_splitter'] = _mock_langchain.text_splitter

sys.modules['sentence_transformers'] = MagicMock()
sys.modules['transformers'] = MagicMock()
sys.modules['langchain_ollama'] = MagicMock()
sys.modules['langchain_openai'] = MagicMock()
sys.modules['chromadb'] = MagicMock()
sys.modules['rank_bm25'] = MagicMock()
sys.modules['sklearn'] = MagicMock()
sys.modules['sklearn.metrics'] = MagicMock()
sys.modules['sklearn.metrics.pairwise'] = MagicMock()
sys.modules['sklearn.metrics.pairwise'].cosine_similarity = MagicMock(return_value=[[1.0]])

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from graphrag_engine import (
    _safe_json_loads,
    _normalize_entity_name,
    build_graph_for_kb,
    retrieve_graph_context,
    get_graph_status,
    delete_graph,
    GRAPHRAG_DIR,
)


@pytest.fixture
def temp_graph_dir():
    tmpdir = tempfile.mkdtemp()
    original = GRAPHRAG_DIR
    import graphrag_engine
    graphrag_engine.GRAPHRAG_DIR = Path(tmpdir)
    yield tmpdir
    graphrag_engine.GRAPHRAG_DIR = original
    shutil.rmtree(tmpdir, ignore_errors=True)


# ------------------------------------------------------------------
# JSON extraction
# ------------------------------------------------------------------

def test_extract_json_markdown_fence():
    text = 'Some text\n```json\n{"a": 1}\n```\nmore text'
    assert _safe_json_loads(text) == {"a": 1}


def test_extract_json_plain():
    text = '{"entities": [], "relationships": []}'
    assert _safe_json_loads(text) == {"entities": [], "relationships": []}


def test_extract_json_fallback():
    text = 'No json here'
    result = _safe_json_loads(text)
    assert result == {}


# ------------------------------------------------------------------
# Entity normalization
# ------------------------------------------------------------------

def test_normalize_entity():
    assert _normalize_entity_name(" OpenAI ") == "openai"
    assert _normalize_entity_name("GitHub, Inc.") == "github, inc."


# ------------------------------------------------------------------
# Graph status
# ------------------------------------------------------------------

def test_get_graph_status_none(temp_graph_dir):
    assert get_graph_status("kb-123") == "none"


def test_get_graph_status_ready(temp_graph_dir):
    kb_dir = os.path.join(temp_graph_dir, "kb-123")
    os.makedirs(kb_dir, exist_ok=True)
    with open(os.path.join(kb_dir, "index.json"), "w") as f:
        json.dump({"status": "ready"}, f)
    with open(os.path.join(kb_dir, "graph.json"), "w") as f:
        json.dump({}, f)
    with open(os.path.join(kb_dir, "communities.json"), "w") as f:
        json.dump({}, f)
    assert get_graph_status("kb-123") == "ready"


def test_delete_graph(temp_graph_dir):
    kb_dir = os.path.join(temp_graph_dir, "kb-123")
    os.makedirs(kb_dir, exist_ok=True)
    with open(os.path.join(kb_dir, "graph.json"), "w") as f:
        json.dump({}, f)
    delete_graph("kb-123")
    assert not os.path.exists(kb_dir)


# ------------------------------------------------------------------
# Build graph
# ------------------------------------------------------------------

def _make_async_gen(return_value):
    async def _gen(*args, **kwargs):
        yield return_value
    return _gen


@pytest.mark.asyncio
async def test_build_graph_for_kb_success(temp_graph_dir):
    extraction_resp = json.dumps({
        "entities": [
            {"name": "Alice", "type": "Person", "description": "Engineer"},
            {"name": "Bob", "type": "Person", "description": "Designer"},
        ],
        "relationships": [
            {"source": "Alice", "relation": "works_with", "target": "Bob", "description": "Team"},
        ],
    })
    summarization_resp = "Alice and Bob work together."

    chunks = [("Alice works with Bob.", {"source": "doc1.txt"})]

    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(extraction_resp)(), _make_async_gen(summarization_resp)()]):
        result = await build_graph_for_kb("kb-test", chunks)

    assert result.get("status") == "ready"
    assert get_graph_status("kb-test") == "ready"

    kb_dir = os.path.join(temp_graph_dir, "kb-test")
    with open(os.path.join(kb_dir, "graph.json")) as f:
        graph_data = json.load(f)
    assert "nodes" in graph_data
    assert "links" in graph_data
    node_names = {n["id"] if "id" in n else n.get("name", "") for n in graph_data["nodes"]}
    assert "alice" in node_names
    assert "bob" in node_names
    assert len(graph_data["links"]) == 1

    with open(os.path.join(kb_dir, "communities.json")) as f:
        comm_data = json.load(f)
    assert isinstance(comm_data, list)
    assert len(comm_data) >= 1


@pytest.mark.asyncio
async def test_build_graph_for_kb_no_chunks(temp_graph_dir):
    result = await build_graph_for_kb("kb-empty", [])
    assert result.get("status") == "error"


# ------------------------------------------------------------------
# Retrieval
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retrieve_graph_context_local(temp_graph_dir):
    extraction_resp = json.dumps({
        "entities": [
            {"name": "Alice", "type": "Person", "description": "Engineer"},
            {"name": "Bob", "type": "Person", "description": "Designer"},
            {"name": "Carol", "type": "Person", "description": "Manager"},
        ],
        "relationships": [
            {"source": "Alice", "relation": "works_with", "target": "Bob", "description": "Team"},
            {"source": "Bob", "relation": "reports_to", "target": "Carol", "description": "Hierarchy"},
        ],
    })
    summarization_resp = "Alice and Bob work together. Bob reports to Carol."
    query_extraction_resp = json.dumps({"entities": [{"name": "Alice"}]})

    chunks = [("Alice works with Bob who reports to Carol.", {"source": "doc1.txt"})]
    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(extraction_resp)(), _make_async_gen(summarization_resp)()]):
        await build_graph_for_kb("kb-ret", chunks)

    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(query_extraction_resp)()]):
        context = await retrieve_graph_context("kb-ret", "What does Alice do?", mode="local", max_depth=2, top_k=5)

    assert isinstance(context, list)
    assert any("alice" in c.lower() for c in context)


@pytest.mark.asyncio
async def test_retrieve_graph_context_global(temp_graph_dir):
    extraction_resp = json.dumps({
        "entities": [
            {"name": "Acme Corp", "type": "Organization", "description": "A company"},
        ],
        "relationships": [],
    })
    summarization_resp = "Acme Corp is a company."

    chunks = [("Acme Corp is a company.", {"source": "doc1.txt"})]
    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(extraction_resp)(), _make_async_gen(summarization_resp)()]):
        await build_graph_for_kb("kb-glob", chunks)

    mock_emb = AsyncMock(return_value=[[{"text": "Community 0 summary: Acme Corp overview."}]])
    with patch("graphrag_engine.ProviderEmbeddings.similarity_search", mock_emb):
        context = await retrieve_graph_context("kb-glob", "Tell me about Acme Corp", mode="global", top_k=1)

    assert isinstance(context, list)
    assert any("acme" in c.lower() for c in context)


@pytest.mark.asyncio
async def test_retrieve_graph_context_not_ready(temp_graph_dir):
    context = await retrieve_graph_context("kb-missing", "hello")
    assert context == []


# ------------------------------------------------------------------
# Hybrid retrieval
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retrieve_graph_context_hybrid(temp_graph_dir):
    extraction_resp = json.dumps({
        "entities": [
            {"name": "Alice", "type": "Person", "description": "Engineer"},
            {"name": "Bob", "type": "Person", "description": "Designer"},
            {"name": "Carol", "type": "Person", "description": "Manager"},
        ],
        "relationships": [
            {"source": "Alice", "relation": "works_with", "target": "Bob", "description": "Team"},
            {"source": "Bob", "relation": "reports_to", "target": "Carol", "description": "Hierarchy"},
        ],
    })
    summarization_resp = "Alice and Bob work together. Bob reports to Carol."
    query_extraction_resp = json.dumps(["Alice"])

    chunks = [("Alice works with Bob who reports to Carol.", {"source": "doc1.txt"})]
    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(extraction_resp)(), _make_async_gen(summarization_resp)()]):
        await build_graph_for_kb("kb-hybrid", chunks)

    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(query_extraction_resp)()]):
        with patch("graphrag_engine.retrieve_relevant_chunks", return_value=["Alice works with Bob"]):
            context = await retrieve_graph_context("kb-hybrid", "What does Alice do?", mode="hybrid", max_depth=2, top_k=5)

    assert isinstance(context, list)
    assert len(context) > 0
    assert any("alice" in c.lower() for c in context)


# ------------------------------------------------------------------
# Path retrieval
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retrieve_graph_context_path(temp_graph_dir):
    extraction_resp = json.dumps({
        "entities": [
            {"name": "Alice", "type": "Person", "description": "Engineer"},
            {"name": "Bob", "type": "Person", "description": "Designer"},
            {"name": "Carol", "type": "Person", "description": "Manager"},
        ],
        "relationships": [
            {"source": "Alice", "relation": "works_with", "target": "Bob", "description": "Team"},
            {"source": "Bob", "relation": "reports_to", "target": "Carol", "description": "Hierarchy"},
        ],
    })
    summarization_resp = "Alice and Bob work together. Bob reports to Carol."
    path_extraction_resp = json.dumps(["Alice", "Carol"])

    chunks = [("Alice works with Bob who reports to Carol.", {"source": "doc1.txt"})]
    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(extraction_resp)(), _make_async_gen(summarization_resp)()]):
        await build_graph_for_kb("kb-path", chunks)

    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(path_extraction_resp)()]):
        context = await retrieve_graph_context("kb-path", "How is Alice connected to Carol?", mode="path", top_k=5)

    assert isinstance(context, list)
    assert len(context) > 0
    assert any("alice" in c.lower() for c in context)
    assert any("carol" in c.lower() for c in context)


# ------------------------------------------------------------------
# Neighborhood retrieval
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retrieve_graph_context_neighborhood(temp_graph_dir):
    extraction_resp = json.dumps({
        "entities": [
            {"name": "Alice", "type": "Person", "description": "Engineer"},
            {"name": "Bob", "type": "Person", "description": "Designer"},
        ],
        "relationships": [
            {"source": "Alice", "relation": "works_with", "target": "Bob", "description": "Team"},
        ],
    })
    summarization_resp = "Alice and Bob work together."
    query_extraction_resp = json.dumps(["Alice"])

    chunks = [("Alice works with Bob.", {"source": "doc1.txt"})]
    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(extraction_resp)(), _make_async_gen(summarization_resp)()]):
        await build_graph_for_kb("kb-nb", chunks)

    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(query_extraction_resp)()]):
        context = await retrieve_graph_context("kb-nb", "Who works with Alice?", mode="neighborhood", top_k=5)

    assert isinstance(context, list)
    assert len(context) > 0
    assert any("bob" in c.lower() for c in context)


# ------------------------------------------------------------------
# Schema support
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_build_graph_with_schema(temp_graph_dir):
    extraction_resp = json.dumps({
        "entities": [
            {"name": "Acme Inc", "type": "ORG", "description": "A company"},
            {"name": "John", "type": "PERSON", "description": "CEO"},
        ],
        "relationships": [
            {"source": "John", "relation": "WORKS_FOR", "target": "Acme Inc", "description": "Employment"},
        ],
    })
    summarization_resp = "John works for Acme Inc."

    chunks = [("John is the CEO of Acme Inc.", {"source": "doc1.txt"})]
    schema = {
        "entity_types": ["PERSON", "ORG", "PRODUCT"],
        "relation_types": ["WORKS_FOR", "CREATED_BY", "LOCATED_IN"],
    }

    with patch("graphrag_engine.stream_chat", side_effect=[_make_async_gen(extraction_resp)(), _make_async_gen(summarization_resp)()]):
        result = await build_graph_for_kb("kb-schema", chunks, schema=schema)

    assert result.get("status") == "ready"
    assert result.get("entities") == 2
