"""Vector store management using ChromaDB."""
import uuid
from pathlib import Path
from typing import Any, List, Dict

import chromadb
from chromadb.config import Settings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder

from chat import embed_text

# Initialize ChromaDB
STORAGE_PATH = Path.home() / ".chatter" / "chroma"
STORAGE_PATH.mkdir(parents=True, exist_ok=True)

_client = chromadb.PersistentClient(
    path=str(STORAGE_PATH),
    settings=Settings(allow_reset=True)
)

# Global cache for reranker and BM25 objects
_reranker = None
_bm25_cache: Dict[str, BM25Okapi] = {}


def get_reranker():
    global _reranker
    if _reranker is None:
        # Using a small, efficient cross-encoder
        _reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    return _reranker


def get_collection(kb_id: str):
    """Get or create a collection for a knowledge base."""
    return _client.get_or_create_collection(name=f"kb_{kb_id}")


async def add_to_vectorstore(kb_id: str, text: str, metadata: dict[str, Any] = None, chunk_size: int = 1000, chunk_overlap: int = 100, provider_id: str | None = None, embedding_model: str | None = None):
    """Chunk text, embed it, and add to the vector store."""
    collection = get_collection(kb_id)
    
    # Use LangChain splitter
    chunks = chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    
    for i, chunk in enumerate(chunks):
        embedding = await embed_text(chunk, provider_id=provider_id, model=embedding_model)
        chunk_id = str(uuid.uuid4())

        
        chunk_metadata = metadata.copy() if metadata else {}
        chunk_metadata.update({
            "chunk_index": i,
            "total_chunks": len(chunks)
        })
        
        collection.add(
            ids=[chunk_id],
            embeddings=[embedding],
            metadatas=[chunk_metadata],
            documents=[chunk]
        )
    
    # Invalidate BM25 cache for this KB
    if kb_id in _bm25_cache:
        del _bm25_cache[kb_id]
        
    return len(chunks)


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks using LangChain."""
    if not text:
        return []
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    return splitter.split_text(text)


def _get_bm25_index(kb_id: str) -> BM25Okapi | None:
    """Lazily load or create BM25 index for a KB."""
    if kb_id in _bm25_cache:
        return _bm25_cache[kb_id]
    
    collection = get_collection(kb_id)
    results = collection.get()
    
    if not results or not results['documents']:
        return None
        
    tokenized_docs = [doc.lower().split() for doc in results['documents']]
    bm25 = BM25Okapi(tokenized_docs)
    _bm25_cache[kb_id] = bm25
    return bm25


async def retrieve_relevant_chunks(
    kb_id: str, 
    query_text: str, 
    n_results: int = 10, 
    provider_id: str | None = None, 
    embedding_model: str | None = None,
    hybrid: bool = True,
    rerank: bool = True
):
    """Retrieve relevant chunks using hybrid search and reranking."""
    collection = get_collection(kb_id)
    
    # 1. Vector Search
    query_embedding = await embed_text(query_text, provider_id=provider_id, model=embedding_model)
    vector_results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results * 2 if rerank else n_results
    )
    
    candidate_chunks = []
    seen_contents = set()
    
    if vector_results and vector_results['documents']:
        for i in range(len(vector_results['documents'][0])):
            doc = vector_results['documents'][0][i]
            if doc not in seen_contents:
                candidate_chunks.append(doc)
                seen_contents.add(doc)

    # 2. BM25 Keyword Search
    if hybrid:
        bm25 = _get_bm25_index(kb_id)
        if bm25:
            tokenized_query = query_text.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            
            # Get top N indices from BM25
            import numpy as np
            top_indices = np.argsort(bm25_scores)[::-1][:n_results]
            
            # Fetch actual documents for these indices from Chroma
            # This is a bit inefficient because collection.get() might return different order
            # Better to store doc IDs in BM25 or similar.
            all_docs = collection.get()['documents']
            for idx in top_indices:
                if idx < len(all_docs):
                    doc = all_docs[idx]
                    if doc not in seen_contents:
                        candidate_chunks.append(doc)
                        seen_contents.add(doc)

    # 3. Reranking
    if rerank and candidate_chunks:
        reranker = get_reranker()
        # Pair query with each candidate
        sentence_pairs = [[query_text, chunk] for chunk in candidate_chunks]
        scores = reranker.predict(sentence_pairs)
        
        # Sort by score
        ranked_chunks = [chunk for _, chunk in sorted(zip(scores, candidate_chunks), key=lambda x: x[0], reverse=True)]
        return ranked_chunks[:n_results]
    
    return candidate_chunks[:n_results]


def delete_vectorstore(kb_id: str):
    """Delete a collection for a knowledge base."""
    try:
        _client.delete_collection(name=f"kb_{kb_id}")
        if kb_id in _bm25_cache:
            del _bm25_cache[kb_id]
        return True
    except Exception:
        return False

def get_kb_embeddings(kb_id: str):
    """Get all chunks and metadata for a knowledge base."""
    collection = get_collection(kb_id)
    results = collection.get()
    
    items = []
    if results and results['ids']:
        for i in range(len(results['ids'])):
            items.append({
                "id": results['ids'][i],
                "content": results['documents'][i],
                "metadata": results['metadatas'][i]
            })
    return items
