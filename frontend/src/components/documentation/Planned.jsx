import React from 'react'

const PlannedCard = ({ icon, title, description, color, status }) => {
  const statusColors = { Planned: '#f59e0b', 'In Progress': '#3b82f6', Designed: '#22c55e' }
  return (
    <div className="p-4 rounded-2xl transition-all duration-200 hover:translate-y-[-2px]"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{title}</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColors[status]}20`, color: statusColors[status] }}>{status}</span>
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  )
}

const Planned = () => {
  const implementedFeatures = [
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>, title: 'Follow-Up Prompts', description: 'Auto-generated contextual follow-up questions after each response. Click to send or insert for editing. Settings for auto-generation, persistence, and insert-to-input mode.', color: 'var(--accent)', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5l9-5.25 9 5.25m-18 0l9 5.25m-9-5.25v9l9 5.25M3 7.5v9l9 5.25m0-9v9m9-5.25l-9 5.25m9-5.25l-9-5.25m9 5.25v9l-9 5.25" /></svg>, title: 'Artifacts', description: 'Interactive panel for standalone HTML, SVG, and ThreeJS/D3.js visualizations. Version tracking lets you compare iterations. Targeted updates and full rewrites via natural language.', color: '#f59e0b', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l-1 3m0 0l.5 1.5m-.5-1.5h-9m9 0a1.5 1.5 0 011.5 1.5m-13.5 0a1.5 1.5 0 011.5 1.5m9 0a1.5 1.5 0 011.5 1.5m-13.5 0a1.5 1.5 0 011.5 1.5" /></svg>, title: 'Reasoning / Thinking', description: 'Auto-detect and render reasoning tags (<thinking>, <reason>) in collapsible blocks. Supports custom tags, Ollama think mode, and OpenAI reasoning effort levels.', color: '#14b8a6', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.125A2.25 2.25 0 0115.75 20.25H5.25A2.25 2.25 0 013 18V7.5A2.25 2.25 0 015.25 5.25H9.375" /></svg>, title: 'Notes Enhancement', description: 'AI-assisted writing with enhance presets, Markdown formatting toolbar, slide-over chat drawer, pinning, and export to txt/md/pdf. Separate provider/model config for enhance.', color: '#8b5cf6', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>, title: 'History & Search', description: 'Time-grouped chat history sidebar with unread indicators and inline title editing. Global fuzzy search via Cmd+K across titles and message content. Export/import sessions as JSON.', color: '#6366f1', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>, title: 'KB Chat Isolation', description: 'Conversations initiated within a Knowledge Base are strictly isolated to that KB. They do not appear in main chat history or leak to other KBs.', color: '#10b981', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>, title: 'GraphRAG', description: 'Graph-based RAG with entity/relationship extraction, community detection (Louvain), and community summarization. Local, global, hybrid, path, and neighborhood search modes. Optional Neo4j persistence. Interactive D3.js graph viewer.', color: '#f97316', status: 'Implemented' },
  ]

  const plannedFeatures = [
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.666 8h-1.583M11.25 7.5h1.084a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75A2.25 2.25 0 004.5 16.5v-6A2.25 2.25 0 016.75 8H6M13.666 8l2.376 13.672M12 8V6" /></svg>, title: 'Agentic Search', description: 'Model can autonomously search your chat history using built-in tools (search_chats, view_chat). Ask natural questions and the model finds the relevant conversation.', color: '#ec4899', status: 'Planned' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="p-4 rounded-2xl" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
        <p className="text-sm">Features marked <strong>Implemented</strong> are live. <strong>Planned</strong> features are in design or awaiting implementation. See <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface)' }}>docs/PLAN-*.md</code> and <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface)' }}>SPEC.md</code> for full specifications.</p>
      </div>

      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <div className="w-1 h-4 rounded-full" style={{ background: '#22c55e' }} />
        Implemented
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {implementedFeatures.map(f => <PlannedCard key={f.title} {...f} />)}
      </div>

      <h3 className="text-sm font-semibold flex items-center gap-2 mt-4" style={{ color: 'var(--text)' }}>
        <div className="w-1 h-4 rounded-full" style={{ background: '#f59e0b' }} />
        Planned
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plannedFeatures.map(f => <PlannedCard key={f.title} {...f} />)}
      </div>
    </div>
  )
}

export default Planned
