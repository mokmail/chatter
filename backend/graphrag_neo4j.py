"""Optional Neo4j backend adapter for GraphRAG.

When NEO4J_URI is configured, this adapter stores graphs in Neo4j
and enables Cypher-based retrieval. Falls back to NetworkX + JSON
when Neo4j is unavailable.
"""
import json
import os
from typing import Any

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")


def _get_driver():
    """Get Neo4j driver if configured."""
    if not NEO4J_URI:
        return None
    try:
        from neo4j import GraphDatabase
        return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    except Exception as e:
        print(f"Neo4j connection error: {e}")
        return None


def _kb_label(kb_id: str) -> str:
    """Sanitize kb_id for use as a Neo4j label."""
    return "KB_" + "".join(c if c.isalnum() else "_" for c in kb_id)


class Neo4jStore:
    """Neo4j-backed graph store for GraphRAG."""

    def __init__(self):
        self.driver = _get_driver()
        if not self.driver:
            raise RuntimeError("Neo4j is not configured")

    def close(self):
        if self.driver:
            self.driver.close()

    def save_graph(self, kb_id: str, graph: Any, index: dict, communities: list[dict]):
        """Save a NetworkX graph to Neo4j."""
        label = _kb_label(kb_id)
        with self.driver.session() as session:
            # Clear existing data for this KB
            session.run(f"MATCH (n:{label}) DETACH DELETE n")

            # Create entity nodes
            for node in graph.nodes():
                nd = graph.nodes[node]
                session.run(f"""
                    CREATE (n:{label}:Entity {{
                        id: $id,
                        name: $name,
                        type: $type,
                        description: $description,
                        source_chunks: $source_chunks
                    }})
                """, {
                    "id": node,
                    "name": nd.get("name", node),
                    "type": nd.get("type", "OTHER"),
                    "description": nd.get("description", ""),
                    "source_chunks": json.dumps(nd.get("source_chunks", [])),
                })

            # Create relationships
            for u, v, key, d in graph.edges(keys=True, data=True):
                session.run(f"""
                    MATCH (a:{label} {{id: $src}}), (b:{label} {{id: $tgt}})
                    CREATE (a)-[r:{d.get('relation', 'RELATED_TO')} {{
                        description: $description,
                        source_chunks: $source_chunks
                    }}]->(b)
                """, {
                    "src": u,
                    "tgt": v,
                    "description": d.get("description", ""),
                    "source_chunks": json.dumps(d.get("source_chunks", [])),
                })

            # Store community summaries as Community nodes
            for comm in communities:
                session.run(f"""
                    CREATE (c:{label}:Community {{
                        comm_id: $comm_id,
                        summary: $summary,
                        entity_count: $entity_count,
                        entities: $entities
                    }})
                """, {
                    "comm_id": comm["id"],
                    "summary": comm.get("summary", ""),
                    "entity_count": comm.get("entity_count", 0),
                    "entities": json.dumps(comm.get("entities", [])),
                })

    def local_search(self, kb_id: str, query_entities: set[str], max_depth: int, top_k: int) -> list[dict]:
        """Cypher-based BFS from query entities using variable-length paths."""
        label = _kb_label(kb_id)
        results = []
        with self.driver.session() as session:
            for start in query_entities:
                result = session.run(f"""
                    MATCH (start:{label} {{id: $start_id}})
                    OPTIONAL MATCH path = (start)-[*0..$max_depth]-(neighbor:{label})
                    WITH DISTINCT neighbor
                    RETURN neighbor.id as id, neighbor.name as name,
                           neighbor.type as type, neighbor.description as description
                    LIMIT $limit
                """, {"start_id": start, "max_depth": max_depth, "limit": top_k * 3})
                for record in result:
                    results.append({
                        "id": record["id"],
                        "name": record["name"],
                        "type": record["type"],
                        "description": record["description"],
                    })
        return results[:top_k * 3]

    def get_relationships(self, kb_id: str, entity_ids: list[str], top_k: int) -> list[dict]:
        """Get relationships between given entity IDs."""
        label = _kb_label(kb_id)
        with self.driver.session() as session:
            result = session.run(f"""
                MATCH (a:{label})-[r]->(b:{label})
                WHERE a.id IN $ids AND b.id IN $ids
                RETURN a.name as source, type(r) as relation, b.name as target,
                       r.description as description
                LIMIT $limit
            """, {"ids": entity_ids, "limit": top_k * 5})
            return [dict(r) for r in result]

    def delete_graph(self, kb_id: str):
        """Delete all graph data for a KB."""
        label = _kb_label(kb_id)
        with self.driver.session() as session:
            session.run(f"MATCH (n:{label}) DETACH DELETE n")


# Compatibility: if Neo4j is not available, these functions return None
# and graphrag_engine.py falls back to NetworkX.

def get_store() -> Neo4jStore | None:
    """Get Neo4j store if available, otherwise None."""
    try:
        return Neo4jStore()
    except RuntimeError:
        return None
