import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
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
  GlobeIcon,
  GithubIcon,
  ServerIcon,
  CloudIcon,
  FolderOpenIcon,
  WorkflowIcon,
  LinkIcon,
  RefreshIcon,
} from './common/Icons'

import GraphViewer from './GraphViewer'

// Source Types for Knowledge Base
const SOURCE_TYPES = {
  notes: { 
    id: 'notes', 
    label: 'Notes', 
    description: 'Personal notes and text content', 
    color: '#8b5cf6', 
    icon: <NotesIcon size={18} />,
    fields: [
      { key: 'content', label: 'Content', type: 'textarea', default: '', help: 'Paste or type your notes content' },
    ]
  },
  files: { 
    id: 'files', 
    label: 'Files', 
    description: 'Upload PDF, DOC, TXT files', 
    color: '#6366f1', 
    icon: <FileIcon size={18} />,
    fields: [
      { key: 'files', label: 'Upload Files', type: 'file', accept: '.pdf,.txt,.md,.doc,.docx,.csv,.json', help: 'Select files to upload and add to knowledge base', required: true },
      { key: 'allowedTypes', label: 'Allowed File Types', type: 'text', default: '.pdf,.txt,.md,.doc,.docx,.csv,.json', help: 'Comma-separated file extensions' },
      { key: 'maxFileSize', label: 'Max File Size (MB)', type: 'number', default: 50, help: 'Maximum file size for uploads' },
    ]
  },
  url: { 
    id: 'url', 
    label: 'URL', 
    description: 'Crawl web pages and articles', 
    color: '#10b981', 
    icon: <GlobeIcon size={18} />,
    fields: [
      { key: 'url', label: 'URL', type: 'text', default: '', help: 'Starting URL to crawl', required: true },
      { key: 'crawlDepth', label: 'Crawl Depth', type: 'select', options: ['1', '2', '3', '5', '10'], default: '1', help: 'How many levels deep to crawl' },
      { key: 'maxPages', label: 'Max Pages', type: 'number', default: 100, help: 'Maximum pages to index' },
      { key: 'respectRobots', label: 'Respect Robots.txt', type: 'toggle', default: true, help: 'Follow robots.txt rules' },
      { key: 'followLinks', label: 'Follow Links', type: 'toggle', default: true, help: 'Crawl linked pages' },
      { key: 'excludePatterns', label: 'Exclude Patterns', type: 'text', default: '/api/,/login,/admin', help: 'URL patterns to skip' },
    ]
  },
  repository: { 
    id: 'repository', 
    label: 'Repository', 
    description: 'Clone and index Git repos', 
    color: '#f59e0b', 
    icon: <GithubIcon size={18} />,
    fields: [
      { key: 'repoUrl', label: 'Repository URL', type: 'text', default: '', help: 'Git repository URL (HTTPS or SSH)', required: true },
      { key: 'branch', label: 'Branch', type: 'text', default: 'main', help: 'Branch to clone' },
      { key: 'depth', label: 'Clone Depth', type: 'select', options: ['1', '10', 'full'], default: '1', help: 'Git history depth' },
      { key: 'filePatterns', label: 'File Patterns', type: 'text', default: '*.py,*.js,*.ts,*.md,*.txt', help: 'Glob patterns to include' },
      { key: 'excludePatterns', label: 'Exclude Patterns', type: 'text', default: 'node_modules/,__pycache__,.git/,dist/,build/', help: 'Paths to exclude' },
      { key: 'parseCode', label: 'Parse Code Structure', type: 'toggle', default: true, help: 'Extract functions and classes' },
      { key: 'accessToken', label: 'Access Token', type: 'password', default: '', help: 'For private repositories' },
    ]
  },
  api: { 
    id: 'api', 
    label: 'API', 
    description: 'Fetch data from APIs', 
    color: '#f97316', 
    icon: <ServerIcon size={18} />,
    fields: [
      { key: 'name', label: 'Source Name', type: 'text', default: '', help: 'Friendly name for this API source', required: true },
      { key: 'apiEndpoint', label: 'API Endpoint', type: 'text', default: '', help: 'API URL endpoint', required: true },
      { key: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT'], default: 'GET', help: 'Request method' },
      { key: 'authType', label: 'Auth Type', type: 'select', options: ['none', 'bearer', 'api_key', 'basic', 'oauth2'], default: 'bearer', help: 'Authentication method' },
      { key: 'apiKey', label: 'API Key', type: 'password', default: '', help: 'Authentication key' },
      { key: 'headers', label: 'Custom Headers', type: 'textarea', default: '', help: 'JSON: {"Authorization": "Bearer ..."}' },
      { key: 'queryParams', label: 'Query Params', type: 'text', default: '', help: 'URL query parameters' },
      { key: 'refreshInterval', label: 'Refresh Interval (min)', type: 'number', default: 60, help: 'Auto-refresh data interval' },
      { key: 'transformScript', label: 'Transform Script', type: 'textarea', default: '', help: 'JavaScript to transform API response' },
    ]
  },
  directory: { 
    id: 'directory', 
    label: 'Directory', 
    description: 'Sync local directory files', 
    color: '#06b6d4', 
    icon: <FolderOpenIcon size={18} />,
    fields: [
      { key: 'name', label: 'Source Name', type: 'text', default: '', help: 'Friendly name for this directory', required: true },
      { key: 'directoryPath', label: 'Directory Path', type: 'text', default: '', help: 'Local directory path to sync', required: true },
      { key: 'watchChanges', label: 'Watch for Changes', type: 'toggle', default: true, help: 'Auto-reindex when files change' },
      { key: 'filePatterns', label: 'File Patterns', type: 'text', default: '*.md,*.txt,*.pdf,*.docx', help: 'Glob patterns to include' },
      { key: 'excludePatterns', label: 'Exclude Patterns', type: 'text', default: '.git/,node_modules/,__pycache__/', help: 'Paths to exclude' },
      { key: 'recursive', label: 'Recursive', type: 'toggle', default: true, help: 'Include subdirectories' },
    ]
  },
  service: { 
    id: 'service', 
    label: 'Service', 
    description: 'Connect external services', 
    color: '#8b5cf6', 
    icon: <CloudIcon size={18} />,
    fields: [
      { key: 'name', label: 'Source Name', type: 'text', default: '', help: 'Friendly name', required: true },
      { key: 'serviceType', label: 'Service Type', type: 'select', options: ['notion', 'confluence', 'jira', 'slack', 'discord', 'github', 'gitlab', 'linear', 'trello'], default: 'notion', help: 'Service provider' },
      { key: 'accessToken', label: 'Access Token', type: 'password', default: '', help: 'OAuth or API access token', required: true },
      { key: 'workspace', label: 'Workspace', type: 'text', default: '', help: 'Workspace or organization ID' },
      { key: 'syncFrequency', label: 'Sync Frequency', type: 'select', options: ['realtime', 'hourly', 'daily', 'weekly'], default: 'hourly', help: 'How often to sync' },
      { key: 'includeArchived', label: 'Include Archived', type: 'toggle', default: false, help: 'Include archived content' },
    ]
  },
  workflow: { 
    id: 'workflow', 
    label: 'Workflow', 
    description: 'Automated data pipelines', 
    color: '#ec4899', 
    icon: <WorkflowIcon size={18} />,
    fields: [
      { key: 'name', label: 'Workflow Name', type: 'text', default: '', help: 'Name for this workflow', required: true },
      { key: 'workflowType', label: 'Workflow Type', type: 'select', options: ['etl', 'scraping', 'aggregation', 'custom'], default: 'etl', help: 'Type of data pipeline' },
      { key: 'schedule', label: 'Schedule (Cron)', type: 'text', default: '0 0 * * *', help: 'Cron schedule (default: daily midnight)' },
      { key: 'inputSources', label: 'Input Sources', type: 'text', default: '', help: 'Comma-separated source IDs' },
      { key: 'transformPipeline', label: 'Transform Pipeline', type: 'textarea', default: '', help: 'JSON array of transformation steps' },
      { key: 'outputDestination', label: 'Output Destination', type: 'select', options: ['vectorstore', 'file', 'api'], default: 'vectorstore', help: 'Where to store processed data' },
      { key: 'notifyOnComplete', label: 'Notify on Complete', type: 'toggle', default: false, help: 'Send notification when done' },
    ]
  },
}

// Knowledge Base Type - unified, all KBs are the same type
const KB_TYPES = [
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    description: 'Container for multiple data sources',
    color: '#6366f1',
    icon: <DatabaseIcon size={20} />,
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject All Content' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200, help: 'Character overlap between chunks' },
      { key: 'kb_chat_enabled', label: 'Enable KB Chat', type: 'toggle', default: true, help: 'Allow chatting with this KB' },
      { key: 'chat_model', label: 'Chat Model', type: 'select', options: ['default', 'loading...'], default: 'default', help: 'AI model for KB chat' },
      { key: 'temperature', label: 'Temperature', type: 'select', options: ['0.0', '0.1', '0.3', '0.5', '0.7', '1.0'], default: '0.7', help: 'Creativity vs precision (0=strict, 1=creative)' },
      { key: 'max_context_chunks', label: 'Max Context Chunks', type: 'number', default: 10, help: 'Chunks to include in context' },
    ],
  },
  {
    id: 'vectorstore',
    label: 'Vector Store',
    description: 'Classic vectorstore RAG with embeddings',
    color: '#10b981',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C3.75 16.153 7.444 18 12 18s8.25-1.847 8.25-4.125v-3.75m0 0l-3.75-3.75m3.75 3.75l3.75-3.75m-16.5 3.75l3.75-3.75m-3.75 3.75l-3.75-3.75" /></svg>,
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Vector Search, Full=Inject All Content' },
      { key: 'hybrid_search', label: 'Hybrid Search', type: 'toggle', default: true, help: 'Combine Vector + Keyword (BM25) search' },
      { key: 'reranking', label: 'Reranking', type: 'toggle', default: true, help: 'Use Cross-Encoder to rerank results' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Characters per chunk' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200, help: 'Character overlap between chunks' },
      { key: 'embeddingModel', label: 'Embedding Model', type: 'text', default: '', help: 'Model for embeddings (empty = default)' },
      { key: 'embeddingProvider', label: 'Embedding Provider', type: 'text', default: '', help: 'Provider ID for embeddings (empty = default)' },
      { key: 'topK', label: 'Top K', type: 'number', default: 10, help: 'Number of chunks to retrieve' },
      { key: 'kb_chat_enabled', label: 'Enable KB Chat', type: 'toggle', default: true, help: 'Allow chatting with this KB' },
      { key: 'chat_model', label: 'Chat Model', type: 'select', options: ['default', 'loading...'], default: 'default', help: 'AI model for KB chat' },
      { key: 'temperature', label: 'Temperature', type: 'select', options: ['0.0', '0.1', '0.3', '0.5', '0.7', '1.0'], default: '0.7', help: 'Creativity vs precision (0=strict, 1=creative)' },
      { key: 'max_context_chunks', label: 'Max Context Chunks', type: 'number', default: 10, help: 'Chunks to include in context' },
    ],
  },
  {
    id: 'graphrag',
    label: 'GraphRAG',
    description: 'Graph-based retrieval with entity/relationship extraction',
    color: '#f97316',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>,
    settings: [
      { key: 'retrieval_mode', label: 'Retrieval Mode', type: 'select', options: ['focused', 'full'], default: 'focused', help: 'Focused=Graph Search, Full=Inject All Content' },
      { key: 'graph_mode', label: 'Graph Search Mode', type: 'select', options: ['local', 'global', 'hybrid', 'path', 'neighborhood'], default: 'local', help: 'Local=BFS entity traversal, Global=community summary ranking, Hybrid=vector+graph, Path=shortest path, Neighborhood=direct neighbors' },
      { key: 'max_depth', label: 'Max BFS Depth', type: 'number', default: 2, help: 'How many hops to traverse in local/hybrid search (1-5)' },
      { key: 'top_k', label: 'Top K', type: 'number', default: 5, help: 'Number of communities/entities to include' },
      { key: 'extraction_model', label: 'Extraction Model', type: 'text', default: '', help: 'Model for entity extraction (empty = default)' },
      { key: 'graph_schema', label: 'Graph Schema (JSON)', type: 'textarea', default: '', help: 'Optional: {\"entity_types\":[\"PERSON\",\"ORG\",...],\"relation_types\":[\"WORKS_FOR\",\"LOCATED_IN\",...]}' },
      { key: 'chunk_size', label: 'Chunk Size', type: 'number', default: 1000, help: 'Characters per chunk for extraction' },
      { key: 'chunk_overlap', label: 'Chunk Overlap', type: 'number', default: 200, help: 'Character overlap between chunks' },
      { key: 'kb_chat_enabled', label: 'Enable KB Chat', type: 'toggle', default: true, help: 'Allow chatting with this KB' },
      { key: 'chat_model', label: 'Chat Model', type: 'select', options: ['default', 'loading...'], default: 'default', help: 'AI model for KB chat' },
      { key: 'temperature', label: 'Temperature', type: 'select', options: ['0.0', '0.1', '0.3', '0.5', '0.7', '1.0'], default: '0.7', help: 'Creativity vs precision (0=strict, 1=creative)' },
    ],
  },
]

// Default source config for each type
const DEFAULT_SOURCE_CONFIG = {
  notes: { content: '' },
  files: { files: [], allowedTypes: '.pdf,.txt,.md,.doc,.docx,.csv,.json', maxFileSize: 50 },
  url: { url: '', crawlDepth: '1', maxPages: 100, respectRobots: true, followLinks: true, excludePatterns: '/api/,/login,/admin' },
  repository: { repoUrl: '', branch: 'main', depth: '1', filePatterns: '*.py,*.js,*.ts,*.md,*.txt', excludePatterns: 'node_modules/,__pycache__,.git/,dist/,build/', parseCode: true, accessToken: '' },
  api: { name: '', apiEndpoint: '', method: 'GET', authType: 'bearer', apiKey: '', headers: '', queryParams: '', refreshInterval: 60, transformScript: '' },
  directory: { name: '', directoryPath: '', watchChanges: true, filePatterns: '*.md,*.txt,*.pdf,*.docx', excludePatterns: '.git/,node_modules/,__pycache__/', recursive: true },
  service: { name: '', serviceType: 'notion', accessToken: '', workspace: '', syncFrequency: 'hourly', includeArchived: false },
  workflow: { name: '', workflowType: 'etl', schedule: '0 0 * * *', inputSources: '', transformPipeline: '', outputDestination: 'vectorstore', notifyOnComplete: false },
}

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
      case 'file':
        return (
          <div className="w-full">
            <input
              type="file"
              multiple
              accept={field.accept || "*"}
              onChange={(e) => onChange(Array.from(e.target.files))}
              className="w-full px-3 py-1.5 rounded-lg text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)]"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            {value && value.length > 0 && (
              <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {value.length} file{value.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
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

const FileInputField = ({ value, onChange, accept = '*' }) => {
  const fileInputRef = useRef(null)
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={e => {
          onChange(Array.from(e.target.files))
        }}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors w-full"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)', border: '1px dashed var(--border)' }}
      >
        <UploadIcon size={12} />
        {value && value.length > 0 ? `${value.length} file${value.length !== 1 ? 's' : ''} selected` : 'Choose files...'}
      </button>
      {value && value.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {value.map((f, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <FileIcon size={9} />
              <span className="truncate">{f.name}</span>
              <span>({(f.size / 1024).toFixed(1)} KB)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SourceFieldInput = ({ field, value, onChange }) => {
  const inputValue = value ?? field.default ?? ''
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={inputValue}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={inputValue}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-20 px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
      )
    case 'select':
      return (
        <select
          value={inputValue}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    case 'toggle':
      return (
        <button
          onClick={() => onChange(!inputValue)}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          style={{ backgroundColor: inputValue ? 'var(--accent)' : 'var(--border)' }}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${inputValue ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      )
    case 'textarea':
      return (
        <textarea
          value={inputValue}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1 rounded text-xs resize-none"
          rows={2}
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
      )
    case 'password':
      return (
        <input
          type="password"
          value={inputValue}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
      )
    case 'file':
      return (
        <FileInputField value={inputValue} onChange={onChange} accept={field.accept} />
      )
    default:
      return null
  }
}

const SourceTypePicker = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.values(SOURCE_TYPES).map(type => (
        <button
          key={type.id}
          onClick={() => onSelect(type.id)}
          className="flex items-center gap-2 p-2 rounded-lg border transition-colors hover:border-opacity-100"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', borderWidth: '1px' }}
        >
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: type.color + '20', color: type.color }}>
            {type.icon}
          </div>
          <div className="text-left">
            <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{type.label}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{type.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

const SourceConfigForm = ({ sourceType, draft, onDraftChange, onCancel, onAdd, isAdding }) => {
  const sourceInfo = SOURCE_TYPES[sourceType]
  if (!sourceInfo) return null

  const requiredFields = sourceInfo.fields.filter(f => f.required)
  const filesField = sourceInfo.fields.find(f => f.type === 'file')
  const hasFiles = filesField && draft[filesField.key] && draft[filesField.key].length > 0
  const missingRequired = requiredFields.some(f => !draft[f.key]?.toString().trim())
  const canAdd = sourceType === 'files' ? hasFiles && !missingRequired && !isAdding : !missingRequired && !isAdding

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: sourceInfo.color + '20', color: sourceInfo.color }}>
            {sourceInfo.icon}
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{sourceInfo.label}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sourceInfo.description}</div>
          </div>
        </div>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--bg-secondary)]" style={{ color: 'var(--text-tertiary)' }}>
          <XIcon size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {sourceInfo.fields.map(field => (
          <div key={field.key} className={field.type === 'file' ? 'space-y-1' : 'flex items-center gap-2'}>
            {field.type === 'file' ? (
              <>
                <div>
                  <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{field.label}</div>
                  {field.help && <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{field.help}</div>}
                </div>
                <SourceFieldInput
                  field={field}
                  value={draft[field.key]}
                  onChange={val => onDraftChange({ ...draft, [field.key]: val })}
                />
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{field.label}</div>
                  {field.help && <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{field.help}</div>}
                </div>
                <div className="w-48">
                  <SourceFieldInput
                    field={field}
                    value={draft[field.key]}
                    onChange={val => onDraftChange({ ...draft, [field.key]: val })}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          Cancel
        </button>
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: canAdd ? 'var(--accent)' : 'var(--bg-secondary)', color: canAdd ? '#fff' : 'var(--text-tertiary)' }}
        >
          {isAdding ? <LoadingSpinner size={12} /> : null}
          {isAdding ? 'Uploading...' : 'Add Source'}
        </button>
      </div>
    </div>
  )
}

const EditableName = ({ value, onRename, className = '', title }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    setDraft(value || '')
  }, [value])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onRename(draft)
            setEditing(false)
          }
          if (e.key === 'Escape') {
            setDraft(value || '')
            setEditing(false)
          }
        }}
        onBlur={() => {
          if (draft.trim() && draft !== value) onRename(draft)
          setEditing(false)
        }}
        className={`truncate bg-[var(--bg-secondary)] text-xs font-semibold rounded px-1 py-0.5 outline-none ring-1 ring-[var(--accent)] ${className}`}
        style={{ color: 'var(--text)', minWidth: '80px', maxWidth: '200px' }}
      />
    )
  }

  return (
    <span
      className={`truncate cursor-text group/editable ${className}`}
      title={title || 'Double-click to rename'}
      onDoubleClick={() => setEditing(true)}
    >
      {value}
    </span>
  )
}

const ViewToggle = ({ mode, onChange }) => (
  <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
    <button
      onClick={() => onChange('list')}
      className="p-1.5 transition-colors"
      style={{ backgroundColor: mode === 'list' ? 'var(--accent)' : 'transparent', color: mode === 'list' ? '#fff' : 'var(--text-tertiary)' }}
      title="List view"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>
    <button
      onClick={() => onChange('grid')}
      className="p-1.5 transition-colors"
      style={{ backgroundColor: mode === 'grid' ? 'var(--accent)' : 'transparent', color: mode === 'grid' ? '#fff' : 'var(--text-tertiary)' }}
      title="Grid view"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    </button>
    <button
      onClick={() => onChange('stack')}
      className="p-1.5 transition-colors"
      style={{ backgroundColor: mode === 'stack' ? 'var(--accent)' : 'transparent', color: mode === 'stack' ? '#fff' : 'var(--text-tertiary)' }}
      title="Stack view"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.011.024.025.048.04.072M6 6.878L6.04 6.95M6 6.878v.878m0 .878v.878m0 .878v.878m0 .878v.431c0 .032.002.063.007.094M6 10.12v.878m0 .878v.878m0 .878v.878m0 .878v.878m0 .878A2.25 2.25 0 008.25 12h7.5a2.25 2.25 0 002.25-2.25v-.878m-12 .878v.878m0 .878v.878m0 .878v-.878m0 .878v.878m0 .878v.878m0 .878A2.25 2.25 0 008.25 15h7.5a2.25 2.25 0 002.25-2.25v-.878" />
      </svg>
    </button>
  </div>
)

const formatSyncTime = (timestamp) => {
  const seconds = Math.floor(Date.now() / 1000) - timestamp
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const SourceListItem = ({ source, sourceFiles = [], isSyncing, isEmbedding, onSync, onEmbed, onDelete, onViewFile, onDeleteFile, onUploadFiles, onRenameSource, onRenameFile, viewMode = 'grid' }) => {
  const stInfo = SOURCE_TYPES[source.type] || SOURCE_TYPES.notes
  const status = source.status || 'active'
  const lastSynced = source.last_synced
  const sourceSummary = source.config?.url || source.config?.repoUrl || source.config?.apiEndpoint || source.config?.directoryPath || source.config?.serviceType || ''
  const fileCount = sourceFiles.length || source.files_count || 0
  const chunkCount = sourceFiles.reduce((sum, file) => sum + (file.chunks_count || 0), 0) || source.chunks_count || 0
  const hasFiles = fileCount > 0
  const [filesExpanded, setFilesExpanded] = useState(fileCount > 0)
  const fileInputRef = useRef(null)

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl border bg-[var(--surface)] transition-colors hover:bg-[var(--surface-hover)] group" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: stInfo.color + '20', color: stInfo.color }}>
          {isSyncing ? <LoadingSpinner size={14} /> : React.cloneElement(stInfo.icon, { size: 16 })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
            <EditableName value={source.name || stInfo.label} onRename={n => onRenameSource?.(source.id, n)} />
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] truncate">
            {stInfo.label}{sourceSummary ? ' · ' + sourceSummary.slice(0, 30) : ''}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] shrink-0">
          <span>{fileCount} files</span>
          <span>{chunkCount} chunks</span>
          <span className="px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: status === 'active' ? 'var(--accent-subtle, #10b98120)' : status === 'syncing' ? '#f59e0b20' : '#ef444420',
              color: status === 'active' ? 'var(--accent)' : status === 'syncing' ? '#f59e0b' : '#ef4444'
            }}>
            {status}
          </span>
          {lastSynced && <span>{formatSyncTime(lastSynced)}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <input ref={fileInputRef} type="file" multiple
            accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,.py,.js,.ts,.html,.css,.xml,.yaml,.yml,.svg,.log"
            className="hidden"
            onChange={e => { if (e.target.files.length > 0 && onUploadFiles) { onUploadFiles(Array.from(e.target.files)); e.target.value = '' } }}
          />
          {source.type === 'files' && (
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-[var(--accent)]/10" style={{ color: 'var(--accent)' }} title="Upload">
              <UploadIcon size={13} />
            </button>
          )}
          <button onClick={onSync} disabled={isSyncing} className="p-1.5 rounded hover:bg-[var(--accent)]/10 disabled:opacity-50" style={{ color: 'var(--accent)' }} title="Sync">
            {isSyncing ? <LoadingSpinner size={13} /> : <RefreshIcon size={13} />}
          </button>
          <button onClick={onEmbed} disabled={!hasFiles || isEmbedding} className="p-1.5 rounded hover:bg-[var(--accent)]/10 disabled:opacity-50" style={{ color: 'var(--accent)' }} title="Embed">
            <DatabaseIcon size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-tertiary)' }} title="Remove">
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-[var(--surface)] p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: stInfo.color + '20', color: stInfo.color }}>
          {isSyncing ? <LoadingSpinner size={16} /> : stInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
            <EditableName value={source.name || stInfo.label} onRename={n => onRenameSource?.(source.id, n)} />
          </div>
          <div className="text-[11px] mt-1 text-[var(--text-tertiary)] truncate">
            {stInfo.label}{sourceSummary ? ' · ' + sourceSummary.slice(0, 40) : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: status === 'active' ? 'var(--accent-subtle, #10b98120)' : status === 'syncing' ? '#f59e0b20' : '#ef444420',
              color: status === 'active' ? 'var(--accent)' : status === 'syncing' ? '#f59e0b' : '#ef4444'
            }}>
            {status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-secondary)]">
        <div className="rounded-lg border border-[var(--border)]/50 bg-[var(--bg-secondary)] p-2">
          <div className="font-semibold text-[var(--text)]">{fileCount}</div>
          <div>Files</div>
        </div>
        <div className="rounded-lg border border-[var(--border)]/50 bg-[var(--bg-secondary)] p-2">
          <div className="font-semibold text-[var(--text)]">{chunkCount}</div>
          <div>Chunks</div>
        </div>
        <div className="rounded-lg border border-[var(--border)]/50 bg-[var(--bg-secondary)] p-2">
          <div className="font-semibold text-[var(--text)]">{lastSynced ? formatSyncTime(lastSynced) : 'Never'}</div>
          <div>Last synced</div>
        </div>
      </div>

      {hasFiles && (
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setFilesExpanded(!filesExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text)' }}
          >
            <span className="flex items-center gap-1.5">
              <FileIcon size={13} />
              {fileCount} file{fileCount !== 1 ? 's' : ''}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 transition-transform duration-200"
              style={{ transform: filesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {filesExpanded && (
            <div className="border-t max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
              {sourceFiles.map((file, idx) => (
                <div
                  key={file.id || idx}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] border-b last:border-b-0 hover:bg-[var(--surface-hover)] transition-colors group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <FileIcon size={11} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="flex-1 truncate" style={{ color: 'var(--text)' }}>
                    {file.content_url ? (
                      <a href={file.content_url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--accent)' }}>
                        <EditableName value={file.name} onRename={n => onRenameFile?.(file.id, n)} />
                      </a>
                    ) : <EditableName value={file.name} onRename={n => onRenameFile?.(file.id, n)} />}
                  </span>
                  {file.chunks_count > 0 && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-subtle, #10b98120)', color: 'var(--accent)' }}>
                      {file.chunks_count} chunks
                    </span>
                  )}
                  {file.is_embedded && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>indexed</span>
                  )}
                  <span className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {file.size_bytes ? (file.size_bytes < 1024 ? file.size_bytes + ' B' : file.size_bytes < 1048576 ? (file.size_bytes / 1024).toFixed(1) + ' KB' : (file.size_bytes / 1048576).toFixed(1) + ' MB') : ''}
                  </span>
                  <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onViewFile && (
                      <button onClick={() => onViewFile(file)} className="p-1 rounded hover:bg-[var(--accent)]/10" style={{ color: 'var(--text-tertiary)' }} title="View">
                        <EyeIcon size={12} />
                      </button>
                    )}
                    {onDeleteFile && (
                      <button onClick={() => onDeleteFile(file.id)} className="p-1 rounded hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-tertiary)' }} title="Delete file">
                        <TrashIcon size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,.py,.js,.ts,.html,.css,.xml,.yaml,.yml,.svg,.log"
          className="hidden"
          onChange={e => {
            if (e.target.files.length > 0 && onUploadFiles) {
              onUploadFiles(Array.from(e.target.files))
              e.target.value = ''
            }
          }}
        />
        {source.type === 'files' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            <UploadIcon size={12} />
            Upload Files
          </button>
        )}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          {isSyncing ? <LoadingSpinner size={12} /> : <RefreshIcon size={12} />}
          Sync / Update
        </button>
        <button
          onClick={onEmbed}
          disabled={!hasFiles || isEmbedding}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: hasFiles ? 'var(--accent)' : 'var(--bg-secondary)', color: hasFiles ? '#fff' : 'var(--text-tertiary)' }}
        >
          <DatabaseIcon size={12} />
          Index & Embed
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}
        >
          <TrashIcon size={12} />
          Remove
        </button>
      </div>
    </div>
  )
}

const SettingsPanel = ({ kb, onSave, models = [], onRefresh, onDeleteSource, onEmbedSource, isEmbedding }) => {
  const typeInfo = getKBTypeInfo(kb.kb_type)
  const [config, setConfig] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isBuildingGraph, setIsBuildingGraph] = useState(false)
  const [graphBuildError, setGraphBuildError] = useState(null)

  const modelOptions = ['default', ...(models || []).map(m => m.id || m.name)]

  useEffect(() => {
    setConfig({
      ...kb.config,
      retrieval_mode: kb.retrieval_mode,
      hybrid_search: kb.hybrid_search,
      reranking: kb.reranking,
      chunk_size: kb.chunk_size,
      chunk_overlap: kb.chunk_overlap,
      kb_chat_enabled: kb.config?.kb_chat_enabled ?? true,
      chat_model: kb.config?.chat_model ?? 'default',
      temperature: kb.config?.temperature ?? '0.7',
      max_context_chunks: kb.config?.max_context_chunks ?? 10,
    })
    setHasChanges(false)
    setGraphBuildError(null)
  }, [kb.id, kb.retrieval_mode, kb.hybrid_search, kb.reranking, kb.chunk_size, kb.chunk_overlap, kb.graph_status])

  const handleChange = (key, value) => {
    setConfig({ ...config, [key]: value })
    setHasChanges(true)
  }

  const handleSave = () => {
    const coreFields = ['retrieval_mode', 'hybrid_search', 'reranking', 'chunk_size', 'chunk_overlap', 'kb_chat_enabled', 'chat_model', 'temperature', 'max_context_chunks']
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

  const handleBuildGraph = async (force = false) => {
    setIsBuildingGraph(true)
    setGraphBuildError(null)
    try {
      const url = force
        ? `/api/knowledge/${kb.id}/build-graph?force=true`
        : `/api/knowledge/${kb.id}/build-graph`
      const resp = await fetch(url, { method: 'POST' })
      const data = await resp.json()
      if (data.error) {
        setGraphBuildError(data.details ? `${data.error}\n${data.details}` : data.error)
      } else if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      setGraphBuildError(err.message)
    } finally {
      setIsBuildingGraph(false)
    }
  }

  const graphStatus = kb.graph_status

  return (
    <div className="overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeInfo.color + '20' }}>
            {React.cloneElement(typeInfo.icon, { style: { color: typeInfo.color } })}
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{typeInfo.label} Configuration</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{typeInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kb.kb_type === 'graphrag' && (
            <>
              {graphStatus && (
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                  graphStatus === 'ready' ? 'bg-emerald-500/10 text-emerald-500' :
                  graphStatus === 'indexing' ? 'bg-amber-500/10 text-amber-500' :
                  graphStatus === 'error' ? 'bg-red-500/10 text-red-500' :
                  'bg-[var(--text-muted)]/10 text-[var(--text-muted)]'
                }`}>
                  Graph: {graphStatus}
                </span>
              )}
              <button
                onClick={() => handleBuildGraph(graphStatus === 'indexing')}
                disabled={isBuildingGraph}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: typeInfo.color + '20', color: typeInfo.color, border: `1px solid ${typeInfo.color}30` }}
              >
                {isBuildingGraph ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Building...
                  </>
                ) : graphStatus === 'indexing' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Force Rebuild
                  </>
                ) : graphStatus === 'error' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Retry Build
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                    Build Graph
                  </>
                )}
              </button>
            </>
          )}
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
      </div>

      {graphBuildError && (
        <div className="px-4 pb-2">
          <div className="text-[11px] text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 whitespace-pre-line">
            {graphBuildError}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* Settings */}
      <div className="p-4 space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Settings
        </h4>
        {typeInfo.settings && typeInfo.settings.map(field => {
          const dynamicField = field.key === 'chat_model' && modelOptions.length > 1
            ? { ...field, options: modelOptions }
            : field
          return (
            <SettingRow
              key={field.key}
              field={dynamicField}
              value={config[field.key]}
              onChange={(val) => handleChange(field.key, val)}
            />
          )
        })}
      </div>
    </div>
  )
}

const SourcesPanel = ({ kb, kbFiles = [], onDeleteSource, onRefresh, onEmbedSource, isEmbedding, onViewFile, onDeleteFile, onUploadFilesToSource, onRenameSource, onRenameFile, sourceViewMode, onSourceViewModeChange }) => {
  const sources = kb.config?.sources || []
  const [syncingSourceId, setSyncingSourceId] = useState(null)
  const [syncingAll, setSyncingAll] = useState(false)

  const getSourceFiles = (sourceId) => kbFiles.filter(file => file.metadata?.source_id === sourceId)

  const handleSyncSource = async (sourceId) => {
    setSyncingSourceId(sourceId)
    try {
      const resp = await fetch(`/api/knowledge/${kb.id}/sources/${sourceId}/sync`, { method: 'POST' })
      const data = await resp.json()
      if (data.error) {
        alert(`Sync failed: ${data.error}`)
      }
    } catch (err) {
      console.error('Sync failed:', err)
      alert('Sync failed')
    } finally {
      setSyncingSourceId(null)
      if (onRefresh) onRefresh()
    }
  }

  const handleSyncAll = async () => {
    if (sources.length === 0) return
    setSyncingAll(true)
    try {
      const resp = await fetch(`/api/knowledge/${kb.id}/sync`, { method: 'POST' })
      const data = await resp.json()
      if (data.error) {
        alert(`Sync failed: ${data.error}`)
      }
    } catch (err) {
      console.error('Sync all failed:', err)
      alert('Sync failed')
    } finally {
      setSyncingAll(false)
      if (onRefresh) onRefresh()
    }
  }

  if (sources.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            {syncingAll ? <LoadingSpinner size={12} /> : <RefreshIcon size={12} />}
            {syncingAll ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
        <ViewToggle mode={sourceViewMode} onChange={onSourceViewModeChange || (() => {})} />
      </div>

      <div className={sourceViewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : sourceViewMode === 'stack' ? 'flex flex-col gap-0.5' : 'flex flex-col gap-2'}>
        {sources.map((source, idx) => (
          <SourceListItem
            key={source.id || idx}
            source={source}
            sourceFiles={getSourceFiles(source.id)}
            isSyncing={syncingSourceId === source.id}
            isEmbedding={isEmbedding}
            onSync={() => handleSyncSource(source.id)}
            onEmbed={() => onEmbedSource?.(source.id)}
            onDelete={() => onDeleteSource(source.id)}
            onViewFile={onViewFile}
            onDeleteFile={(fileId) => onDeleteFile?.(fileId, source.id)}
            onUploadFiles={(files) => onUploadFilesToSource?.(source.id, files)}
            onRenameSource={onRenameSource}
            onRenameFile={onRenameFile}
            viewMode={sourceViewMode}
          />
        ))}
      </div>
    </div>
  )
}

// Source Configuration Component - for adding/configuring data sources
const SourceConfigModal = ({ isOpen, onClose, sourceType, onAdd }) => {
  const [config, setConfig] = useState({})
  const sourceInfo = SOURCE_TYPES[sourceType]

  useEffect(() => {
    if (sourceType && DEFAULT_SOURCE_CONFIG[sourceType]) {
      setConfig(DEFAULT_SOURCE_CONFIG[sourceType])
    }
  }, [sourceType])

  if (!isOpen || !sourceInfo) return null

  const handleChange = (key, value) => {
    setConfig({ ...config, [key]: value })
  }

  const handleAdd = () => {
    onAdd({ type: sourceType, config })
    onClose()
    setConfig(DEFAULT_SOURCE_CONFIG[sourceType] || {})
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 animate-backdrop"
      style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-[560px] max-h-[85vh] rounded-xl overflow-hidden animate-modal"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--modal-shadow)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: sourceInfo.color + '20' }}>
              <span style={{ color: sourceInfo.color }}>{sourceInfo.icon}</span>
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Add {sourceInfo.label} Source</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sourceInfo.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        {/* Fields */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
          {sourceInfo.fields.map(field => (
            <SettingRow
              key={field.key}
              field={field}
              value={config[field.key]}
              onChange={(val) => handleChange(field.key, val)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--gradient-primary)', color: '#fff' }}
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  )
}

// Premium Knowledge Base Card with full insights
const KnowledgeBaseCard = ({ kb, active, onClick, onDelete, viewMode = 'list' }) => {
  const typeInfo = getKBTypeInfo(kb.kb_type)
  const itemCount = kb.file_count || 0
  const embeddedCount = kb.files?.filter(f => f.is_embedded).length || 0
  const totalTokens = kb.files?.reduce((sum, f) => sum + (f.token_count || 0), 0) || 0
  const totalChunks = kb.files?.reduce((sum, f) => sum + (f.chunks_count || 0), 0) || 0

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never'
    const diff = Date.now() / 1000 - timestamp
    const minutes = Math.floor(diff / 60)
    const hours = Math.floor(diff / 3600)
    const days = Math.floor(diff / 86400)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return new Date(timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const isFullyEmbedded = itemCount > 0 && embeddedCount === itemCount
  const isPartiallyEmbedded = embeddedCount > 0 && embeddedCount < itemCount

  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className={`group relative flex flex-col p-3 rounded-2xl text-sm transition-all duration-300 cursor-pointer
          ${active
            ? 'glass-card-strong border-[var(--accent-primary)]/30 glow-accent-sm scale-[1.02]'
            : 'glass-card hover:border-[var(--accent-primary)]/20 hover:shadow-lg hover:scale-[1.01]'
          }`}
      >
        {active && (
          <div className="absolute -left-0.5 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
        )}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${typeInfo.color}20, ${typeInfo.color}08)`,
              border: `1px solid ${typeInfo.color}20`,
              color: typeInfo.color
            }}
          >
            {React.cloneElement(typeInfo.icon, { size: 18 })}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-xs font-semibold truncate ${active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
              {kb.name}
            </h3>
            <div className="text-[10px] text-[var(--text-muted)]">{formatNumber(itemCount)} files · {formatNumber(totalChunks)} chunks{kb.graph_status ? ` · Graph: ${kb.graph_status}` : ''}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(kb.id) }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
          >
            <TrashIcon size={12} />
          </button>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
          {itemCount === 0 ? (
            <span className="text-[9px] text-[var(--text-muted)]">Empty</span>
          ) : isFullyEmbedded ? (
            <span className="flex items-center gap-1 text-[9px] text-emerald-500 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Indexed
            </span>
          ) : isPartiallyEmbedded ? (
            <span className="text-[9px] text-amber-500 font-medium">{embeddedCount}/{itemCount}</span>
          ) : (
            <span className="text-[9px] text-[var(--text-muted)]">Not indexed</span>
          )}
          <span className="text-[9px] text-[var(--text-muted)]">{formatTimeAgo(kb.updated_at)}</span>
        </div>
      </div>
    )
  }

  if (viewMode === 'stack') {
    return (
      <div
        onClick={onClick}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300 cursor-pointer
          ${active
            ? 'bg-[var(--accent-subtle, #10b98120)] border border-[var(--accent)]/40'
            : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30'
          }`}
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: typeInfo.color + '20', color: typeInfo.color }}>
          {React.cloneElement(typeInfo.icon, { size: 14 })}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-semibold truncate ${active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
            {kb.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[10px] text-[var(--text-muted)]">
          <span>{formatNumber(itemCount)} files</span>
          <span>{formatNumber(totalChunks)} chunks</span>
        </div>
        {itemCount > 0 ? isFullyEmbedded ? (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Indexed" />
        ) : isPartiallyEmbedded ? (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" title="Partially indexed" />
        ) : (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" title="Not indexed" />
        ) : (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/30" title="Empty" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(kb.id) }}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
        >
          <TrashIcon size={11} />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col w-full p-4 rounded-2xl text-sm transition-all duration-300 cursor-pointer
        ${active
          ? 'glass-card-strong border-[var(--accent-primary)]/30 glow-accent-sm scale-[1.02]'
          : 'glass-card hover:border-[var(--accent-primary)]/20 hover:shadow-lg hover:scale-[1.01]'
        }
      `}
    >
      {/* Active Indicator */}
      {active && (
        <div className="absolute -left-0.5 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
      )}

      {/* Header with Icon & Actions */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon Container with Gradient Background */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${typeInfo.color}20, ${typeInfo.color}08)`,
            border: `1px solid ${active ? typeInfo.color + '40' : typeInfo.color + '20'}`,
            color: typeInfo.color
          }}
        >
          <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {React.cloneElement(typeInfo.icon, { size: 24 })}
          </span>
        </div>

        {/* Title & Type */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className={`font-semibold text-base truncate ${active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
            {kb.name}
          </h3>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="font-medium" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
            {kb.config?.sources && kb.config.sources.length > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">{kb.config.sources.length} sources</span>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">ID: {kb.id?.slice(0, 8)}</span>
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

      {/* Description Preview */}
      {kb.description && (
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
          {kb.description}
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col p-2 rounded-lg bg-[var(--surface)]/50 border border-[var(--border)]/50">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wide">Files</span>
          <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(itemCount)}</span>
        </div>
        <div className="flex flex-col p-2 rounded-lg bg-[var(--surface)]/50 border border-[var(--border)]/50">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wide">Tokens</span>
          <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(totalTokens)}</span>
        </div>
        <div className="flex flex-col p-2 rounded-lg bg-[var(--surface)]/50 border border-[var(--border)]/50">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wide">Chunks</span>
          <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(totalChunks)}</span>
        </div>
      </div>

      {/* Footer with Status & Last Updated */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
        {/* Embedding Status & Graph Status */}
        <div className="flex items-center gap-2">
          {itemCount === 0 ? (
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              Empty
            </span>
          ) : isFullyEmbedded ? (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Indexed
            </span>
          ) : isPartiallyEmbedded ? (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {embeddedCount}/{itemCount} Indexed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              Not Indexed
            </span>
          )}
          {kb.kb_type === 'graphrag' && kb.graph_status && (
            <span className={`flex items-center gap-1.5 text-[10px] font-medium ${
              kb.graph_status === 'ready' ? 'text-emerald-500' :
              kb.graph_status === 'indexing' ? 'text-amber-500' :
              kb.graph_status === 'error' ? 'text-red-500' :
              'text-[var(--text-muted)]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                kb.graph_status === 'ready' ? 'bg-emerald-500' :
                kb.graph_status === 'indexing' ? 'bg-amber-500 animate-pulse' :
                kb.graph_status === 'error' ? 'bg-red-500' :
                'bg-[var(--text-muted)]'
              }`} />
              Graph: {kb.graph_status}
            </span>
          )}
        </div>

        {/* Last Updated */}
        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
          </svg>
          {formatTimeAgo(kb.updated_at)}
        </span>
      </div>
    </div>
  )
}

const FileCard = ({ file, onDelete, onView, onEmbed, isEmbedding, onRename, viewMode = 'grid' }) => {
  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const diff = Date.now() / 1000 - timestamp
    const minutes = Math.floor(diff / 60)
    const hours = Math.floor(diff / 3600)
    const days = Math.floor(diff / 86400)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return new Date(timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const getFileColor = (fileType, fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    const type = (fileType || '').toLowerCase()
    if (['pdf'].includes(ext) || type.includes('pdf')) return '#ef4444'
    if (['doc', 'docx'].includes(ext) || type.includes('word')) return '#3b82f6'
    if (['xls', 'xlsx', 'csv'].includes(ext) || type.includes('excel') || type.includes('csv')) return '#22c55e'
    if (['ppt', 'pptx'].includes(ext) || type.includes('powerpoint')) return '#f97316'
    if (['md', 'txt', 'text'].includes(ext) || type.includes('text') || type.includes('markdown')) return '#64748b'
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'c', 'cpp', 'go', 'rs'].includes(ext)) return '#8b5cf6'
    if (['json', 'xml', 'yaml', 'yml'].includes(ext)) return '#eab308'
    if (['html', 'htm', 'css'].includes(ext)) return '#ec4899'
    return '#6366f1'
  }

  const fileColor = getFileColor(file.file_type, file.name)
  const fileExt = file.name?.split('.').pop()?.toUpperCase() || file.file_type?.toUpperCase() || 'FILE'

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl border bg-[var(--surface)] transition-colors hover:bg-[var(--surface-hover)] group" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative" style={{ backgroundColor: fileColor + '20', color: fileColor }}>
          <FileIcon size={14} />
          <span className="absolute -bottom-0.5 -right-0.5 px-1 rounded text-[7px] font-bold" style={{ background: fileColor, color: '#fff' }}>{fileExt.slice(0, 3)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
            <EditableName value={file.name} onRename={n => onRename?.(file.id, n)} />
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">{formatSize(file.size_bytes)} · {(file.token_count || 0).toLocaleString()} tokens</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[10px] text-[var(--text-secondary)]">
          {(file.chunks_count || 0) > 0 && <span>{file.chunks_count} chunks</span>}
          {file.is_embedded ? (
            <span className="flex items-center gap-1 text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg></span>
          ) : (
            <button onClick={() => onEmbed?.(file.id)} disabled={isEmbedding} className="px-2 py-0.5 rounded text-[9px] font-medium disabled:opacity-50" style={{ background: 'var(--accent)', color: '#fff' }}>Embed</button>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(file)} className="p-1.5 rounded hover:bg-[var(--accent)]/10" style={{ color: 'var(--accent)' }} title="View">
            <EyeIcon size={13} />
          </button>
          <button onClick={() => onDelete(file.id)} className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-tertiary)' }} title="Delete">
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    )
  }

  if (viewMode === 'stack') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-[var(--surface)] transition-colors hover:bg-[var(--surface-hover)] group" style={{ borderColor: 'var(--border)' }}>
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: fileColor + '20', color: fileColor }}>
          <FileIcon size={11} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>
            <EditableName value={file.name} onRename={n => onRename?.(file.id, n)} />
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[9px] text-[var(--text-secondary)]">
          <span>{formatSize(file.size_bytes)}</span>
          {file.is_embedded && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(file)} className="p-1 rounded hover:bg-[var(--accent)]/10" style={{ color: 'var(--accent)' }} title="View">
            <EyeIcon size={11} />
          </button>
          <button onClick={() => onDelete(file.id)} className="p-1 rounded hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-tertiary)' }} title="Delete">
            <TrashIcon size={11} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col p-4 rounded-2xl text-sm transition-all duration-300 glass-card hover:border-[var(--accent-primary)]/20 hover:shadow-lg hover:scale-[1.01]">
      {/* Header with Icon & Actions */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon Container with File Extension Badge */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 relative"
          style={{
            background: `linear-gradient(135deg, ${fileColor}20, ${fileColor}08)`,
            border: `1px solid ${fileColor}30`,
            color: fileColor
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {/* Extension Badge */}
          <span
            className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
            style={{ background: fileColor, color: '#fff' }}
          >
            {fileExt.slice(0, 4)}
          </span>
        </div>

        {/* File Name & Type */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-semibold text-base truncate text-[var(--text)]">
            <EditableName value={file.name} onRename={n => onRename?.(file.id, n)} className="text-base" />
          </h3>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span style={{ color: fileColor }}>{file.file_type || 'Unknown'}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">ID: {file.id?.slice(0, 8)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onView(file)}
            className="p-2 rounded-lg glass-button text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all duration-200 hover:scale-110"
            title="View content"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(file.id)}
            className="p-2 rounded-lg glass-button text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all duration-200 hover:scale-110"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.194.855-2.166 2.083-2.166H8.25c-1.228 0-2.083.972-2.083 2.166v.916" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col p-2 rounded-lg bg-[var(--surface)]/50 border border-[var(--border)]/50">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wide">Size</span>
          <span className="text-sm font-semibold text-[var(--text)]">{formatSize(file.size_bytes)}</span>
        </div>
        <div className="flex flex-col p-2 rounded-lg bg-[var(--surface)]/50 border border-[var(--border)]/50">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wide">Tokens</span>
          <span className="text-sm font-semibold text-[var(--text)]">{(file.token_count || 0).toLocaleString()}</span>
        </div>
        <div className="flex flex-col p-2 rounded-lg bg-[var(--surface)]/50 border border-[var(--border)]/50">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wide">Chunks</span>
          <span className="text-sm font-semibold text-[var(--text)]">{(file.chunks_count || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Footer with Status, Embed Button & Last Updated */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
        {/* Left: Embedding Status or Embed Button */}
        <div className="flex items-center gap-2">
          {file.is_embedded ? (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Indexed
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEmbed?.(file.id)
              }}
              disabled={isEmbedding}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--gradient-primary)',
                color: '#fff',
              }}
            >
              {isEmbedding ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Indexing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  Index & Embed
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Last Updated */}
        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
          </svg>
          {formatTimeAgo(file.updated_at)}
        </span>
      </div>
    </div>
  )
}

const EmbeddingStatsPanel = ({ stats }) => {
  const { charCount, wordCount, tokenCount, lineCount, chunkCount, chunkSize, embeddingModel } = stats
  
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{charCount?.toLocaleString() || 0}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Characters</div>
      </div>
      <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{wordCount?.toLocaleString() || 0}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Words</div>
      </div>
      <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{lineCount?.toLocaleString() || 0}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Lines</div>
      </div>
      <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{chunkCount || 0}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Chunks</div>
      </div>
      <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{chunkSize || 1000}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Chunk Size</div>
      </div>
      <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="text-lg font-bold truncate" style={{ color: 'var(--accent)' }}>{embeddingModel || 'nomic-embed-text'}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Embedding Model</div>
      </div>
    </div>
  )
}

const ChunkMapVisualizer = ({ content, chunkSize = 1000, chunkOverlap = 100 }) => {
  if (!content) return null
  
  const chunks = []
  for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
    chunks.push({
      start: i,
      end: Math.min(i + chunkSize, content.length),
      text: content.slice(i, Math.min(i + chunkSize, content.length))
    })
    if (i + chunkSize >= content.length) break
  }
  
  const totalLength = content.length
  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16']
  
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-tertiary)' }}>Document Chunk Map</h4>
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-8 rounded-lg overflow-hidden flex" style={{ background: 'var(--bg-secondary)' }}>
            {chunks.map((chunk, idx) => (
              <div
                key={idx}
                className="relative group"
                style={{
                  width: `${(chunk.text.length / totalLength) * 100}%`,
                  minWidth: '4px',
                  backgroundColor: colors[idx % colors.length],
                  opacity: 0.7 + (idx === 0 ? 0.3 : 0)
                }}
                title={`Chunk ${idx + 1}: ${chunk.start}-${chunk.end} (${chunk.text.length} chars)`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{ background: 'var(--text)', color: 'var(--bg)' }}>
                  Chunk {idx + 1}: {chunk.start}-{chunk.end}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {chunks.map((chunk, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx % colors.length] }} />
              <span style={{ color: 'var(--text-secondary)' }}>Ch {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TermFrequencyChart = ({ content }) => {
  if (!content) return null
  
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'as', 'if', 'then', 'therefore', 'however', 'although', 'though', 'while', 'because', 'since', 'unless', 'until', 'after', 'before', 'about', 'into', 'through', 'during', 'above', 'below', 'between', 'under', 'again', 'further', 'once'])
  
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
  
  const freq = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
  
  const maxFreq = sorted[0]?.[1] || 1
  
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-tertiary)' }}>Top Terms (TF)</h4>
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="space-y-2">
          {sorted.map(([word, count], idx) => (
            <div key={word} className="flex items-center gap-3">
              <span className="text-xs w-4 text-right" style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</span>
              <span className="text-xs w-24 truncate" style={{ color: 'var(--text-secondary)' }}>{word}</span>
              <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div 
                  className="h-full rounded transition-all"
                  style={{ 
                    width: `${(count / maxFreq) * 100}%`,
                    background: `linear-gradient(90deg, var(--accent), ${idx < 3 ? '#d946ef' : 'var(--accent)'})`,
                    opacity: 0.6 + (1 - idx / 15) * 0.4
                  }}
                />
              </div>
              <span className="text-xs w-8 text-right font-mono" style={{ color: 'var(--accent)' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ChunkNavigator = ({ chunks, onChunkSelect, selectedChunk }) => {
  if (!chunks || chunks.length === 0) return null
  
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-tertiary)' }}>Chunk Navigator</h4>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-h-64 overflow-y-auto">
          {chunks.map((chunk, idx) => (
            <div 
              key={chunk.id || idx}
              className="p-3 border-b cursor-pointer transition-colors"
              style={{ 
                borderColor: 'var(--border)',
                background: selectedChunk === idx ? 'var(--accent-subtle)' : 'transparent'
              }}
              onClick={() => onChunkSelect?.(idx)}
            >
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{chunk.content}</p>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {chunk.metadata?.chunk_index !== undefined ? `Index: ${chunk.metadata.chunk_index} | ` : ''}{chunk.content?.length || 0} chars
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const FilePreviewModal = ({ file, content, embeddingsData, onClose }) => {
  const [viewMode, setViewMode] = useState('preview')
  const [deepViewTab, setDeepViewTab] = useState('stats')
  const [selectedChunk, setSelectedChunk] = useState(null)
  const [csvData, setCsvData] = useState({ headers: [], rows: [] })

  const fileType = file?.file_type || ''
  const fileName = file?.name || ''

  const getFileCategory = (name, type) => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const t = type?.toLowerCase() || ''
    if (ext === 'md' || t.includes('markdown') || t.includes('md')) return 'markdown'
    if (ext === 'csv' || t.includes('csv')) return 'csv'
    if (ext === 'json' || t.includes('json')) return 'json'
    if (ext === 'html' || ext === 'htm' || t.includes('html')) return 'html'
    if (ext === 'pdf' || t.includes('pdf')) return 'pdf'
    if (ext === 'doc' || ext === 'docx' || t.includes('word') || t.includes('document')) return 'doc'
    if (ext === 'txt' || ext === 'text' || t.includes('text/plain')) return 'text'
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'sh', 'bash', 'yaml', 'yml', 'xml', 'sql'].includes(ext)) return 'code'
    return 'text'
  }

  const category = getFileCategory(fileName, fileType)

  useEffect(() => {
    if (category === 'csv' && content) {
      parseCSV(content)
    }
  }, [content, category])

  const parseCSV = (text) => {
    try {
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length === 0) { setCsvData({ headers: [], rows: [] }); return }
      const delimiter = lines[0].includes('\t') ? '\t' : ','
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
      const rows = lines.slice(1).map(line =>
        line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
      )
      setCsvData({ headers, rows })
    } catch {
      setCsvData({ headers: [], rows: [] })
    }
  }

  const detectLanguage = (name) => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const langMap = {
      py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      rb: 'ruby', java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
      css: 'css', scss: 'scss', sh: 'bash', bash: 'bash', yaml: 'yaml', yml: 'yaml',
      xml: 'xml', sql: 'sql', json: 'json', md: 'markdown', txt: 'text'
    }
    return langMap[ext] || 'text'
  }

  const renderPreview = () => {
    if (content === null) {
      return (
        <div className="flex flex-col items-center justify-center h-64 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading content...</p>
        </div>
      )
    }

    if (!content) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 opacity-40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H3m9 0h9m-9 0a9 9 0 01-9-9m9 9v9m0 0v-9m0 0H3m9 0h9" />
          </svg>
          No content available
        </div>
      )
    }

    if (category === 'csv') {
      return (
        <div className="overflow-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: 'var(--accent-subtle)' }}>
                {csvData.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: 'var(--accent)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.rows.map((row, i) => (
                <tr key={i} className="even:bg-surface hover:bg-surface transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{cell || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {csvData.rows.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>No data rows found</div>
          )}
        </div>
      )
    }

    if (category === 'markdown') {
      return (
        <div className="prose prose-sm max-w-none rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )
    }

    if (category === 'json') {
      try {
        const formatted = JSON.stringify(JSON.parse(content), null, 2)
        return (
          <pre className="text-xs font-mono whitespace-pre-wrap rounded-xl p-4 overflow-auto"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', maxHeight: '70vh' }}>
            <code>{formatted}</code>
          </pre>
        )
      } catch {
        return <pre className="text-sm font-mono whitespace-pre-wrap rounded-xl p-4" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>{content}</pre>
      }
    }

    if (category === 'html') {
      return (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 01-9-9m9 9a9 9 0 100-18m-9 9l-3-3m3 3l-3 3M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
            HTML Preview
          </div>
          <iframe
            srcDoc={content}
            className="w-full bg-white"
            style={{ height: '60vh', border: 'none' }}
            title="HTML Preview"
            sandbox="allow-same-origin"
          />
        </div>
      )
    }

    if (category === 'pdf') {
      return (
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 mb-4" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H3m9 0h9m-9 0a9 9 0 01-9-9m9 9v9m0 0v-9m0 0H3m9 0h9" />
          </svg>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>PDF Document</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{content?.length || 0} characters extracted from PDF</p>
          <pre className="mt-4 text-xs text-left whitespace-pre-wrap max-h-48 overflow-auto w-full px-4" style={{ color: 'var(--text-secondary)' }}>{content}</pre>
        </div>
      )
    }

    if (category === 'doc') {
      return (
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 mb-4" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H3m9 0h9m-9 0a9 9 0 01-9-9m9 9v9m0 0v-9m0 0H3m9 0h9" />
          </svg>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Document</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{content?.length || 0} characters extracted</p>
          <pre className="mt-4 text-xs text-left whitespace-pre-wrap max-h-48 overflow-auto w-full px-4" style={{ color: 'var(--text-secondary)' }}>{content}</pre>
        </div>
      )
    }

    if (category === 'code') {
      return (
        <div className="rounded-xl overflow-auto border" style={{ borderColor: 'var(--border)', background: '#1e1e1e', maxHeight: '70vh' }}>
          <div className="flex items-center gap-2 px-4 py-2 text-xs border-b" style={{ background: '#2d2d2d', borderColor: '#3d3d3d' }}>
            <span style={{ color: '#888' }}>{detectLanguage(fileName)}</span>
          </div>
          <SyntaxHighlighter
            language={detectLanguage(fileName)}
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '1rem', fontSize: '12px', background: 'transparent' }}
            wrapLongLines={false}
          >
            {content}
          </SyntaxHighlighter>
      </div>
    )
  }

  if (viewMode === 'stack') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-[var(--surface)] transition-colors hover:bg-[var(--surface-hover)] group" style={{ borderColor: 'var(--border)' }}>
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: stInfo.color + '20', color: stInfo.color }}>
          {isSyncing ? <LoadingSpinner size={12} /> : React.cloneElement(stInfo.icon, { size: 13 })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>
            <EditableName value={source.name || stInfo.label} onRename={n => onRenameSource?.(source.id, n)} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[9px] text-[var(--text-secondary)]">
          <span>{fileCount}f</span>
          <span>{chunkCount}c</span>
          <span className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: status === 'active' ? 'var(--accent)' : status === 'syncing' ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <input ref={fileInputRef} type="file" multiple
            accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,.py,.js,.ts,.html,.css,.xml,.yaml,.yml,.svg,.log"
            className="hidden"
            onChange={e => { if (e.target.files.length > 0 && onUploadFiles) { onUploadFiles(Array.from(e.target.files)); e.target.value = '' } }}
          />
          {source.type === 'files' && (
            <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded hover:bg-[var(--accent)]/10" style={{ color: 'var(--accent)' }} title="Upload">
              <UploadIcon size={11} />
            </button>
          )}
          <button onClick={onSync} disabled={isSyncing} className="p-1 rounded hover:bg-[var(--accent)]/10 disabled:opacity-50" style={{ color: 'var(--accent)' }} title="Sync">
            {isSyncing ? <LoadingSpinner size={11} /> : <RefreshIcon size={11} />}
          </button>
          <button onClick={onEmbed} disabled={!hasFiles || isEmbedding} className="p-1 rounded hover:bg-[var(--accent)]/10 disabled:opacity-50" style={{ color: 'var(--accent)' }} title="Embed">
            <DatabaseIcon size={11} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-tertiary)' }} title="Remove">
            <TrashIcon size={11} />
          </button>
        </div>
      </div>
    )
  }

  return (
      <pre className="text-sm font-mono whitespace-pre-wrap rounded-xl p-4 overflow-auto"
        style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', maxHeight: '70vh' }}>
        {content}
      </pre>
    )
  }

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
              {category === 'markdown' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              ) : category === 'csv' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-1.125h-1.5m1.5 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 8.25v-1.5m0 12.75c0 .621.504 1.125 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m17.25-1.125h1.5m1.5 0v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0v-1.5" /></svg>
              ) : category === 'code' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
              ) : category === 'html' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" style={{ color: 'var(--accent)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 01-9-9m9 9a9 9 0 100-18m-9 9l-3-3m3 3l-3 3M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H3m9 0h9m-9 0a9 9 0 01-9-9m9 9v9m0 0v-9m0 0H3m9 0h9" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{file.name}</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>{category.toUpperCase()}</span>
                <span className="ml-2">{content?.length || 0} characters</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'deep' ? 'preview' : 'deep')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              style={{ 
                background: viewMode === 'deep' ? 'var(--accent)' : 'var(--surface)', 
                color: viewMode === 'deep' ? '#fff' : 'var(--text-secondary)', 
                border: '1px solid var(--border)' 
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              Deep View
            </button>
            {(category === 'code' || category === 'markdown') && (
              <button
                onClick={() => setViewMode(v => v === 'preview' ? 'raw' : 'preview')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {viewMode === 'preview' ? 'Raw' : 'Preview'}
              </button>
            )}
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
        </div>

        <div className="flex-1 overflow-hidden p-6 bg-grid">
          {viewMode === 'raw' ? (
            <pre className="text-sm font-mono whitespace-pre-wrap rounded-xl p-4 overflow-auto"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', maxHeight: '70vh' }}>
              {content || 'No content available'}
            </pre>
          ) : viewMode === 'deep' ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {[
                  { id: 'stats', label: 'Stats', icon: '📊' },
                  { id: 'chunks', label: 'Chunks', icon: '🧩' },
                  { id: 'visualization', label: 'Visualization', icon: '📈' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDeepViewTab(tab.id)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    style={{ 
                      background: deepViewTab === tab.id ? 'var(--accent)' : 'transparent',
                      color: deepViewTab === tab.id ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-auto">
                {deepViewTab === 'stats' && (
                  <div>
                    <EmbeddingStatsPanel 
                      stats={{
                        charCount: content?.length || 0,
                        wordCount: content?.split(/\s+/).filter(w => w).length || 0,
                        tokenCount: Math.ceil((content?.length || 0) / 4),
                        lineCount: content?.split('\n').length || 0,
                        chunkCount: embeddingsData?.length || Math.ceil((content?.length || 0) / 1000),
                        chunkSize: 1000,
                        embeddingModel: 'nomic-embed-text'
                      }}
                    />
                    <ChunkMapVisualizer content={content} />
                  </div>
                )}
                
                {deepViewTab === 'chunks' && (
                  <ChunkNavigator 
                    chunks={embeddingsData?.length > 0 ? embeddingsData : (content ? [{
                      id: 'computed-1',
                      content: content.slice(0, 1000)
                    }] : [])}
                    selectedChunk={selectedChunk}
                    onChunkSelect={setSelectedChunk}
                  />
                )}
                
                {deepViewTab === 'visualization' && (
                  <TermFrequencyChart content={content} />
                )}
              </div>
            </div>
          ) : renderPreview()}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(content || '')}`}
            download={file.name}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: 'var(--user-bubble-bg)', color: '#ffffff', boxShadow: 'var(--user-bubble-shadow)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const KnowledgeBase = ({ onRefresh, models = [] }) => {
  const [kbs, setKbs] = useState([])
  const [selectedKB, setSelectedKB] = useState(null)
  const [selectedKBFiles, setSelectedKBFiles] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const [viewingFile, setViewingFile] = useState(null)
  const [viewingFileContent, setViewingFileContent] = useState(null)
  const [newKBDir, setNewKBDir] = useState({ name: '', description: '', kb_type: 'knowledge' })
  const [isEmbedding, setIsEmbedding] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showEmbeddings, setShowEmbeddings] = useState(false)
  const [sourceAdded, setSourceAdded] = useState(false)
  const [embeddingsData, setEmbeddingsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [embedProgress, setEmbedProgress] = useState(null)
  const [addSourceStep, setAddSourceStep] = useState('pick') // 'pick', 'config', or 'success'
  const [addSourceType, setAddSourceType] = useState(null)
  const [addSourceConfig, setAddSourceConfig] = useState({})
  const [kbViewMode, setKbViewMode] = useState('list')
  const [sourceViewMode, setSourceViewMode] = useState('grid')
  const [inlineAddingType, setInlineAddingType] = useState(null)
  const [inlineDraft, setInlineDraft] = useState({})
  const [showAddSource, setShowAddSource] = useState(false)
  const [isAddingSource, setIsAddingSource] = useState(false)
  const fileInputRef = useRef(null)

  // KB Chat state
  const [showKBChat, setShowKBChat] = useState(false)
  const [kbChatMessages, setKBChatMessages] = useState([])
  const [kbChatInput, setKBChatInput] = useState('')
  const [isKBChatStreaming, setIsKBChatStreaming] = useState(false)
  const kbChatEndRef = useRef(null)
  const kbChatAbortRef = useRef(null)
  const [kbSessions, setKbSessions] = useState([])
  const [activeKbSessionId, setActiveKbSessionId] = useState(null)
  const [originalSessionId, setOriginalSessionId] = useState(null)
  const originalSessionIdRef = useRef(null)

  // Keep ref in sync with state so cleanup can access the latest value
  useEffect(() => {
    originalSessionIdRef.current = originalSessionId
  }, [originalSessionId])

  // Cleanup: restore the original non-KB session when this component unmounts
  // or when the KB chat panel is closed without explicitly restoring.
  useEffect(() => {
    return () => {
      if (originalSessionIdRef.current) {
        fetch('/api/sessions/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: originalSessionIdRef.current })
        }).catch(err => console.error('Failed to restore original session on unmount:', err))
        originalSessionIdRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    fetchKBs()
  }, [])

  useEffect(() => {
    if (selectedKB) {
      fetchKBDetails(selectedKB.id)
      setShowSettings(false)
      setShowGraph(false)
    }
  }, [selectedKB?.id])

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
      if (selectedKB && selectedKB.id === kbId) {
        setSelectedKB({ ...selectedKB, ...data })
      }
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
      setNewKBDir({ name: '', description: '', kb_type: 'knowledge' })
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

  const handleAddSource = async () => {
    if (!addSourceType || !selectedKB) return
    const sourceConfig = { ...addSourceConfig }
    // Validate required fields
    const sourceInfo = SOURCE_TYPES[addSourceType]
    const requiredFields = sourceInfo?.fields?.filter(f => f.required) || []
    for (const field of requiredFields) {
      if (!sourceConfig[field.key]?.toString().trim()) {
        alert(`Please fill in "${field.label}"`)
        return
      }
    }

    const sourceId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)

    // Handle file uploads for files source type
    let fileCount = 0
    if (addSourceType === 'files' && sourceConfig.files && sourceConfig.files.length > 0) {
      fileCount = sourceConfig.files.length
      try {
        setIsUploading(true)
        for (const file of sourceConfig.files) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('source_id', sourceId)

          const resp = await fetch(`/api/knowledge/${selectedKB.id}/upload`, {
            method: 'POST',
            body: formData,
          })
          if (!resp.ok) {
            const data = await resp.json().catch(() => ({}))
            throw new Error(data.details || data.error || `Upload failed for ${file.name}`)
          }
        }
        setIsUploading(false)
        // Remove files from config since they're uploaded
        delete sourceConfig.files
      } catch (err) {
        setIsUploading(false)
        console.error('Failed to upload files:', err)
        alert('Failed to upload files: ' + err.message)
        return
      }
    }

    try {
      // Add source to KB config
      const sources = selectedKB.config?.sources || []
      const newSource = {
        id: sourceId,
        type: addSourceType,
        name: sourceConfig.name || (addSourceType === 'files' && fileCount > 0 ? `Files (${fileCount} files)` : `Files Source (${new Date().toLocaleDateString()})`),
        config: sourceConfig,
        created_at: Date.now() / 1000,
        status: 'active',
      }
      sources.push(newSource)
      const resp = await fetch(`/api/knowledge/${selectedKB.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...selectedKB.config, sources } }),
      })
      const data = await resp.json()
      setSelectedKB({ ...selectedKB, ...data })
      setSourceAdded(newSource)
      setAddSourceStep('success')
      fetchKBs()
      fetchKBDetails(selectedKB.id)
    } catch (err) {
      console.error('Failed to add source:', err)
      alert('Failed to add source: ' + err.message)
    }
  }

  const handleDeleteSource = async (sourceId) => {
    if (!selectedKB) return
    if (!window.confirm('Remove this source and all its fetched files? This cannot be undone.')) return
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}/sources/${sourceId}`, { method: 'DELETE' })
      const data = await resp.json()
      if (data.error) {
        alert(`Failed to remove source: ${data.error}`)
        return
      }
      const sources = (selectedKB.config?.sources || []).filter(s => s.id !== sourceId)
      const filesRemoved = data.files_removed || 0
      setSelectedKB({ ...selectedKB, config: { ...selectedKB.config, sources }, files: selectedKB.files.filter(f => f.metadata?.source_id !== sourceId) })
      fetchKBs()
      fetchKBDetails(selectedKB.id)
    } catch (err) {
      console.error('Failed to remove source:', err)
      alert('Failed to remove source')
    }
  }

  const handleDropFiles = async (files) => {
    if (!files || files.length === 0 || !selectedKB) return
    setIsUploading(true)
    setIsDragOver(false)
    const sourceId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
    let uploadedCount = 0
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('source_id', sourceId)

        const resp = await fetch(`/api/knowledge/${selectedKB.id}/upload`, {
          method: 'POST',
          body: formData,
        })
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}))
          throw new Error(data.details || data.error || `Upload failed for ${file.name}`)
        }
        uploadedCount++
      }
      
      if (uploadedCount > 0) {
        const sources = selectedKB.config?.sources || []
        const newSource = {
          id: sourceId,
          type: 'files',
          name: `Dropped Files (${uploadedCount} items)`,
          config: {},
          created_at: Date.now() / 1000,
          status: 'active',
        }
        sources.push(newSource)
        await fetch(`/api/knowledge/${selectedKB.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...selectedKB.config, sources } }),
        })
      }

      fetchKBDetails(selectedKB.id)
      fetchKBs()
    } catch (err) {
      console.error('Failed to upload files:', err)
      alert('Failed to upload files: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadFilesToSource = async (sourceId, files) => {
    if (!files || files.length === 0 || !selectedKB) return
    setIsUploading(true)
    let uploadedCount = 0
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('source_id', sourceId)
        const resp = await fetch(`/api/knowledge/${selectedKB.id}/upload`, {
          method: 'POST',
          body: formData,
        })
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}))
          throw new Error(data.details || data.error || `Upload failed for ${file.name}`)
        }
        uploadedCount++
      }
      if (uploadedCount > 0) {
        const sources = selectedKB.config?.sources || []
        const source = sources.find(s => s.id === sourceId)
        if (source) {
          const currentCount = source.files_count || 0
          source.files_count = currentCount + uploadedCount
          source.last_synced = Date.now() / 1000
        }
        await fetch(`/api/knowledge/${selectedKB.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...selectedKB.config, sources } }),
        })
      }
      fetchKBDetails(selectedKB.id)
      fetchKBs()
    } catch (err) {
      console.error('Failed to upload files:', err)
      alert('Failed to upload files: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're actually leaving the container (not entering a child)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    handleDropFiles(files)
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

  const handleDeleteFileFromSource = async (fileId, sourceId) => {
    try {
      await fetch(`/api/knowledge/${selectedKB.id}/files/${fileId}`, { method: 'DELETE' })
      fetchKBDetails(selectedKB.id)
      fetchKBs()
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  const handleRenameSource = async (sourceId, newName) => {
    if (!newName.trim() || !selectedKB) return
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}/sources/${sourceId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (resp.ok) {
        const sources = (selectedKB.config?.sources || []).map(s => s.id === sourceId ? { ...s, name: newName.trim() } : s)
        setSelectedKB({ ...selectedKB, config: { ...selectedKB.config, sources } })
        fetchKBDetails(selectedKB.id)
      }
    } catch (err) {
      console.error('Failed to rename source:', err)
    }
  }

  const handleRenameFile = async (fileId, newName) => {
    if (!newName.trim() || !selectedKB) return
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}/files/${fileId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (resp.ok) {
        fetchKBDetails(selectedKB.id)
        fetchKBs()
      }
    } catch (err) {
      console.error('Failed to rename file:', err)
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

  const handleEmbedSource = async (sourceId) => {
    if (!selectedKB) return
    const sourceFiles = selectedKBFiles.filter(file => file.metadata?.source_id === sourceId)
    setIsEmbedding(true)
    setEmbedProgress({ status: 'starting', currentFile: null, filesDone: 0, totalFiles: sourceFiles.length, chunksCreated: 0 })
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}/embed?source_id=${encodeURIComponent(sourceId)}`, { method: 'POST' })
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('event: ')) {
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
      console.error('Failed to embed source:', err)
      setEmbedProgress({ status: 'error', error: err.message })
    } finally {
      setTimeout(() => {
        setIsEmbedding(false)
        setTimeout(() => setEmbedProgress(null), 2000)
      }, 1000)
    }
  }

  const handleEmbedFile = async (fileId) => {
    if (!selectedKB) return
    setIsEmbedding(true)
    setEmbedProgress({ status: 'starting', currentFile: null, filesDone: 0, totalFiles: 1, chunksCreated: 0 })
    try {
      const resp = await fetch(`/api/knowledge/${selectedKB.id}/embed?file_id=${fileId}`, { method: 'POST' })
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.file_index !== undefined) {
                setEmbedProgress(prev => ({
                  ...prev,
                  status: 'processing',
                  currentFile: data.file_name,
                  filesDone: data.file_index,
                  totalFiles: 1
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
      console.error('Failed to embed file:', err)
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

  // KB Chat functions - using proper KB-scoped sessions
  const loadKbSessions = async (kbId) => {
    try {
      const res = await fetch(`/api/sessions?knowledge_base_id=${kbId}`)
      const data = await res.json()
      setKbSessions(data.sessions || [])
    } catch (err) {
      console.error('Failed to load KB sessions:', err)
    }
  }

  const handleStartKBChat = async () => {
    if (!selectedKB) return
    setShowKBChat(true)

    // Save current session to restore later
    try {
      const sessionsResp = await fetch('/api/sessions?knowledge_base_id=__none__')
      const sessionsData = await sessionsResp.json()
      const currentSession = sessionsData.sessions?.[0]
      if (currentSession) {
        setOriginalSessionId(currentSession.id)
        originalSessionIdRef.current = currentSession.id
      }
    } catch (err) {
      console.error('Failed to get original session:', err)
    }

    // Load KB sessions
    await loadKbSessions(selectedKB.id)

    // If there are existing sessions for this KB, switch to the most recent one
    if (kbSessions.length > 0) {
      await switchToKbSession(kbSessions[0].id)
    } else {
      // Create a new KB-scoped session
      await createNewKbSession()
    }
  }

  const switchToKbSession = async (sessionId) => {
    try {
      const resp = await fetch('/api/sessions/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })
      const data = await resp.json()
      setActiveKbSessionId(sessionId)
      // Load messages from this session
      const historyResp = await fetch('/api/history')
      const historyData = await historyResp.json()
      setKBChatMessages(historyData.messages || [])
    } catch (err) {
      console.error('Failed to switch to KB session:', err)
    }
  }

  const createNewKbSession = async () => {
    if (!selectedKB) return
    try {
      const resp = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_base_id: selectedKB.id })
      })
      const data = await resp.json()
      setActiveKbSessionId(data.session_id)
      setKBChatMessages([])
      await loadKbSessions(selectedKB.id)
    } catch (err) {
      console.error('Failed to create KB session:', err)
    }
  }

  const deleteKbSession = async (sessionId) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      await loadKbSessions(selectedKB.id)
      if (sessionId === activeKbSessionId) {
        const remainingSessions = kbSessions.filter(s => s.id !== sessionId)
        if (remainingSessions.length > 0) {
          await switchToKbSession(remainingSessions[0].id)
        } else {
          await createNewKbSession()
        }
      }
    } catch (err) {
      console.error('Failed to delete KB session:', err)
    }
  }

  const handleCloseKBChat = () => {
    setShowKBChat(false)
    setKBChatInput('')
    if (kbChatAbortRef.current) {
      kbChatAbortRef.current.abort()
      kbChatAbortRef.current = null
    }
    // Restore original session
    if (originalSessionId) {
      fetch('/api/sessions/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: originalSessionId })
      }).catch(err => console.error('Failed to restore original session:', err))
      setOriginalSessionId(null)
      originalSessionIdRef.current = null
    }
    setActiveKbSessionId(null)
    if (onRefresh) onRefresh()
  }

  const handleClearKBChat = async () => {
    if (!activeKbSessionId) return
    try {
      await fetch('/api/history', { method: 'DELETE' })
      setKBChatMessages([])
    } catch (err) {
      console.error('Failed to clear KB chat:', err)
    }
  }

  const handleKBChatSubmit = async (e) => {
    e?.preventDefault()
    if (!kbChatInput.trim() || !selectedKB || isKBChatStreaming) return

    const userMessage = { id: Date.now().toString(), role: 'user', content: kbChatInput, timestamp: Date.now() / 1000 }
    setKBChatMessages(prev => [...prev, userMessage])
    setKBChatInput('')
    setIsKBChatStreaming(true)

    try {
      const chatModel = selectedKB.config?.chat_model !== 'default' ? selectedKB.config?.chat_model : undefined

      kbChatAbortRef.current = new AbortController()

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          knowledge_base_ids: [selectedKB.id],
          model: chatModel,
        }),
        signal: kbChatAbortRef.current.signal,
      })

      if (!resp.ok) {
        throw new Error('Failed to get response')
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMsgId = (Date.now() + 1).toString()
      setKBChatMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() / 1000 }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantContent += chunk
        setKBChatMessages(prev =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: assistantContent } : msg
          )
        )
      }

      // Reload from backend to get final state with proper IDs
      try {
        const historyResp = await fetch('/api/history')
        const historyData = await historyResp.json()
        if (historyData.messages?.length) {
          setKBChatMessages(historyData.messages)
        }
      } catch {}

      await loadKbSessions(selectedKB.id)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to send KB chat message:', err)
        setKBChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'error', content: 'Failed to get response. Please try again.', timestamp: Date.now() / 1000 }])
      }
    } finally {
      setIsKBChatStreaming(false)
      kbChatAbortRef.current = null
    }
  }

  const handleSaveChatToKB = async (message) => {
    if (!selectedKB || !message.content) return
    try {
      const payload = {
        name: `Chat Response - ${new Date().toLocaleString()}`,
        content: message.content,
        file_type: 'text',
        content_url: '',
      }
      await fetch(`/api/knowledge/${selectedKB.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      fetchKBDetails(selectedKB.id)
      alert('Response saved to knowledge base!')
    } catch (err) {
      console.error('Failed to save chat to KB:', err)
      alert('Failed to save response')
    }
  }

  const handleSaveEntireChatToKB = async () => {
    if (!selectedKB || kbChatMessages.length === 0) return
    try {
      // Format the entire chat as a transcript
      const transcript = kbChatMessages.map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant'
        const time = new Date(msg.timestamp * 1000).toLocaleString()
        return `[${time}] ${role}:\n${msg.content}\n`
      }).join('\n---\n\n')

      const payload = {
        name: `Chat Transcript - ${new Date().toLocaleString()}`,
        content: transcript,
        file_type: 'text',
        content_url: '',
      }
      await fetch(`/api/knowledge/${selectedKB.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      fetchKBDetails(selectedKB.id)
      alert('Entire chat saved to knowledge base!')
    } catch (err) {
      console.error('Failed to save chat transcript:', err)
      alert('Failed to save chat transcript')
    }
  }

  useEffect(() => {
    kbChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [kbChatMessages])

  const selectedType = selectedKB ? getKBTypeInfo(selectedKB.kb_type) : null

  return (
    <div className="flex h-full bg-[var(--bg)]">
      {/* Left sidebar - Premium glass design - Wider for stacked cards */}
      <div className="w-[480px] border-r border-[var(--glass-border)] flex flex-col glass-card-strong">
        {/* Header */}
        <div className="p-5 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/10
                            flex items-center justify-center text-[var(--accent-primary)]">
                <BrainIcon size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">Knowledge Bases</h2>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">RAG Context Sources</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ViewToggle mode={kbViewMode} onChange={setKbViewMode} />
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
        </div>

        {/* Knowledge Base Card Stack - Single column layout */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
            <div className={kbViewMode === 'grid' ? 'grid grid-cols-2 gap-3' : kbViewMode === 'stack' ? 'flex flex-col gap-0.5' : 'flex flex-col gap-4'}>
              {kbs.map((kb) => (
                <KnowledgeBaseCard
                  key={kb.id}
                  kb={kb}
                  active={selectedKB?.id === kb.id}
                  onClick={() => setSelectedKB(kb)}
                  onDelete={handleDeleteKB}
                  viewMode={kbViewMode}
                />
              ))}
            </div>
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
                {selectedKB.config?.kb_chat_enabled !== false && (
                  <button
                    onClick={handleStartKBChat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--accent)',
                      border: '1px solid',
                      borderColor: 'var(--accent)',
                    }}
                    title="Start chat with this knowledge base using RAG"
                  >
                    <SparklesIcon size={14} />
                    Chat with Knowledge Bases
                  </button>
                )}
                <button
                  onClick={() => { setShowGraph(false); setShowSettings(!showSettings) }}
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
                {selectedKB.kb_type === 'graphrag' && selectedKB.graph_status === 'ready' && (
                  <button
                    onClick={() => { setShowSettings(false); setShowGraph(!showGraph) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: showGraph ? 'var(--accent-subtle)' : 'var(--surface)',
                      color: showGraph ? 'var(--accent)' : 'var(--text-secondary)',
                      border: '1px solid',
                      borderColor: showGraph ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                    Graph
                  </button>
                )}
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
                  onClick={() => { setInlineAddingType(null); setInlineDraft({}); setShowAddSource(!showAddSource) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: showAddSource ? 'var(--accent)' : 'var(--surface)',
                    color: showAddSource ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: showAddSource ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  <PlusIcon size={14} />
                  Add Source
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
              <div className="border-b overflow-y-auto max-h-[50vh]" style={{ borderColor: 'var(--border)' }}>
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
                  onDeleteSource={handleDeleteSource}
                  onRefresh={() => fetchKBDetails(selectedKB.id)}
                  models={models}
                  onEmbedSource={handleEmbedSource}
                  isEmbedding={isEmbedding}
                />
              </div>
            )}

            {showGraph && selectedKB?.kb_type === 'graphrag' && (
              <div className="border-b" style={{ borderColor: 'var(--border)', height: '60vh', minHeight: 400 }}>
                <GraphViewer kbId={selectedKB.id} onClose={() => setShowGraph(false)} />
              </div>
            )}

            <div
              className={`flex-1 overflow-y-auto p-4 relative transition-all duration-300 ${
                isDragOver ? 'bg-[var(--accent-primary)]/5' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag Overlay */}
              {isDragOver && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--surface)]/90 backdrop-blur-sm rounded-xl border-2 border-dashed border-[var(--accent-primary)] m-4">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 animate-bounce"
                    style={{ background: 'var(--gradient-primary)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 4.5 4.5 0 018.774-1.41 4.5 4.5 0 014.5 4.5 4.5 4.5 0 01-1.41 8.775 4.5 4.5 0 01-8.774 1.41 4.5 4.5 0 01-1.41-8.775z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Drop files here</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Release to upload to {selectedKB.name}</p>
                </div>
              )}

              {/* Uploading Overlay */}
              {isUploading && !isDragOver && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[var(--surface)]/80 backdrop-blur-sm rounded-xl m-4">
                  <div className="w-12 h-12 rounded-full border-4 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] animate-spin mb-4" />
                  <h3 className="text-sm font-semibold text-[var(--text)]">Uploading files...</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Please wait</p>
                </div>
              )}

              {(() => {
                const sources = selectedKB.config?.sources || []
                const orphanFiles = selectedKBFiles.filter(f => !f.metadata?.source_id)
                const getSourceFiles = (sourceId) => selectedKBFiles.filter(f => f.metadata?.source_id === sourceId)
                const hasNoContent = sources.length === 0 && orphanFiles.length === 0

                const handleInlineAdd = async () => {
                  const sourceInfo = SOURCE_TYPES[inlineAddingType]
                  const sourceId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
                  let fileCount = 0
                  setIsAddingSource(true)
                  try {
                    if (inlineAddingType === 'files' && inlineDraft.files && inlineDraft.files.length > 0) {
                      fileCount = inlineDraft.files.length
                      for (const file of inlineDraft.files) {
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('source_id', sourceId)
                        const resp = await fetch(`/api/knowledge/${selectedKB.id}/upload`, { method: 'POST', body: formData })
                        if (!resp.ok) throw new Error('Upload failed')
                      }
                    }
                    const config = { ...inlineDraft }
                    delete config.files
                    const newSource = {
                      id: sourceId,
                      type: inlineAddingType,
                      name: inlineDraft.name || (inlineAddingType === 'files' && fileCount > 0 ? `Files (${fileCount} files)` : inlineDraft.repoUrl || inlineDraft.url || inlineDraft.apiEndpoint || inlineDraft.directoryPath || sourceInfo.label),
                      config,
                      created_at: Date.now() / 1000,
                      status: 'active',
                      files_count: fileCount,
                      last_synced: fileCount > 0 ? Date.now() / 1000 : undefined,
                    }
                    const existingSources = selectedKB.config?.sources || []
                    await fetch(`/api/knowledge/${selectedKB.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ config: { ...selectedKB.config, sources: [...existingSources, newSource] } }),
                    })
                    setInlineAddingType(null)
                    setInlineDraft({})
                    setShowAddSource(false)
                    fetchKBDetails(selectedKB.id)
                    fetchKBs()
                  } catch (err) {
                    console.error('Failed to add source:', err)
                    alert('Failed to add source: ' + err.message)
                  } finally {
                    setIsAddingSource(false)
                  }
                }

                return (
                  <div className="space-y-6">
                    {/* Your Sources */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' + '15', color: 'var(--accent)' }}>
                          <DatabaseIcon size={14} />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
                          Your Sources
                        </h3>
                        {sources.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--accent-subtle, #10b98120)', color: 'var(--accent)' }}>
                            {sources.length}
                          </span>
                        )}
                      </div>
                      {sources.length > 0 ? (
                        <SourcesPanel
                          kb={selectedKB}
                          kbFiles={selectedKBFiles}
                          onDeleteSource={handleDeleteSource}
                          onRefresh={() => fetchKBDetails(selectedKB.id)}
                          onEmbedSource={handleEmbedSource}
                          isEmbedding={isEmbedding}
                          onViewFile={handleViewFile}
                          onDeleteFile={handleDeleteFileFromSource}
                          onUploadFilesToSource={handleUploadFilesToSource}
                          onRenameSource={handleRenameSource}
                          onRenameFile={handleRenameFile}
                          sourceViewMode={sourceViewMode}
                          onSourceViewModeChange={setSourceViewMode}
                        />
                      ) : (
                        <div className="rounded-xl border-2 border-dashed p-6 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                          <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' + '15' }}>
                            <PlusIcon size={20} style={{ color: 'var(--accent)' }} />
                          </div>
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>No sources added yet</p>
                          <p className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>Click "Add Source" above to add content</p>
                          <button
                            onClick={() => setShowAddSource(true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                          >
                            Add Source
                          </button>
                        </div>
                      )}
                    </section>

                    {/* Add Source - only visible when toggled */}
                    {showAddSource && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: '#6366f115', color: '#6366f1' }}>
                          <PlusIcon size={14} />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
                          Add Source
                        </h3>
                      </div>

                      {inlineAddingType ? (
                        <SourceConfigForm
                          sourceType={inlineAddingType}
                          draft={inlineDraft}
                          onDraftChange={setInlineDraft}
                          onCancel={() => { setInlineAddingType(null); setInlineDraft({}) }}
                          onAdd={handleInlineAdd}
                          isAdding={isAddingSource}
                        />
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          {Object.values(SOURCE_TYPES).map(type => {
                            const alreadyAdded = sources.some(s => s.type === type.id)
                            return (
                              <button
                                key={type.id}
                                onClick={() => { setInlineAddingType(type.id); setInlineDraft(DEFAULT_SOURCE_CONFIG[type.id] || {}) }}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.03] hover:shadow-md"
                                style={{ borderColor: alreadyAdded ? type.color + '40' : 'var(--border)', backgroundColor: alreadyAdded ? type.color + '08' : 'var(--surface)' }}
                              >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: type.color + '20', color: type.color }}>
                                  {React.cloneElement(type.icon, { size: 18 })}
                                </div>
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--text)' }}>{type.label}</span>
                                <span className="text-[9px] text-center leading-tight" style={{ color: 'var(--text-tertiary)' }}>{type.description}</span>
                                {alreadyAdded && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: type.color + '20', color: type.color }}>+1</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </section>
                    )}

                    {/* Standalone Files (orphan) */}
                    {orphanFiles.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: '#6366f115', color: '#6366f1' }}>
                              <FileIcon size={14} />
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
                              Standalone Files
                            </h3>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
                              {orphanFiles.length}
                            </span>
                          </div>
                          <ViewToggle mode={sourceViewMode} onChange={setSourceViewMode} />
                        </div>
                        <div className={sourceViewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : sourceViewMode === 'stack' ? 'flex flex-col gap-0.5' : 'flex flex-col gap-2'}>
                          {orphanFiles.map((file) => (
                            <FileCard
                              key={file.id}
                              file={file}
                              onDelete={handleDeleteFile}
                              onView={handleViewFile}
                              onEmbed={handleEmbedFile}
                              isEmbedding={isEmbedding}
                              onRename={handleRenameFile}
                              viewMode={sourceViewMode}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )
              })()}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Select a knowledge base</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Choose one from the sidebar or create a new one</p>
          </div>
        )}
      </div>

      {/* KB Chat Panel */}
      {showKBChat && selectedKB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--modal-backdrop)] backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseKBChat() }}>
          <div className="w-[1000px] h-[700px] rounded-2xl flex overflow-hidden animate-modal"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--modal-shadow)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Session Sidebar */}
            <div className="w-[220px] border-r flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={createNewKbSession}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {(kbSessions || []).map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-xs transition-all ${
                      session.id === activeKbSessionId ? 'glass-card-strong border border-[var(--accent)]/30' : 'hover:bg-[var(--surface)]'
                    }`}
                    style={{ color: session.id === activeKbSessionId ? 'var(--text)' : 'var(--text-secondary)' }}
                    onClick={() => switchToKbSession(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {session.title || session.preview || 'New Chat'}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {session.message_count || 0} messages
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteKbSession(session.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition-all"
                      title="Delete session"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.194.855-2.166 2.083-2.166H8.25c-1.228 0-2.083.972-2.083 2.166v.916" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(!kbSessions || kbSessions.length === 0) && (
                  <div className="text-center py-6">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No chat sessions yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: selectedType.color + '20' }}>
                    {React.cloneElement(selectedType.icon, { style: { color: selectedType.color } })}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text)]">Chat with {selectedKB.name}</h3>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {selectedKB.config?.chat_model && selectedKB.config?.chat_model !== 'default'
                        ? `Using ${selectedKB.config.chat_model} • Temp: ${selectedKB.config.temperature || '0.7'}`
                        : 'RAG-powered conversation • Using default model'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {kbChatMessages.length > 0 && (
                    <>
                      <button
                        onClick={handleClearKBChat}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        title="Clear chat history"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.194.855-2.166 2.083-2.166H8.25c-1.228 0-2.083.972-2.083 2.166v.916" />
                        </svg>
                        Clear
                      </button>
                      <button
                        onClick={() => handleSaveEntireChatToKB()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{ background: 'var(--accent-primary)', color: '#fff' }}
                        title="Save entire chat to knowledge base"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Save Chat
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleCloseKBChat}
                    className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'var(--bg)' }}>
                {kbChatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'var(--gradient-primary)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">Start a conversation using this knowledge base</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Ask questions about your documents</p>
                  </div>
                ) : (
                  kbChatMessages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'user-bubble'
                          : msg.role === 'error'
                            ? 'bg-[var(--danger)]/10 border border-[var(--danger)]/30'
                            : 'glass-card border border-[var(--glass-border)]'
                      }`}>
                        <div className="prose prose-invert max-w-none text-[var(--text)]">
                          {msg.content || (isKBChatStreaming && idx === kbChatMessages.length - 1 ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          ) : null)}
                        </div>

                        {msg.role === 'assistant' && msg.content && !isKBChatStreaming && (
                          <div className="mt-3 pt-2 border-t border-[var(--border)]/50 flex items-center justify-between">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString() : ''}
                            </span>
                            <button
                              onClick={() => handleSaveChatToKB(msg)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:scale-105"
                              style={{ 
                                background: 'var(--surface)',
                                color: 'var(--accent)',
                                border: '1px solid var(--accent)',
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Add to Knowledge Bases
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={kbChatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <form onSubmit={handleKBChatSubmit} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={kbChatInput}
                    onChange={(e) => setKBChatInput(e.target.value)}
                    placeholder="Ask about your documents..."
                    disabled={isKBChatStreaming}
                    className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!kbChatInput.trim() || isKBChatStreaming}
                    className="p-3 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create KB Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 animate-backdrop"
          style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateModal(false); setNewKBDir({ name: '', description: '', kb_type: 'knowledge' }) } }}>
          <div className="w-[480px] rounded-xl p-5 animate-modal"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--modal-shadow)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>Create Knowledge Base</h3>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <div className="grid grid-cols-2 gap-2">
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
                onClick={() => { setShowCreateModal(false); setNewKBDir({ name: '', description: '', kb_type: 'knowledge' }) }}
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

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 animate-backdrop"
          style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}); setSourceAdded(false) } }}>
          <div className="w-[560px] max-h-[85vh] rounded-xl overflow-hidden animate-modal"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--modal-shadow)' }}>
            
            {/* Step 1: Pick Source Type */}
            {addSourceStep === 'pick' && (
              <>
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Add Source to {selectedKB?.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Choose a source type to add data</p>
                  </div>
                  <button onClick={() => { setShowAddModal(false); setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}) }}
                    className="p-1 rounded-md" style={{ color: 'var(--text-tertiary)' }}>
                    <XIcon size={16} />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 130px)' }}>

                  {/* Source types grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {Object.values(SOURCE_TYPES).map(st => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setAddSourceType(st.id)
                          setAddSourceConfig(DEFAULT_SOURCE_CONFIG[st.id] || {})
                          setAddSourceStep('config')
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: st.color + '08',
                          border: '1px solid',
                          borderColor: st.color + '30',
                        }}
                      >
                        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                          style={{ backgroundColor: st.color + '20', color: st.color }}>
                          {st.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{st.label}</div>
                          <div className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>{st.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Configure Source */}
            {addSourceStep === 'config' && addSourceType && SOURCE_TYPES[addSourceType] && (
              <>
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}) }}
                      className="p-1 rounded-md hover:bg-[var(--surface-hover)]" style={{ color: 'var(--text-tertiary)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: SOURCE_TYPES[addSourceType].color + '20', color: SOURCE_TYPES[addSourceType].color }}>
                      {SOURCE_TYPES[addSourceType].icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Add {SOURCE_TYPES[addSourceType].label} Source</h3>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{SOURCE_TYPES[addSourceType].description}</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowAddModal(false); setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}) }}
                    className="p-1 rounded-md" style={{ color: 'var(--text-tertiary)' }}>
                    <XIcon size={16} />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(85vh - 130px)' }}>
                  {SOURCE_TYPES[addSourceType].fields.map(field => (
                    <SettingRow
                      key={field.key}
                      field={field}
                      value={addSourceConfig[field.key]}
                      onChange={(val) => setAddSourceConfig({ ...addSourceConfig, [field.key]: val })}
                    />
                  ))}
                </div>

                <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => { setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}) }}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAddSource}
                    disabled={isUploading}
                    className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: SOURCE_TYPES[addSourceType].color, color: '#fff' }}
                  >
                    {isUploading ? 'Uploading...' : `Add ${SOURCE_TYPES[addSourceType].label} Source`}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {addSourceStep === 'success' && sourceAdded && (
              <>
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Source Added Successfully</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Your source has been added to {selectedKB?.name}</p>
                  </div>
                  <button onClick={() => { setShowAddModal(false); setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}); setSourceAdded(false) }}
                    className="p-1 rounded-md" style={{ color: 'var(--text-tertiary)' }}>
                    <XIcon size={16} />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: SOURCE_TYPES[sourceAdded.type]?.color + '20', color: SOURCE_TYPES[sourceAdded.type]?.color }}>
                      {SOURCE_TYPES[sourceAdded.type]?.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{sourceAdded.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{SOURCE_TYPES[sourceAdded.type]?.description}</div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                      Active
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => { setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}); setSourceAdded(false) }}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                    >
                      Add Another Source
                    </button>
                    <button
                      onClick={() => { setShowAddModal(false); setAddSourceStep('pick'); setAddSourceType(null); setAddSourceConfig({}); setSourceAdded(false) }}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: 'var(--gradient-primary)', color: '#fff' }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showViewModal && (
        <FilePreviewModal
          file={viewingFile}
          content={viewingFileContent}
          embeddingsData={embeddingsData}
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