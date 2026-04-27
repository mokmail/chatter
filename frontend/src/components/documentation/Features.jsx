import React from 'react'

const FeatureCard = ({ icon, title, description, color }) => (
  <div className="p-4 rounded-2xl transition-all duration-200 hover:translate-y-[-2px]"
    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)', boxShadow: 'var(--shadow-sm)' }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>{title}</h3>
    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
  </div>
)

const Features = () => {
  const coreFeatures = [
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, title: 'Streaming Responses', description: 'Tokens arrive in real-time with smooth animations. No waiting for complete responses.', color: 'var(--accent)' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.022 0 2.012.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>, title: 'Knowledge Bases (RAG)', description: 'Upload documents, notes, or web sources. Ask questions and get answers grounded in your data.', color: '#8b5cf6' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>, title: 'Mermaid Diagrams', description: 'Generate architecture or workflow diagrams live within the interface using mermaid syntax.', color: '#22c55e' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 3m0 0l-3 3m3-3l3 3m0 0l-3-3m3 3l3-3" /></svg>, title: 'Code Execution', description: 'Execute Python, JavaScript, and other code blocks directly in the chat with sandboxed output.', color: '#f59e0b' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v1.5a2.25 2.25 0 01-.659 1.59L5.7 10.17a2.25 2.25 0 00-.659 1.59v1.5a2.25 2.25 0 002.25 2.25h11.5a2.25 2.25 0 002.25-2.25v-1.5a2.25 2.25 0 00-.659-1.59L14.93 6.09A2.25 2.25 0 0011.75 4.5H9z" /></svg>, title: 'File Attachments', description: 'Attach documents and code snippets to messages. Drag and drop directly into the chat.', color: '#6366f1' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l-1 3m0 0l.5 1.5m-.5-1.5h-9m9 0a1.5 1.5 0 011.5 1.5m-13.5 0a1.5 1.5 0 011.5 1.5m9 0a1.5 1.5 0 011.5 1.5m-13.5 0a1.5 1.5 0 011.5 1.5" /></svg>, title: 'Thinking Block', description: 'Foldable thought processes let you inspect AI reasoning steps inline.', color: '#14b8a6' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>, title: 'Dark / Light Mode', description: 'Full dark and light theme support with persistent preference storage.', color: '#8b5cf6' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v2m0-2v2m0-2v2m0-2v2M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 015.25 16.5v-9z" /></svg>, title: 'Math & Code Rendering', description: 'KaTeX for equations, syntax-highlighted code blocks, and GFM markdown support.', color: '#22c55e' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {coreFeatures.map(f => <FeatureCard key={f.title} {...f} />)}
      </div>
    </div>
  )
}

export default Features
