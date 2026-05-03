import React from 'react'

const Overview = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{ background: 'var(--bg-secondary)', border: '2px solid var(--accent)', boxShadow: 'var(--shadow-md)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9" style={{ color: 'var(--accent)' }}>
          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.382.75.75 0 00-.658.447l-1.892 4.52a.75.75 0 01-1.396 0l-1.892-4.52a.75.75 0 00-.658-.447 48.902 48.902 0 01-3.476-.382c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h8.25a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text)' }}>CIO Intelligence Hub</h1>
      <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
        Self-hosted AI chat interface with Ollama and OpenAI-compatible API support. Features Knowledge Bases (classic RAG + GraphRAG), reasoning model support, artifacts, follow-up prompts, notes enhancement, and global chat history search.
      </p>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Providers', value: 'Multi', icon: '🧠', color: 'var(--accent)' },
        { label: 'KB Types', value: '6', icon: '📚', color: '#8b5cf6' },
        { label: 'RAG Modes', value: '2', icon: '🔍', color: '#f97316' },
        { label: 'Sessions', value: 'Multi', icon: '💬', color: '#22c55e' },
      ].map(stat => (
        <div key={stat.label} className="text-center p-4 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
          <div className="text-2xl mb-1">{stat.icon}</div>
          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{stat.value}</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</div>
        </div>
      ))}
    </div>

    <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
        Quick Start
      </h3>
      <div className="space-y-2">
        {[
          { step: '1', text: 'Configure your AI provider in Settings (Ollama, OpenAI, or compatible)' },
          { step: '2', text: 'Select a model from the header dropdown' },
          { step: '3', text: 'Start chatting — responses stream in real-time with reasoning blocks' },
          { step: '4', text: 'Build Knowledge Bases from notes, documents, web, or API sources' },
          { step: '5', text: 'Switch a KB to GraphRAG mode for entity-based graph retrieval' },
          { step: '6', text: 'Use Cmd+K to search your entire chat history' },
        ].map(s => (
          <div key={s.step} className="flex items-center gap-3">
            <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>{s.step}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
        Key Capabilities
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { title: 'Multi-Provider', desc: 'Ollama, OpenAI-compatible, and Anthropic APIs' },
          { title: 'Classic + GraphRAG', desc: 'Vectorstore RAG or graph-based entity retrieval' },
          { title: 'Streaming', desc: 'Real-time token-by-token responses' },
          { title: 'Reasoning Models', desc: 'Collapsible thinking blocks with custom tags' },
          { title: 'Code Execution', desc: 'Run Python and JavaScript in-chat' },
          { title: 'Artifacts', desc: 'HTML, SVG, ThreeJS, D3.js with versioning' },
          { title: 'Math & Diagrams', desc: 'KaTeX, Mermaid, and syntax highlighting' },
          { title: 'Notes Enhancement', desc: 'AI rewrite, chat drawer, export, pinning' },
          { title: 'History Search', desc: 'Cmd+K fuzzy search across all chats' },
          { title: 'Follow-Up Prompts', desc: 'Auto-generated contextual questions' },
          { title: 'KB Chat Isolation', desc: 'KB-scoped conversations never leak' },
          { title: 'CIO Agent', desc: 'AI code analysis with 10+ rule categories' },
          { title: 'Dark / Light Mode', desc: 'Full theme support with persistence' },
        ].map(cap => (
          <div key={cap.title} className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{cap.title}</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{cap.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default Overview
