import React, { useState } from 'react'
import { MermaidDiagram } from './MermaidDiagram'

const AccordionItem = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors duration-200 hover:opacity-80"
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

const DeepDive = () => {
  const chatFlow = `
sequenceDiagram
    participant U as User
    participant F as React Frontend
    participant B as FastAPI Backend
    participant L as LLM Provider
    U->>F: Type message + optional KB ids
    F->>B: POST /api/chat {message, model, provider, kb_ids}
    B->>B: Retrieve KB context (if kb_ids) - vector or GraphRAG
    B->>B: Build messages array with system prompt + reasoning config
    B->>L: SSE streaming request
    L-->>B: Token stream
    B-->>F: Pass-through SSE
    F->>F: Incremental render + reasoning detection
    F-->>U: Live token display
  `

  const agenticFlow = `
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant L as LLM
    U->>F: Send message with agent mode
    F->>B: POST /api/chat/agent
    B->>L: Stream with tools context
    L-->>B: Tool call detected (search_web / fetch_url / notes)
    B->>B: Execute tool
    B->>B: Append tool results to messages
    B->>L: Continue stream
    L-->>B: Final response
    B-->>F: Full response + tool results
    F-->>U: Render with citations
  `

  const ragFlow = `
graph LR
    A[User Query] --> B{KB Selected?}
    B -->|Yes| C{KB Type?}
    C -->|vectorstore| D[Retrieve Top-K Chunks]
    C -->|graphrag| E[Graph Search: local/global/hybrid/path/neighborhood]
    D --> F[Inject Context into Prompt]
    E --> F
    B -->|No| G[Direct LLM Call]
    F --> H[LLM Generates Response]
    G --> H
    H --> I[Stream to User]
  `

  const graphragFlow = `
graph TB
    subgraph Ingestion
        A[Raw Documents] --> B[Text Chunking]
        B --> C[Batch Entity Extraction LLM]
        C --> D[Relationship Extraction]
    end
    subgraph Graph Build
        D --> E[Build networkx Graph]
        E --> F[Fuzzy Entity Resolution]
        F --> G[Community Detection louvain]
        G --> H[Summarize Communities LLM]
    end
    subgraph Retrieval
        I[User Query] --> J{Search Mode}
        J -->|Local| K[Extract Query Entities]
        J -->|Global| L[Embed Query Vector]
        J -->|Hybrid| M[Vector + Graph BFS]
        J -->|Path| N[Shortest Path]
        J -->|Neighborhood| O[Direct Neighbors]
        K --> P[Graph BFS Traversal + Chunks]
        L --> Q[Rank Community Summaries]
        P --> R[LLM Response with Graph Context]
        Q --> R
        M --> R
        N --> R
        O --> R
    end
    H --> S[Persist graph.json + index.json]
    S --> P
    S --> Q
  `

  const reasoningFlow = `
sequenceDiagram
    participant L as LLM
    participant B as Backend
    participant F as Frontend
    L-->>B: Stream with <thinking>...</thinking>
    B->>B: Extract reasoning via regex
    B->>B: Serialize: {content, reasoning}
    B-->>F: SSE with reasoning field
    F->>F: Detect reasoning in stream
    F->>F: Collapsible ThinkingBlock
    F-->>U: Show/Hide reasoning on demand
  `

  const followupFlow = `
graph LR
    A[Assistant Response Completes] --> B{followupAutoGenerate?}
    B -->|Yes| C[POST /api/followups/generate]
    C --> D[LLM: Generate 3 questions]
    D --> E[Return JSON suggestions]
    E --> F[Render chip buttons]
    F --> G{User clicks chip}
    G -->|insertToInput=true| H[Insert into ChatInput]
    G -->|insertToInput=false| I[Send immediately]
  `

  const artifactFlow = `
graph TB
    A[Streaming Completes] --> B[POST /api/artifacts/detect]
    B --> C{Has Artifact?}
    C -->|Yes| D[Determine Type: HTML/SVG/ThreeJS/D3]
    D --> E[Open Artifacts Panel]
    E --> F[Render in iframe/canvas]
    F --> G[Show Version Bar v1]
    G --> H[User: Update/Rewrite]
    H --> I[Create New Version v2]
    I --> J[Switch Versions Instantly]
    C -->|No| K[Normal Chat Display]
  `

  const historyFlow = `
graph TB
    A[Chat Sessions] --> B[Time Grouping]
    B --> C[Today]
    B --> D[Yesterday]
    B --> E[Previous 7 Days]
    B --> F[Previous 30 Days]
    B --> G[Archived]
    A --> H[In-Memory Search Index]
    H --> I[Cmd+K / Search Page]
    I --> J[Fuzzy Match Titles]
    I --> K[Full-Text Content]
    I --> L[Tag Filter]
    I --> M[Unified: Notes + KBs]
    J --> N[Click Result]
    K --> N
    L --> N
    M --> N
    N --> O[Load Session / Note / KB]
  `

  const notesFlow = `
graph LR
    A[Note Editor] --> B[Formatting Toolbar]
    A --> C[AI Enhance Button]
    A --> D[Chat Drawer Toggle]
    A --> E[Pin / Export]
    A --> F[12 Note Types]
    C --> G{Text Selected?}
    G -->|Yes| H[Enhance Selection]
    G -->|No| I[Enhance Full Note]
    H --> J[POST /api/notes/enhance SSE]
    I --> J
    J --> K[Stream rewritten text]
    D --> L[Slide-over Mini Chat]
    L --> M[Inject note as system context]
    E --> N[Download txt/md via backend + pdf via html2pdf.js]
  `

  const isolationFlow = `
graph TB
    A[User Clicks Chat in KB] --> B[Create KB-Scoped Session]
    B --> C[session.knowledge_base_id = kb_id]
    C --> D[Messages tagged to KB]
    D --> E[/api/history?kb_id=xxx]
    E --> F[Load only KB messages]
    F --> G[Isolated from Main Chat]
    A --> H[User Clicks Main Chat]
    H --> I[Create Main Session]
    I --> J[session.knowledge_base_id = null]
    J --> K[/api/history?kb_id=null]
    K --> L[Load only Main messages]
    L --> M[Isolated from KB Chat]
  `

  const codeExecFlow = `
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Sandbox
    U->>F: Clicks "Run Code" on code block
    F->>B: POST /api/execute {code, session_id}
    B->>B: Validate language
    B->>S: Spawn isolated subprocess (60s timeout)
    S-->>B: stdout/stderr/images (base64 PNG)
    B-->>F: Execution result JSON
    F-->>U: Render output below code block
  `

  const providerFlow = `
graph TB
    A[User] --> B[Settings Page]
    B --> C[Add Provider]
    C --> D{Provider Type}
    D -->|Ollama| E[Name + Base URL]
    D -->|OpenAI| F[Name + Base URL + API Key]
    D -->|Anthropic| G[Name + API Key]
    E --> H[Save Config]
    F --> H
    G --> H
    H --> I[Provider Config Saved to JSON]
    I --> J[chat.py routes to provider adapter]
    J --> K[vectorstore.py: ProviderEmbeddings]
  `

  const webSearchFlow = `
graph LR
    A[User Query] --> B{Provider?}
    B -->|DuckDuckGo| C[HTML Parse - No API key]
    B -->|SerpAPI| D[Google/Bing - API key]
    B -->|SearXNG| E[Self-hosted - Base URL]
    C --> F[Results list]
    D --> F
    E --> F
    F --> G{Need full page?}
    G -->|Yes| H[fetch_url - extract clean text]
    G -->|No| I[Return snippets to LLM]
    H --> I
  `

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
        <p className="text-sm">Expand each section to explore how a feature works internally. Mermaid diagrams illustrate data flow and architecture for complex features.</p>
      </div>

      <AccordionItem title="1. Chat & Streaming" defaultOpen>
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The core chat experience uses Server-Sent Events (SSE) for real-time token streaming. When you send a message, the frontend POSTs to <code>/api/chat</code> with the message, selected model, provider, and optional Knowledge Base IDs. The backend builds a messages array (including system prompts and retrieved KB context), streams the request to the LLM provider, and passes tokens back as SSE events.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>SSE Streaming:</strong> Tokens arrive one-by-one for live rendering</li>
              <li><strong>Multi-Provider:</strong> Backend normalizes Ollama, OpenAI, and Anthropic formats</li>
              <li><strong>KB Context Injection:</strong> Retrieved chunks prepended to system prompt. <code>rag_system_context</code> places RAG at position 0 for KV cache optimization</li>
              <li><strong>Session Persistence:</strong> Every message stored with session ID, timestamps, and tree IDs</li>
              <li><strong>Reasoning Config:</strong> Passed through to providers (Ollama think param, OpenAI reasoning effort)</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Request Flow</h4>
            <MermaidDiagram chart={chatFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="2. Agentic Chat">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Agentic chat (<code>/api/chat/agent</code>) lets models call tools. When a tool call is detected, the backend pauses streaming, executes the tool, appends results to the conversation, and continues. Available tools include web search (DuckDuckGo/SerpAPI/SearXNG), URL fetching, and notes CRUD.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Web Search:</strong> DuckDuckGo (no key), SerpAPI (API key), SearXNG (self-hosted)</li>
              <li><strong>URL Fetch:</strong> Extracts clean text from HTML (strips scripts, styles, nav, footer, header, aside)</li>
              <li><strong>Notes CRUD:</strong> Models can create, read, update, and delete notes autonomously</li>
              <li><strong>Source Attribution:</strong> All tool results include formatted markdown citations</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Agentic Flow</h4>
            <MermaidDiagram chart={agenticFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="3. Knowledge Bases (Classic RAG)">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Classic RAG uses a pluggable vector store backend (ChromaDB by default, Qdrant optional) for vector storage. Documents are chunked, embedded, and stored. When a user queries with a KB selected, the backend embeds the query, retrieves top-K similar chunks, and injects them into the LLM context. Supports hybrid search (vector + BM25 keyword) and CrossEncoder reranking. The vector store backend is selected per-KB in the Knowledge Base settings.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Chunking:</strong> Configurable chunk_size and chunk_overlap via LangChain RecursiveCharacterTextSplitter</li>
              <li><strong>Embedding:</strong> ProviderEmbeddings routes to Ollama (nomic-embed-text) or OpenAI (text-embedding-3-small)</li>
              <li><strong>Vector Store:</strong> Pluggable backends — ChromaDB (default) or Qdrant, selected per-KB</li>
              <li><strong>Hybrid Search:</strong> Vector similarity + BM25 keyword ranking via rank-bm25</li>
              <li><strong>Reranking:</strong> CrossEncoder (ms-marco-MiniLM-L-6-v2) re-ranks top candidates</li>
              <li><strong>Source Fetching:</strong> URL crawl, git clone, REST API, local directories, Notion, GitHub, GitLab</li>
              <li><strong>KB Types:</strong> Notes, Documents, Web Search, API Sources, Vector DB, GraphRAG</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>RAG Pipeline</h4>
            <MermaidDiagram chart={ragFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="4. GraphRAG">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            GraphRAG is a graph-based retrieval strategy that lives alongside classic vectorstore RAG. Each KB can be set to <code>kb_type: &quot;graphrag&quot;</code>. The pipeline extracts entities and relationships from chunks using the LLM, builds a networkx graph, detects communities via python-louvain, summarizes each community, and persists the graph. Supports incremental updates (only re-processes changed chunks). Optional Neo4j persistence and official neo4j-graphrag backend.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Entity Extraction:</strong> LLM extracts named entities in batches</li>
              <li><strong>Relationship Extraction:</strong> Subject-predicate-object triples with descriptions</li>
              <li><strong>Fuzzy Entity Resolution:</strong> Jaccard-like token overlap merges near-duplicates</li>
              <li><strong>Community Detection:</strong> python-louvain partitions graph into clusters</li>
              <li><strong>Community Summarization:</strong> Parallel LLM summarization (max 5 concurrent)</li>
              <li><strong>Community Embeddings:</strong> Summaries embedded for global search ranking</li>
              <li><strong>Incremental Updates:</strong> Chunk hash deltas trigger selective re-extraction</li>
              <li><strong>Progress Tracking:</strong> progress.json updated per phase for frontend polling</li>
              <li><strong>5 Search Modes:</strong> Local, Global, Hybrid, Path, Neighborhood</li>
              <li><strong>Neo4j Integration:</strong> Optional. Falls back to NetworkX JSON if unavailable</li>
              <li><strong>Official Backend:</strong> Set GRAPHRAG_USE_OFFICIAL=true</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>GraphRAG Pipeline</h4>
            <MermaidDiagram chart={graphragFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="5. Reasoning / Thinking Models">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            First-class support for reasoning models that output thinking tags. Backend auto-detects XML-like tags during SSE streaming, extracts reasoning into a dedicated field, and the frontend renders it in a collapsible ThinkingBlock.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Tag Detection:</strong> Regex matches &lt;thinking&gt;, &lt;reason&gt;, &lt;reasoning&gt;, &lt;thought&gt;, &lt;|begin_of_thought|&gt;</li>
              <li><strong>Extraction:</strong> reasoning field on ChatMessage, separate from content</li>
              <li><strong>Collapsible UI:</strong> ThinkingBlock component with expand/collapse</li>
              <li><strong>Custom Tags:</strong> Configurable start/end tags in Settings</li>
              <li><strong>Ollama Think:</strong> Native think parameter support</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Reasoning Extraction Flow</h4>
            <MermaidDiagram chart={reasoningFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="6. Follow-Up Prompts">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            After each assistant response completes, the frontend calls <code>POST /api/followups/generate</code> to get 3 contextual follow-up questions. These appear as clickable chips below the message.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Auto-Generation:</strong> Triggered after streaming if enabled</li>
              <li><strong>Ephemeral:</strong> Not persisted to disk</li>
              <li><strong>Settings:</strong> autoGenerate, keepInChat, insertToInput</li>
              <li><strong>Regenerate:</strong> Circular arrow to get fresh suggestions</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Follow-Up Generation Flow</h4>
            <MermaidDiagram chart={followupFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="7. Artifacts">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Artifacts detect standalone renderable content (HTML, SVG, ThreeJS, D3.js) in model output and display it in a dedicated resizable panel docked to the right of chat.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Detection:</strong> Regex checks for complete HTML, SVG, ThreeJS, D3.js</li>
              <li><strong>Sandboxed:</strong> iframe with allow-scripts allow-same-origin</li>
              <li><strong>Versioning:</strong> Max 10 versions, oldest dropped</li>
              <li><strong>Update Flow:</strong> Natural language rewrite creates new version</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Artifact Lifecycle</h4>
            <MermaidDiagram chart={artifactFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="8. History & Search">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Chat history is grouped by time period in the sidebar. Unified search via Cmd+K and Search Gate page supports fuzzy searching across chats, notes, and knowledge bases.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Time Grouping:</strong> Today, Yesterday, Previous 7/30 Days, Archived</li>
              <li><strong>Auto Titles:</strong> Generated on first user message (≤50 chars)</li>
              <li><strong>Unified Search:</strong> /api/search/all returns chats, notes, and KBs</li>
              <li><strong>Export/Import:</strong> JSON format for session backup/restore</li>
              <li><strong>Message Tree:</strong> Edit, branch, fork, continue, regenerate, evaluate, delete</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>History & Search Architecture</h4>
            <MermaidDiagram chart={historyFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="9. Notes Enhancement">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Notes are enhanced with 12 note types, AI-assisted writing, a Markdown formatting toolbar, a slide-over chat drawer for AI conversation about note content, pinning, and export to txt/md/pdf. The enhance feature uses a separate provider/model config and streams the rewritten text via SSE.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>12 Note Types:</strong> rich, simple, voice, meeting, research, project, daily, documentation, bug, feature, recipe, book</li>
              <li><strong>AI Enhance:</strong> Presets: Make Concise, Expand, Improve, Fix Grammar</li>
              <li><strong>Formatting Toolbar:</strong> Bold, Italic, Code, Headers, Lists, Blockquote, Strikethrough</li>
              <li><strong>Chat Drawer:</strong> Mini chat with note content as system context (ephemeral)</li>
              <li><strong>Export:</strong> txt/md via backend, pdf via html2pdf.js frontend</li>
              <li><strong>Pinning:</strong> Pinned notes float to top of sidebar</li>
              <li><strong>Agentic Tools:</strong> Models can create, read, update, delete notes autonomously</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Notes Enhancement Flow</h4>
            <MermaidDiagram chart={notesFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="10. KB Chat Isolation">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Conversations initiated within a Knowledge Base are strictly isolated. When a user opens chat from a KB, a session is created with <code>knowledge_base_id</code> set. All messages in that session are tagged to the KB. The frontend and backend enforce that KB-scoped sessions never appear in main chat history, and main chat never leaks into KB conversations.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Session Scope:</strong> Each session has knowledge_base_id (UUID or null)</li>
              <li><strong>Backend Filter:</strong> /api/history accepts kb_id param, filters server-side</li>
              <li><strong>Frontend Separation:</strong> KB chat UI separate from main chat UI</li>
              <li><strong>Navigation Guard:</strong> Switching pages clears KB-scoped state</li>
              <li><strong>No Cross-Leak:</strong> KB chat history excluded from main session list</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Isolation Architecture</h4>
            <MermaidDiagram chart={isolationFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="11. Code Execution">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Code blocks in chat messages have a "Run Code" button that sends the code to the backend for sandboxed execution. The backend validates the language, spawns an isolated subprocess with timeouts and resource limits, captures stdout/stderr (with matplotlib figure auto-capture), and returns the result.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Sandboxed:</strong> Isolated subprocess with timeouts (default 60s)</li>
              <li><strong>Python Support:</strong> Full Python execution with matplotlib figure capture as base64 PNG</li>
              <li><strong>Session State:</strong> Jupyter-style session management with variable persistence</li>
              <li><strong>Output:</strong> stdout, stderr, images (base64 PNG), and return value</li>
              <li><strong>Safety:</strong> Resource limits, output truncation (1MB max)</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Execution Flow</h4>
            <MermaidDiagram chart={codeExecFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="12. Multi-Provider System">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The backend uses a multi-provider architecture where each provider has its own credentials and endpoints. Provider configs are saved to ~/.cio-intelligence-hub/config.json. When listing models or sending messages, the backend iterates all active providers, calls their respective APIs, and normalizes the streaming format.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Provider Registry:</strong> Each provider has id, name, type, base_url, api_key, is_active</li>
              <li><strong>Masked Keys:</strong> API keys shown as ******** in config responses</li>
              <li><strong>Docker Override:</strong> OLLAMA_BASE_URL env var overrides localhost providers in Docker</li>
              <li><strong>Embedding Routing:</strong> ProviderEmbeddings switches between OllamaEmbeddings and OpenAIEmbeddings</li>
              <li><strong>Provider Files:</strong> ollama.py, openai.py, anthropic.py each handle auth and streaming format</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Provider Flow</h4>
            <MermaidDiagram chart={providerFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="13. Web Search">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Native web search is integrated as an agentic tool. Three providers are supported: DuckDuckGo (free, no API key), SerpAPI (paid, supports Google/Bing), and SearXNG (self-hosted meta-search). URL fetching extracts clean text from HTML pages for direct LLM context.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>DuckDuckGo:</strong> HTML parsing, no API key required</li>
              <li><strong>SerpAPI:</strong> Google/Bing results via paid API key</li>
              <li><strong>SearXNG:</strong> Self-hosted meta-search aggregator</li>
              <li><strong>URL Fetch:</strong> Extract clean text from HTML (strips scripts, styles, nav, footer, header, aside)</li>
              <li><strong>Max Length:</strong> Up to 50,000 characters per fetched page</li>
              <li><strong>Source Attribution:</strong> Auto-formatted markdown citations</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Web Search Flow</h4>
            <MermaidDiagram chart={webSearchFlow} />
          </div>
        </div>
      </AccordionItem>
    </div>
  )
}

export default DeepDive