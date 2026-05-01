# CIO Intelligence Hub — Open WebUI-Inspired Chat Application

## 1. Project Overview

- **Name**: CIO Intelligence Hub
- **Type**: Full-stack web application (chat interface with RAG capabilities)
- **Summary**: A self-hosted AI chat interface supporting Ollama and OpenAI-compatible APIs with Knowledge Base (RAG), Markdown rendering, chat history, dynamic sidebar, and dark mode.
- **Target users**: Developers and users running local LLMs via Ollama or connecting to OpenAI-compatible APIs.

## 2. Technical Stack

### Backend
- **Framework**: Python 3.12 + FastAPI
- **LLM Integration**: Ollama API + OpenAI-compatible API support
- **Key dependencies**: fastapi, uvicorn, httpx, python-dotenv, fastapi-sessions, chromadb (for vector store), networkx, python-louvain (for GraphRAG)

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Markdown**: react-markdown + remark-gfm + rehype-highlight
- **Diagrams**: mermaid (for architecture diagrams)
- **HTTP client**: axios

## 3. Feature List

### Core Features
1. **Chat Interface** — Message input, send button, streaming responses
2. **Model Selection** — Settings modal to pick from available Ollama/OpenAI models
3. **Markdown Rendering** — Support for code blocks, inline code, bold, italic, lists, links, **Mermaid diagrams**
4. **Chat History** — Persistent conversation history stored in backend with session management
5. **Dark/Light Mode** — Toggle with persistent preference
6. **Responsive Design** — Works on desktop and mobile
7. **Dynamic Sidebar** — Extensible page system via PAGES registry
8. **Knowledge Base (RAG)** — Multiple knowledge source types for retrieval-augmented generation
9. **GraphRAG** — Graph-based retrieval with entity/relationship extraction and community summaries
10. **Reasoning / Thinking Models** — Detect and render reasoning tags (`<thinking>`, `<reason>`, etc.) in collapsible UI blocks
11. **Follow-Up Prompts** — Auto-generate contextual follow-up question suggestions after each AI response
12. **Artifacts** — Detect and render standalone HTML, SVG, ThreeJS, and D3.js visualizations in a dedicated panel
13. **History & Search** — Global fuzzy search across titles and message content; session archival, export/import
14. **Notes Enhancement** — AI-assisted writing, Markdown formatting toolbar, slide-over chat drawer, pinning, export (txt/md/pdf)

### Reasoning / Thinking Models

First-class support for reasoning/thinking models with tag detection, extraction, and rendering.

| Feature | Description |
|---------|-------------|
| **Tag Detection** | Auto-detect XML-like reasoning tags (`<thinking>`, `<reason>`, `<reasoning>`, `<thought>`, etc.) in LLM output |
| **Extraction** | Extract reasoning into a dedicated `reasoning` field on `ChatMessage` |
| **Collapsible UI** | Render reasoning in a collapsible `ThinkingBlock` component |
| **Streaming Support** | Real-time reasoning detection during SSE streams |
| **Custom Tags** | Configurable custom start/end tags via Settings |
| **Ollama Think** | Support for Ollama's native `think` parameter |
| **Reasoning Effort** | Support for OpenAI reasoning effort levels |
| **Cross-Turn Preservation** | Reasoning is preserved across conversation turns |

### Follow-Up Prompts

Auto-generate contextual follow-up question suggestions after each AI response.

| Feature | Description |
|---------|-------------|
| **Auto-Generation** | Generate 3 diverse, contextually relevant follow-up questions after each response |
| **Clickable Chips** | Render suggestions as rounded pill buttons below assistant messages |
| **Settings** | `followupAutoGenerate`, `followupKeepInChat`, `followupInsertToInput` |
| **Regenerate** | Circular arrow icon to get new suggestions |
| **Ephemeral** | Suggestions stored in memory only, not persisted to disk |

### Artifacts

Detect and render standalone, renderable content in a dedicated panel.

| Feature | Description |
|---------|-------------|
| **Detection** | Auto-detect HTML, SVG, ThreeJS, and D3.js content in model output |
| **Artifacts Panel** | Resizable panel docked to the right of chat |
| **Version Tracking** | Track all versions of an artifact, switch between them |
| **Content Types** | HTML websites, SVG graphics, ThreeJS visualizations, D3.js charts |
| **Update Flow** | Targeted and full rewrites via natural language |
| **Sandboxed Preview** | iframe with `sandbox="allow-scripts allow-same-origin"` |
| **Settings** | `artifactsEnabled`, `artifactsPanelWidth`, `artifactsAutoOpen` |

### History & Search

Comprehensive system for managing and navigating previous conversations.

| Feature | Description |
|---------|-------------|
| **Chat History Sidebar** | Grouped by time period (Today, Yesterday, Previous 7/30 Days, Archived) |
| **Unread Indicators** | Magenta/red dot for unread sessions |
| **Auto-Generated Titles** | Short titles (≤ 50 chars) generated on first user message |
| **Global Search** | Fuzzy search across titles, message content, and tags via Cmd+K / Ctrl+K |
| **Agentic Search** | Model can search history autonomously using built-in tools |
| **Session Management** | Archive, delete, export, import individual or all sessions |
| **Inline Title Editing** | Pencil icon → inline edit → Enter to save |

### Notes Enhancement

AI-assisted writing and advanced note management.

| Feature | Description |
|---------|-------------|
| **AI Enhance** | Rewrite selected or full note text via LLM (SSE streamed) |
| **Formatting Toolbar** | Floating toolbar for Bold, Italic, Strikethrough, Code, Headers, Lists, Blockquote |
| **Word/Character Count** | Live count bar below editor |
| **Chat Drawer** | Slide-over panel for AI conversation about note content |
| **Pinning** | Pin notes to top of sidebar |
| **Export** | Download as `.txt`, `.md`, or `.pdf` |
| **Enhance Config** | Separate provider/model for enhance operations |

### Knowledge Base Types

| Type | Icon | Description | Settings |
|------|------|-------------|----------|
| Notes | Pencil | Personal notes and text snippets | chunkSize, overlap |
| Documents | File | PDF, DOC, TXT files for RAG | allowedTypes, maxFileSize, extractText, chunkSize, chunkOverlap |
| Web Search | Globe | Search results as knowledge source | searchProvider, maxResults, maxContentLength, chunkSize |
| API Sources | Lightning | External API data integration | apiEndpoint, apiKey, headers, method, responseFormat, refreshInterval |
| Vector DB | Database | Chroma, Qdrant, Pinecone collections | vectorDB, collectionName, embeddingModel, embeddingDimensions, indexMethod |
| **GraphRAG** | **Network** | **Graph-based retrieval with entity/relationship extraction and community summaries** | **graphMode, maxDepth, topK, extractionModel** |

### Pages
1. **Chat** — Main chat interface
2. **Knowledge Base** — RAG configuration with 5 knowledge source types
3. **Info** — Architecture documentation with mermaid diagrams

## 4. Backend Design

### GraphRAG Architecture

GraphRAG is a lightweight, self-hosted retrieval strategy that lives alongside the classic vectorstore RAG. Each Knowledge Base is created as either `vectorstore` (classic) or `graphrag` (graph), and the chat pipeline automatically dispatches to the correct retriever based on `kb_type`.

**Pipeline:**
1. **Entity/Relationship Extraction** — Document chunks are fed to the active LLM provider with a structured extraction prompt. Output: JSON arrays of entities and relationships.
2. **Graph Construction** — A `networkx.MultiDiGraph` is built. Nodes = entities (type, description, source chunks). Edges = relationships (description, weight, source chunks).
3. **Community Detection** — `python-louvain` partitions the graph into communities.
4. **Community Summarization** — Each community is summarized into a cohesive paragraph by the LLM.
5. **Persistence** — `graph.json`, `communities.json`, and `index.json` are stored under `~/.cio-intelligence-hub/graphrag/{kb_id}/`.

**Search Modes:**
- **Local Search** (default): Extract entities from the query, traverse the graph via BFS from matched nodes, return neighboring entities, relationships, and connected chunks.
- **Global Search**: Embed the query, rank community summaries by vector similarity, return top-N summaries.

### Artifacts Architecture

Artifacts automatically detect standalone renderable content (HTML, SVG, ThreeJS, D3.js) in model output and display it in a dedicated resizable panel.

**Detection:**
- Content must be "standalone" — HTML has `</html>` tag, SVG has `<svg>` element, ThreeJS has `<script>` + `<canvas>`, D3.js has `<script>` + `<svg>`
- Minimum length > 500 chars
- Detection via regex during/after streaming

**Versioning:**
- Each artifact tracks versions (v1, v2, v3...)
- Max 10 versions stored; oldest dropped when exceeded
- Version switching is instant (no backend round-trip)

**Update Flow:**
- User says "change the color" → frontend detects update intent → appends current artifact content as context → model generates updated content → new version created

### Follow-Up Prompts Architecture

Follow-up prompts are generated asynchronously after each assistant response completes.

**Flow:**
1. After streaming completes, frontend calls `POST /api/followups/generate`
2. Backend uses the configured LLM with a focused prompt: "Generate 3 diverse follow-up questions"
3. Suggestions returned as JSON array
4. Rendered as clickable chips below the assistant message

**Settings:**
- `followupAutoGenerate`: Auto-generate after each response
- `followupKeepInChat`: Show for all messages vs. only most recent
- `followupInsertToInput`: Insert text into input field vs. send immediately

### History & Search Architecture

**Session Management:**
- Sessions grouped by time period in sidebar (Today, Yesterday, Previous 7 Days, Previous 30 Days, Archived)
- Auto-generated titles on first user message (≤ 50 chars)
- Unread indicators, inline title editing, context menu (rename, archive, delete, export)

**Search:**
- SQLite FTS5 for full-text search on session titles and message content
- Fuzzy matching via Levenshtein distance for titles
- Snippet extraction: 150-char context window around match
- Filters: All, Titles, Content, Tags

**Agentic Search Tools:**
- `search_chats`: Simple text search across chat titles and content
- `view_chat`: Read full message history of a specific chat
- Exposed via `/api/tools` for models with native function calling

### Notes Enhancement Architecture

**AI Enhance:**
- `POST /api/notes/enhance` rewrites text via LLM with SSE streaming
- Separate provider/model config (`enhance_provider`, `enhance_model`)
- Presets: "Make Concise", "Expand", "Improve", "Fix Grammar"

**Chat Drawer:**
- Slide-over panel from right edge (400px width)
- Injects current note content as system message
- Messages are ephemeral (lost when drawer closes)

**Export:**
- `.txt` / `.md`: Backend endpoint with `Content-Disposition: attachment`
- `.pdf`: Frontend uses `html2pdf.js` to render and download

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List available models from Ollama/OpenAI |
| POST | `/api/chat` | Send chat message, receive streaming response |
| GET | `/api/history` | Get chat history |
| DELETE | `/api/history` | Clear chat history |
| POST | `/api/config` | Update Ollama/OpenAI configuration |
| GET | `/api/search` | **(History & Search)** Fuzzy search across sessions and messages |
| GET | `/api/sessions` | **(History & Search)** List all sessions |
| PUT | `/api/sessions/:id` | **(History & Search)** Update session (title, tags, archive) |
| PUT | `/api/sessions/:id/read` | **(History & Search)** Mark session as read |
| GET | `/api/sessions/:id/export` | **(History & Search)** Export session as JSON |
| POST | `/api/sessions/import` | **(History & Search)** Import session from JSON |
| DELETE | `/api/sessions/:id` | **(History & Search)** Delete a session |
| POST | `/api/sessions/archive-all` | **(History & Search)** Archive all sessions |
| DELETE | `/api/sessions` | **(History & Search)** Delete all sessions |
| GET | `/api/knowledge` | List all knowledge bases |
| POST | `/api/knowledge` | Create a new knowledge base |
| PUT | `/api/knowledge/:id` | Update a knowledge base |
| DELETE | `/api/knowledge/:id` | Delete a knowledge base |
| POST | `/api/knowledge/:id/files` | Upload files to a knowledge base |
| POST | `/api/knowledge/:id/build-graph` | **(GraphRAG)** Build graph from KB files |
| GET | `/api/knowledge/:id/graph-status` | **(GraphRAG)** Get graph build status |
| POST | `/api/followups/generate` | **(Follow-Ups)** Generate follow-up prompts for a message |
| POST | `/api/followups/regenerate` | **(Follow-Ups)** Regenerate follow-up prompts |
| GET | `/api/artifacts/current` | **(Artifacts)** Get current artifact for session |
| GET | `/api/artifacts/:id` | **(Artifacts)** Get specific artifact by ID |
| POST | `/api/artifacts` | **(Artifacts)** Create new artifact (from model rewrite) |
| PUT | `/api/artifacts/:id` | **(Artifacts)** Update artifact content |
| GET | `/api/artifacts/:id/version-history` | **(Artifacts)** Get all versions of an artifact |
| POST | `/api/artifacts/detect` | **(Artifacts)** Analyze message content for artifacts |
| GET | `/api/notes` | **(Notes)** List all notes |
| POST | `/api/notes` | **(Notes)** Create a new note |
| PUT | `/api/notes/:id` | **(Notes)** Update a note |
| DELETE | `/api/notes/:id` | **(Notes)** Delete a note |
| POST | `/api/notes/enhance` | **(Notes)** Rewrite selected text via LLM (SSE streamed) |
| GET | `/api/notes/export/:id` | **(Notes)** Export note as txt or md |
| GET | `/api/notes/enhance-config` | **(Notes)** Get enhance model/provider settings |
| PUT | `/api/notes/enhance-config` | **(Notes)** Update enhance model/provider settings |
| POST | `/scrape` | Scrape web content |

### Data Models

**ChatMessage**:
- `id`: str (UUID)
- `role`: str ("user" | "assistant" | "system")
- `content`: str
- `reasoning`: str — *extracted reasoning/thinking content*
- `timestamp`: float

**ChatSession** *(History & Search)*:
- `id`: str (UUID)
- `title`: str (auto-generated or manual)
- `is_archived`: bool (default: false)
- `is_unread`: bool (default: false)
- `tags`: list[str] (optional)
- `knowledge_base_id`: str | null — *KB scope for isolated KB chat*
- `created_at`: float
- `updated_at`: float

**KnowledgeBase**:
- `id`: str (UUID)
- `name`: str
- `description`: str
- `kb_type`: str ("notes" | "files" | "web" | "api" | "vectorstore" | **"graphrag"**)
- `retrieval_mode`: str ("focused" | "full") — *classic RAG*
- `hybrid_search`: bool — *classic RAG*
- `reranking`: bool — *classic RAG*
- `chunk_size`: int — *shared*
- `chunk_overlap`: int — *shared*
- `config`: dict (type-specific settings)
  - *GraphRAG fields*: `graph_mode` ("local" | "global" | "hybrid"), `max_depth` (int), `top_k` (int), `extraction_model` (str), `graph_status` ("none" | "indexing" | "ready" | "error")
- `files`: list[KBFile]
- `created_at`: float
- `updated_at`: float

**KBFile**:
- `id`: str (UUID)
- `name`: str
- `content`: str
- `content_url`: str
- `metadata`: dict
- `file_type`: str
- `created_at`: float

**Artifact**:
- `id`: str (UUID)
- `session_id`: str
- `message_id`: str (assistant message that generated it)
- `content`: str (the full artifact content)
- `content_type`: str ("html" | "svg" | "threejs" | "d3")
- `version`: int (starts at 1)
- `created_at`: float

**Note** *(Notes Enhancement)*:
- `id`: str (UUID)
- `title`: str
- `content`: str
- `pinned`: bool (default: false)
- `created_at`: float
- `updated_at`: float

**Config**:
- `provider`: str ("ollama" | "openai")
- `ollama_base_url`: str
- `openai_base_url`: str
- `openai_api_key`: str
- `model`: str
- `rag_system_context`: bool
- `rag_chunk_size`: int
- `rag_chunk_overlap`: int
- `rag_hybrid_search`: bool
- `rag_reranking`: bool
- `rag_top_k`: int
- **GraphRAG globals**: `graphrag_extraction_model` (str), `graphrag_default_mode` (str), `graphrag_max_depth` (int), `graphrag_top_k` (int)
- **Reasoning**: `reasoning_enabled` (bool), `reasoning_mode` (str), `reasoning_custom_start` (str), `reasoning_custom_end` (str), `ollama_think` (bool | null), `reasoning_effort` (str | null)
- **Follow-Ups**: `followup_auto_generate` (bool), `followup_keep_in_chat` (bool), `followup_insert_to_input` (bool)
- **Artifacts**: `artifacts_enabled` (bool), `artifacts_auto_open` (bool)
- **Enhance**: `enhance_provider` (str | null), `enhance_model` (str | null)

## 5. Frontend Design

### Layout
- **Header**: App name "CIO Intelligence Hub", settings gear icon, theme toggle
- **Sidebar**: Dynamic page navigation (Chat, Knowledge Base, Info)
- **Main Content**: Page-specific content area

### Color Scheme
- **Dark mode** (default): Dark gray background (#1a1a2e), accent blue (#4f8ef7)
- **Light mode**: White background (#ffffff), accent blue (#4f8ef7)
- **KB Type Colors**:
  - Notes: #8b5cf6 (purple)
  - Documents: #6366f1 (indigo)
  - Web Search: #10b981 (emerald)
  - API Sources: #f59e0b (amber)
  - Vector DB: #ec4899 (pink)
  - **GraphRAG: #f97316 (orange)**

## 6. File Structure

```
cio-intelligence-hub/
├── backend/
│   ├── main.py              # FastAPI app + routes
│   ├── config.py            # Configuration management
│   ├── chat.py              # Chat/LLM integration
│   ├── history.py           # Chat history management
│   ├── knowledge.py         # Knowledge base storage
│   ├── vectorstore.py       # Vector store / classic RAG
│   ├── graphrag_engine.py   # GraphRAG extraction, graph build, retrieval
│   ├── reasoning.py         # Reasoning/thinking tag parsing and serialization
│   ├── followups.py         # Follow-up prompt generation logic
│   ├── artifacts.py         # Artifact detection, storage, versioning
│   ├── notes.py             # Notes storage and management
│   ├── loaders.py           # Document loaders (PDF, DOCX, etc.)
│   ├── source_processor.py  # Source processing pipeline
│   ├── code_executor.py    # Code execution sandbox
│   ├── web_search.py        # Web search integration
│   ├── tests/               # Backend tests
│   │   ├── test_reasoning.py
│   │   └── ...
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with sidebar + pages
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── ChatInput.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── SettingsModal.jsx
│   │   │   ├── KnowledgeBase.jsx
│   │   │   ├── Info.jsx
│   │   │   ├── Notes.jsx
│   │   │   ├── NoteChatDrawer.jsx
│   │   │   ├── SearchModal.jsx
│   │   │   ├── SessionItem.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── FollowUpPrompts.jsx
│   │   │   ├── ArtifactsPanel.jsx
│   │   │   ├── ArtifactPreview.jsx
│   │   │   ├── VersionSelector.jsx
│   │   │   └── index.css
│   │   ├── hooks/
│   │   │   ├── useChat.js
│   │   │   └── useNotes.js
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```
