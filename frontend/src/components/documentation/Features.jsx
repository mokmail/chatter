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

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
    <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
    {children}
  </h3>
)

const Features = () => {
  const coreFeatures = [
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, title: 'Streaming Responses', description: 'Tokens arrive in real-time with smooth animations. Multi-provider streaming via Server-Sent Events.', color: 'var(--accent)' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.022 0 2.012.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>, title: 'Knowledge Bases (RAG)', description: 'Upload documents, notes, or web sources. Pluggable vector stores (ChromaDB or Qdrant) with hybrid search + CrossEncoder reranking.', color: '#8b5cf6' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>, title: 'GraphRAG', description: 'Graph-based retrieval with entity/relationship extraction, community detection (Louvain), and community LLM summarization. 5 search modes + optional Neo4j persistence.', color: '#f97316' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>, title: 'Agentic Chat', description: 'Models can autonomously use tools: search the web, fetch URLs, and manage notes (CRUD via function calling).', color: '#ec4899' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 3m0 0l-3 3m3-3l3 3m0 0l-3-3m3 3l3-3" /></svg>, title: 'Code Execution', description: 'Execute Python code in a sandboxed subprocess with matplotlib figure auto-capture and session-based state.', color: '#f59e0b' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l-1 3m0 0l.5 1.5m-.5-1.5h-9m9 0a1.5 1.5 0 011.5 1.5m-13.5 0a1.5 1.5 0 011.5 1.5m9 0a1.5 1.5 0 011.5 1.5m-13.5 0a1.5 1.5 0 011.5 1.5" /></svg>, title: 'Thinking / Reasoning', description: 'Auto-detect reasoning tags (<thinking>, <reason>) and render them in collapsible blocks. Supports custom tags and Ollama think mode.', color: '#14b8a6' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>, title: 'Unified Search', description: 'Global Cmd+K search across chats, notes, and knowledge bases with relevance scoring and snippets.', color: '#6366f1' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v2m0-2v2m0-2v2m0-2v2M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 015.25 16.5v-9z" /></svg>, title: 'Math & Code Rendering', description: 'KaTeX for equations, syntax-highlighted code blocks, and GFM markdown support.', color: '#22c55e' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>, title: 'Follow-Up Prompts', description: 'Auto-generated contextual questions after each AI response. Click to send or insert for editing.', color: 'var(--accent)' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>, title: 'Artifacts', description: 'Detect and render standalone HTML, SVG, ThreeJS, and D3.js in a dedicated panel with version tracking.', color: '#ec4899' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>, title: 'History & Search', description: 'Time-grouped chat history sidebar with unread indicators and inline title editing. Export/import sessions as JSON.', color: '#6366f1' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.125A2.25 2.25 0 0115.75 20.25H5.25A2.25 2.25 0 013 18V7.5A2.25 2.25 0 015.25 5.25H9.375" /></svg>, title: 'Notes Enhancement', description: '12 note types, AI-assisted writing with formatting toolbar, slide-over chat drawer, pinning, and export.', color: '#f59e0b' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>, title: 'KB Chat Isolation', description: 'Conversations within a Knowledge Base are strictly isolated. They do not appear in main chat history or leak to other KBs.', color: '#10b981' },
    { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.666 8h-1.583M11.25 7.5h1.084a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75A2.25 2.25 0 004.5 16.5v-6A2.25 2.25 0 016.75 8H6M13.666 8l2.376 13.672M12 8V6" /></svg>, title: 'Message Tree', description: 'Edit, branch, fork, continue, regenerate, evaluate, and delete individual messages. Full conversation tree support.', color: '#8b5cf6' },
  ]

  const kbTypes = [
    { name: 'Notes', color: '#8b5cf6', desc: 'Personal notes and text snippets. Chunked with configurable size and overlap.' },
    { name: 'Documents', color: '#6366f1', desc: 'PDF, DOC, TXT files. Text extracted, chunked, and embedded for retrieval.' },
    { name: 'Web Search', color: '#10b981', desc: 'URL sources with depth-limited crawling, robots.txt respect, and HTML deduplication.' },
    { name: 'API Sources', color: '#f59e0b', desc: 'External API data integration with auth (bearer, api-key, basic), headers, and query params.' },
    { name: 'Vector DB', color: '#ec4899', desc: 'Connect to ChromaDB or Qdrant collections with per-KB backend selection.' },
    { name: 'GraphRAG', color: '#f97316', desc: 'Graph-based RAG with entity extraction, relationship mapping, and community summaries. 5 search modes + optional Neo4j.' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionTitle>Core Features</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {coreFeatures.map(f => <FeatureCard key={f.title} {...f} />)}
      </div>

      <SectionTitle>Knowledge Base Types</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {kbTypes.map(t => (
          <div key={t.name} className="p-4 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t.name}</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.desc}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Source Processor Types</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { name: 'URL Crawling', color: '#10b981', desc: 'Fetch web pages with configurable depth, exclude patterns, content deduplication, and same-domain link following.' },
          { name: 'Git Repository', color: '#6366f1', desc: 'Clone git repos with branch/depth selection, file pattern filtering, and code structure parsing.' },
          { name: 'REST API', color: '#f59e0b', desc: 'Fetch from REST APIs with configurable auth, headers, query params, and response transformation.' },
          { name: 'Local Directory', color: '#8b5cf6', desc: 'Scan local directories recursively with include/exclude file patterns and deduplication.' },
          { name: 'Notion', color: '#ec4899', desc: 'Fetch Notion pages via API with workspace filtering and rich text extraction.' },
          { name: 'GitHub / GitLab', color: '#22c55e', desc: 'Fetch repository READMEs and project content via API with access token support.' },
        ].map(t => (
          <div key={t.name} className="p-4 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t.name}</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Features
