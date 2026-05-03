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
    B->>B: Retrieve KB context (if kb_ids)
    B->>B: Build messages array with system prompt
    B->>L: SSE streaming request
    L-->>B: Token stream
    B-->>F: Pass-through SSE
    F->>F: Incremental render + reasoning detection
    F-->>U: Live token display
  `

  const ragFlow = `
graph LR
    A[User Query] --> B{KB Selected?}
    B -->|Yes| C[Retrieve Top-K Chunks]
    B -->|No| D[Direct LLM Call]
    C --> E[Inject Context into Prompt]
    E --> F[LLM Generates Response]
    D --> F
    F --> G[Stream to User]
  `

  const graphragFlow = `
graph TB
    subgraph Ingestion
        A[Raw Documents] --> B[Text Chunking]
        B --> C[Entity Extraction LLM]
        C --> D[Relationship Extraction]
    end
    subgraph Graph Build
        D --> E[Build networkx Graph]
        E --> F[Community Detection louvain]
        F --> G[Summarize Communities LLM]
    end
    subgraph Retrieval
        H[User Query] --> I{Search Mode}
        I -->|Local| J[Extract Query Entities]
        I -->|Global| K[Embed Query Vector]
        J --> L[Graph BFS Traversal]
        K --> M[Rank Community Summaries]
        L --> N[Retrieve Neighbors + Chunks]
        M --> N
    end
    G --> O[Persist graph.json]
    O --> L
    O --> M
    N --> P[LLM Response with Graph Context]
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
    A --> H[SQLite FTS5 Index]
    H --> I[Cmd+K Search Modal]
    I --> J[Fuzzy Match Titles]
    I --> K[Full-Text Content]
    I --> L[Tag Filter]
    J --> M[Click Result]
    K --> M
    L --> M
    M --> N[Load Session]
  `

  const notesFlow = `
graph LR
    A[Note Editor] --> B[Formatting Toolbar]
    A --> C[AI Enhance Button]
    A --> D[Chat Drawer Toggle]
    A --> E[Pin / Export]
    C --> F{Text Selected?}
    F -->|Yes| G[Enhance Selection]
    F -->|No| H[Enhance Full Note]
    G --> I[POST /api/notes/enhance SSE]
    H --> I
    I --> J[Stream rewritten text]
    D --> K[Slide-over Mini Chat]
    K --> L[Inject note as system context]
    E --> M[Download txt/md/pdf]
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
    F->>B: POST /api/execute {language, code}
    B->>B: Validate language (python/js)
    B->>S: Spawn isolated subprocess
    S-->>B: stdout/stderr
    B-->>F: Execution result
    F-->>U: Render output below code block
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
              <li>• <strong>SSE Streaming:</strong> Tokens arrive one-by-one for live rendering</li>
              <li>• <strong>Multi-Provider:</strong> Backend normalizes Ollama, OpenAI, and Anthropic formats</li>
              <li>• <strong>KB Context Injection:</strong> Retrieved chunks are prepended to the system prompt</li>
              <li>• <strong>Session Persistence:</strong> Every message is stored with a session ID</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Request Flow</h4>
            <MermaidDiagram chart={chatFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="2. Knowledge Bases (Classic RAG)">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Classic RAG uses ChromaDB for vector storage. Documents are chunked, embedded, and stored. When a user queries with a KB selected, the backend embeds the query, retrieves top-K similar chunks, and injects them into the LLM context. Supports hybrid search (vector + keyword) and reranking.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Chunking:</strong> Configurable chunk_size and chunk_overlap</li>
              <li>• <strong>Embedding:</strong> Uses the provider's embedding model (or default)</li>
              <li>• <strong>Retrieval Modes:</strong> focused (top-K only) or full (all relevant chunks)</li>
              <li>• <strong>KB Types:</strong> Notes, Documents, Web Search, API Sources, Vector DB</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>RAG Pipeline</h4>
            <MermaidDiagram chart={ragFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="3. GraphRAG">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            GraphRAG is a graph-based retrieval strategy that lives alongside classic vectorstore RAG. Each KB can be set to <code>kb_type: "graphrag"</code>. The pipeline extracts entities and relationships from chunks using the LLM, builds a networkx graph, detects communities via python-louvain, summarizes each community, and persists the graph. Supports multiple search modes: <strong>Local</strong> (entity BFS traversal), <strong>Global</strong> (community summary ranking), <strong>Hybrid</strong> (vector + graph), <strong>Path</strong> (shortest path between entities), and <strong>Neighborhood</strong> (direct neighbors only). Optional Neo4j persistence enables Cypher-based queries at scale.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Entity Extraction:</strong> LLM extracts named entities with types and descriptions</li>
              <li>• <strong>Relationship Extraction:</strong> LLM extracts subject-predicate-object triples</li>
              <li>• <strong>Community Detection:</strong> python-louvain partitions the graph into clusters</li>
              <li>• <strong>Community Summaries:</strong> Each partition summarized into a cohesive paragraph</li>
              <li>• <strong>Local Search:</strong> Extract query entities → BFS traversal → neighbor retrieval</li>
              <li>• <strong>Global Search:</strong> Embed query → rank community summaries by vector similarity</li>
              <li>• <strong>Hybrid Search:</strong> Vector search to find starting chunks, then graph BFS from entities</li>
              <li>• <strong>Path Search:</strong> Find shortest path between two entities in the graph</li>
              <li>• <strong>Neighborhood Search:</strong> Direct neighbors only (depth=1) for quick lookups</li>
              <li>• <strong>Neo4j Persistence:</strong> Optional, falls back to NetworkX JSON if unavailable</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>GraphRAG Pipeline</h4>
            <MermaidDiagram chart={graphragFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="4. Reasoning / Thinking Models">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            First-class support for reasoning models that output thinking tags. The backend auto-detects XML-like tags (<code>&lt;thinking&gt;</code>, <code>&lt;reason&gt;</code>, etc.) during SSE streaming, extracts reasoning content into a dedicated field, and the frontend renders it in a collapsible <code>ThinkingBlock</code> component. Supports custom tags, Ollama <code>think</code> parameter, and OpenAI reasoning effort levels.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Tag Detection:</strong> Regex matches &lt;thinking&gt;, &lt;reason&gt;, &lt;reasoning&gt;, &lt;thought&gt;</li>
              <li>• <strong>Extraction:</strong> reasoning field on ChatMessage, separate from content</li>
              <li>• <strong>Collapsible UI:</strong> ThinkingBlock component with expand/collapse</li>
              <li>• <strong>Streaming Detection:</strong> Real-time tag detection during SSE</li>
              <li>• <strong>Custom Tags:</strong> Configurable start/end tags in Settings</li>
              <li>• <strong>Ollama Think:</strong> Native think parameter support</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Reasoning Extraction Flow</h4>
            <MermaidDiagram chart={reasoningFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="5. Follow-Up Prompts">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            After each assistant response completes, the frontend optionally calls <code>POST /api/followups/generate</code> to get 3 contextual follow-up questions. These appear as clickable chips below the message. Clicking can either send immediately or insert into the input field for editing, based on the <code>followupInsertToInput</code> setting.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Auto-Generation:</strong> Triggered after streaming if enabled</li>
              <li>• <strong>Ephemeral:</strong> Not persisted to disk, stored in React state only</li>
              <li>• <strong>Settings:</strong> autoGenerate, keepInChat, insertToInput</li>
              <li>• <strong>Regenerate:</strong> Circular arrow to get fresh suggestions</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Follow-Up Generation Flow</h4>
            <MermaidDiagram chart={followupFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="6. Artifacts">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Artifacts detect standalone renderable content (HTML, SVG, ThreeJS, D3.js) in model output and display it in a dedicated resizable panel docked to the right of chat. Each artifact tracks versions (v1, v2, v3...), supports instant version switching, and allows targeted updates via natural language prompts.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Detection:</strong> Regex checks for complete HTML, SVG, ThreeJS, D3.js</li>
              <li>• <strong>Sandboxed:</strong> iframe with allow-scripts allow-same-origin</li>
              <li>• <strong>Versioning:</strong> Max 10 versions, oldest dropped, instant switching</li>
              <li>• <strong>Update Flow:</strong> Detect intent → append artifact context → LLM rewrite</li>
              <li>• <strong>Settings:</strong> artifactsEnabled, artifactsPanelWidth, artifactsAutoOpen</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Artifact Lifecycle</h4>
            <MermaidDiagram chart={artifactFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="7. History & Search">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Chat history is grouped by time period (Today, Yesterday, Previous 7/30 Days, Archived) in the sidebar. Sessions have auto-generated titles (≤50 chars), unread indicators, and inline title editing. Global fuzzy search via Cmd+K uses SQLite FTS5 for full-text search across titles and message content, plus Levenshtein distance for title matching. Agentic search tools (<code>search_chats</code>, <code>view_chat</code>) are exposed via <code>/api/tools</code> for models with native function calling.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Time Grouping:</strong> Sidebar organizes by recency</li>
              <li>• <strong>Auto Titles:</strong> Generated on first user message (≤50 chars)</li>
              <li>• <strong>FTS5:</strong> Full-text search on titles and message content</li>
              <li>• <strong>Fuzzy Matching:</strong> Levenshtein distance for title similarity</li>
              <li>• <strong>Export/Import:</strong> JSON format for session backup/restore</li>
              <li>• <strong>Agentic Tools:</strong> search_chats and view_chat via /api/tools</li>
              <li>• <strong>Unread Indicators:</strong> Magenta/red dot for unread sessions</li>
              <li>• <strong>Inline Editing:</strong> Click pencil icon to rename sessions</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>History & Search Architecture</h4>
            <MermaidDiagram chart={historyFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="8. Notes Enhancement">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Notes are enhanced with AI-assisted writing, a Markdown formatting toolbar, a slide-over chat drawer for AI conversation about note content, pinning, and export to txt/md/pdf. The enhance feature uses a separate provider/model config and streams the rewritten text via SSE.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>AI Enhance:</strong> Presets: Make Concise, Expand, Improve, Fix Grammar</li>
              <li>• <strong>Formatting Toolbar:</strong> Bold, Italic, Code, Headers, Lists, Blockquote</li>
              <li>• <strong>Chat Drawer:</strong> Mini chat with note content as system context</li>
              <li>• <strong>Export:</strong> txt/md via backend, pdf via html2pdf.js frontend</li>
              <li>• <strong>Pinning:</strong> Pinned notes float to top of sidebar</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Notes Enhancement Flow</h4>
            <MermaidDiagram chart={notesFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="9. KB Chat Isolation">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Conversations initiated within a Knowledge Base are strictly isolated. When a user opens chat from a KB, a session is created with <code>knowledge_base_id</code> set. All messages in that session are tagged to the KB. The frontend and backend enforce that KB-scoped sessions never appear in main chat history, and main chat never leaks into KB conversations.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Session Scope:</strong> Each session has knowledge_base_id (UUID or null)</li>
              <li>• <strong>Backend Filter:</strong> /api/history accepts kb_id param, filters server-side</li>
              <li>• <strong>Frontend Separation:</strong> KB chat UI separate from main chat UI</li>
              <li>• <strong>Navigation Guard:</strong> Switching pages clears KB-scoped state</li>
              <li>• <strong>No Cross-Leak:</strong> KB chat history excluded from main session list</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Isolation Architecture</h4>
            <MermaidDiagram chart={isolationFlow} />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="10. Code Execution">
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Code blocks in chat messages have a "Run Code" button that sends the code to the backend for sandboxed execution. The backend validates the language, spawns an isolated subprocess with timeouts and resource limits, captures stdout/stderr, and returns the result. Currently supports Python and JavaScript.
          </p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Concepts</h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Sandboxed:</strong> Isolated subprocess with timeouts</li>
              <li>• <strong>Language Support:</strong> Python and JavaScript</li>
              <li>• <strong>Safety:</strong> Resource limits and output truncation</li>
              <li>• <strong>Inline Results:</strong> Output rendered below the code block</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Execution Flow</h4>
            <MermaidDiagram chart={codeExecFlow} />
          </div>
        </div>
      </AccordionItem>
    </div>
  )
}

export default DeepDive
