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
    { method: 'POST', path: '/api/chat', desc: 'Stream chat response (SSE, text/plain)' },
    { method: 'POST', path: '/api/chat/agent', desc: 'Agentic chat with tool calling (SSE)' },
  ]
  const messageEndpoints = [
    { method: 'GET', path: '/api/messages/{msg_id}', desc: 'Get specific message by ID' },
    { method: 'POST', path: '/api/messages/{msg_id}/edit', desc: 'Edit message, truncate history after it' },
    { method: 'DELETE', path: '/api/messages/{msg_id}', desc: 'Delete a message' },
    { method: 'POST', path: '/api/messages/{msg_id}/evaluate', desc: 'Rate a message (good/bad)' },
    { method: 'POST', path: '/api/messages/{msg_id}/branch', desc: 'Branch session from this message' },
    { method: 'POST', path: '/api/messages/{msg_id}/fork', desc: 'Fork session from this message' },
    { method: 'POST', path: '/api/messages/continue', desc: 'Get last message for continuation' },
    { method: 'POST', path: '/api/messages/regenerate', desc: 'Remove last assistant for regeneration' },
  ]
  const historyEndpoints = [
    { method: 'GET', path: '/api/history', desc: 'Get chat history and session KBs' },
    { method: 'DELETE', path: '/api/history', desc: 'Clear chat history (preserves KB scope)' },
    { method: 'GET', path: '/api/sessions', desc: 'List all sessions, filterable by knowledge_base_id' },
    { method: 'POST', path: '/api/sessions/switch', desc: 'Switch to an existing session' },
    { method: 'POST', path: '/api/sessions/create', desc: 'Create new session, optionally KB-scoped' },
    { method: 'PATCH', path: '/api/sessions/{session_id}', desc: 'Update session metadata (title, tags, archive)' },
    { method: 'POST', path: '/api/sessions/{session_id}/read', desc: 'Mark session as read' },
    { method: 'GET', path: '/api/sessions/{session_id}/export', desc: 'Export session as JSON' },
    { method: 'POST', path: '/api/sessions/import', desc: 'Import session from JSON' },
    { method: 'DELETE', path: '/api/sessions/{session_id}', desc: 'Delete a session' },
    { method: 'POST', path: '/api/sessions/archive-all', desc: 'Archive all sessions' },
    { method: 'DELETE', path: '/api/sessions', desc: 'Delete all sessions' },
    { method: 'GET', path: '/api/search', desc: 'Fuzzy search across sessions and messages' },
    { method: 'GET', path: '/api/search/all', desc: 'Unified search across chats, notes, and KBs' },
  ]
  const kbEndpoints = [
    { method: 'GET', path: '/api/knowledge', desc: 'List all knowledge bases' },
    { method: 'POST', path: '/api/knowledge', desc: 'Create a new knowledge base' },
    { method: 'PUT', path: '/api/knowledge/{kb_id}', desc: 'Update KB name or config' },
    { method: 'DELETE', path: '/api/knowledge/{kb_id}', desc: 'Delete a knowledge base' },
    { method: 'POST', path: '/api/knowledge/{kb_id}/upload', desc: 'Upload and process a file to KB' },
    { method: 'POST', path: '/api/knowledge/{kb_id}/embed', desc: 'Trigger embedding for KB files' },
    { method: 'POST', path: '/api/knowledge/{kb_id}/scrape', desc: 'Scrape URL and add content to KB' },
    { method: 'DELETE', path: '/api/knowledge/{kb_id}/files/{file_id}', desc: 'Remove a file from KB' },
    { method: 'PATCH', path: '/api/knowledge/{kb_id}/files/{file_id}/rename', desc: 'Rename a file in KB' },
    { method: 'GET', path: '/api/knowledge/{kb_id}/files/{file_id}', desc: 'Get file content' },
    { method: 'PATCH', path: '/api/knowledge/{kb_id}/sources/{source_id}/rename', desc: 'Rename a source in KB' },
    { method: 'POST', path: '/api/knowledge/{kb_id}/build-graph', desc: 'Build/rebuild GraphRAG graph (full or incremental)' },
    { method: 'GET', path: '/api/knowledge/{kb_id}/graph', desc: 'Get graph data (nodes, edges, communities)' },
    { method: 'GET', path: '/api/knowledge/{kb_id}/graph-progress', desc: 'Poll graph build progress' },
    { method: 'GET', path: '/api/knowledge/{kb_id}/graph-status', desc: 'Get graph build status' },
  ]
  const notesEndpoints = [
    { method: 'GET', path: '/api/notes', desc: 'List all notes' },
    { method: 'POST', path: '/api/notes', desc: 'Create a new note' },
    { method: 'PUT', path: '/api/notes/{id}', desc: 'Update a note' },
    { method: 'DELETE', path: '/api/notes/{id}', desc: 'Delete a note' },
    { method: 'POST', path: '/api/notes/enhance', desc: 'AI rewrite selected text (SSE)' },
    { method: 'GET', path: '/api/notes/export/{id}', desc: 'Export note as txt or md' },
    { method: 'GET', path: '/api/notes/enhance-config', desc: 'Get enhance model/provider settings' },
    { method: 'PUT', path: '/api/notes/enhance-config', desc: 'Update enhance model/provider settings' },
  ]
  const followupEndpoints = [
    { method: 'POST', path: '/api/followups/generate', desc: 'Generate follow-up prompts for a message' },
    { method: 'POST', path: '/api/followups/regenerate', desc: 'Regenerate follow-up prompts' },
  ]
  const artifactEndpoints = [
    { method: 'GET', path: '/api/artifacts/current', desc: 'Get current artifact for session' },
    { method: 'GET', path: '/api/artifacts/{id}', desc: 'Get specific artifact by ID' },
    { method: 'POST', path: '/api/artifacts', desc: 'Create new artifact from model rewrite' },
    { method: 'PUT', path: '/api/artifacts/{id}', desc: 'Update artifact content (creates new version)' },
    { method: 'GET', path: '/api/artifacts/{id}/version-history', desc: 'Get all versions of an artifact' },
    { method: 'POST', path: '/api/artifacts/detect', desc: 'Analyze message content for artifacts' },
  ]
  const toolsEndpoints = [
    { method: 'GET', path: '/api/tools', desc: 'Expose agentic tools for function calling' },
  ]
  const execEndpoints = [
    { method: 'POST', path: '/api/execute', desc: 'Execute code in sandboxed session' },
    { method: 'POST', path: '/api/execute/session', desc: 'Create code execution session' },
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
  "notes": ["Answer in bullet points"],
  "parent_id": "...",
  "regenerate": false,
  "no_history": false
}

Response: text/plain SSE stream

---

POST /api/chat/agent

{
  "message": "Search the web for AI news",
  "model": "llama3.2:latest",
  "provider_id": "ollama",
  "enable_notes_tools": true,
  "enable_web_search": true
}`}
        </pre>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Chat & Config</h3>
        <div className="space-y-1.5 mb-4">{chatEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Messages — Tree Operations</h3>
        <div className="space-y-1.5 mb-4">{messageEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
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
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Notes</h3>
        <div className="space-y-1.5 mb-4">{notesEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Follow-Up Prompts</h3>
        <div className="space-y-1.5 mb-4">{followupEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Artifacts</h3>
        <div className="space-y-1.5 mb-4">{artifactEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Code Execution</h3>
        <div className="space-y-1.5 mb-4">{execEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Agentic Tools</h3>
        <div className="space-y-1.5">{toolsEndpoints.map(e => <ApiRow key={`${e.method}-${e.path}`} {...e} />)}</div>
      </div>
    </div>
  )
}

export default Api
