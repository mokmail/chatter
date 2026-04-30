import React from 'react'

export const KB_TYPES = [
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    description: 'Container for multiple data sources',
    color: '#6366f1',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject Entire Document' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Max characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200, help: 'Characters overlapping between chunks' },
      { key: 'kb_chat_enabled', label: 'Enable KB Chat', type: 'toggle', default: true, help: 'Allow chatting directly with this knowledge base' },
      { key: 'chat_model', label: 'Chat Model', type: 'select', options: ['default'], default: 'default', help: 'AI model for KB chat' },
      { key: 'temperature', label: 'Temperature', type: 'select', options: ['0.0', '0.1', '0.3', '0.5', '0.7', '1.0'], default: '0.7', help: 'Creativity vs precision' },
      { key: 'max_context_chunks', label: 'Max Context Chunks', type: 'number', default: 10, help: 'Chunks to include in context' },
    ],
  },
]

export const getKBTypeInfo = (kbTypeId) => KB_TYPES.find(t => t.id === kbTypeId) || KB_TYPES[0]