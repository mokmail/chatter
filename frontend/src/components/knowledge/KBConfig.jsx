import React from 'react'

export const KB_TYPES = [
  {
    id: 'notes',
    label: 'Notes',
    description: 'Personal notes and text snippets',
    color: '#8b5cf6',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject Entire Document' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Max characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 100, help: 'Characters overlapping between chunks' },
    ],
  },
  {
    id: 'api',
    label: 'API Data',
    description: 'External API data source',
    color: '#f59e0b',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject Entire Document' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Max characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 100, help: 'Characters overlapping between chunks' },
    ],
  },
]

export const getKBTypeInfo = (kbTypeId) => KB_TYPES.find(t => t.id === kbTypeId) || KB_TYPES[0]

export const SettingRow = ({ field, value, onChange }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{field.label}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{field.help}</div>
      </div>
      <div className="ml-4">
        {field.type === 'select' && (
          <select
            value={value || field.default}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
        {field.type === 'toggle' && (
          <button
            onClick={() => onChange(field.key, !value)}
            className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-accent' : 'bg-surface-hover'}`}
            style={{ background: value ? 'var(--accent)' : 'var(--surface-hover)' }}
          >
            <div className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all ${value ? 'left-5.5 bg-white' : 'left-0.5 bg-text-tertiary'}`}
              style={{ background: value ? '#fff' : 'var(--text-tertiary)', left: value ? '22px' : '2px' }} />
          </button>
        )}
        {field.type === 'number' && (
          <input
            type="number"
            value={value || field.default}
            onChange={(e) => onChange(field.key, parseInt(e.target.value))}
            className="text-sm rounded-lg px-3 py-1.5 w-24"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
        )}
        {field.type === 'text' && (
          <input
            type="text"
            value={value || field.default}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 w-48"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
        )}
      </div>
    </div>
  )
}

export const SettingsPanel = ({ kb, onSave }) => {
  const typeInfo = getKBTypeInfo(kb.kb_type)
  const [settings, setSettings] = React.useState(kb.settings || {})

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(kb.id, settings)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeInfo.color + '20' }}>
          {React.cloneElement(typeInfo.icon, { style: { color: typeInfo.color } })}
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{typeInfo.label} Configuration</h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{typeInfo.description}</p>
        </div>
      </div>
      <div className="space-y-1">
        {typeInfo.settings.map(field => (
          <SettingRow
            key={field.key}
            field={field}
            value={settings[field.key]}
            onChange={handleChange}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
