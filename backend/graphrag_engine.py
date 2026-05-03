"""Lightweight GraphRAG engine using LLM extraction + NetworkX + community detection.

Supports multiple retrieval modes inspired by Neo4j GraphRAG patterns:
- local: BFS entity traversal from query-extracted entities
- global: community summary ranking by embedding similarity
- hybrid: vector search on chunks + graph traversal (VectorCypherRetriever pattern)
- path: shortest path between entities mentioned in query
- neighborhood: direct neighbors only (depth=1)

Graph Persistence & Incremental Updates:
- Once a graph is built, it is persisted to disk (graph.json, communities.json, index.json)
- update_graph_for_kb() merges new entities/relationships into an existing graph,
  only re-extracts from new/changed chunks and re-computes affected communities
- build_graph_for_kb() still supports full rebuild when force=true
- Source chunk hashes are tracked to enable delta detection
"""
import asyncio
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

from config import get_config
from chat import stream_chat
from vectorstore import ProviderEmbeddings, retrieve_relevant_chunks

# Optional Neo4j integration (legacy raw-Cypher adapter)
try:
    from graphrag_neo4j import get_store, Neo4jStore
except Exception:
    get_store = lambda: None  # type: ignore
    Neo4jStore = None  # type: ignore

# Optional official neo4j-graphrag adapter
try:
    from graphrag_neo4j_official import (
        build_graph_official,
        retrieve_graph_context_official,
        delete_graph_official,
        get_graph_status_official,
        get_graph_data_official,
        is_available as _official_is_available,
    )
except Exception:
    build_graph_official = None  # type: ignore
    retrieve_graph_context_official = None  # type: ignore
    delete_graph_official = None  # type: ignore
    get_graph_status_official = None  # type: ignore
    get_graph_data_official = None  # type: ignore
    _official_is_available = lambda: False  # type: ignore


def _try_save_to_neo4j(kb_id: str, graph: Any, index: dict, communities: list[dict]):
    """Save graph to Neo4j if available."""
    store = get_store()
    if store:
        try:
            store.save_graph(kb_id, graph, index, communities)
        except Exception as e:
            print(f"Neo4j save error (non-fatal): {e}")
        finally:
            store.close()


def _try_delete_from_neo4j(kb_id: str):
    """Delete graph from Neo4j if available."""
    store = get_store()
    if store:
        try:
            store.delete_graph(kb_id)
        except Exception as e:
            print(f"Neo4j delete error (non-fatal): {e}")
        finally:
            store.close()


def _use_official() -> bool:
    """Return True when the official neo4j-graphrag backend should be used."""
    import os
    # Opt-in: set GRAPHRAG_USE_OFFICIAL=true to enable the official backend.
    # Default is false to preserve backward compatibility with existing tests
    # and NetworkX-only deployments.
    env = os.environ.get("GRAPHRAG_USE_OFFICIAL", "false").lower()
    if env == "true":
        return _official_is_available()
    return False

GRAPHRAG_DIR = Path.home() / ".cio-intelligence-hub" / "graphrag"
GRAPHRAG_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_ENTITY_TYPES = ["PERSON", "ORG", "TECH", "CONCEPT", "LOCATION", "EVENT", "OTHER"]
DEFAULT_RELATION_TYPES = ["RELATED_TO", "PART_OF", "WORKS_FOR", "LOCATED_IN", "CREATED_BY", "USES", "INFLUENCES", "PRECEDES"]

EXTRACTION_PROMPT_TEMPLATE = """You are a knowledge graph extraction engine.
Given the following text chunk, extract all named entities and their relationships.

Use these entity types: {entity_types}
Use these relationship types: {relation_types}

Output ONLY a JSON object with this exact structure (no markdown, no explanations):
{{
  "entities": [
    {{"name": "Entity Name", "type": "TYPE_FROM_LIST", "description": "Brief description"}}
  ],
  "relationships": [
    {{"source": "Entity A", "relation": "RELATION_FROM_LIST", "target": "Entity B", "description": "Brief description"}}
  ]
}}

Rules:
- Use concise, canonical entity names (e.g., "OpenAI" not "openai inc.")
- Each relationship must connect two entities that appear in the entities list.
- Use ONLY the entity types and relationship types listed above.
- If no entities or relationships are found, return empty arrays.
- Do NOT wrap the JSON in markdown code blocks.

Text chunk:
"""

BATCH_EXTRACTION_PROMPT_TEMPLATE = """You are a knowledge graph extraction engine.
Given the following text chunks, extract all named entities and their relationships from ALL chunks combined.

Use these entity types: {entity_types}
Use these relationship types: {relation_types}

Output ONLY a JSON object with this exact structure (no markdown, no explanations):
{{
  "entities": [
    {{"name": "Entity Name", "type": "TYPE_FROM_LIST", "description": "Brief description"}}
  ],
  "relationships": [
    {{"source": "Entity A", "relation": "RELATION_FROM_LIST", "target": "Entity B", "description": "Brief description"}}
  ]
}}

Rules:
- Use concise, canonical entity names (e.g., "OpenAI" not "openai inc.")
- Each relationship must connect two entities that appear in the entities list.
- Use ONLY the entity types and relationship types listed above.
- If no entities or relationships are found, return empty arrays.
- Do NOT wrap the JSON in markdown code blocks.

Text chunks:
{chunks}
"""

COMMUNITY_SUMMARY_PROMPT = """You are a knowledge graph summarizer.
Given the following entities and relationships from a community subgraph, write a concise, information-dense paragraph that summarizes what this community is about.

Focus on:
- Key themes and topics
- Important connections and dependencies
- Notable entities and their roles

Output ONLY the summary paragraph. No JSON, no markdown, no preamble.

Entities:
"""

QUERY_ENTITY_EXTRACTION_PROMPT = """Extract the key entities mentioned in the following user query.
Output ONLY a JSON array of entity names (strings). No markdown, no explanations.

Query: """

PATH_EXTRACTION_PROMPT = """Extract up to 2 named entities from the following user query that we should find a connection between.
Output ONLY a JSON array of exactly 2 entity names (strings). No markdown, no explanations.

Query: """



def _kb_graph_dir(kb_id: str) -> Path:
    return GRAPHRAG_DIR / kb_id


def _graph_path(kb_id: str) -> Path:
    return _kb_graph_dir(kb_id) / "graph.json"


def _communities_path(kb_id: str) -> Path:
    return _kb_graph_dir(kb_id) / "communities.json"


def _index_path(kb_id: str) -> Path:
    return _kb_graph_dir(kb_id) / "index.json"


def _normalize_entity_name(name: str) -> str:
    return name.strip().lower()


def _entity_similarity_fuzzy(name_a: str, name_b: str) -> float:
    """Compute a simple fuzzy similarity between two entity names.
    Uses token overlap ratio (Jaccard-like) to catch e.g. "OpenAI" vs "openai inc.".
    """
    tokens_a = set(re.findall(r'\w+', _normalize_entity_name(name_a)))
    tokens_b = set(re.findall(r'\w+', _normalize_entity_name(name_b)))
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union)


def _resolve_entity(norm_name: str, new_data: dict, existing_entities: dict) -> dict:
    """Merge a newly extracted entity into the existing entity map.
    
    If the normalized name exists, merge descriptions and source chunks.
    If a fuzzy match (>=0.8 similarity) exists, merge into that entry.
    Otherwise, create a new entry.
    """
    if norm_name in existing_entities:
        existing = existing_entities[norm_name]
        # Merge: prefer longer/earlier description, accumulate source chunks
        if len(new_data.get("description", "")) > len(existing.get("description", "")):
            existing["description"] = new_data["description"]
        # Keep the most specific type
        type_order = {"PERSON": 1, "ORG": 2, "TECH": 3, "CONCEPT": 4, "LOCATION": 5, "EVENT": 6, "OTHER": 99}
        existing_type_rank = type_order.get(existing.get("type", "OTHER"), 99)
        new_type_rank = type_order.get(new_data.get("type", "OTHER"), 99)
        if new_type_rank < existing_type_rank:
            existing["type"] = new_data.get("type", existing["type"])
        # Keep the display name with proper casing (longer or more capitalized)
        if len(new_data.get("name", "")) > len(existing.get("name", "")):
            existing["name"] = new_data["name"]
        # Accumulate source chunks
        for sc in new_data.get("source_chunks", []):
            if sc not in existing.get("source_chunks", []):
                existing.setdefault("source_chunks", []).append(sc)
        return existing
    
    # Fuzzy matching for near-duplicate entities
    for existing_norm, existing in existing_entities.items():
        sim = _entity_similarity_fuzzy(norm_name, existing_norm)
        if sim >= 0.8:
            # Merge into this existing entity
            if len(new_data.get("description", "")) > len(existing.get("description", "")):
                existing["description"] = new_data["description"]
            type_order = {"PERSON": 1, "ORG": 2, "TECH": 3, "CONCEPT": 4, "LOCATION": 5, "EVENT": 6, "OTHER": 99}
            if type_order.get(new_data.get("type", "OTHER"), 99) < type_order.get(existing.get("type", "OTHER"), 99):
                existing["type"] = new_data.get("type", existing["type"])
            for sc in new_data.get("source_chunks", []):
                if sc not in existing.get("source_chunks", []):
                    existing.setdefault("source_chunks", []).append(sc)
            return existing
    
    # No match found — create new
    existing_entities[norm_name] = dict(new_data)
    return existing_entities[norm_name]


def _chunk_hash(text: str) -> str:
    """Compute a content hash for a text chunk to enable incremental updates."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def _load_existing_graph(kb_id: str) -> tuple[Any | None, dict | None, list[dict] | None]:
    """Load an existing graph from disk. Returns (graph, index, communities) or (None, None, None)."""
    import networkx as nx
    graph_path = _graph_path(kb_id)
    index_path = _index_path(kb_id)
    communities_path = _communities_path(kb_id)
    
    if not graph_path.exists() or not index_path.exists():
        return None, None, None
    
    try:
        graph_data = json.loads(graph_path.read_text())
        graph = nx.node_link_graph(graph_data)
        index = json.loads(index_path.read_text())
        communities = []
        if communities_path.exists():
            communities = json.loads(communities_path.read_text())
        return graph, index, communities
    except Exception as e:
        print(f"[GraphRAG] Error loading existing graph for {kb_id}: {e}")
        return None, None, None


def _safe_json_loads(text: str) -> dict:
    """Extract JSON from LLM output, handling markdown fences and truncation."""
    text = text.strip()
    # Remove markdown code fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find the first JSON object
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return {}


async def _call_llm(messages: list[dict], model: str | None = None, provider_id: str | None = None) -> str:
    """Non-streaming LLM call that collects chunks."""
    full = ""
    async for chunk in stream_chat(messages, model=model, provider_id=provider_id, quiet=True):
        full += chunk
    return full


async def _call_llm_with_timeout(messages: list[dict], model: str | None = None, provider_id: str | None = None, timeout: float = 60.0) -> str:
    """Call LLM with a timeout to prevent hangs."""
    try:
        return await asyncio.wait_for(_call_llm(messages, model=model, provider_id=provider_id), timeout=timeout)
    except asyncio.TimeoutError:
        print(f"[GraphRAG] LLM call timed out after {timeout}s")
        return ""


async def _summarize_single_community(
    comm_id: int,
    nodes: set,
    graph: Any,
    extraction_model: str | None,
    extraction_provider: str | None,
) -> dict:
    """Summarize a single community."""
    comm_entities = []
    comm_relationships = []
    for node in nodes:
        nd = graph.nodes[node]
        comm_entities.append({
            "name": nd.get("name", node),
            "type": nd.get("type", "OTHER"),
            "description": nd.get("description", ""),
        })
    for u, v, d in graph.edges(data=True):
        if u in nodes and v in nodes:
            comm_relationships.append({
                "source": graph.nodes[u].get("name", u),
                "relation": d.get("relation", "related_to"),
                "target": graph.nodes[v].get("name", v),
                "description": d.get("description", ""),
            })

    summary_text = ""
    if comm_entities:
        # Cap entities to avoid huge prompts
        if len(comm_entities) > 30:
            comm_entities = comm_entities[:30]
        if len(comm_relationships) > 50:
            comm_relationships = comm_relationships[:50]
        prompt = COMMUNITY_SUMMARY_PROMPT + json.dumps(comm_entities, indent=2)
        if comm_relationships:
            prompt += "\n\nRelationships:\n" + json.dumps(comm_relationships, indent=2)
        messages = [
            {"role": "system", "content": "You summarize knowledge graph communities."},
            {"role": "user", "content": prompt},
        ]
        try:
            summary_text = await _call_llm_with_timeout(messages, model=extraction_model, provider_id=extraction_provider, timeout=45.0)
        except Exception as e:
            print(f"[GraphRAG] Community {comm_id} summarization error: {e}")
            summary_text = ""

    return {
        "id": comm_id,
        "entities": list(nodes),
        "summary": summary_text.strip(),
        "entity_count": len(nodes),
    }


def get_graph_status(kb_id: str) -> str:
    """Return graph status: none | indexing | ready | error"""
    idx_path = _index_path(kb_id)
    if idx_path.exists():
        try:
            data = json.loads(idx_path.read_text())
            status = data.get("status", "none")
            if status in ("ready", "indexing", "error"):
                return status
        except Exception:
            pass
    # Fallback: check official Neo4j backend
    if _use_official() and get_graph_status_official is not None:
        try:
            official_status = get_graph_status_official(kb_id)
            if official_status == "ready":
                return "ready"
        except Exception:
            pass
    return "none"


def set_graph_status(kb_id: str, status: str, error: str | None = None):
    """Update graph index metadata."""
    idx_path = _index_path(kb_id)
    data = {}
    if idx_path.exists():
        try:
            data = json.loads(idx_path.read_text())
        except Exception:
            pass
    data["status"] = status
    if error:
        data["error"] = error
    elif "error" in data:
        del data["error"]
    _kb_graph_dir(kb_id).mkdir(parents=True, exist_ok=True)
    idx_path.write_text(json.dumps(data, indent=2))


def _progress_path(kb_id: str) -> Path:
    return _kb_graph_dir(kb_id) / "progress.json"


def set_graph_progress(kb_id: str, current: int, total: int, phase: str, message: str = ""):
    """Write build progress for frontend polling."""
    progress = {
        "current": current,
        "total": total,
        "phase": phase,
        "message": message,
        "timestamp": __import__("time").time(),
    }
    _kb_graph_dir(kb_id).mkdir(parents=True, exist_ok=True)
    _progress_path(kb_id).write_text(json.dumps(progress, indent=2))


def get_graph_progress(kb_id: str) -> dict:
    """Read current build progress. Returns empty dict if none."""
    path = _progress_path(kb_id)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


def _build_extraction_prompt(schema: dict | None = None) -> str:
    """Build extraction prompt with optional graph schema."""
    entity_types = ", ".join(schema.get("entity_types", DEFAULT_ENTITY_TYPES) if schema else DEFAULT_ENTITY_TYPES)
    relation_types = ", ".join(schema.get("relation_types", DEFAULT_RELATION_TYPES) if schema else DEFAULT_RELATION_TYPES)
    return EXTRACTION_PROMPT_TEMPLATE.format(
        entity_types=entity_types,
        relation_types=relation_types,
    )


async def extract_entities_and_relationships(
    chunk: str,
    model: str | None = None,
    provider_id: str | None = None,
    schema: dict | None = None,
) -> tuple[list[dict], list[dict]]:
    """Run LLM extraction over a single chunk with optional schema."""
    prompt = _build_extraction_prompt(schema) + chunk
    messages = [
        {"role": "system", "content": "You extract structured knowledge graphs from text."},
        {"role": "user", "content": prompt},
    ]
    try:
        raw = await _call_llm(messages, model=model, provider_id=provider_id)
        data = _safe_json_loads(raw)
        entities = data.get("entities", [])
        relationships = data.get("relationships", [])
        return entities, relationships
    except Exception as e:
        print(f"GraphRAG extraction error: {e}")
        return [], []


def _build_batch_extraction_prompt(schema: dict | None, chunks: list[tuple[str, dict[str, Any]]]) -> str:
    """Build a prompt for batch extraction over multiple chunks."""
    entity_types = ", ".join(schema.get("entity_types", DEFAULT_ENTITY_TYPES) if schema else DEFAULT_ENTITY_TYPES)
    relation_types = ", ".join(schema.get("relation_types", DEFAULT_RELATION_TYPES) if schema else DEFAULT_RELATION_TYPES)
    chunks_text = "\n\n---\n\n".join(
        f"CHUNK {i + 1}:\n{text[:2000]}" for i, (text, _) in enumerate(chunks)
    )
    return BATCH_EXTRACTION_PROMPT_TEMPLATE.format(
        entity_types=entity_types,
        relation_types=relation_types,
        chunks=chunks_text,
    )


async def extract_entities_and_relationships_batch(
    chunks: list[tuple[str, dict[str, Any]]],
    model: str | None = None,
    provider_id: str | None = None,
    schema: dict | None = None,
) -> tuple[list[dict], list[dict]]:
    """Run LLM extraction over a batch of chunks."""
    prompt = _build_batch_extraction_prompt(schema, chunks)
    messages = [
        {"role": "system", "content": "You extract structured knowledge graphs from text."},
        {"role": "user", "content": prompt},
    ]
    try:
        raw = await _call_llm(messages, model=model, provider_id=provider_id)
        data = _safe_json_loads(raw)
        entities = data.get("entities", [])
        relationships = data.get("relationships", [])
        return entities, relationships
    except Exception as e:
        print(f"GraphRAG batch extraction error: {e}")
        return [], []


async def build_graph_for_kb(
    kb_id: str,
    chunks: list[tuple[str, dict[str, Any]]],
    model: str | None = None,
    provider_id: str | None = None,
    schema: dict | None = None,
) -> dict:
    """Build a knowledge graph from text chunks.

    Args:
        kb_id: Knowledge base ID
        chunks: List of (text, metadata) tuples
        model: Optional model override for extraction/summarization
        provider_id: Optional provider override
        schema: Optional graph schema with entity_types and relation_types

    Returns:
        dict with stats about the built graph
    """
    # Prefer official neo4j-graphrag when available
    if _use_official() and build_graph_official is not None:
        print(f"[GraphRAG] Using official neo4j-graphrag backend for KB {kb_id}")
        return await build_graph_official(
            kb_id, chunks, model=model, provider_id=provider_id, schema=schema
        )

    # Legacy NetworkX implementation below
    import networkx as nx

    set_graph_status(kb_id, "indexing")

    cfg = get_config()
    extraction_model = model or cfg.active_model
    extraction_provider = provider_id or cfg.active_provider_id
    batch_size = (schema.get("batch_size", 5) if schema else 5)

    try:
        # 1. Extract entities and relationships from all chunks in batches
        all_entities: dict[str, dict] = {}  # normalized_name -> entity data
        all_relationships: list[dict] = []
        chunk_hashes: dict[str, str] = {}  # chunk_hash -> chunk_text (for incremental tracking)
        total = len(chunks)
        num_batches = (total + batch_size - 1) // batch_size

        set_graph_progress(kb_id, 0, num_batches + 3, "extraction", "Starting entity extraction...")

        for batch_idx, batch_start in enumerate(range(0, total, batch_size)):
            batch_end = min(batch_start + batch_size, total)
            batch = chunks[batch_start:batch_end]
            msg = f"Extracting entities from batch {batch_idx + 1} of {num_batches} ({batch_start + 1}-{batch_end} chunks)..."
            print(f"[GraphRAG] {msg}")
            set_graph_progress(kb_id, batch_idx, num_batches + 3, "extraction", msg)

            # Track chunk hashes for incremental updates
            for i, (text, meta) in enumerate(batch):
                ch = _chunk_hash(text)
                chunk_hashes[ch] = text

            entities, relationships = await extract_entities_and_relationships_batch(
                batch, model=extraction_model, provider_id=extraction_provider, schema=schema
            )

            for e in entities:
                norm = _normalize_entity_name(e.get("name", ""))
                if not norm:
                    continue
                if norm not in all_entities:
                    all_entities[norm] = {
                        "name": e.get("name", "").strip(),
                        "type": e.get("type", "OTHER"),
                        "description": e.get("description", ""),
                        "source_chunks": [],
                    }
                for i, (text, meta) in enumerate(batch):
                    ch = _chunk_hash(text)
                    sc = {"batch": f"{batch_start + 1}-{batch_end}", "hash": ch}
                    if sc not in all_entities[norm]["source_chunks"]:
                        all_entities[norm]["source_chunks"].append(sc)

            for r in relationships:
                src = _normalize_entity_name(r.get("source", ""))
                tgt = _normalize_entity_name(r.get("target", ""))
                if not src or not tgt:
                    continue
                batch_hash = _chunk_hash(batch[0][0]) if batch else ""
                all_relationships.append({
                    "source": src,
                    "relation": r.get("relation", "related_to"),
                    "target": tgt,
                    "description": r.get("description", ""),
                    "source_chunks": [{"batch": f"{batch_start + 1}-{batch_end}", "hash": batch_hash}],
                })

            await asyncio.sleep(0.2)

        if not all_entities:
            set_graph_status(kb_id, "error", error="No entities extracted from chunks")
            set_graph_progress(kb_id, 0, 1, "error", "No entities extracted from chunks")
            return {"status": "error", "entities": 0, "relationships": 0, "communities": 0}

        msg = f"Extracted {len(all_entities)} entities, {len(all_relationships)} relationships. Building graph..."
        print(f"[GraphRAG] {msg}")
        set_graph_progress(kb_id, num_batches, num_batches + 3, "building", msg)

        # 2. Build NetworkX graph
        graph = nx.MultiDiGraph()
        for norm, e in all_entities.items():
            graph.add_node(
                norm,
                name=e["name"],
                type=e["type"],
                description=e["description"],
                source_chunks=e["source_chunks"],
            )

        for r in all_relationships:
            if r["source"] in all_entities and r["target"] in all_entities:
                graph.add_edge(
                    r["source"],
                    r["target"],
                    relation=r["relation"],
                    description=r["description"],
                    source_chunks=r["source_chunks"],
                )

        # 3. Community detection
        msg = f"Running community detection on {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges..."
        print(f"[GraphRAG] {msg}")
        set_graph_progress(kb_id, num_batches + 1, num_batches + 3, "community_detection", msg)
        try:
            # Try python-louvain first
            try:
                import community as community_louvain
                partition = community_louvain.best_partition(graph.to_undirected())
                communities: dict[int, set] = {}
                for node, comm_id in partition.items():
                    communities.setdefault(comm_id, set()).add(node)
            except ImportError:
                # Fallback to NetworkX greedy modularity
                communities_iter = nx.algorithms.community.greedy_modularity_communities(graph.to_undirected())
                communities = {i: set(c) for i, c in enumerate(communities_iter)}
        except Exception as e:
            print(f"Community detection error: {e}")
            communities = {0: set(graph.nodes())}

        msg = f"Found {len(communities)} communities. Summarizing..."
        print(f"[GraphRAG] {msg}")

        # 4. Summarize communities in parallel
        # Skip communities with fewer than 3 entities (not worth summarizing)
        communities_to_summarize = {cid: nodes for cid, nodes in communities.items() if len(nodes) >= 3}
        if not communities_to_summarize:
            communities_to_summarize = communities  # fallback: summarize all if all are tiny

        total_communities = len(communities_to_summarize)
        msg = f"Found {len(communities)} communities. Summarizing {total_communities} in parallel..."
        print(f"[GraphRAG] {msg}")
        set_graph_progress(kb_id, num_batches + 1, num_batches + 3, "summarization", msg)

        # Build tasks for parallel execution
        summary_tasks = []
        for comm_id, nodes in communities_to_summarize.items():
            summary_tasks.append(
                _summarize_single_community(comm_id, nodes, graph, extraction_model, extraction_provider)
            )

        # Run all community summaries in parallel with a concurrency limit
        MAX_PARALLEL = 5
        community_summaries = []
        for i in range(0, len(summary_tasks), MAX_PARALLEL):
            batch_tasks = summary_tasks[i:i + MAX_PARALLEL]
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            for res in batch_results:
                if isinstance(res, Exception):
                    print(f"[GraphRAG] Community summary task failed: {res}")
                    continue
                community_summaries.append(res)
            set_graph_progress(
                kb_id,
                num_batches + 1 + len(community_summaries) / max(total_communities, 1),
                num_batches + 3,
                "summarization",
                f"Summarized {len(community_summaries)} of {total_communities} communities..."
            )

        msg = f"Summarized {len(community_summaries)} communities. Saving graph..."
        print(f"[GraphRAG] {msg}")
        set_graph_progress(kb_id, num_batches + 2, num_batches + 3, "persisting", msg)

        # 5. Persist
        graph_dir = _kb_graph_dir(kb_id)
        graph_dir.mkdir(parents=True, exist_ok=True)

        # Serialize graph for JSON (networkx node_link_data)
        graph_data = nx.node_link_data(graph)
        _graph_path(kb_id).write_text(json.dumps(graph_data, indent=2))
        _communities_path(kb_id).write_text(json.dumps(community_summaries, indent=2))

        # Build embeddings for community summaries (for global search)
        summary_texts = [c["summary"] for c in community_summaries if c["summary"]]
        summary_embeddings = []
        if summary_texts:
            print(f"[GraphRAG] Embedding {len(summary_texts)} community summaries...")
            try:
                embeddings = ProviderEmbeddings(provider_id=extraction_provider, model=None)
                # Use asyncio.wait_for to cap embedding time at 30s
                summary_embeddings = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(None, embeddings.embed_documents, summary_texts),
                    timeout=30.0
                )
                print(f"[GraphRAG] Embedded {len(summary_embeddings)} summaries.")
            except asyncio.TimeoutError:
                print("[GraphRAG] Community embedding timed out after 30s, skipping.")
            except Exception as e:
                print(f"Community embedding error: {e}")
        else:
            print("[GraphRAG] No community summaries to embed.")

        index = {
            "status": "ready",
            "entity_count": len(all_entities),
            "relationship_count": len(all_relationships),
            "community_count": len(community_summaries),
            "chunk_hashes": list(chunk_hashes.keys()),
            "build_timestamp": __import__("time").time(),
            "community_summaries": [
                {
                    "id": c["id"],
                    "summary": c["summary"],
                    "entity_count": c["entity_count"],
                    "embedding": summary_embeddings[i] if i < len(summary_embeddings) else None,
                }
                for i, c in enumerate(community_summaries)
            ],
        }
        _index_path(kb_id).write_text(json.dumps(index, indent=2))

        # Optionally save to Neo4j
        _try_save_to_neo4j(kb_id, graph, index, community_summaries)

        msg = f"Graph ready! {len(all_entities)} entities, {len(all_relationships)} relationships, {len(community_summaries)} communities."
        print(f"[GraphRAG] {msg}")
        set_graph_progress(kb_id, num_batches + 3, num_batches + 3, "ready", msg)

        return {
            "status": "ready",
            "entities": len(all_entities),
            "relationships": len(all_relationships),
            "communities": len(community_summaries),
        }
    except Exception as e:
        err_msg = f"Graph build failed: {e}"
        print(f"[GraphRAG] {err_msg}")
        import traceback
        traceback.print_exc()
        set_graph_status(kb_id, "error", error=str(e))
        set_graph_progress(kb_id, 0, 1, "error", err_msg)
        return {"status": "error", "entities": 0, "relationships": 0, "communities": 0, "error": str(e)}


async def update_graph_for_kb(
    kb_id: str,
    chunks: list[tuple[str, dict[str, Any]]],
    model: str | None = None,
    provider_id: str | None = None,
    schema: dict | None = None,
) -> dict:
    """Incrementally update an existing knowledge graph with new/changed chunks.

    Instead of rebuilding from scratch, this function:
    1. Computes hashes for all incoming chunks
    2. Compares against stored chunk_hashes in the existing index
    3. Only extracts entities/relationships from new or changed chunks
    4. Merges new entities/relationships into the existing graph (with fuzzy dedup)
    5. Re-runs community detection on the updated graph
    6. Re-summarizes only communities that have changed
    7. Re-embeds community summaries

    Falls back to a full rebuild if no existing graph is found.
    """
    if _use_official() and build_graph_official is not None:
        print(f"[GraphRAG] Incremental update: delegating to official backend for KB {kb_id}")
        return await build_graph_official(kb_id, chunks, model=model, provider_id=provider_id, schema=schema)

    import networkx as nx

    # Load existing graph
    existing_graph, existing_index, existing_communities = _load_existing_graph(kb_id)
    
    if existing_graph is None or existing_index is None or existing_index.get("status") != "ready":
        print(f"[GraphRAG] No existing graph for {kb_id}, falling back to full build")
        return await build_graph_for_kb(kb_id, chunks, model=model, provider_id=provider_id, schema=schema)

    set_graph_status(kb_id, "indexing")
    cfg = get_config()
    extraction_model = model or cfg.active_model
    extraction_provider = provider_id or cfg.active_provider_id
    batch_size = (schema.get("batch_size", 5) if schema else 5)

    try:
        # 1. Determine which chunks are new/changed
        old_hashes = set(existing_index.get("chunk_hashes", []))
        new_chunk_hashes = {}
        for text, meta in chunks:
            ch = _chunk_hash(text)
            new_chunk_hashes[ch] = text

        new_hashes = set(new_chunk_hashes.keys())
        added_hashes = new_hashes - old_hashes
        removed_hashes = old_hashes - new_hashes

        if not added_hashes and not removed_hashes:
            print(f"[GraphRAG] No changes detected for KB {kb_id}, graph is up to date")
            set_graph_status(kb_id, "ready")
            return {
                "status": "ready",
                "entities": existing_graph.number_of_nodes(),
                "relationships": existing_graph.number_of_edges(),
                "communities": len(existing_communities or []),
                "changes": "none",
            }

        print(f"[GraphRAG] Incremental update for {kb_id}: {len(added_hashes)} new, {len(removed_hashes)} removed chunks")

        # 2. If chunks were removed, we need to remove stale entities/relationships
        if removed_hashes:
            set_graph_progress(kb_id, 0, len(added_hashes) + len(removed_hashes) + 3, "cleanup", "Removing stale entities...")
            # Remove nodes whose only source chunks are removed ones
            stale_nodes = []
            # Recompute which hashes are still valid
            remaining_hashes = new_hashes
            for node in list(existing_graph.nodes()):
                nd = existing_graph.nodes[node]
                source_chunks = nd.get("source_chunks", [])
                # Remove source chunks that no longer exist
                nd["source_chunks"] = [sc for sc in source_chunks if isinstance(sc, dict) and sc.get("hash", "") in remaining_hashes]
                if not nd["source_chunks"]:
                    stale_nodes.append(node)

            for node in stale_nodes:
                existing_graph.remove_node(node)

            print(f"[GraphRAG] Removed {len(stale_nodes)} stale entities, graph now has {existing_graph.number_of_nodes()} nodes")

        # 3. Extract entities/relationships from new chunks only
        new_chunks = [(new_chunk_hashes[h], {}) for h in added_hashes if h in new_chunk_hashes]
        
        all_new_entities: dict[str, dict] = {}
        all_new_relationships: list[dict] = []

        if new_chunks:
            total_new = len(new_chunks)
            num_batches = (total_new + batch_size - 1) // batch_size
            set_graph_progress(kb_id, 0, num_batches + 3, "extraction", f"Extracting from {total_new} new chunks...")

            for batch_idx, batch_start in enumerate(range(0, total_new, batch_size)):
                batch_end = min(batch_start + batch_size, total_new)
                batch = new_chunks[batch_start:batch_end]
                
                entities, relationships = await extract_entities_and_relationships_batch(
                    batch, model=extraction_model, provider_id=extraction_provider, schema=schema
                )

                for e in entities:
                    norm = _normalize_entity_name(e.get("name", ""))
                    if not norm:
                        continue
                    entity_data = {
                        "name": e.get("name", "").strip(),
                        "type": e.get("type", "OTHER"),
                        "description": e.get("description", ""),
                        "source_chunks": [{"batch": f"{batch_start + 1}-{batch_end}", "hash": _chunk_hash(batch[0][0] if batch else "")}],
                    }
                    _resolve_entity(norm, entity_data, all_new_entities)

                for r in relationships:
                    src = _normalize_entity_name(r.get("source", ""))
                    tgt = _normalize_entity_name(r.get("target", ""))
                    if not src or not tgt:
                        continue
                    all_new_relationships.append({
                        "source": src,
                        "relation": r.get("relation", "related_to"),
                        "target": tgt,
                        "description": r.get("description", ""),
                        "source_chunks": [{"batch": f"{batch_start + 1}-{batch_end}"}],
                    })

                await asyncio.sleep(0.2)

        # 4. Merge new entities into existing graph
        merged_entities = 0
        merged_relationships = 0
        added_entities = 0

        # Build entity map from existing graph for fuzzy resolution
        existing_entity_map = {}
        for node in existing_graph.nodes():
            nd = existing_graph.nodes[node]
            existing_entity_map[node] = dict(nd)

        for norm, e_data in all_new_entities.items():
            resolved = _resolve_entity(norm, e_data, existing_entity_map)
            resolved_norm = _normalize_entity_name(resolved.get("name", norm))
            
            if resolved_norm not in existing_graph:
                existing_graph.add_node(
                    resolved_norm,
                    name=resolved.get("name", e_data["name"]),
                    type=resolved.get("type", e_data.get("type", "OTHER")),
                    description=resolved.get("description", ""),
                    source_chunks=resolved.get("source_chunks", []),
                )
                added_entities += 1
            else:
                # Update existing node attributes
                nd = existing_graph.nodes[resolved_norm]
                if len(resolved.get("description", "")) > len(nd.get("description", "")):
                    nd["description"] = resolved["description"]
                for sc in resolved.get("source_chunks", []):
                    if sc not in nd.get("source_chunks", []):
                        nd.setdefault("source_chunks", []).append(sc)
                merged_entities += 1

        for r in all_new_relationships:
            src_norm = _normalize_entity_name(r["source"])
            tgt_norm = _normalize_entity_name(r["target"])
            # Resolve through entity map
            src_resolved = src_norm
            tgt_resolved = tgt_norm
            for existing_norm in existing_entity_map:
                if _entity_similarity_fuzzy(src_norm, existing_norm) >= 0.8:
                    src_resolved = existing_norm
                    break
            for existing_norm in existing_entity_map:
                if _entity_similarity_fuzzy(tgt_norm, existing_norm) >= 0.8:
                    tgt_resolved = existing_norm
                    break

            if src_resolved in existing_graph and tgt_resolved in existing_graph:
                # Check if this edge already exists
                already_exists = False
                if existing_graph.has_edge(src_resolved, tgt_resolved):
                    for key in existing_graph[src_resolved][tgt_resolved]:
                        edge = existing_graph[src_resolved][tgt_resolved][key]
                        if edge.get("relation") == r["relation"]:
                            already_exists = True
                            break
                if not already_exists:
                    existing_graph.add_edge(
                        src_resolved, tgt_resolved,
                        relation=r["relation"],
                        description=r.get("description", ""),
                        source_chunks=r.get("source_chunks", []),
                    )
                    merged_relationships += 1

        print(f"[GraphRAG] Merged: {added_entities} new entities, {merged_entities} updated entities, {merged_relationships} new relationships")

        # 5. Re-run community detection on the updated graph
        set_graph_progress(kb_id, len(all_new_relationships), len(all_new_relationships) + 3, "community_detection", "Recomputing communities...")
        try:
            try:
                import community as community_louvain
                partition = community_louvain.best_partition(existing_graph.to_undirected())
                communities: dict[int, set] = {}
                for node, comm_id in partition.items():
                    communities.setdefault(comm_id, set()).add(node)
            except ImportError:
                communities_iter = nx.algorithms.community.greedy_modularity_communities(existing_graph.to_undirected())
                communities = {i: set(c) for i, c in enumerate(communities_iter)}
        except Exception as e:
            print(f"Community detection error: {e}")
            communities = {0: set(existing_graph.nodes())}

        # 6. Determine which communities changed and re-summarize only those
        old_community_map = {}
        if existing_communities:
            for c in existing_communities:
                old_community_map[c.get("id", -1)] = set(c.get("entities", []))

        new_community_ids = set()
        for cid, nodes in communities.items():
            if len(nodes) < 2:
                continue
            # Check if this community's composition changed
            if cid not in old_community_map or old_community_map[cid] != nodes:
                new_community_ids.add(cid)

        print(f"[GraphRAG] {len(communities)} communities total, {len(new_community_ids)} changed, re-summarizing those")

        communities_to_summarize = {cid: nodes for cid, nodes in communities.items() if cid in new_community_ids and len(nodes) >= 2}
        if not communities_to_summarize:
            # Even if no communities changed, we need a valid summary for each
            communities_to_summarize = {cid: nodes for cid, nodes in communities.items() if len(nodes) >= 2}

        # Reuse existing summaries for unchanged communities
        reused_summaries = {}
        if existing_communities:
            for c in existing_communities:
                cid = c.get("id", -1)
                if cid not in new_community_ids and cid in communities:
                    reused_summaries[cid] = c

        # Summarize only changed communities
        summary_tasks = []
        for comm_id, nodes in communities_to_summarize.items():
            summary_tasks.append(
                _summarize_single_community(comm_id, nodes, existing_graph, extraction_model, extraction_provider)
            )

        community_summaries = []
        MAX_PARALLEL = 5
        for i in range(0, len(summary_tasks), MAX_PARALLEL):
            batch_tasks = summary_tasks[i:i + MAX_PARALLEL]
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            for res in batch_results:
                if isinstance(res, Exception):
                    print(f"[GraphRAG] Community summary task failed: {res}")
                    continue
                community_summaries.append(res)

        # Merge reused and new summaries
        final_summaries = list(community_summaries)
        for cid, summary in reused_summaries.items():
            final_summaries.append(summary)

        set_graph_progress(kb_id, len(all_new_relationships) + 1, len(all_new_relationships) + 3, "persisting", "Saving updated graph...")

        # 7. Persist
        graph_dir = _kb_graph_dir(kb_id)
        graph_dir.mkdir(parents=True, exist_ok=True)

        graph_data = nx.node_link_data(existing_graph)
        _graph_path(kb_id).write_text(json.dumps(graph_data, indent=2))
        _communities_path(kb_id).write_text(json.dumps(final_summaries, indent=2))

        # Re-embed all community summaries
        summary_texts = [c["summary"] for c in final_summaries if c.get("summary")]
        summary_embeddings = []
        if summary_texts:
            print(f"[GraphRAG] Re-embedding {len(summary_texts)} community summaries...")
            try:
                embeddings = ProviderEmbeddings(provider_id=extraction_provider, model=None)
                summary_embeddings = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(None, embeddings.embed_documents, summary_texts),
                    timeout=30.0
                )
                print(f"[GraphRAG] Embedded {len(summary_embeddings)} summaries.")
            except asyncio.TimeoutError:
                print("[GraphRAG] Community embedding timed out after 30s, skipping.")
            except Exception as e:
                print(f"Community embedding error: {e}")

        index = {
            "status": "ready",
            "entity_count": existing_graph.number_of_nodes(),
            "relationship_count": existing_graph.number_of_edges(),
            "community_count": len(final_summaries),
            "chunk_hashes": list(new_chunk_hashes.keys()),
            "build_timestamp": __import__("time").time(),
            "incremental_update": True,
            "changes": {
                "chunks_added": len(added_hashes),
                "chunks_removed": len(removed_hashes),
                "entities_added": added_entities,
                "entities_merged": merged_entities,
                "relationships_added": merged_relationships,
                "communities_changed": len(new_community_ids),
            },
            "community_summaries": [
                {
                    "id": c["id"],
                    "summary": c.get("summary", ""),
                    "entity_count": c.get("entity_count", 0),
                    "embedding": summary_embeddings[i] if i < len(summary_embeddings) else None,
                }
                for i, c in enumerate(final_summaries)
            ],
        }
        _index_path(kb_id).write_text(json.dumps(index, indent=2))

        _try_save_to_neo4j(kb_id, existing_graph, index, final_summaries)

        msg = f"Graph updated! {existing_graph.number_of_nodes()} entities, {existing_graph.number_of_edges()} edges, {len(final_summaries)} communities. Changes: +{len(added_hashes)} chunks, -{len(removed_hashes)} chunks"
        print(f"[GraphRAG] {msg}")
        set_graph_progress(kb_id, 1, 1, "ready", msg)
        set_graph_status(kb_id, "ready")

        return {
            "status": "ready",
            "entities": existing_graph.number_of_nodes(),
            "relationships": existing_graph.number_of_edges(),
            "communities": len(final_summaries),
            "changes": {
                "chunks_added": len(added_hashes),
                "chunks_removed": len(removed_hashes),
                "entities_added": added_entities,
                "entities_merged": merged_entities,
                "relationships_added": merged_relationships,
            },
        }
    except Exception as e:
        err_msg = f"Graph update failed: {e}"
        print(f"[GraphRAG] {err_msg}")
        import traceback
        traceback.print_exc()
        set_graph_status(kb_id, "error", error=str(e))
        set_graph_progress(kb_id, 0, 1, "error", err_msg)
        return {"status": "error", "entities": 0, "relationships": 0, "communities": 0, "error": str(e)}


async def retrieve_graph_context(
    kb_id: str,
    query: str,
    mode: str = "local",
    max_depth: int = 2,
    top_k: int = 5,
    provider_id: str | None = None,
    embedding_model: str | None = None,
) -> list[str]:
    """Retrieve context from a GraphRAG knowledge base.

    Args:
        kb_id: Knowledge base ID
        query: User query
        mode: "local" | "global" | "hybrid" | "path" | "neighborhood"
        max_depth: BFS depth for local search
        top_k: Number of communities/chunks to return
        provider_id: Embedding provider
        embedding_model: Embedding model name

    Returns:
        List of context strings
    """
    # Prefer official neo4j-graphrag for hybrid mode when available
    if _use_official() and retrieve_graph_context_official is not None:
        # Official library excels at hybrid retrieval; still allow legacy modes
        # to work via NetworkX when the local JSON graph exists.
        if mode == "hybrid":
            return await retrieve_graph_context_official(
                kb_id, query, mode=mode, max_depth=max_depth, top_k=top_k,
                provider_id=provider_id, embedding_model=embedding_model,
            )

    import networkx as nx

    graph_path = _graph_path(kb_id)
    communities_path = _communities_path(kb_id)
    index_path = _index_path(kb_id)

    if not graph_path.exists() or not index_path.exists():
        return []

    try:
        graph_data = json.loads(graph_path.read_text())
        graph = nx.node_link_graph(graph_data)
        index = json.loads(index_path.read_text())
    except Exception as e:
        print(f"GraphRAG load error: {e}")
        return []

    if mode == "global":
        return await _global_search(graph, index, query, top_k, provider_id, embedding_model)
    elif mode == "hybrid":
        return await _hybrid_search(graph, query, kb_id, max_depth, top_k, provider_id, embedding_model)
    elif mode == "path":
        return await _path_search(graph, query, top_k)
    elif mode == "neighborhood":
        return await _neighborhood_search(graph, query, top_k)
    else:
        return await _local_search(graph, query, max_depth, top_k)



async def _local_search(
    graph: Any,
    query: str,
    max_depth: int,
    top_k: int,
) -> list[str]:
    """Local search: extract query entities, BFS traversal, collect context."""
    import networkx as nx

    # Try LLM entity extraction from query
    cfg = get_config()
    query_entities = set()
    try:
        messages = [
            {"role": "system", "content": "You extract entities from queries."},
            {"role": "user", "content": QUERY_ENTITY_EXTRACTION_PROMPT + query},
        ]
        raw = await _call_llm(messages, model=cfg.active_model, provider_id=cfg.active_provider_id)
        data = _safe_json_loads(raw)
        if isinstance(data, list):
            query_entities = {_normalize_entity_name(e) for e in data if isinstance(e, str)}
        elif isinstance(data, dict) and "entities" in data:
            query_entities = {_normalize_entity_name(e.get("name", e)) for e in data["entities"]}
    except Exception as e:
        print(f"Query entity extraction error: {e}")

    # Fallback: keyword match on node names
    if not query_entities:
        query_words = set(query.lower().split())
        for node in graph.nodes():
            node_name = str(node).lower()
            nd = graph.nodes[node]
            display_name = nd.get("name", node_name).lower()
            if any(w in display_name or w in node_name for w in query_words if len(w) > 3):
                query_entities.add(node)

    if not query_entities:
        return []

    # BFS traversal from matched entities
    visited_entities = set()
    visited_edges = []
    source_chunks = []

    for start in query_entities:
        if start not in graph:
            continue
        try:
            for depth in range(max_depth + 1):
                if depth == 0:
                    nodes_at_depth = {start}
                else:
                    nodes_at_depth = set()
                    for n in visited_entities:
                        if graph.has_node(n):
                            nodes_at_depth.update(graph.successors(n))
                            nodes_at_depth.update(graph.predecessors(n))
                for node in nodes_at_depth:
                    if node in graph:
                        visited_entities.add(node)
                        nd = graph.nodes[node]
                        for sc in nd.get("source_chunks", []):
                            if isinstance(sc, dict) and sc not in source_chunks:
                                source_chunks.append(sc)
                        for u, v, d in graph.in_edges(node, data=True):
                            visited_edges.append({
                                "source": graph.nodes[u].get("name", u),
                                "relation": d.get("relation", "related_to"),
                                "target": graph.nodes[v].get("name", v),
                                "description": d.get("description", ""),
                            })
                        for u, v, d in graph.out_edges(node, data=True):
                            visited_edges.append({
                                "source": graph.nodes[u].get("name", u),
                                "relation": d.get("relation", "related_to"),
                                "target": graph.nodes[v].get("name", v),
                                "description": d.get("description", ""),
                            })
        except Exception as e:
            print(f"BFS error: {e}")
            continue

    if not visited_entities:
        return []

    # Deduplicate edges
    seen_edges = set()
    unique_edges = []
    for e in visited_edges:
        key = (e["source"], e["relation"], e["target"])
        if key not in seen_edges:
            seen_edges.add(key)
            unique_edges.append(e)

    # Build context string
    entity_lines = []
    for node in list(visited_entities)[:top_k * 3]:
        if node in graph:
            nd = graph.nodes[node]
            entity_lines.append(f"- {nd.get('name', node)} ({nd.get('type', 'OTHER')}): {nd.get('description', '')}")

    edge_lines = []
    for e in unique_edges[:top_k * 5]:
        edge_lines.append(f"- {e['source']} --[{e['relation']}]--> {e['target']}: {e['description']}")

    context_parts = []
    if entity_lines:
        context_parts.append("Relevant Entities:\n" + "\n".join(entity_lines))
    if edge_lines:
        context_parts.append("Relationships:\n" + "\n".join(edge_lines))

    return ["\n\n".join(context_parts)] if context_parts else []


async def _vector_search_chunks(kb_id: str, query: str, top_k: int, provider_id: str | None, embedding_model: str | None) -> list[str]:
    try:
        return await retrieve_relevant_chunks(
            kb_id=kb_id, query_text=query, n_results=top_k,
            provider_id=provider_id, embedding_model=embedding_model,
            hybrid=True, rerank=True,
        )
    except Exception as e:
        print(f"Hybrid vector search error: {e}")
        return []


def _find_chunk_entities(graph: Any, chunk_texts: list[str]) -> set[str]:
    chunk_entities: set[str] = set()
    if not chunk_texts:
        return chunk_entities
    for node in graph.nodes():
        display_name = graph.nodes[node].get("name", node).lower()
        if len(display_name) <= 2:
            continue
        for chunk in chunk_texts:
            if display_name in chunk.lower():
                chunk_entities.add(node)
                break
    return chunk_entities


async def _extract_query_entities(graph: Any, query: str) -> set[str]:
    query_entities = set()
    try:
        cfg = get_config()
        messages = [
            {"role": "system", "content": "You extract entities from queries."},
            {"role": "user", "content": QUERY_ENTITY_EXTRACTION_PROMPT + query},
        ]
        raw = await _call_llm(messages, model=cfg.active_model, provider_id=cfg.active_provider_id)
        data = _safe_json_loads(raw)
        if isinstance(data, list):
            query_entities = {_normalize_entity_name(e) for e in data if isinstance(e, str)}
        elif isinstance(data, dict) and "entities" in data:
            query_entities = {_normalize_entity_name(e.get("name", e)) for e in data["entities"]}
    except Exception as e:
        print(f"Hybrid query entity extraction error: {e}")

    if not query_entities:
        query_words = set(query.lower().split())
        for node in graph.nodes():
            display_name = graph.nodes[node].get("name", node).lower()
            if any(w in display_name for w in query_words if len(w) > 3):
                query_entities.add(node)

    return query_entities


def _bfs_traverse(graph: Any, starting_entities: set[str], max_depth: int) -> tuple[set[str], list[dict]]:
    visited_entities: set[str] = set()
    visited_edges: list[dict] = []

    for start in starting_entities:
        if start not in graph:
            continue
        try:
            for depth in range(max_depth + 1):
                if depth == 0:
                    nodes_at_depth = {start}
                else:
                    nodes_at_depth = set()
                    for n in visited_entities:
                        if graph.has_node(n):
                            nodes_at_depth.update(graph.successors(n))
                            nodes_at_depth.update(graph.predecessors(n))
                for node in nodes_at_depth:
                    if node in graph:
                        visited_entities.add(node)
                        for u, v, d in graph.in_edges(node, data=True):
                            visited_edges.append({
                                "source": graph.nodes[u].get("name", u),
                                "relation": d.get("relation", "related_to"),
                                "target": graph.nodes[v].get("name", v),
                                "description": d.get("description", ""),
                            })
                        for u, v, d in graph.out_edges(node, data=True):
                            visited_edges.append({
                                "source": graph.nodes[u].get("name", u),
                                "relation": d.get("relation", "related_to"),
                                "target": graph.nodes[v].get("name", v),
                                "description": d.get("description", ""),
                            })
        except Exception as e:
            print(f"Hybrid BFS error: {e}")
            continue

    return visited_entities, visited_edges


def _deduplicate_edges(edges: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for e in edges:
        key = (e["source"], e["relation"], e["target"])
        if key not in seen:
            seen.add(key)
            unique.append(e)
    return unique


def _build_hybrid_context(chunk_texts: list[str], graph: Any, visited_entities: set[str], unique_edges: list[dict], top_k: int) -> list[str]:
    context_parts = []

    if chunk_texts:
        context_parts.append("Relevant Document Chunks:\n\n" + "\n\n---\n\n".join(chunk_texts))

    entity_lines = []
    for node in list(visited_entities)[:top_k * 3]:
        if node in graph:
            nd = graph.nodes[node]
            entity_lines.append(f"- {nd.get('name', node)} ({nd.get('type', 'OTHER')}): {nd.get('description', '')}")
    if entity_lines:
        context_parts.append("Related Entities:\n" + "\n".join(entity_lines))

    edge_lines = []
    for e in unique_edges[:top_k * 5]:
        edge_lines.append(f"- {e['source']} --[{e['relation']}]--> {e['target']}: {e['description']}")
    if edge_lines:
        context_parts.append("Relationships:\n" + "\n".join(edge_lines))

    return ["\n\n".join(context_parts)] if context_parts else []


async def _hybrid_search(
    graph: Any,
    query: str,
    kb_id: str,
    max_depth: int,
    top_k: int,
    provider_id: str | None = None,
    embedding_model: str | None = None,
) -> list[str]:
    """Hybrid search: vector search on chunks + graph BFS traversal.

    Inspired by Neo4j VectorCypherRetriever pattern:
    1. Vector search finds relevant starting chunks
    2. Entities from those chunks become graph starting points
    3. BFS traversal gathers connected entities and relationships
    4. Returns both chunk texts and graph context
    """
    chunk_texts = await _vector_search_chunks(kb_id, query, top_k, provider_id, embedding_model)
    chunk_entities = _find_chunk_entities(graph, chunk_texts)
    query_entities = await _extract_query_entities(graph, query)
    starting_entities = chunk_entities | query_entities

    if not starting_entities:
        if chunk_texts:
            return ["Relevant Document Chunks:\n\n" + "\n\n---\n\n".join(chunk_texts)]
        return []

    visited_entities, visited_edges = _bfs_traverse(graph, starting_entities, max_depth)
    unique_edges = _deduplicate_edges(visited_edges)
    return _build_hybrid_context(chunk_texts, graph, visited_entities, unique_edges, top_k)


async def _path_search(
    graph: Any,
    query: str,
    top_k: int,
) -> list[str]:
    """Path search: find shortest path between entities mentioned in query."""
    import networkx as nx

    # Extract entities from query
    path_entities = []
    try:
        cfg = get_config()
        messages = [
            {"role": "system", "content": "You extract entities for path finding."},
            {"role": "user", "content": PATH_EXTRACTION_PROMPT + query},
        ]
        raw = await _call_llm(messages, model=cfg.active_model, provider_id=cfg.active_provider_id)
        data = _safe_json_loads(raw)
        if isinstance(data, list):
            path_entities = [_normalize_entity_name(e) for e in data if isinstance(e, str)]
        elif isinstance(data, dict) and "entities" in data:
            path_entities = [_normalize_entity_name(e.get("name", e)) for e in data["entities"]]
    except Exception as e:
        print(f"Path entity extraction error: {e}")

    # Fallback: keyword match for exactly 2 entities
    if len(path_entities) < 2:
        query_words = set(query.lower().split())
        for node in graph.nodes():
            nd = graph.nodes[node]
            display_name = nd.get("name", node).lower()
            if any(w in display_name for w in query_words if len(w) > 3):
                path_entities.append(node)
                if len(path_entities) >= 2:
                    break

    if len(path_entities) < 2:
        return []

    # Find shortest path between pairs
    paths_found = []
    undirected = graph.to_undirected()

    for i in range(min(3, len(path_entities))):
        for j in range(i + 1, min(4, len(path_entities))):
            src = path_entities[i]
            tgt = path_entities[j]
            if src not in undirected or tgt not in undirected:
                continue
            try:
                path = nx.shortest_path(undirected, source=src, target=tgt)
                path_edges = []
                for idx in range(len(path) - 1):
                    u, v = path[idx], path[idx + 1]
                    # Find edge data (prefer first edge)
                    edge_data = {}
                    if graph.has_edge(u, v):
                        edge_data = list(graph[u][v].values())[0]
                    elif graph.has_edge(v, u):
                        edge_data = list(graph[v][u].values())[0]
                    path_edges.append({
                        "source": graph.nodes[u].get("name", u),
                        "relation": edge_data.get("relation", "related_to"),
                        "target": graph.nodes[v].get("name", v),
                        "description": edge_data.get("description", ""),
                    })

                path_nodes = [graph.nodes[n].get("name", n) for n in path]
                paths_found.append({
                    "nodes": path_nodes,
                    "edges": path_edges,
                })
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                continue

    if not paths_found:
        return []

    lines = []
    for p in paths_found[:top_k]:
        nodes_str = " → ".join(p["nodes"])
        lines.append(f"Path: {nodes_str}")
        for e in p["edges"]:
            lines.append(f"  {e['source']} --[{e['relation']}]--> {e['target']}: {e['description']}")

    return ["Connection Paths:\n\n" + "\n".join(lines)]


async def _neighborhood_search(
    graph: Any,
    query: str,
    top_k: int,
) -> list[str]:
    """Neighborhood search: direct neighbors only (depth=1)."""
    # Extract entities from query
    query_entities = set()
    try:
        cfg = get_config()
        messages = [
            {"role": "system", "content": "You extract entities from queries."},
            {"role": "user", "content": QUERY_ENTITY_EXTRACTION_PROMPT + query},
        ]
        raw = await _call_llm(messages, model=cfg.active_model, provider_id=cfg.active_provider_id)
        data = _safe_json_loads(raw)
        if isinstance(data, list):
            query_entities = {_normalize_entity_name(e) for e in data if isinstance(e, str)}
        elif isinstance(data, dict) and "entities" in data:
            query_entities = {_normalize_entity_name(e.get("name", e)) for e in data["entities"]}
    except Exception as e:
        print(f"Neighborhood query entity extraction error: {e}")

    # Fallback keyword match
    if not query_entities:
        query_words = set(query.lower().split())
        for node in graph.nodes():
            nd = graph.nodes[node]
            display_name = nd.get("name", node).lower()
            if any(w in display_name for w in query_words if len(w) > 3):
                query_entities.add(node)

    if not query_entities:
        return []

    # Collect direct neighbors and edges
    neighbor_entities = set()
    visited_edges = []

    for start in query_entities:
        if start not in graph:
            continue
        neighbor_entities.add(start)
        for neighbor in graph.successors(start):
            neighbor_entities.add(neighbor)
            edge_data = list(graph[start][neighbor].values())[0]
            visited_edges.append({
                "source": graph.nodes[start].get("name", start),
                "relation": edge_data.get("relation", "related_to"),
                "target": graph.nodes[neighbor].get("name", neighbor),
                "description": edge_data.get("description", ""),
            })
        for neighbor in graph.predecessors(start):
            neighbor_entities.add(neighbor)
            edge_data = list(graph[neighbor][start].values())[0]
            visited_edges.append({
                "source": graph.nodes[neighbor].get("name", neighbor),
                "relation": edge_data.get("relation", "related_to"),
                "target": graph.nodes[start].get("name", start),
                "description": edge_data.get("description", ""),
            })

    # Deduplicate edges
    seen_edges = set()
    unique_edges = []
    for e in visited_edges:
        key = (e["source"], e["relation"], e["target"])
        if key not in seen_edges:
            seen_edges.add(key)
            unique_edges.append(e)

    entity_lines = []
    for node in list(neighbor_entities)[:top_k * 3]:
        if node in graph:
            nd = graph.nodes[node]
            entity_lines.append(f"- {nd.get('name', node)} ({nd.get('type', 'OTHER')}): {nd.get('description', '')}")

    edge_lines = []
    for e in unique_edges[:top_k * 5]:
        edge_lines.append(f"- {e['source']} --[{e['relation']}]--> {e['target']}: {e['description']}")

    context_parts = []
    if entity_lines:
        context_parts.append("Entity Neighborhood:\n" + "\n".join(entity_lines))
    if edge_lines:
        context_parts.append("Direct Relationships:\n" + "\n".join(edge_lines))

    return ["\n\n".join(context_parts)] if context_parts else []


async def _global_search(
    graph: Any,
    index: dict,
    query: str,
    top_k: int,
    provider_id: str | None = None,
    embedding_model: str | None = None,
) -> list[str]:
    """Global search: embed query, rank community summaries by similarity."""
    community_summaries = index.get("community_summaries", [])
    if not community_summaries:
        return []

    # Get query embedding
    try:
        embeddings = ProviderEmbeddings(provider_id=provider_id, model=embedding_model)
        query_embedding = embeddings.embed_query(query)
    except Exception as e:
        print(f"Global search embedding error: {e}")
        return []

    import numpy as np

    # Rank by cosine similarity
    scored = []
    for c in community_summaries:
        emb = c.get("embedding")
        if emb:
            sim = float(np.dot(query_embedding, emb) / (np.linalg.norm(query_embedding) * np.linalg.norm(emb)))
            scored.append((sim, c.get("summary", "")))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_summaries = [s for _, s in scored[:top_k] if s.strip()]

    if not top_summaries:
        return []

    return ["Relevant Community Summaries:\n\n" + "\n\n".join(f"- {s}" for s in top_summaries)]


def delete_graph(kb_id: str) -> bool:
    """Delete all graph data for a knowledge base."""
    import shutil
    _try_delete_from_neo4j(kb_id)
    if delete_graph_official is not None:
        try:
            delete_graph_official(kb_id)
        except Exception as e:
            print(f"Official GraphRAG delete error (non-fatal): {e}")
    graph_dir = _kb_graph_dir(kb_id)
    if graph_dir.exists():
        shutil.rmtree(graph_dir)
        return True
    return False
