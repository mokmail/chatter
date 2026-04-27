import React from 'react'

const ApiRow = ({ method, path, desc }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 hover:translate-x-1"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 uppercase tracking-wider"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: method === 'GET' ? '#22c55e' : method === 'POST' ? 'var(--accent)' : method === 'DELETE' ? '#ef4444' : '#eab308' }}>
      {method}
    </span>
    <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text)' }}>{path}</span>
    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{desc}</span>
  </div>
)

const Api = () => {
  const chatEndpoints = [
    { method: 'GET', path: '/api/config', desc: 'Get current config with masked API keys' },
    { method: 'POST', path: '/api/config', desc: 'Update config, providers, active model' },
    { method: 'GET', path: '/api/models', desc: 'List available models per provider' },
    { method: 'POST', path: '/api/chat', desc: 'Stream chat response (SSE)' },
  ]
  const historyEndpoints = [
    { method: 'GET', path: '/api/history', desc: 'Get all chat messages' },
    { method: 'DELETE', path: '/api/history', desc: 'Clear all chat history' },
    { method: 'GET', path: '/api/sessions', desc: 'List all sessions' },
    { method: 'PUT', path: '/api/sessions/:id', desc: 'Update session (title, archive)' },
    { method: 'DELETE', path: '/api/sessions/:id', desc: 'Delete a session' },
  ]
  const kbEndpoints = [
    { method: 'GET', path: '/api/knowledge', desc: 'List all knowledge bases' },
    { method: 'POST', path: '/api/knowledge', desc: 'Create a new knowledge base' },
    { method: 'PUT', path: '/api/knowledge/:id', desc: 'Update KB name or config' },
    { method: 'DELETE', path: '/api/knowledge/:id', desc: 'Delete a knowledge base' },
    { method: 'POST', path: '/api/knowledge/:id/upload', desc: 'Upload + process file to KB' },
    { method: 'POST', path: '/api/knowledge/:id/embed', desc: 'Generate embeddings' },
    { method: 'POST', path: '/api/knowledge/:id/scrape', desc: 'Scrape URL and add to KB' },
  ]
  const plannedEndpoints = [
    { method: 'GET', path: '/api/search', desc: 'Fuzzy search sessions + messages' },
    { method: 'POST', path: '/api/followups/generate', desc: 'Generate follow-up prompts (planned)' },
    { method: 'POST', path: '/api/artifacts/detect', desc: 'Detect artifact in message (planned)' },
    { method: 'GET', path: '/api/tools', desc: 'Expose agentic search tools (planned)' },
    { method: 'GET', path: '/api/sessions/:id/export', desc: 'Export session JSON (planned)' },
    { method: 'POST', path: '/api/sessions/import', desc: 'Import session JSON (planned)' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          Chat Request Format
        </h3>
        <pre className="text-xs p-4 rounded-xl overflow-x-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: "'Fira Code', monospace" }}>
{`POST /api/chat
Content-Type: application/json

{
  "message": "What is RAG?",
  "model": "llama3.2:latest",
  "provider_id": "ollama",
  "knowledge_base_ids": ["kb-id-1"],
  "notes": ["Answer in bullet points"]
}

Response: text/plain SSE stream`}
        </pre>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Chat & Config</h3>
        <div className="space-y-1.5 mb-4">{chatEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>History & Sessions</h3>
        <div className="space-y-1.5 mb-4">{historyEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Knowledge Bases</h3>
        <div className="space-y-1.5 mb-4">{kbEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          Planned
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>NEW</span>
        </h3>
        <div className="space-y-1.5">{plannedEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>
    </div>
  )
}

export default Api
