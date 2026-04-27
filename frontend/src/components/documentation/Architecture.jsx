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
          Knowledge Base Data Flow
        </h3>
        <MermaidDiagram chart={dataFlowchart} />
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          Project Structure
        </h3>
        <pre className="text-xs leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)', fontFamily: "'Fira Code', monospace" }}>
{`chatter/
├── backend/
│   ├── main.py          FastAPI app + all routes
│   ├── config.py        Provider config management
│   ├── chat.py          Multi-provider streaming client
│   ├── history.py       Session + message persistence
│   ├── knowledge.py     Knowledge base CRUD
│   ├── code_executor.py Code execution sandbox
│   └── vectorstore.py   ChromaDB embeddings
│
└── frontend/
    └── src/
        ├── App.jsx          Main layout + page registry
        ├── index.css        CSS variables, themes, animations
        ├── components/
    │   ├── ChatInput.jsx     Rich input + attachments
    │   ├── ChatMessage.jsx    Markdown + streaming + code
    │   ├── Header.jsx        Model switcher + theme
    │   ├── Sidebar.jsx       Page navigation
    │   ├── KnowledgeBase.jsx RAG management
        │   ├── Notes.jsx         Notes management
        │   ├── documentation/     (this section)
        │   └── About.jsx         (legacy)
        └── hooks/
            ├── useChat.js   API + state management
            └── useTheme.js  ThemeProvider`}
        </pre>
      </div>
    </div>
  )
}

export default Architecture
