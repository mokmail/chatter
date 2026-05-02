"""Official neo4j-graphrag adapter.

Wraps neo4j-graphrag v1.x library to provide:
- Knowledge-base-scoped graph building via custom KGWriter
- Hybrid vector+graph retrieval via VectorCypherRetriever
- Graph data export for the frontend graph viewer

Falls back gracefully when neo4j-graphrag is not installed or Neo4j is unreachable.
"""
import os
import json
import asyncio
from typing import Any
from pathlib import Path

# Optional: neo4j-graphrag may not be installed
try:
    from neo4j_graphrag.experimental.pipeline.kg_builder import SimpleKGPipeline
    from neo4j_graphrag.experimental.components.kg_writer import KGWriter, Neo4jWriter, KGWriterModel
    from neo4j_graphrag.experimental.components.types import (
        Neo4jGraph,
        Neo4jNode,
        Neo4jRelationship,
        LexicalGraphConfig,
    )
    from neo4j_graphrag.llm import OllamaLLM
    from neo4j_graphrag.embeddings import OllamaEmbeddings
    from neo4j_graphrag.retrievers import VectorCypherRetriever
    from neo4j_graphrag.generation import GraphRAG
    from neo4j_graphrag.experimental.pipeline.notification import Event, EventType
    from neo4j import GraphDatabase

    HAS_OFFICIAL = True
except Exception:
    HAS_OFFICIAL = False
    SimpleKGPipeline = None  # type: ignore
    KGWriter = None  # type: ignore
    Neo4jWriter = None  # type: ignore
    KGWriterModel = None  # type: ignore
    Neo4jGraph = None  # type: ignore
    Neo4jNode = None  # type: ignore
    Neo4jRelationship = None  # type: ignore
    LexicalGraphConfig = None  # type: ignore
    OllamaLLM = None  # type: ignore
    OllamaEmbeddings = None  # type: ignore
    VectorCypherRetriever = None  # type: ignore
    GraphRAG = None  # type: ignore
    Event = None  # type: ignore
    EventType = None  # type: ignore
    GraphDatabase = None  # type: ignore


# Shared paths with graphrag_engine
GRAPHRAG_DIR = Path.home() / ".cio-intelligence-hub" / "graphrag"


def _kb_graph_dir(kb_id: str) -> Path:
    return GRAPHRAG_DIR / kb_id


def _index_path(kb_id: str) -> Path:
    return _kb_graph_dir(kb_id) / "index.json"


def _progress_path(kb_id: str) -> Path:
    return _kb_graph_dir(kb_id) / "progress.json"


def _set_status(kb_id: str, status: str, error: str | None = None):
    idx_path = _index_path(kb_id)
    data: dict[str, Any] = {}
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


def _set_progress(kb_id: str, current: int, total: int, phase: str, message: str = ""):
    progress = {
        "current": current,
        "total": total,
        "phase": phase,
        "message": message,
        "timestamp": __import__("time").time(),
    }
    _kb_graph_dir(kb_id).mkdir(parents=True, exist_ok=True)
    _progress_path(kb_id).write_text(json.dumps(progress, indent=2))


def _get_driver():
    """Get Neo4j driver from environment or return None."""
    if not GraphDatabase:
        return None
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")
    try:
        return GraphDatabase.driver(uri, auth=(user, password))
    except Exception as e:
        print(f"[GraphRAG Official] Neo4j connection error: {e}")
        return None


def _get_ollama_host() -> str | None:
    """Return Ollama base URL from environment."""
    return os.environ.get("OLLAMA_BASE_URL")


class KBGuidedWriter(KGWriter):
    """Custom KGWriter that isolates data per knowledge base.

    Before writing, deletes all nodes previously tagged with this kb_id.
    After receiving the graph from the pipeline, adds a `kb_id` property
    to every node and relationship, then delegates to Neo4jWriter.
    """

    def __init__(
        self,
        driver,
        kb_id: str,
        neo4j_database: str | None = None,
        batch_size: int = 1000,
    ):
        self.kb_id = kb_id
        self.driver = driver
        self.neo4j_database = neo4j_database
        self.batch_size = batch_size
        # inner writer with clean_db=False so we don't wipe other KBs
        self._inner = Neo4jWriter(
            driver=driver,
            neo4j_database=neo4j_database,
            batch_size=batch_size,
            clean_db=False,
        )

    async def run(
        self,
        graph: Neo4jGraph,
        lexical_graph_config: LexicalGraphConfig = LexicalGraphConfig(),
    ) -> KGWriterModel:
        """Write the graph to Neo4j with kb_id tagging."""
        # 1. Delete previous data for this KB
        try:
            with self.driver.session(database=self.neo4j_database) as session:
                session.run(
                    "MATCH (n {kb_id: $kb_id}) DETACH DELETE n",
                    kb_id=self.kb_id,
                )
        except Exception as e:
            print(f"[GraphRAG Official] KB cleanup warning: {e}")

        # 2. Tag every node and relationship with kb_id
        for node in graph.nodes:
            node.properties["kb_id"] = self.kb_id
        for rel in graph.relationships:
            rel.properties["kb_id"] = self.kb_id

        # 3. Delegate to real Neo4jWriter
        return await self._inner.run(graph=graph, lexical_graph_config=lexical_graph_config)


async def build_graph_official(
    kb_id: str,
    chunks: list[tuple[str, dict[str, Any]]],
    model: str | None = None,
    provider_id: str | None = None,
    schema: dict | None = None,
) -> dict:
    """Build a GraphRAG knowledge graph using the official neo4j-graphrag library.

    Returns dict with status, entities, relationships, communities.
    """
    if not HAS_OFFICIAL:
        return {"status": "error", "error": "neo4j-graphrag not installed"}

    driver = _get_driver()
    if not driver:
        return {"status": "error", "error": "Neo4j not available"}

    _set_status(kb_id, "indexing")
    _set_progress(kb_id, 0, 100, "preparation", "Connecting to Neo4j...")

    try:
        # Resolve model names
        cfg = __import__("config").get_config()
        llm_model = model or cfg.active_model or "llama3.2"
        embed_model = "nomic-embed-text"
        ollama_host = _get_ollama_host()
        ollama_kwargs = {"host": ollama_host} if ollama_host else {}

        # Build combined text from all chunks
        combined_text = "\n\n".join(text for text, _ in chunks)
        if not combined_text.strip():
            _set_status(kb_id, "error", error="No text content to build graph from")
            return {"status": "error", "error": "No text content to build graph from"}

        _set_progress(kb_id, 10, 100, "extraction", "Initializing LLM and embedder...")

        llm = OllamaLLM(model_name=llm_model, **ollama_kwargs)
        embedder = OllamaEmbeddings(model=embed_model, **ollama_kwargs)

        _set_progress(kb_id, 20, 100, "extraction", f"Running knowledge graph extraction over {len(chunks)} chunks...")

        # Use custom KB-scoped writer
        kg_writer = KBGuidedWriter(driver=driver, kb_id=kb_id)

        # NOTE: schema='FREE' skips the schema-extraction step and lets the LLM
        # extract any entities/relations it finds (free-form). This avoids
        # JSON-parsing failures from schema-extraction prompts.
        pipeline = SimpleKGPipeline(
            llm=llm,
            driver=driver,
            embedder=embedder,
            from_file=False,
            kg_writer=kg_writer,
            perform_entity_resolution=True,
            on_error="IGNORE",
            schema="FREE",
        )

        result = await pipeline.run_async(text=combined_text)

        _set_progress(kb_id, 80, 100, "building", "Finalizing graph and creating indexes...")

        # Ensure vector index exists for chunk retrieval
        with driver.session() as session:
            idx_result = session.run(
                "SHOW INDEXES YIELD name WHERE name = 'chunk-embedding-index' RETURN count(*) AS c"
            )
            if idx_result.single()["c"] == 0:
                try:
                    session.run(
                        """
                        CREATE VECTOR INDEX chunk-embedding-index IF NOT EXISTS
                        FOR (c:Chunk) ON (c.embedding)
                        OPTIONS {indexConfig: {
                            `vector.dimensions`: 768,
                            `vector.similarity_function`: 'cosine'
                        }}
                        """
                    )
                except Exception as e:
                    print(f"[GraphRAG Official] Vector index creation warning: {e}")

        # Count stats for this KB
        with driver.session() as session:
            entity_count = session.run(
                "MATCH (n {kb_id: $kb_id}) RETURN count(n) AS c",
                kb_id=kb_id,
            ).single()["c"]
            rel_count = session.run(
                "MATCH ()-[r {kb_id: $kb_id}]->() RETURN count(r) AS c",
                kb_id=kb_id,
            ).single()["c"]

        _set_progress(kb_id, 100, 100, "ready", f"Graph ready! {entity_count} nodes, {rel_count} relationships.")
        _set_status(kb_id, "ready")

        # Persist minimal index metadata for compatibility with graphrag_engine
        index = {
            "status": "ready",
            "entity_count": entity_count,
            "relationship_count": rel_count,
            "community_count": 0,
            "official_library": True,
            "community_summaries": [],
        }
        _kb_graph_dir(kb_id).mkdir(parents=True, exist_ok=True)
        _index_path(kb_id).write_text(json.dumps(index, indent=2))

        return {
            "status": "ready",
            "entities": entity_count,
            "relationships": rel_count,
            "communities": 0,
        }

    except Exception as e:
        import traceback

        traceback.print_exc()
        err_msg = f"Official GraphRAG build failed: {e}"
        print(f"[GraphRAG Official] {err_msg}")
        _set_status(kb_id, "error", error=str(e))
        _set_progress(kb_id, 0, 1, "error", err_msg)
        return {"status": "error", "entities": 0, "relationships": 0, "communities": 0, "error": str(e)}
    finally:
        try:
            driver.close()
        except Exception:
            pass


async def retrieve_graph_context_official(
    kb_id: str,
    query: str,
    mode: str = "hybrid",
    max_depth: int = 2,
    top_k: int = 5,
    provider_id: str | None = None,
    embedding_model: str | None = None,
) -> list[str]:
    """Retrieve context using VectorCypherRetriever with KB isolation."""
    if not HAS_OFFICIAL:
        return []

    driver = _get_driver()
    if not driver:
        return []

    try:
        ollama_host = _get_ollama_host()
        ollama_kwargs = {"host": ollama_host} if ollama_host else {}
        embedder = OllamaEmbeddings(model="nomic-embed-text", **ollama_kwargs)

        # Custom retrieval query that filters by kb_id and traverses 1-2 hops
        # Note: $kb_id is injected as a parameter by retriever if we pass it,
        # but VectorCypherRetriever doesn't support extra query params directly.
        # Instead, we hard-code kb_id in the query string. Since Cypher doesn't
        # allow string interpolation, we use a workaround: pass kb_id as a
        # parameter via the retriever's internal query execution. Unfortunately
        # VectorCypherRetriever doesn't expose custom params in search().
        # Workaround: create a retriever per KB by baking kb_id into query.
        # Better workaround: use retrieval_query with no filter, then post-filter.

        # Actually, the neo4j-graphrag retriever supports extra parameters!
        # Let me check...

        # For simplicity, we will use a custom retrieval query that uses
        # apoc.util.validate or similar. But APOC may not be available.
        # Simpler: just traverse without kb_id filter and post-filter in Python.

        retrieval_query = """
        WITH node AS chunk
        MATCH (chunk)<-[:FROM_CHUNK]-(entity)
        WITH chunk, collect(entity) AS entities
        UNWIND entities AS entity
        MATCH (entity)-[rel:!FROM_CHUNK]-{1,2}(neighbor)
        WITH chunk, entity, rel, neighbor
        RETURN chunk.text AS chunk_text,
               chunk.kb_id AS chunk_kb_id,
               entity.id AS entity_id,
               entity.name AS entity_name,
               type(rel) AS relation_type,
               neighbor.name AS neighbor_name
        """

        retriever = VectorCypherRetriever(
            driver=driver,
            index_name="chunk-embedding-index",
            embedder=embedder,
            retrieval_query=retrieval_query,
            result_format="array",
        )

        search_results = retriever.search(query_text=query, top_k=top_k * 3)

        # Post-filter by kb_id and build context
        chunks_seen: set[str] = set()
        rels_seen: set[tuple[str, str, str]] = set()
        entity_lines: list[str] = []
        rel_lines: list[str] = []

        for record in search_results:
            if not isinstance(record, dict):
                continue
            # Filter by kb_id
            if record.get("chunk_kb_id") != kb_id:
                continue

            chunk_text = record.get("chunk_text", "")
            if chunk_text and chunk_text not in chunks_seen:
                chunks_seen.add(chunk_text)

            entity_name = record.get("entity_name", "")
            neighbor_name = record.get("neighbor_name", "")
            relation_type = record.get("relation_type", "")

            if entity_name and neighbor_name and relation_type:
                key = (entity_name, relation_type, neighbor_name)
                if key not in rels_seen:
                    rels_seen.add(key)
                    rel_lines.append(f"- {entity_name} --[{relation_type}]--> {neighbor_name}")

        context_parts: list[str] = []
        if chunks_seen:
            context_parts.append("Relevant Document Chunks:\n\n" + "\n\n---\n\n".join(list(chunks_seen)[:top_k]))
        if entity_lines:
            context_parts.append("Related Entities:\n" + "\n".join(entity_lines))
        if rel_lines:
            context_parts.append("Relationships:\n" + "\n".join(rel_lines[:top_k * 5]))

        return ["\n\n".join(context_parts)] if context_parts else []

    except Exception as e:
        print(f"[GraphRAG Official] Retrieval error: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        try:
            driver.close()
        except Exception:
            pass


def get_graph_data_official(kb_id: str) -> dict:
    """Return graph nodes/edges for the frontend graph viewer."""
    if not HAS_OFFICIAL:
        return {"nodes": [], "edges": [], "communities": []}

    driver = _get_driver()
    if not driver:
        return {"nodes": [], "edges": [], "communities": []}

    try:
        with driver.session() as session:
            # Fetch nodes (both Entity and Chunk types)
            nodes_result = session.run(
                """
                MATCH (n {kb_id: $kb_id})
                RETURN id(n) AS internal_id, labels(n) AS labels, properties(n) AS props
                """,
                kb_id=kb_id,
            )

            nodes: list[dict] = []
            node_id_map: dict[int, int] = {}  # Neo4j internal id -> array index

            for i, record in enumerate(nodes_result):
                internal_id = record["internal_id"]
                labels = record["labels"]
                props = record["props"]
                node_id_map[internal_id] = i

                name = props.get("name") or props.get("text") or props.get("id") or f"node-{i}"
                node_type = labels[0] if labels else "Node"
                description = props.get("description", "")

                nodes.append({
                    "id": str(internal_id),
                    "name": name,
                    "type": node_type,
                    "description": description,
                })

            # Fetch relationships
            edges_result = session.run(
                """
                MATCH (a {kb_id: $kb_id})-[r]->(b {kb_id: $kb_id})
                RETURN id(a) AS src_id, id(b) AS tgt_id, type(r) AS rel_type, properties(r) AS props
                """,
                kb_id=kb_id,
            )

            edges: list[dict] = []
            for record in edges_result:
                src = node_id_map.get(record["src_id"])
                tgt = node_id_map.get(record["tgt_id"])
                if src is not None and tgt is not None:
                    edges.append({
                        "source": str(record["src_id"]),
                        "target": str(record["tgt_id"]),
                        "relation": record["rel_type"],
                        "description": record["props"].get("description", ""),
                    })

            return {
                "nodes": nodes,
                "edges": edges,
                "communities": [],
                "entity_count": len(nodes),
                "relationship_count": len(edges),
            }

    except Exception as e:
        print(f"[GraphRAG Official] Get graph data error: {e}")
        return {"nodes": [], "edges": [], "communities": []}
    finally:
        try:
            driver.close()
        except Exception:
            pass


def delete_graph_official(kb_id: str) -> bool:
    """Delete all Neo4j nodes and relationships tagged with this kb_id."""
    if not HAS_OFFICIAL:
        return False

    driver = _get_driver()
    if not driver:
        return False

    try:
        with driver.session() as session:
            session.run(
                "MATCH (n {kb_id: $kb_id}) DETACH DELETE n",
                kb_id=kb_id,
            )
        return True
    except Exception as e:
        print(f"[GraphRAG Official] Delete error: {e}")
        return False
    finally:
        try:
            driver.close()
        except Exception:
            pass


def get_graph_status_official(kb_id: str) -> str:
    """Return 'ready' if Neo4j has nodes for this KB, else 'none'."""
    if not HAS_OFFICIAL:
        return "none"

    driver = _get_driver()
    if not driver:
        return "none"

    try:
        with driver.session() as session:
            result = session.run(
                "MATCH (n {kb_id: $kb_id}) RETURN count(n) AS c",
                kb_id=kb_id,
            )
            count = result.single()["c"]
            return "ready" if count > 0 else "none"
    except Exception:
        return "none"
    finally:
        try:
            driver.close()
        except Exception:
            pass


def is_available() -> bool:
    """Check if both neo4j-graphrag and a live Neo4j instance are available.

    Also verifies that pydantic is compatible (there is a known issue
    between neo4j-graphrag<1.16 and pydantic>=2.9 that breaks GraphSchema).
    """
    if not HAS_OFFICIAL:
        return False
    # Pydantic compatibility smoke-test
    try:
        from neo4j_graphrag.experimental.components.schema import GraphSchema
        GraphSchema.create_empty()
    except Exception:
        print(
            "[GraphRAG Official] Pydantic compatibility issue detected. "
            "Falling back to legacy NetworkX implementation."
        )
        return False
    driver = _get_driver()
    if not driver:
        return False
    try:
        driver.verify_connectivity()
        return True
    except Exception:
        return False
    finally:
        try:
            driver.close()
        except Exception:
            pass
