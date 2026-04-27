import React, { useState, useEffect, useRef } from 'react'
import {
  NotesIcon,
  FileIcon,
  SearchIcon,
  CodeIcon,
  DatabaseIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  XIcon,
  UploadIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
  BrainIcon,
  LoadingSpinner,
} from './common/Icons'

// Enhanced Knowledge Base Types with better icons
const KB_TYPES = [
  {
    id: 'notes',
    label: 'Notes',
    description: 'Personal notes and text snippets',
    color: '#8b5cf6',
    icon: <NotesIcon size={20} />,
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject Entire Document' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Max characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 100, help: 'Characters overlapping between chunks' },
    ],
  },
  {
    id: 'files',
    label: 'Documents',
    description: 'PDF, DOC, TXT files for RAG',
    color: '#6366f1',
    icon: <FileIcon size={20} />,
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject Entire Document' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Max characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 100, help: 'Characters overlapping between chunks' },
      { key: 'allowedTypes', label: 'Allowed File Types', type: 'text', default: '.pdf,.txt,.md,.doc,.docx,.csv', help: 'Comma-separated list of allowed file extensions' },
    ],
  },
  {
    id: 'web',
    label: 'Web Search',
    description: 'Search results as knowledge source',
    color: '#10b981',
    icon: <SearchIcon size={20} />,
    settings: [
      { key: 'searchProvider', label: 'Search Provider', type: 'select', options: ['Google', 'Bing', 'DuckDuckGo', 'SearXNG', 'serpapi'], default: 'Google', help: 'Search engine for web results' },
      { key: 'maxResults', label: 'Max Results', type: 'number', default: 5, help: 'Number of search results to include' },
      { key: 'maxContentLength', label: 'Max Content Length', type: 'number', default: 10000, help: 'Max characters per result' },
      { key: 'chunkSize', label: 'Chunk Size', type: 'number', default: 1500, help: 'Max characters per chunk' },
      { key: 'embeddingModel', label: 'Embedding Model', type: 'select', options: ['nomic-embed-text', 'all-minilm', 'text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'], default: 'nomic-embed-text', help: 'Model used for generating embeddings' },
    ],
  },
  {
    id: 'api',
    label: 'API Sources',
    description: 'External API data integration',
    color: '#f59e0b',
    icon: <CodeIcon size={20} />,
    settings: [
      { key: 'apiEndpoint', label: 'API Endpoint', type: 'text', default: '', help: 'Base URL for the API' },
      { key: 'apiKey', label: 'API Key', type: 'password', default: '', help: 'Authentication key for the API' },
      { key: 'headers', label: 'Custom Headers', type: 'textarea', default: '', help: 'JSON format: {"Authorization": "Bearer ..."}' },
      { key: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT'], default: 'GET' },
      { key: 'responseFormat', label: 'Response Format', type: 'select', options: ['json', 'xml', 'text'], default: 'json' },
      { key: 'refreshInterval', label: 'Refresh Interval (min)', type: 'number', default: 60, help: 'Auto-refresh data every X minutes' },
    ],
  },
  {
    id: 'vectorstore',
    label: 'Vector DB',
    description: 'Chroma, Qdrant, Pinecone collections',
    color: '#ec4899',
    icon: <DatabaseIcon size={20} />,
    settings: [
      { key: 'vectorDB', label: 'Vector Database', type: 'select', options: ['chroma', 'qdrant', 'milvus', 'pinecone', 'pgvector'], default: 'chroma', help: 'Vector database backend' },
      { key: 'collectionName', label: 'Collection Name', type: 'text', default: '', help: 'Name of the vector collection' },
      { key: 'embeddingModel', label: 'Embedding Model', type: 'select', options: ['nomic-embed-text', 'all-minilm', 'text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'], default: 'nomic-embed-text', help: 'Model used for embeddings' },
      { key: 'embeddingDimensions', label: 'Embedding Dimensions', type: 'select', options: ['256', '384', '768', '1536', '3072'], default: '768', help: 'Higher = more detail, slower' },
      { key: 'indexMethod', label: 'Indexing Method', type: 'select', options: ['hnsw', 'flat', 'ivf'], default: 'hnsw', help: 'HNSW is faster for large datasets' },
    ],
  },
]

const getKBTypeInfo = (kbTypeId) => {
  return KB_TYPES.find(t => t.id === kbTypeId) || KB_TYPES[0]
}

const SettingRow = ({ field, value, onChange }) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputValue = value ?? field.default

  const renderInput = () => {
    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            value={inputValue}
            onChange={e => onChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
        )
      case 'text':
        return (
          <input
            type="text"
            value={inputValue}
            onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
        )
      case 'password':
        return (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={inputValue}
              onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-1.5 pr-8 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                )}
              </svg>
            </button>
          </div>
        )
      case 'textarea':
        return (
          <textarea
            value={inputValue}
            onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm resize-none"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', minHeight: '60px', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        )
      case 'toggle':
        return (
          <button
            onClick={() => onChange(!inputValue)}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            style={{ backgroundColor: inputValue ? 'var(--accent)' : 'var(--border)' }}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${inputValue ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        )
      case 'select':
        return (
          <select
            value={inputValue}
            onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--surface)] transition-colors">
      <div className="flex-1">
        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{field.label}</div>
        {field.help && <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{field.help}</div>}
      </div>
      <div className="w-48 ml-4">{renderInput()}</div>
    </div>
  )
}

const SettingsPanel = ({ kb, onSave }) => {
  const typeInfo = getKBTypeInfo(kb.kb_type)
  const [config, setConfig] = useState({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Merge core KB fields with config for the settings UI
    setConfig({
      ...kb.config,
      retrieval_mode: kb.retrieval_mode,
      hybrid_search: kb.hybrid_search,
      reranking: kb.reranking,
      chunk_size: kb.chunk_size,
      chunk_overlap: kb.chunk_overlap
    })
    setHasChanges(false)
  }, [kb.id, kb.retrieval_mode, kb.hybrid_search, kb.reranking, kb.chunk_size, kb.chunk_overlap])

  const handleChange = (key, value) => {
    setConfig({ ...config, [key]: value })
    setHasChanges(true)
  }

  const handleSave = () => {
    // Filter out core fields for the backend update
    const coreFields = ['retrieval_mode', 'hybrid_search', 'reranking', 'chunk_size', 'chunk_overlap']
    const updateData = {}
    const configData = { ...config }
    
    coreFields.forEach(field => {
      if (config[field] !== undefined) {
        updateData[field] = config[field]
        delete configData[field]
      }
    })
    
    onSave({ ...updateData, config: configData })
    setHasChanges(false)
  }

  return (
    <div className="p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeInfo.color + '20' }}>
            {React.cloneElement(typeInfo.icon, { style: { color: typeInfo.color } })}
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{typeInfo.label} Configuration</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{typeInfo.description}</p>
          </div>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Save Changes
          </button>
        )}
      </div>

      <div className="space-y-1">
        {typeInfo.settings.map(field => (
          <SettingRow
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(val) => handleChange(field.key, val)}
          />
        ))}
      </div>

      {/* Type-specific actions */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          {kb.kb_type === 'web' && (
            <button
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Test Search
            </button>
          )}
          {kb.kb_type === 'api' && (
            <button
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Test API
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Premium Knowledge Base Item with glassmorphism
const KnowledgeBaseItem = ({ kb, active, onClick, onDelete }) => {
  const typeInfo = getKBTypeInfo(kb.kb_type)
  const itemCount = kb.file_count || 0
  
  return (
    <div
      onClick={onClick}
      className={`
        group flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm transition-all duration-300 text-left cursor-pointer
        ${active 
          ? 'glass-card-strong border-[var(--accent-primary)]/30 glow-accent-sm' 
          : 'hover:bg-[var(--surface)]/40 border border-transparent hover:border-[var(--glass-border)]'
        }
      `}
    >
      {/* Icon Container with Gradient Background */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
        style={{
          background: active 
            ? `linear-gradient(135deg, ${typeInfo.color}30, ${typeInfo.color}10)` 
            : 'var(--surface)',
          border: `1px solid ${active ? typeInfo.color + '40' : 'var(--glass-border)'}`,
          color: active ? typeInfo.color : 'var(--text-tertiary)'
        }}
      >
        <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
          {typeInfo.icon}
        </span>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold truncate ${active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
          {kb.name}
        </div>
        <div className="flex items-center gap-2 text-xs mt-0.5">
          <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">{itemCount} items</span>
        </div>
      </div>
      
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (onDelete) onDelete(kb.id)
        }}
        className="
          opacity-0 group-hover:opacity-100 
          p-2 rounded-lg glass-button 
          text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10
          transition-all duration-200 hover:scale-110
        "
        title="Delete Knowledge Base"
      >
        <TrashIcon size={16} />
      </button>
    </div>
  )
}

const FileItem = ({ file, onDelete, onView }) => {
  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg transition-all"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--accent-subtle)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</div>
        <div className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          <span>{file.file_type}</span>
          <span>·</span>
          <span>{formatSize(file.size_bytes)}</span>
          <span>·</span>
          <span>{file.token_count || 0} tokens</span>
          {file.is_embedded && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-blue-500 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                {file.chunks_count || 0} chunks
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onView(file)}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--text-tertiary)' }}
          title="View content"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(file.id)}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--danger-subtle)] hover:text-[var(--danger-icon)]"
          style={{ color: 'var(--text-tertiary)' }}
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.194-.855-2.166-2.083-2.166H8.25c-1.228 0-2.083.972-2.083 2.166v.916" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const FilePreviewModal = ({ file, content, onClose }) => {
  if (!file) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] animate-backdrop"
      style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col animate-modal overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: 'var(--modal-shadow)' }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" style={{ color: 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{file.name}</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{file.file_type} · {content?.length || 0} characters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all duration-200"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-grid">
          {content === null ? (
            <div className="flex flex-col items-center justify-center h-64 animate-pulse">
              <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading content...</p>
            </div>
          ) : (
            <pre className="text-sm font-mono whitespace-pre-wrap rounded-xl p-4"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              {content || 'No content available'}
            </pre>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: 'var(--user-bubble-bg)', color: '#ffffff', boxShadow: 'var(--user-bubble-shadow)' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}

const KnowledgeBase = ({ onRefresh }) => {
  const [kbs, setKbs] = useState([])
  const [selectedKB, setSelectedKB] = useState(null)
  const [selectedKBFiles, setSelectedKBFiles] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewingFile, setViewingFile] = useState(null)
  const [viewingFileContent, setViewingFileContent] = useState(null)
  const [newKBDir, setNewKBDir] = useState({ name: '', description: '', kb_type: 'notes' })
  const [newItem, setNewItem] = useState({ name: '', content: '', url: '' })
  const [isEmbedding, setIsEmbedding] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showEmbeddings, setShowEmbeddings] = useState(false)
  const [embeddingsData, setEmbeddingsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [embedProgress, setEmbedProgress] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchKBs()
  }, [])

  useEffect(() => {
    if (selectedKB) {
      fetchKBDetails(selectedKB.id)
      setShowSettings(false)
    }
  }, [selectedKB])

  const fetchKBs = async () => {
    try {
      const res = await fetch('/api/knowledge')
      const data = await res.json()
      setKbs(data.knowledge_bases || [])
      setLoading(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to fetch KBs:', err)
      setLoading(false)
    }
  }

  const fetchKBDetails = async (kbId) => {
    try {
      const res = await fetch(`/api/knowledge/${kbId}`)
      const data = await res.json()
      setSelectedKBFiles(data.files || [])
    } catch (err) {
      console.error('Failed to fetch KB details:', err)
    }
  }

  const handleCreateKB = async () => {
    if (!newKBDir.name.trim()) return
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKBDir),
      })
      setNewKBDir({ name: '', description: '', kb_type: 'notes' })
      setShowCreateModal(false)
      fetchKBs()
    } catch (err) {
      console.error('Failed to create KB:', err)
    }
  }

  const handleDeleteKB = async (kbId) => {
    if (!window.confirm('Delete this knowledge base?')) return
    try {
      await fetch(`/api/knowledge/${kbId}`, { method: 'DELETE' })
      if (selectedKB?.id === kbId) {
        setSelectedKB(null)
        setSelectedKBFiles([])
      }
      fetchKBs()
    } catch (err) {
      console.error('Failed to delete KB:', err)
    }
  }

  const handleSaveSettings = async (updates) => {
    if (!selectedKB) return
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await resp.json()
      // Refresh list to show updated metadata in sidebar
      fetchKBs()
      // Refresh current KB view
      setSelectedKB({ ...selectedKB, ...data })
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !selectedKB) return
    try {
      const payload = {
        name: newItem.name,
        content: newItem.content,
        file_type: selectedKB.kb_type,
        content_url: newItem.url || '',
      }
      await fetch(`/api/knowledge/${selectedKB.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setNewItem({ name: '', content: '', url: '' })
      setShowAddModal(false)
      fetchKBDetails(selectedKB.id)
      fetchKBs()
    } catch (err) {
      console.error('Failed to add item:', err)
    }
  }

  const handleFileChange = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedKB) return
    setIsUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        
        await fetch(`/api/knowledge/${selectedKB.id}/upload`, {
          method: 'POST',
          body: formData,
        })
      }
      fetchKBDetails(selectedKB.id)
      fetchKBs()
      setShowAddModal(false)
    } catch (err) {
      console.error('Failed to upload files:', err)
      alert('Failed to upload files')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this item?')) return
    try {
      await fetch(`/api/knowledge/${selectedKB.id}/files/${fileId}`, { method: 'DELETE' })
      fetchKBDetails(selectedKB.id)
      fetchKBs()
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  const handleViewFile = async (file) => {
    setViewingFile(file)
    setViewingFileContent(null)
    setShowViewModal(true)
    try {
      const res = await fetch(`/api/knowledge/${selectedKB.id}/files/${file.id}`)
      const data = await res.json()
      setViewingFileContent(data.content || '')
    } catch (err) {
      console.error('Failed to fetch file content:', err)
      setViewingFileContent('Error loading content')
    }
  }

  const handleEmbed = async () => {
    if (!selectedKB) return
    setIsEmbedding(true)
    setEmbedProgress({ status: 'starting', currentFile: null, filesDone: 0, totalFiles: selectedKBFiles.length, chunksCreated: 0 })
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}/embed`, { method: 'POST' })
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim()
            continue
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.file_index !== undefined) {
                setEmbedProgress(prev => ({
                  ...prev,
                  status: 'processing',
                  currentFile: data.file_name,
                  filesDone: data.file_index,
                  totalFiles: data.file_count
                }))
              } else if (data.chunks_created !== undefined) {
                setEmbedProgress(prev => ({
                  ...prev,
                  chunksCreated: (prev.chunksCreated || 0) + data.chunks_created
                }))
              } else if (data.status === 'ok') {
                setEmbedProgress({
                  status: 'complete',
                  chunks: data.chunks,
                  tokens: data.tokens,
                  embedding_model: data.embedding_model,
                  embedding_dimensions: data.embedding_dimensions
                })
                fetchKBDetails(selectedKB.id)
                fetchKBs()
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to embed:', err)
      setEmbedProgress({ status: 'error', error: err.message })
    } finally {
      setTimeout(() => {
        setIsEmbedding(false)
        setTimeout(() => setEmbedProgress(null), 2000)
      }, 1000)
    }
  }

  const fetchEmbeddings = async () => {
    if (!selectedKB) return
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}/embeddings`)
      const data = await resp.json()
      setEmbeddingsData(data.embeddings || [])
      setShowEmbeddings(true)
    } catch (err) {
      console.error('Failed to fetch embeddings:', err)
    }
  }

  const selectedType = selectedKB ? getKBTypeInfo(selectedKB.kb_type) : null

  return (
    <div className="flex h-full bg-[var(--bg)]">
      {/* Left sidebar - Premium glass design */}
      <div className="w-80 border-r border-[var(--glass-border)] flex flex-col glass-card-strong">
        {/* Header */}
        <div className="p-5 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/10 
                            flex items-center justify-center text-[var(--accent-primary)]">
                <BrainIcon size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">Knowledge</h2>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">RAG Context Sources</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-lg glass-button text-[var(--accent-primary)] hover:scale-105 
                        transition-all duration-200 glow-accent-sm"
              title="Create new knowledge base"
            >
              <PlusIcon size={18} />
            </button>
          </div>
        </div>

        {/* Knowledge Base List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size={24} className="text-[var(--accent-primary)]" />
            </div>
          ) : kbs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center 
                              bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/5
                              border border-[var(--glass-border)]">
                <SparklesIcon size={28} className="text-[var(--accent-primary)] opacity-60" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">No knowledge bases</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Create your first knowledge source</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold
                          bg-[var(--gradient-primary)] text-white hover:scale-105 
                          transition-all duration-200 glow-accent-sm"
              >
                Create Knowledge Base
              </button>
            </div>
          ) : (
            kbs.map((kb) => (
              <KnowledgeBaseItem
                key={kb.id}
                kb={kb}
                active={selectedKB?.id === kb.id}
                onClick={() => setSelectedKB(kb)}
                onDelete={handleDeleteKB}
              />
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full">
        {selectedKB ? (
          <>
            <div className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: selectedType.color + '20' }}>
                  {React.cloneElement(selectedType.icon, { style: { color: selectedType.color } })}
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{selectedKB.name}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {selectedType.description} · {selectedKB.description && `${selectedKB.description} · `}{selectedKBFiles.length} items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: showSettings ? 'var(--accent-subtle)' : 'var(--surface)',
                    color: showSettings ? 'var(--accent)' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: showSettings ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  Settings
                </button>
                <button
                  onClick={handleEmbed}
                  disabled={isEmbedding || selectedKBFiles.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: isEmbedding ? 'var(--accent-subtle)' : 'var(--surface)',
                    color: isEmbedding ? 'var(--accent)' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: isEmbedding ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {isEmbedding ? 'Embedding...' : 'Embed'}
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Add
                </button>
              </div>
            </div>

            {embedProgress && (
              <div className="mx-4 mt-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                {embedProgress.status === 'starting' && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Starting embedding process...</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Initializing</div>
                    </div>
                  </div>
                )}
                {embedProgress.status === 'processing' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                        Processing: {embedProgress.currentFile || '...'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {embedProgress.filesDone} / {embedProgress.totalFiles} files
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.round((embedProgress.filesDone / embedProgress.totalFiles) * 100)}%`,
                          backgroundColor: 'var(--accent)'
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {embedProgress.chunksCreated || 0} chunks created
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--accent)' }}>
                        Embedding in progress...
                      </span>
                    </div>
                  </div>
                )}
                {embedProgress.status === 'complete' && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--success-bg, #10b981)20' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" style={{ color: 'var(--success, #10b981)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Embedding complete</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {embedProgress.chunks} chunks · {embedProgress.tokens} tokens · {embedProgress.embedding_dimensions}d embedding
                      </div>
                    </div>
                  </div>
                )}
                {embedProgress.status === 'error' && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--danger-subtle, #ef444420)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" style={{ color: 'var(--danger, #ef4444)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Embedding failed</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{embedProgress.error}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showSettings && (
              <div className="border-b" style={{ borderColor: 'var(--border)' }}>
                {/* Information Info Grid */}
                <div className="p-4 bg-[var(--bg-secondary)] border-b grid grid-cols-1 md:grid-cols-3 gap-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="p-3 rounded-lg border bg-[var(--surface)] transition-all hover:shadow-sm" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Storage
                    </div>
                    <div className="text-xs font-bold text-[var(--text)] truncate">{selectedKB.storage_path ? selectedKB.storage_path.split('/').pop() : 'Default'}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">{selectedKB.storage_path || 'Standard location'}</div>
                  </div>

                  <div className="p-3 rounded-lg border bg-[var(--surface)] transition-all hover:shadow-sm" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Embedding Model
                    </div>
                    <div className="text-xs font-bold text-[var(--text)] truncate">{selectedKB.embedding_model || 'Not indexed'}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">{selectedKB.embedding_dimensions ? `${selectedKB.embedding_dimensions} dimensions` : 'Dimensions unknown'}</div>
                  </div>

                  <div className="p-3 rounded-lg border bg-[var(--surface)] transition-all hover:shadow-sm" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Added
                    </div>
                    <div className="text-xs font-bold text-[var(--text)] truncate">{new Date(selectedKB.created_at * 1000).toLocaleString()}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">ID: {selectedKB.id.substring(0, 8)}...</div>
                  </div>
                </div>
                
                <SettingsPanel 
                  kb={selectedKB} 
                  onSave={handleSaveSettings} 
                  onRefresh={() => fetchKBDetails(selectedKB.id)}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {selectedKBFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No items yet</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    Add {selectedType.label.toLowerCase()} to use as context in chats
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-xs px-4 py-2 rounded-lg font-medium"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Add Your First Item
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      {selectedKBFiles.length} item{selectedKBFiles.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {selectedKBFiles.map((file) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      onDelete={handleDeleteFile}
                      onView={handleViewFile}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Select a knowledge base</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Choose one from the sidebar or create a new one</p>
          </div>
        )}
      </div>

      {/* Create KB Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 animate-backdrop"
          style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateModal(false); setNewKBDir({ name: '', description: '', kb_type: 'notes' }) } }}>
          <div className="w-[480px] rounded-xl p-5 animate-modal"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--modal-shadow)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>Create Knowledge Base</h3>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <div className="grid grid-cols-5 gap-2">
                {KB_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewKBDir({ ...newKBDir, kb_type: type.id })}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg text-center transition-all"
                    style={{
                      backgroundColor: newKBDir.kb_type === type.id ? type.color + '15' : 'var(--bg-secondary)',
                      border: '1px solid',
                      borderColor: newKBDir.kb_type === type.id ? type.color : 'var(--border)',
                      color: newKBDir.kb_type === type.id ? type.color : 'var(--text-secondary)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: newKBDir.kb_type === type.id ? type.color : 'var(--surface)', color: newKBDir.kb_type === type.id ? '#fff' : 'var(--text-tertiary)' }}>
                      {type.icon}
                    </div>
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input
                  type="text"
                  value={newKBDir.name}
                  onChange={e => setNewKBDir({ ...newKBDir, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  placeholder="e.g., Product Documentation"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description (optional)</label>
                <input
                  type="text"
                  value={newKBDir.description}
                  onChange={e => setNewKBDir({ ...newKBDir, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  placeholder="Brief description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setShowCreateModal(false); setNewKBDir({ name: '', description: '', kb_type: 'notes' }) }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKB}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 animate-backdrop"
          style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setNewItem({ name: '', content: '', url: '' }) } }}>
          <div className="w-[500px] rounded-xl p-5 animate-modal"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--modal-shadow)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Add to {selectedKB?.name}</h3>
            </div>

            <div className="space-y-4">
              {selectedKB?.kb_type === 'files' && (
                <div 
                  className="relative group border-2 border-dashed rounded-xl p-8 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                  style={{ borderColor: 'var(--border)', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--accent-subtle)' }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'transparent'; handleFileChange({ target: { files: e.dataTransfer.files } }) }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.txt,.md,.doc,.docx,.csv" 
                    multiple 
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${isUploading ? 'animate-spin' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        {isUploading ? 'Uploading...' : 'Click or Drag Files'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        PDF, TXT, MD, DOCX, CSV
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedKB?.kb_type === 'files' && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>or manual entry</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    placeholder="Item name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Content</label>
                  <textarea
                    value={newItem.content}
                    onChange={e => setNewItem({ ...newItem, content: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', minHeight: '150px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                    placeholder="Content to add..."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setShowAddModal(false); setNewItem({ name: '', content: '', url: '' }) }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && (
        <FilePreviewModal
          file={viewingFile}
          content={viewingFileContent}
          onClose={() => { setShowViewModal(false); setViewingFile(null); setViewingFileContent(null) }}
        />
      )}

      {/* Embeddings View Modal */}
      {showEmbeddings && (
        <div className="fixed inset-0 flex items-center justify-center z-50 animate-backdrop"
          style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowEmbeddings(false); setEmbeddingsData([]) } }}>
          <div className="w-[800px] max-h-[85vh] rounded-xl p-5 flex flex-col animate-modal"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--modal-shadow)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Saved Embeddings: {selectedKB?.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Total chunks: {embeddingsData.length}
                </p>
              </div>
              <button
                onClick={() => { setShowEmbeddings(false); setEmbeddingsData([]) }}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto space-y-3 pr-2">
              {embeddingsData.length === 0 ? (
                <div className="text-center py-10 text-xs" style={{ color: 'var(--text-tertiary)' }}>No embeddings found.</div>
              ) : (
                embeddingsData.map((emb, idx) => (
                  <div key={emb.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--accent)' }}>Chunk #{idx + 1}</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{emb.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeBase