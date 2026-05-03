import React from 'react'
import { MermaidDiagram } from './MermaidDiagram'

const Architecture = () => {
  const systemFlowchart = `
graph TB
    subgraph Browser["Browser (React + Vite)"]
        UI["UI Components"]
        State["useChat Hook"]
        Notes["useNotes Hook"]
        Theme["useTheme Hook"]
    end
    subgraph Backend["FastAPI Backend"]
        Routes["API Routes"]
        ChatSvc["chat.py - Multi-Provider"]
        RAG["vectorstore.py + graphrag_engine.py"]
        Tools["source_processor.py + web_search.py"]
        Exec["code_executor.py"]
    end
    subgraph Providers["AI Providers"]
        Ollama["Ollama Local"]
        OpenAI["OpenAI-Compatible"]
        Anthropic["Anthropic"]
    end
    UI --> State --> Routes --> ChatSvc --> Providers
    UI --> Notes --> Routes --> Tools
    Routes --> RAG --> ChatSvc
    Routes --> Exec
  `

  const chatFlowchart = `
sequenceDiagram
    participant U as User
    participant R as React Frontend
    participant B as FastAPI Backend
    participant L as AI Provider
    U->>R: Type & send message
    R->>B: POST /api/chat {message, knowledge_base_ids}
    B->>B: Inject KB context (classic or GraphRAG)
    B->>L: Stream request
    L-->>B: SSE token stream
    B-->>R: Pass-through stream
    R->>R: Incremental render + reasoning detection
    R-->>U: Live response
  `

  const agenticFlowchart = `
graph TB
    A[User Message] --> B{Agent Mode?}
    B -->|Yes| C[POST /api/chat/agent]
    C --> D{Tool Call Detected?}
    D -->|Yes| E[search_web / fetch_url / notes CRUD]
    E --> F[Append tool results to context]
    F --> G[Continue LLM stream]
    D -->|No| G
    G --> H[Full response to user]
    B -->|No| I[POST /api/chat]
    I --> H
  `

  const dataFlowchart = `
graph LR
    A["Notes / Docs / Web / API / Git"] --> B["Knowledge Base"]
    B --> C[source_processor.py]
    C --> D["Embed + Store"]
    D --> E1["ChromaDB (default)"]
    D --> E2["Qdrant (optional)"]
    E1 --> F[BM25 Hybrid + CrossEncoder Rerank]
    E2 --> F
    F --> G["Retrieve on Query"]
    G --> H[LLM Context]
    H --> I[Response]
  `

  const graphragFlowchart = `
graph TB
    A[Documents / Notes / Web] --> B[Chunk & Batch Extract Entities]
    B --> C[Build Graph networkx]
    C --> D[Fuzzy Entity Resolution]
    D --> E[Community Detection louvain]
    E --> F[Summarize Communities LLM]
    F --> G[Embed Community Summaries]
    G --> H[Persist graph.json + index.json]
    H --> I{Query Mode}
    I -->|local| J[Entity BFS Traversal]
    I -->|global| K[Rank by Embedding Similarity]
    I -->|hybrid| L[Vector + Graph BFS]
    I -->|path| M[Shortest Path]
    I -->|neighborhood| N[Direct Neighbors]
    J --> O[Retrieve + LLM Response]
    K --> O
    L --> O
    M --> O
    N --> O
  `

  const artifactsFlowchart = `
graph LR
    A[LLM Output] --> B{Detect HTML/SVG/ThreeJS/D3?}
    B -->|Yes| C[Artifacts Panel]
    B -->|No| D[Normal Chat Render]
    C --> E[Version v1, v2, v3...]
    E --> F[User: Update/Rewrite]
    F --> G[New Version Created]
  `

  const notesFlowchart = `
graph TB
    A[Notes Editor] --> B[Formatting Toolbar]
    A --> C[AI Enhance]
    A --> D[Chat Drawer]
    A --> E[Pin / Export txt/md/pdf]
    A --> F[12 Note Types]
    C --> G[LLM Rewrite SSE]
    D --> H[Ephemeral Mini Chat]
    E --> I[txt/md via backend + pdf via html2pdf.js]
  `

  const providerFlowchart = `
graph TB
    User[User] --> Config[Settings]
    Config --> ProviderReg[Provider Registry]
    ProviderReg --> Ollama[Ollama Provider]
    ProviderReg --> OpenAI[OpenAI-Compatible]
    ProviderReg --> Anthropic[Anthropic Provider]
    ProviderReg --> ActiveModel[Active Model Selection]
    ActiveModel --> Embeddings[ProviderEmbeddings]
    Embeddings --> OllamaEmb[OllamaEmbeddings]
    Embeddings --> OpenAIEmb[OpenAIEmbeddings]
  `

  const services = [
    {
      name: 'CIO Intelligence Hub',
      url: window.location.origin,
      desc: 'This application — chat, knowledge bases, notes, and settings.',
      color: 'var(--accent)',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    },
    {
      name: 'Backend API Docs',
      url: `${window.location.protocol}//${window.location.hostname}:8000/docs`,
      desc: 'FastAPI Swagger UI — explore all REST endpoints interactively.',
      color: '#22c55e',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
    },
    {
      name: 'Neo4j Browser',
      url: `${window.location.protocol}//${window.location.hostname}:7474`,
      desc: 'Graph database admin — query, visualize, and manage graph data.',
      color: '#f97316',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M12 1v4m0 14v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M1 12h4m14 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" /></svg>,
    },
    {
      name: 'Qdrant Dashboard',
      url: `${window.location.protocol}//${window.location.hostname}:6333/dashboard`,
      desc: 'Vector database admin — inspect collections, points, and search.',
      color: '#dc2626',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    },
    {
      name: 'CIO Agent',
      url: `${window.location.protocol}//${window.location.hostname}:8001`,
      desc: 'AI code analysis service (optional, when enabled via docker-compose override).',
      color: '#8b5cf6',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          Service Links & Admin Dashboards
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Quick access to the admin dashboards of all Docker containers in the stack. Links open in a new tab.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
              className="p-4 rounded-xl transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg no-underline"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30`, color: s.color }}>
                  {s.icon}
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.name}</div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{s.desc}</p>
              <div className="text-xs font-mono mt-2 truncate" style={{ color: s.color }}>{s.url.replace(/^https?:\/\//, '')}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          System Architecture
        </h3>
        <MermaidDiagram chart={systemFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          Chat Request Flow
        </h3>
        <MermaidDiagram chart={chatFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: '#ec4899' }} />
          Agentic Chat Flow
        </h3>
        <MermaidDiagram chart={agenticFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          Classic RAG Data Flow
        </h3>
        <MermaidDiagram chart={dataFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
          GraphRAG Pipeline
        </h3>
        <MermaidDiagram chart={graphragFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: '#ec4899' }} />
          Artifacts Flow
        </h3>
        <MermaidDiagram chart={artifactsFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: '#f59e0b' }} />
          Notes Enhancement Flow
        </h3>
        <MermaidDiagram chart={notesFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: '#6366f1' }} />
          Multi-Provider Architecture
        </h3>
        <MermaidDiagram chart={providerFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          Project Structure
        </h3>
        <pre className="text-xs leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)', fontFamily: "'Fira Code', monospace" }}>
{`cio-intelligence-hub/
├── backend/
│   ├── main.py                  FastAPI app + all routes
│   ├── config.py                Multi-provider config management
│   ├── chat.py                  Multi-provider streaming (Ollama/OpenAI/Anthropic)
│   ├── history.py               Session + message persistence with branching
│   ├── knowledge.py             Knowledge base CRUD
│   ├── vectorstore.py           Vector store facade / classic RAG + hybrid + rerank
│   ├── vector_stores/           Pluggable vector store backends
│   │   ├── base.py              VectorStoreBase ABC
│   │   ├── registry.py          Backend registry (register, get, list)
│   │   ├── chroma_adapter.py    ChromaDB adapter (default)
│   │   └── qdrant_adapter.py    Qdrant adapter (optional)
│   ├── graphrag_engine.py       GraphRAG extraction, build, retrieval, incremental updates
│   ├── graphrag_neo4j.py        Legacy Neo4j raw-Cypher adapter
│   ├── graphrag_neo4j_official.py Official neo4j-graphrag backend
│   ├── reasoning.py             Thinking tag parsing and serialization
│   ├── followups.py             Follow-up prompt generation logic
│   ├── artifacts.py             Artifact detection, storage, versioning
│   ├── notes.py                 Notes storage and management + note tools
│   ├── code_executor.py         Sandboxed Python execution with matplotlib
│   ├── web_search.py            Web search (DuckDuckGo/SerpAPI/SearXNG) + URL fetch
│   ├── loaders.py               Document loaders (PDF, DOCX, MD, TXT)
│   ├── source_processor.py      Advanced source processing (URL crawl, git clone, API, directory, services)
│   ├── code_analyzer.py         CIO Agent code analysis engine
│   ├── adapters/
│   │   └── cio_agent_adapter.py CIO Agent API adapter
│   ├── providers/
│   │   ├── ollama.py            Ollama streaming + think param
│   │   ├── openai.py            OpenAI-compatible streaming
│   │   └── anthropic.py         Anthropic streaming + system prompt handling
│   ├── tests/
│   │   ├── test_reasoning.py
│   │   └── test_graphrag.py
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.jsx              Main layout + page routing (Search, Chat, Knowledge, Notes, Docs, Settings)
        ├── index.css            CSS variables, themes, animations
        ├── components/
        │   ├── ChatInput.jsx       Rich input + KB selection + agent toggles
        │   ├── ChatMessage.jsx      Markdown + streaming + code + reasoning + actions
        │   ├── Header.jsx           Model switcher + theme
        │   ├── Sidebar.jsx          Page nav + session history
        │   ├── KnowledgeBase.jsx    RAG + GraphRAG management + graph viewer
        │   ├── Notes.jsx            Rich editor + enhance + chat drawer
        │   ├── ArtifactsPanel.jsx   Artifact preview + versions
        │   ├── SearchModal.jsx      Global chat search (Cmd+K)
        │   ├── SearchPage.jsx       Unified search (chats, notes, KBs)
        │   ├── SettingsPage.jsx     Provider config + feature toggles + CIO Agent
        │   ├── CodeExecution.jsx    Code run button + output display
        │   ├── ShareModal.jsx       Session/message sharing
        │   ├── documentation/       This docs section
        │   ├── chat/                ThinkingBlock, StreamingCursor, MermaidDiagram, CodeBlock
        │   ├── common/              Icons, DropdownPanel, MoreMenu, etc.
        │   └── knowledge/           KBConfig.jsx
        └── hooks/
            ├── useChat.js       API + state management
            ├── useNotes.js      Notes state management
            └── useTheme.jsx     ThemeProvider`}
        </pre>
      </div>
    </div>
  )
}

export default Architecture
