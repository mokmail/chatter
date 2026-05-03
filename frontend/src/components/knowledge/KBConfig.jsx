import React from 'react'

export const KB_TYPES = [
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    description: 'Container for multiple data sources with file-based retrieval',
    color: '#6366f1',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Chunk Search, Full=Inject All Content' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200, help: 'Character overlap between chunks' },
      { key: 'kb_chat_enabled', label: 'Enable KB Chat', type: 'toggle', default: true, help: 'Allow chatting with this KB' },
      { key: 'chat_model', label: 'Chat Model', type: 'select', options: ['default'], default: 'default', help: 'AI model for KB chat' },
    ],
  },
  {
    id: 'vectorstore',
    label: 'Vector Store',
    description: 'Classic vectorstore RAG with embeddings',
    color: '#10b981',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C3.75 16.153 7.444 18 12 18s8.25-1.847 8.25-4.125v-3.75m0 0l-3.75-3.75m3.75 3.75l3.75-3.75m-16.5 3.75l3.75-3.75m-3.75 3.75l-3.75-3.75" />
      </svg>
    ),
    settings: [
      { key: 'vectorDb', label: 'Vector Database', type: 'select', default: 'chroma', help: 'Backend for storing and querying embeddings', options: [
        { value: 'chroma', label: 'ChromaDB' },
        { value: 'qdrant', label: 'Qdrant' },
      ]},
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject All Content' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200, help: 'Character overlap between chunks' },
      { key: 'embeddingModel', label: 'Embedding Model', type: 'text', default: '', help: 'Model for embeddings (empty = default)' },
      { key: 'embeddingProvider', label: 'Embedding Provider', type: 'text', default: '', help: 'Provider ID for embeddings (empty = default)' },
      { key: 'topK', label: 'Top K', type: 'number', default: 10, help: 'Number of chunks to retrieve' },
      { key: 'kb_chat_enabled', label: 'Enable KB Chat', type: 'toggle', default: true, help: 'Allow chatting with this KB' },
      { key: 'chat_model', label: 'Chat Model', type: 'select', options: ['default'], default: 'default', help: 'AI model for KB chat' },
    ],
  },
  {
    id: 'graphrag',
    label: 'GraphRAG',
    description: 'Graph-based retrieval with entity/relationship extraction',
    color: '#f97316',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    settings: [
      { key: 'graph_mode', label: 'Graph Retrieval Mode', type: 'select', options: ['local', 'global', 'hybrid', 'path', 'neighborhood'], default: 'local', help: 'Graph search strategy: local=BFS, global=community, hybrid=vectors+graph' },
      { key: 'max_depth', label: 'BFS Max Depth', type: 'number', default: 2, help: 'Entity traversal depth for local/hybrid search' },
      { key: 'top_k', label: 'Top K', type: 'number', default: 5, help: 'Communities/chunks/edges to return' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Characters per chunk for extraction' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200, help: 'Character overlap between chunks' },
      { key: 'extraction_model', label: 'Extraction Model', type: 'text', default: '', help: 'LLM for entity/relationship extraction (empty = default)' },
      { key: 'embeddingModel', label: 'Embedding Model', type: 'text', default: '', help: 'Model for embeddings (empty = default)' },
      { key: 'embeddingProvider', label: 'Embedding Provider', type: 'text', default: '', help: 'Provider ID for embeddings (empty = default)' },
      { key: 'kb_chat_enabled', label: 'Enable KB Chat', type: 'toggle', default: true, help: 'Allow chatting with this KB' },
      { key: 'chat_model', label: 'Chat Model', type: 'select', options: ['default'], default: 'default', help: 'AI model for KB chat' },
    ],
  },
]

export const getKBTypeInfo = (kbTypeId) => KB_TYPES.find(t => t.id === kbTypeId) || KB_TYPES[0]
