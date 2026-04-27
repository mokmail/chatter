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
  const plannedFeatures = [
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>, title: 'Follow-Up Prompts', description: 'Auto-generated contextual follow-up questions after each response. Click to send or insert for editing. Settings for auto-generation, persistence, and insert-to-input mode.', color: 'var(--accent)', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>, title: 'History & Search', description: 'Time-grouped chat history sidebar with unread indicators and inline title editing. Global fuzzy search via Cmd+K across titles and message content.', color: '#8b5cf6', status: 'Planned' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.666 8h-1.583M11.25 7.5h1.084a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75A2.25 2.25 0 004.5 16.5v-6A2.25 2.25 0 016.75 8H6M13.666 8l2.376 13.672M12 8V6" /></svg>, title: 'Agentic Search', description: 'Model can autonomously search your chat history using built-in tools (search_chats, view_chat). Ask natural questions and the model finds the relevant conversation.', color: '#ec4899', status: 'Planned' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L9 4.5l6 3-6 3v6l-6-3 6-3v3l-6 3zm0 0l6 3m-6-3l6-3m-6 3l6 3m-6-3l6-3" /></svg>, title: 'Artifacts', description: 'Interactive panel for standalone HTML, SVG, and ThreeJS/D3.js visualizations. Version tracking lets you compare iterations. Targeted updates and full rewrites via natural language.', color: '#f59e0b', status: 'Implemented' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>, title: 'Export / Import', description: 'Export individual chats or entire history as JSON. Drag-and-drop JSON import to restore sessions. Download chats as Markdown.', color: '#6366f1', status: 'Planned' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="p-4 rounded-2xl" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
        <p className="text-sm">These features are designed and ready for implementation. See <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface)' }}>docs/PLAN-*.md</code> for full specifications.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plannedFeatures.map(f => <PlannedCard key={f.title} {...f} />)}
      </div>
    </div>
  )
}

export default Planned
