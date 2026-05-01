import React from 'react'
import { MermaidDiagram } from './MermaidDiagram'

const Architecture = () => {
  const systemFlowchart = `
graph TB
    subgraph Browser["Browser (React + Vite)"]
        UI["UI Components"]
        State["useChat Hook"]
    end
    subgraph Backend["FastAPI Backend"]
        Routes["API Routes"]
        Services["Services"]
    end
    subgraph Providers["AI Providers"]
        Ollama["Ollama Local"]
        OpenAI["OpenAI-Compatible"]
        Anthropic["Anthropic"]
    end
    UI --> State --> Routes --> Services
    Services --> Ollama
    Services --> OpenAI
    Services --> Anthropic
  `

  const chatFlowchart = `
sequenceDiagram
    participant U as User
    participant R as React Frontend
    participant B as FastAPI Backend
    participant L as AI Provider
    U->>R: Type & send message
    R->>B: POST /api/chat {message, knowledge_base_ids}
    B->>B: Inject KB context
    B->>L: Stream request
    L-->>B: SSE token stream
    B-->>R: Pass-through stream
    R->>R: Incremental render
    R-->>U: Live response
  `

  const dataFlowchart = `
graph LR
    A["Notes / Docs / Web / API"] --> B["Knowledge Base"]
    B --> C["Embed + Store"]
    C --> D["Vector DB (Chroma)"]
    D --> E["Retrieve on Query"]
    E --> F["LLM Context"]
    F --> G["Response"]
  `

  const graphragFlowchart = `
graph TB
    A[Documents / Notes / Web] --> B[Chunk & Extract Entities]
    B --> C[Build Graph networkx]
    C --> D[Community Detection louvain]
    D --> E[Summarize Communities]
    E --> F[Persist graph.json]
    F --> G[Query: Local or Global Search]
    G --> H[Retrieve + LLM Response]
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
    C --> F[LLM Rewrite SSE]
    D --> G[Ephemeral KB Chat]
  `

  return (
    <div className="space-y-6 animate-fade-in">
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
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          Project Structure
        </h3>
        <pre className="text-xs leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)', fontFamily: "'Fira Code', monospace" }}>
{`cio-intelligence-hub/
├── backend/
│   ├── main.py              FastAPI app + all routes
│   ├── config.py            Provider config management
│   ├── chat.py              Multi-provider streaming client
│   ├── history.py           Session + message persistence
│   ├── knowledge.py         Knowledge base CRUD
│   ├── vectorstore.py       ChromaDB embeddings / classic RAG
│   ├── graphrag_engine.py   GraphRAG extraction, build, retrieval
│   ├── reasoning.py          Thinking tag parsing and serialization
│   ├── followups.py          Follow-up prompt generation
│   ├── artifacts.py          Artifact detection, storage, versioning
│   ├── notes.py              Notes storage and management
│   ├── code_executor.py      Code execution sandbox
│   ├── loaders.py            Document loaders (PDF, DOCX, etc.)
│   ├── source_processor.py  Source processing pipeline
│   ├── web_search.py         Web search integration
│   └── tests/                Backend tests
│
└── frontend/
    └── src/
        ├── App.jsx               Main layout + page registry
        ├── index.css             CSS variables, themes, animations
        ├── components/
        │   ├── ChatInput.jsx       Rich input + attachments
        │   ├── ChatMessage.jsx      Markdown + streaming + code + reasoning
        │   ├── Header.jsx           Model switcher + theme
        │   ├── Sidebar.jsx          Page navigation
        │   ├── KnowledgeBase.jsx    RAG + GraphRAG management
        │   ├── Notes.jsx            Notes editor + enhance + drawer
        │   ├── ArtifactsPanel.jsx   Artifact preview + versions
        │   ├── SearchModal.jsx      Global chat search (Cmd+K)
        │   ├── documentation/       (this section)
        │   └── SettingsPage.jsx    Provider + feature settings
        └── hooks/
            ├── useChat.js       API + state management
            ├── useNotes.js      Notes state management
            └── useTheme.js      ThemeProvider`}
        </pre>
      </div>
    </div>
  )
}

export default Architecture
