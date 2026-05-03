# CIO Intelligence Hub — Open WebUI-Inspired Chat Application

## 1. Project Overview

- **Name**: CIO Intelligence Hub
- **Type**: Full-stack web application (chat interface with RAG capabilities)
- **Summary**: A self-hosted AI chat interface supporting Ollama, OpenAI-compatible, and Anthropic APIs with Knowledge Base (Classic RAG + GraphRAG), agentic tool calling, Markdown rendering, chat history with advanced session management, dynamic sidebar, and dark mode.
- **Target users**: Developers and users running local LLMs via Ollama or connecting to OpenAI-compatible/Anthropic APIs.

## 2. Technical Stack

### Backend
- **Framework**: Python 3.12 + FastAPI
- **LLM Integration**: Multi-provider architecture supporting Ollama, OpenAI-compatible, and Anthropic APIs
- **Embeddings**: LangChain (OllamaEmbeddings, OpenAIEmbeddings) + ChromaDB
- **Vector Store**: ChromaDB (persistent) with BM25 hybrid search + CrossEncoder reranking
- **GraphRAG**: NetworkX + python-louvain + optional Neo4j (legacy raw-Cypher and official neo4j-graphrag backends)
- **Key dependencies**: fastapi, uvicorn, httpx, pydantic, python-dotenv, chromadb, langchain, langchain-ollama, langchain-openai, networkx, python-louvain, sentence-transformers, rank-bm25, httpx

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS with CSS variables for theming
- **Markdown**: react-markdown + remark-gfm + rehype-highlight
- **Diagrams**: mermaid (for architecture diagrams)
- **HTTP client**: axios

## 3. Feature List

### Core Features
1. **Chat Interface** — Message input, send button, streaming responses with SSE
2. **Multi-Provider Model Selection** — Settings modal to pick from available Ollama/OpenAI/Anthropic models via unified provider registry
3. **Markdown Rendering** — Support for code blocks, inline code, bold, italic, lists, links, Mermaid diagrams, KaTeX math
4. **Chat History & Sessions** — Persistent conversation history with multi-session management, branching, forking, editing
5. **Dark/Light Mode** — Toggle with persistent preference via CSS variables
6. **Responsive Design** — Works on desktop and mobile
7. **Dynamic Sidebar** — Extensible page system via PAGES registry (Search Gate, Chat, Knowledge, Notes, Docs, Settings)
8. **Knowledge Base (RAG)** — Classic vectorstore RAG with hybrid search and reranking
9. **GraphRAG** — Graph-based retrieval with entity/relationship extraction, community detection, and multiple search modes
10. **Reasoning / Thinking Models** — Detect and render reasoning tags (`<thinking>`, `<reason>`, etc.) in collapsible UI blocks
11. **Follow-Up Prompts** — Auto-generate contextual follow-up question suggestions after each AI response
12. **Artifacts** — Detect and render standalone HTML, SVG, ThreeJS, and D3.js visualizations in a dedicated panel
13. **History & Search** — Global fuzzy search across titles and message content; session archival, export/import, unread indicators
14. **Notes Enhancement** — AI-assisted writing, Markdown formatting toolbar, slide-over chat drawer, pinning, export (txt/md/pdf), 12 note types
15. **Code Execution** — Sandboxed Python execution with matplotlib support
16. **Agentic Chat** — Tool calling with notes CRUD and web search integration
17. **Web Search** — Native web search via DuckDuckGo, SerpAPI, or SearXNG with URL fetching
18. **CIO Agent** — AI-powered code analysis and architectural understanding

### Provider System

The backend uses a multi-provider architecture where each provider has an ID, name, type, base_url, API key, and active status.

| Provider Type | Authentication | Endpoint |
|---------------|----------------|----------|
| **Ollama** | None | `OLLAMA_BASE_URL` (default: http://localhost:11434) |
| **OpenAI** | API Key | `base_url` + `/chat/completions` |
| **Anthropic** | API Key | `https://api.anthropic.com/v1/messages` |

**Features:**
- Masked API keys in config responses (`********`)
- Docker override: `OLLAMA_BASE_URL` env var overrides localhost providers
- Provider-specific streaming format normalization
- Provider-specific embedding routing via `ProviderEmbeddings`

### Reasoning / Thinking Models

First-class support for reasoning/thinking models with tag detection, extraction, and rendering.

| Feature | Description |
|---------|-------------|
| **Tag Detection** | Auto-detect XML-like reasoning tags (`<thinking>`, `<reason>`, `<reasoning>`, `<thought>`, `<|begin_of_thought|>`, etc.) in LLM output |
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
| **Message Actions** | Edit, evaluate (good/bad), branch, fork, continue, regenerate, delete per message |

### Notes Enhancement

AI-assisted writing and advanced note management.

| Feature | Description |
|---------|-------------|
| **12 Note Types** | rich, simple, voice, meeting, research, project, daily, documentation, bug, feature, recipe, book |
| **AI Enhance** | Rewrite selected or full note text via LLM (SSE streamed) |
| **Formatting Toolbar** | Floating toolbar for Bold, Italic, Strikethrough, Code, Headers, Lists, Blockquote |
| **Word/Character Count** | Live count bar below editor |
| **Chat Drawer** | Slide-over panel for AI conversation about note content |
| **Pinning** | Pin notes to top of sidebar |
| **Export** | Download as `.txt`, `.md`, or `.pdf` |
| **Enhance Config** | Separate provider/model for enhance operations |
| **Note Tools** | Agentic tools: search_notes, view_note, write_note, replace_note_content, update_note |

### Code Execution

Sand-boxed code execution for Python with matplotlib support.

| Feature | Description |
|---------|-------------|
| **Sandboxed** | Isolated subprocess with timeouts (default 60s) |
| **Python Support** | Full Python execution with matplotlib figure capture |
| **Session State** | Jupyter-style session management with variable persistence |
| **Output** | stdout, stderr, images (base64 PNG), and return value |
| **Safety** | Resource limits, output truncation (1MB max) |

### Web Search

Native web search integrated as an agentic tool.

| Feature | Description |
|---------|-------------|
| **Providers** | DuckDuckGo (default), SerpAPI, SearXNG |
| **URL Fetching** | Fetch and extract text from any webpage (up to 50,000 chars) |
| **Tool Definitions** | `search_web` and `fetch_url` exposed to models via `/api/tools` |
| **HTML Cleaning** | Strips scripts, styles, nav, footer, header, aside for clean text |
| **Source Attribution** | Auto-formatted markdown citations |

### CIO Agent

AI-powered code analysis and architectural understanding system. When activated by an admin, it analyzes the codebase and provides both **improvement suggestions** and **architectural insights** for general system comprehension.

| Feature | Description |
|---------|-------------|
| **Admin Toggle** | Enable/disable in Settings → CIO Agent tab |
| **Code Analysis** | Scans backend (Python) and frontend (JSX/TSX) code |
| **Architecture Understanding** | Maps features, traces dependencies, identifies design patterns, traces data flows, and flags cross-cutting concerns |
| **Suggestion Categories** | Improvement: Functionality, Documentation, Refactoring, Enhancement, Security, Performance, Bug. Understanding: Architecture, Feature Map, Dependency, Design Pattern, Data Flow, Cross-Cutting |
| **Insight Types** | `improvement` (code fixes) and `understanding` (architectural insights) |
| **Real-time Streaming** | SSE-based streaming of analysis results |
| **Suggestion Details** | File path, line numbers, current code, suggested code, rationale, hypothesis, evidence, impact assessment |
| **Persistence** | Suggestions stored in `~/.cio-intelligence-hub/cio_suggestions.json` |
| **Management** | Dismiss, apply, adapt, or revert suggestions |
| **Architecture Overview** | Dashboard card showing feature count, dependency count, pattern count, data flow count, and cross-cutting concern count |

**Analysis Capabilities (Improvement):**
- Missing docstrings on functions/classes
- Unresolved TODO/FIXME comments
- Missing type hints
- Long functions (>50 lines)
- Duplicate/copy-paste code detection
- Missing PropTypes in React components
- Debug code (console.log) left behind
- Inline styles in React components
- Bare except clauses
- Hardcoded credentials/secrets
- Insecure HTTP links in docs
- Missing alt text in markdown images
- Code blocks without language specifier

**Analysis Capabilities (Understanding):**
- **Feature Mapping**: Identifies features from API routes, React components, service classes, and custom hooks; flags features spanning too many modules (SRP violation)
- **Dependency Tracing**: Builds import dependency graph; flags high-coupling modules (>10 imports), critical hub modules (>5 dependents), and circular dependencies
- **Design Pattern Detection**: Identifies Factory, Singleton, Middleware, Observer/Event, Redux patterns; detects anti-patterns (god objects, broad exception handling, prop drilling, context overuse)
- **Data Flow Tracing**: Maps all API entry points and client-side API calls; provides API surface overview with endpoint counts
- **Cross-Cutting Concern Analysis**: Identifies where auth, logging, error handling, and config are distributed; flags scattered cross-cutting logic
- **Module Responsibility Analysis**: Detects modules with too many distinct responsibilities (SRP violations)
- **LLM Architectural Review**: Asks LLM to assess each file's role, interfaces, consumers, and cross-cutting concerns

**Configuration Fields:**
- `cio_agent_enabled` — Toggle agent on/off
- `cio_agent_auto_scan` — Auto-run analysis when enabled
- `cio_agent_include_tests` — Include test files in analysis
- `cio_agent_include_understanding` — Include architectural understanding phase (default: true)
- `cio_agent_last_scan` — Timestamp of last analysis
- `cio_agent_exclude_dirs` — Directories to exclude from analysis
- `cio_agent_exclude_files` — Files to exclude from analysis
- `cio_agent_target_dir` — Target directory for analysis

**API Endpoints:**
- `GET /cio-agent/status` — Current status (includes understanding_count, improvement_count, understanding_categories)
- `POST /cio-agent/toggle` — Enable/disable (supports include_understanding parameter)
- `POST /cio-agent/analyze` — Trigger analysis (supports include_understanding parameter)
- `GET /cio-agent/stream` — SSE stream results
- `POST /cio-agent/analyze-and-save` — Blocking analysis (supports include_understanding parameter)
- `GET /cio-agent/suggestions` — List all suggestions (filterable by category, status, priority, search)
- `GET /cio-agent/suggestion/{id}` — Get specific suggestion
- `PATCH /cio-agent/suggestion/{id}` — Update (apply/dismiss)
- `GET /cio-agent/stats` — Statistics dashboard

### Knowledge Base Types

| Type | Icon | Description | Settings |
|------|------|-------------|----------|
| Notes | Pencil | Personal notes and text snippets | chunkSize, overlap |
| Documents | File | PDF, DOC, TXT files for RAG | allowedTypes, maxFileSize, extractText, chunkSize, chunkOverlap |
| Web Search | Globe | Search results as knowledge source with URL crawling support | searchProvider, maxResults, maxContentLength, chunkSize |
| API Sources | Lightning | External API data integration | apiEndpoint, apiKey, headers, method, responseFormat, refreshInterval |
| Vector DB | Database | Chroma, Qdrant, Pinecone collections | vectorDB, collectionName, embeddingModel, embeddingDimensions, indexMethod |
| **GraphRAG** | **Network** | **Graph-based retrieval with entity/relationship extraction and community summaries** | **graphMode, maxDepth, topK, extractionModel** |

### Source Processor Types

Beyond basic KB types, the `source_processor.py` supports advanced source fetching:

| Source Type | Description |
|-------------|-------------|
| **URL** | Web page fetching with depth-limited crawling, robots.txt respect, exclude patterns, deduplication |
| **Repository** | Git clone with configurable branch, depth, file patterns, code structure parsing |
| **API** | REST API calls with auth (bearer, api_key, basic), headers, query params, transformation |
| **Directory** | Local directory scanning with recursive support, file patterns, exclude patterns |
| **Service** | Third-party integrations: Notion (page search + content), GitHub (repo READMEs), GitLab (project READMEs) |
| **Workflow** | Placeholder for multi-source pipeline composition |

### Pages
1. **Search Gate** — Unified search across chats, notes, and knowledge bases (default landing page)
2. **Chat** — Main chat interface with streaming, reasoning, artifacts, follow-ups
3. **Knowledge Base** — RAG configuration with classic vectorstore and GraphRAG
4. **Notes** — Rich note editor with AI enhancement and chat drawer
5. **Docs** — Architecture documentation with mermaid diagrams
6. **Settings** — Provider config, feature toggles, CIO Agent, keyboard shortcuts

## 4. Backend Design

### GraphRAG Architecture

GraphRAG is a lightweight, self-hosted retrieval strategy inspired by Neo4j's GraphRAG patterns. It lives alongside the classic vectorstore RAG. Each Knowledge Base is created as either `vectorstore` (classic) or `graphrag` (graph), and the chat pipeline automatically dispatches to the correct retriever based on `kb_type`.

**Pipeline:**
1. **Entity/Relationship Extraction** — Document chunks are fed to the active LLM provider with a structured extraction prompt. Output: JSON arrays of entities and relationships. Supports configurable graph schema (entity types + relation types) per KB. Supports batch extraction for efficiency.
2. **Graph Construction** — A `networkx.MultiDiGraph` is built. Nodes = entities (type, description, source chunks). Edges = relationships (description, weight, source chunks).
3. **Fuzzy Entity Resolution** — New entities are merged into existing ones via fuzzy name matching (Jaccard-like token overlap ≥ 0.8) to handle near-duplicates.
4. **Community Detection** — `python-louvain` partitions the graph into communities. Falls back to NetworkX greedy modularity if python-louvain is unavailable.
5. **Community Summarization** — Each community is summarized into a cohesive paragraph by the LLM. Runs in parallel batches (max 5 concurrent).
6. **Community Embedding** — Summaries are embedded for global search ranking.
7. **Persistence** — `graph.json`, `communities.json`, and `index.json` stored under `~/.cio-intelligence-hub/graphrag/{kb_id}/`
8. **Incremental Updates** — `update_graph_for_kb()` computes chunk hashes, detects deltas, and only re-extracts from changed chunks. Re-runs community detection and re-summarizes only changed communities.

**Progress Tracking:**
- `progress.json` updated at each phase for frontend polling via `GET /api/knowledge/{kb_id}/graph-progress`
- Phases: extraction → building → community_detection → summarization → persisting → ready/error

**Search Modes:**
- **Local Search** (default): Extract entities from the query, traverse the graph via BFS from matched nodes, return neighboring entities, relationships, and connected chunks.
- **Global Search**: Embed the query, rank community summaries by vector similarity, return top-N summaries.
- **Hybrid Search** (Neo4j VectorCypherRetriever pattern): Vector search on chunks to find starting points, then graph BFS from entities in those chunks. Returns both chunk texts and entity-relationship pairs.
- **Path Search**: Extract up to 2 entities from the query, find shortest path between them in the graph.
- **Neighborhood Search**: Direct neighbors only (depth=1) for quick relationship lookups.

**Neo4j Integration (Optional):**
- Add `neo4j:5-community` service to `docker-compose.yml`
- Backend auto-detects `NEO4J_URI` env var
- Graphs saved to Neo4j in addition to JSON (non-blocking, falls back to NetworkX if Neo4j unavailable)
- Alternative official neo4j-graphrag backend available via `GRAPHRAG_USE_OFFICIAL=true` env var
- Enables Cypher-based queries for complex traversals at scale

### Classic RAG Architecture

- **Chunking**: LangChain `RecursiveCharacterTextSplitter` with configurable `chunk_size`, `chunk_overlap`
- **Embedding**: `ProviderEmbeddings` routes to Ollama (default: nomic-embed-text) or OpenAI (default: text-embedding-3-small) based on provider config
- **Storage**: ChromaDB persistent client with collection per KB (`kb_{kb_id}`)
- **Retrieval**: Vector similarity search + optional BM25 keyword search (hybrid) + CrossEncoder reranking (default: ms-marco-MiniLM-L-6-v2)
- **RAG Context Placement**: `rag_system_context` setting places KB context in system message at position 0 for KV cache optimization

### Agentic Chat Architecture

A separate `/api/chat/agent` endpoint enables models to call tools. The backend intercepts assistant messages, detects function calls, executes them, and appends results back into the conversation.

**Available Tools:**
- `search_web(query, count)` — Web search via configured provider
- `fetch_url(url)` — Fetch and extract webpage text
- `search_notes(query)` — Search user's notes
- `view_note(note_id)` — Read a note's full content
- `write_note(title, content)` — Create a new note
- `replace_note_content(note_id, new_content)` — Overwrite a note
- `update_note(note_id, ...)` — Patch specific note fields

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
- Strict KB isolation: sessions with `knowledge_base_id` only appear in KB-scoped chat

**Search:**
- In-memory fuzzy search across session titles and message content
- Levenshtein-like word boundary matching for titles
- Snippet extraction: 150-char context window around match
- Filters: All, Titles, Content, Tags

**Unified Search (`/api/search/all`):**
- Searches chats (via `search_history`), notes (via `search_notes`), and knowledge bases simultaneously
- Relevance scoring per entity type
- Returns structured results with snippets

**Agentic Search Tools:**
- `search_chats`: Simple text search across chat titles and content
- `view_chat`: Read full message history of a specific chat
- Exposed via `/api/tools` for models with native function calling

**Message Tree Operations:**
- **Edit**: Truncates history after edited message, re-sends prompt
- **Branch**: Creates new session copying messages up to selected message
- **Fork**: Same as branch (legacy alias)
- **Continue**: Sends "Continue the response" prompt
- **Regenerate**: Removes last assistant message and re-sends user's prompt
- **Evaluate**: Good/bad rating stored on message
- **Delete**: Removes individual message from history

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

### Code Execution Architecture

- Session-based execution with state persistence
- Subprocess isolation with `PYTHONDONTWRITEBYTECODE=1`
- Matplotlib auto-capture: figures saved as base64 PNG
- Output marker protocol: `__CE_OUTPUT__{json}__CE_OUTPUT__`
- Auto-cleanup of temp files after execution

### Web Search Architecture

- **Native Mode**: Returns snippets directly without RAG/chunking/Vector DB
- **DuckDuckGo**: HTML parsing (no API key)
- **SerpAPI**: Google/Bing results (requires API key)
- **SearXNG**: Self-hosted meta-search (requires base URL)
- **URL Fetch**: Extracts clean text from HTML (strips scripts, styles, nav, footer, header, aside)

### Data Models

**ChatMessage**:
- `id`: str (UUID)
- `role`: str ("user" | "assistant" | "system")
- `content`: str
- `reasoning`: str — *extracted reasoning/thinking content*
- `timestamp`: float
- `knowledge_base_ids`: list[str]
- `notes`: list[str]
- `rating`: str | null ("good" | "bad")
- `parent_id`: str | null — *for branching tree*
- `children_ids`: list[str]
- `sources`: list[dict]

**ChatSession**:
- `id`: str (UUID)
- `title`: str (auto-generated or manual)
- `is_archived`: bool (default: false)
- `is_unread`: bool (default: false)
- `tags`: list[str] (optional)
- `knowledge_base_id`: str | null — *KB scope for isolated KB chat*
- `branch_root_id`: str | null — *message ID branch originated from*
- `archived_at`: float | null
- `active_model`: str — *model used in this session*
- `active_provider_id`: str — *provider used*
- `created_at`: float
- `updated_at`: float

**KnowledgeBase**:
- `id`: str (UUID)
- `name`: str
- `description`: str
- `kb_type`: str ("knowledge" | "vectorstore" | "graphrag")
- `retrieval_mode`: str ("focused" | "full")
- `hybrid_search`: bool
- `reranking`: bool
- `chunk_size`: int
- `chunk_overlap`: int
- `storage_path`: str
- `embedding_model`: str
- `embedding_dimensions`: int
- `config`: dict (type-specific settings)
  - *GraphRAG fields*: `graph_mode` ("local" | "global" | "hybrid" | "path" | "neighborhood"), `max_depth` (int), `top_k` (int), `extraction_model` (str), `graph_schema` (dict with entity_types/relation_types), `batch_size` (int)
  - *Source fields*: `sources` list for URL/API/Repository/etc.
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
- `size_bytes`: int
- `token_count`: int
- `chunks_count`: int
- `is_embedded`: bool
- `created_at`: float

**Artifact**:
- `id`: str (UUID)
- `session_id`: str
- `message_id`: str (assistant message that generated it)
- `content`: str (the full artifact content)
- `content_type`: str ("html" | "svg" | "threejs" | "d3")
- `version`: int (starts at 1)
- `created_at`: float

**Note**:
- `id`: str (UUID)
- `title`: str
- `content`: str
- `tags`: list[str]
- `archived`: bool (default: false)
- `pinned`: bool (default: false)
- `note_type`: str (one of 12 types)
- `chat_history`: list[NoteMessage]
- `created_at`: float
- `updated_at`: float

**ProviderConfig**:
- `id`: str (UUID)
- `name`: str
- `type`: str ("ollama" | "openai" | "anthropic")
- `base_url`: str | null
- `api_key`: str | null
- `is_active`: bool (default: true)

**Config**:
- `providers`: list[ProviderConfig]
- `active_model`: str
- `active_provider_id`: str | null
- `enhance_provider`: str | null
- `enhance_model`: str | null
- `rag_system_context`: bool (default: false)
- `rag_chunk_size`: int (default: 1000)
- `rag_chunk_overlap`: int (default: 100)
- `rag_min_chunk_size`: int (default: 0)
- `rag_hybrid_search`: bool (default: true)
- `rag_reranking`: bool (default: true)
- `rag_top_k`: int (default: 10)
- `web_search_enabled`: bool (default: true)
- `web_search_provider`: str ("duckduckgo" | "serpapi" | "searxng")
- `web_search_api_key`: str | null
- `web_search_result_count`: int (default: 10)
- `web_search_serpapi_base_url`: str | null
- `web_search_searxng_base_url`: str | null
- `graphrag_extraction_model`: str | null
- `graphrag_default_mode`: str ("local" | "global" | "hybrid" | "path" | "neighborhood")
- `graphrag_max_depth`: int (default: 2)
- `graphrag_top_k`: int (default: 5)
- `neo4j_uri`: str | null
- `neo4j_user`: str | null
- `neo4j_password`: str | null
- `reasoning_enabled`: bool (default: true)
- `reasoning_mode`: str ("default" | "enabled" | "disabled" | "custom")
- `reasoning_custom_start`: str
- `reasoning_custom_end`: str
- `ollama_think`: bool | null
- `reasoning_effort`: str | null
- `followup_auto_generate`: bool (default: true)
- `followup_keep_in_chat`: bool (default: false)
- `followup_insert_to_input`: bool (default: false)
- `iframe_same_origin`: bool (default: false)
- `artifacts_enabled`: bool (default: true)
- `artifacts_auto_open`: bool (default: true)
- `cio_agent_enabled`: bool (default: false)
- `cio_agent_auto_scan`: bool (default: true)
- `cio_agent_include_tests`: bool (default: false)
- `cio_agent_include_understanding`: bool (default: true)
- `cio_agent_last_scan`: str | null
- `cio_agent_exclude_dirs`: list[str]
- `cio_agent_exclude_files`: list[str]
- `cio_agent_target_dir`: str | null

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List available models from all active providers |
| POST | `/api/chat` | Send chat message, receive streaming response (SSE) |
| POST | `/api/chat/agent` | Agentic chat with tool calling (notes + web search) |
| GET | `/api/history` | Get chat history and session KBs |
| DELETE | `/api/history` | Clear chat history (preserves KB scope) |
| GET | `/api/messages/{msg_id}` | Get specific message by ID |
| POST | `/api/messages/{msg_id}/edit` | Edit message, truncate history after it |
| DELETE | `/api/messages/{msg_id}` | Delete a message |
| POST | `/api/messages/{msg_id}/evaluate` | Rate a message (good/bad) |
| POST | `/api/messages/{msg_id}/branch` | Branch session from this message |
| POST | `/api/messages/{msg_id}/fork` | Fork session from this message |
| POST | `/api/messages/continue` | Get last message for continuation |
| POST | `/api/messages/regenerate` | Remove last assistant message for regeneration |
| GET | `/api/sessions` | List all sessions, optionally filtered by `knowledge_base_id` |
| POST | `/api/sessions/switch` | Switch to an existing session |
| POST | `/api/sessions/create` | Create new session, optionally scoped to KB |
| PATCH | `/api/sessions/{session_id}` | Update session metadata (title, tags, archive) |
| POST | `/api/sessions/{session_id}/read` | Mark session as read |
| GET | `/api/sessions/{session_id}/export` | Export session as JSON |
| POST | `/api/sessions/import` | Import session from JSON |
| DELETE | `/api/sessions/{session_id}` | Delete a session |
| POST | `/api/sessions/archive-all` | Archive all sessions |
| DELETE | `/api/sessions` | Delete all sessions |
| GET | `/api/search` | Fuzzy search across session titles and messages |
| GET | `/api/search/all` | Unified search across chats, notes, and knowledge bases |
| GET | `/api/config` | Get current configuration with masked API keys |
| POST | `/api/config` | Update any configuration field |
| GET | `/api/knowledge` | List all knowledge bases |
| POST | `/api/knowledge` | Create a new knowledge base |
| PUT | `/api/knowledge/{kb_id}` | Update a knowledge base |
| DELETE | `/api/knowledge/{kb_id}` | Delete a knowledge base |
| POST | `/api/knowledge/{kb_id}/upload` | Upload and process a file to KB |
| POST | `/api/knowledge/{kb_id}/embed` | Trigger embedding for KB files/chunks |
| POST | `/api/knowledge/{kb_id}/scrape` | Scrape URL and add content to KB |
| DELETE | `/api/knowledge/{kb_id}/files/{file_id}` | Remove a file from KB |
| PATCH | `/api/knowledge/{kb_id}/files/{file_id}/rename` | Rename a file in KB |
| GET | `/api/knowledge/{kb_id}/files/{file_id}` | Get file content |
| PATCH | `/api/knowledge/{kb_id}/sources/{source_id}/rename` | Rename a source in KB |
| POST | `/api/knowledge/{kb_id}/build-graph` | Build/rebuild GraphRAG graph (full or incremental) |
| GET | `/api/knowledge/{kb_id}/graph` | Get graph data (nodes, edges, communities) for visualization |
| GET | `/api/knowledge/{kb_id}/graph-progress` | Poll graph build progress |
| GET | `/api/knowledge/{kb_id}/graph-status` | Get graph build status |
| POST | `/api/followups/generate` | Generate follow-up prompts for a message |
| POST | `/api/followups/regenerate` | Regenerate follow-up prompts |
| GET | `/api/artifacts/current` | Get current artifact for session |
| GET | `/api/artifacts/{id}` | Get specific artifact by ID |
| POST | `/api/artifacts` | Create new artifact (from model rewrite) |
| PUT | `/api/artifacts/{id}` | Update artifact content (creates new version) |
| GET | `/api/artifacts/{id}/version-history` | Get all versions of an artifact |
| POST | `/api/artifacts/detect` | Analyze message content for artifacts |
| GET | `/api/notes` | List all notes |
| POST | `/api/notes` | Create a new note |
| PUT | `/api/notes/{id}` | Update a note |
| DELETE | `/api/notes/{id}` | Delete a note |
| POST | `/api/notes/enhance` | Rewrite selected text via LLM (SSE streamed) |
| GET | `/api/notes/export/{id}` | Export note as txt or md |
| GET | `/api/notes/enhance-config` | Get enhance model/provider settings |
| PUT | `/api/notes/enhance-config` | Update enhance model/provider settings |
| POST | `/api/execute` | Execute code in sandboxed session |
| POST | `/api/execute/session` | Create code execution session |
| GET | `/api/tools` | Expose agentic tools for function calling |

## 6. Frontend Design

### Layout
- **Header**: App name or current model, settings gear icon, theme toggle
- **Sidebar**: Dynamic page navigation with session history, archive/delete controls
- **Main Content**: Page-specific content area

### Pages & Routing
| Route | Page | Description |
|-------|------|-------------|
| `/search` | Search Gate | Unified search across all data |
| `/chat` | Chat | Main chat interface |
| `/knowledge` | Knowledge Bases | RAG + GraphRAG management |
| `/notes` | Notes | Rich note editor |
| `/docs` | Documentation | Architecture docs (this section) |
| `/settings` | Settings | Provider config + feature toggles |

### Color Scheme
- **Dark mode** (default): CSS variables `--bg`, `--bg-secondary`, `--surface`, `--border`, `--text`, `--text-secondary`, `--accent`
- **Light mode**: Same CSS variable system, values swapped
- **KB Type Colors**:
  - Notes: #8b5cf6 (purple)
  - Documents: #6366f1 (indigo)
  - Web Search: #10b981 (emerald)
  - API Sources: #f59e0b (amber)
  - Vector DB: #ec4899 (pink)
  - GraphRAG: #f97316 (orange)

### Component Structure
- `App.jsx` — Root layout, page routing, message action handlers, session modals
- `useChat.js` — Core state: messages, models, sessions, follow-ups, artifacts, streaming
- `ChatMessage.jsx` — Markdown render, reasoning blocks, code execution, message actions
- `ChatInput.jsx` — Rich input with KB selection, file attachments, agent toggles
- `Sidebar.jsx` — Navigation, session history with groups, archive/delete
- `KnowledgeBase.jsx` — KB CRUD, file upload, GraphRAG build with progress
- `Notes.jsx` — Rich editor, formatting toolbar, AI enhance, chat drawer
- `ArtifactsPanel.jsx` — Artifact preview, version switching, iframe sandbox
- `SearchModal.jsx` / `SearchPage.jsx` — Global fuzzy search with unified results
- `SettingsPage.jsx` — Provider management, feature toggles, CIO Agent config

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Search Gate |
| `Cmd/Ctrl + /` | Toggle Keyboard Shortcuts Help |
| `Escape` | Close modals / help |

## 7. File Structure

```
cio-intelligence-hub/
├── backend/
│   ├── main.py                  # FastAPI app + all routes
│   ├── config.py                # Multi-provider config management
│   ├── chat.py                  # Multi-provider streaming (Ollama/OpenAI/Anthropic)
│   ├── history.py               # Session + message persistence with branching
│   ├── knowledge.py             # Knowledge base CRUD
│   ├── vectorstore.py           # ChromaDB embeddings / classic RAG + hybrid + rerank
│   ├── graphrag_engine.py       # GraphRAG extraction, build, retrieval, incremental updates
│   ├── graphrag_neo4j.py        # Legacy Neo4j raw-Cypher adapter
│   ├── graphrag_neo4j_official.py # Official neo4j-graphrag backend
│   ├── reasoning.py             # Thinking tag parsing and serialization
│   ├── followups.py             # Follow-up prompt generation logic
│   ├── artifacts.py             # Artifact detection, storage, versioning
│   ├── notes.py                 # Notes storage and management + note tools
│   ├── code_executor.py         # Sandboxed Python execution with matplotlib
│   ├── web_search.py            # Web search integration (DuckDuckGo/SerpAPI/SearXNG)
│   ├── loaders.py               # Document loaders (PDF, DOCX, MD, TXT)
│   ├── source_processor.py      # Advanced source processing (URL crawl, git clone, API, directory, services)
│   ├── code_analyzer.py         # CIO Agent code analysis engine
│   ├── adapters/
│   │   └── cio_agent_adapter.py # CIO Agent API adapter
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── ollama.py            # Ollama streaming + think param
│   │   ├── openai.py            # OpenAI-compatible streaming
│   │   └── anthropic.py         # Anthropic streaming + system prompt handling
│   ├── tests/
│   │   ├── test_reasoning.py
│   │   └── test_graphrag.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app with sidebar + page routing
│   │   ├── main.jsx
│   │   ├── index.css            # CSS variables, themes, animations
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── ChatInput.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   ├── SearchModal.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── KnowledgeBase.jsx
│   │   │   ├── Notes.jsx
│   │   │   ├── NoteTypes.jsx
│   │   │   ├── ArtifactsPanel.jsx
│   │   │   ├── FollowUpPrompts.jsx
│   │   │   ├── ShareModal.jsx
│   │   │   ├── SaveToKnowledgeModal.jsx
│   │   │   ├── KeyboardShortcutsHelp.jsx
│   │   │   ├── DateSeparator.jsx
│   │   │   ├── GraphViewer.jsx
│   │   │   ├── KBChatDrawer.jsx
│   │   │   ├── CodeExecution.jsx
│   │   │   ├── chat/
│   │   │   │   ├── ThinkingBlock.jsx
│   │   │   │   ├── StreamingCursor.jsx
│   │   │   │   ├── MermaidDiagram.jsx
│   │   │   │   ├── CodeBlock.jsx
│   │   │   │   ├── HTMLPreview.jsx
│   │   │   │   └── icons.jsx
│   │   │   ├── common/
│   │   │   │   ├── Icons.jsx
│   │   │   │   ├── DropdownPanel.jsx
│   │   │   │   ├── IconButton.jsx
│   │   │   │   ├── MoreMenu.jsx
│   │   │   │   ├── MenuItem.jsx
│   │   │   │   ├── MenuDivider.jsx
│   │   │   │   ├── Tooltip.jsx
│   │   │   │   ├── TypingDots.jsx
│   │   │   │   └── AttachmentPill.jsx
│   │   │   ├── knowledge/
│   │   │   │   └── KBConfig.jsx
│   │   │   ├── documentation/
│   │   │   │   ├── Overview.jsx
│   │   │   │   ├── Features.jsx
│   │   │   │   ├── Architecture.jsx
│   │   │   │   ├── Api.jsx
│   │   │   │   ├── Providers.jsx
│   │   │   │   ├── DeepDive.jsx
│   │   │   │   ├── Planned.jsx
│   │   │   │   └── MermaidDiagram.jsx
│   │   ├── hooks/
│   │   │   ├── useChat.js       # API + state management
│   │   │   ├── useNotes.js      # Notes state management
│   │   │   └── useTheme.jsx     # ThemeProvider
│   │   └── utils/
│   │       └── noteTemplates.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── README.md
└── SPEC.md
```

## 8. Environment Variables

| Variable | Description |
|----------|-------------|
| `OLLAMA_BASE_URL` | Ollama server URL. Overrides localhost in Docker |
| `CIO_AGENT_URL` | CIO Agent service endpoint |
| `CIO_AGENT_ENABLED` | Enable CIO Agent (default: false) |
| `NEO4J_URI` | Neo4j bolt URL (optional) |
| `NEO4J_USER` | Neo4j username (optional) |
| `NEO4J_PASSWORD` | Neo4j password (optional) |
| `GRAPHRAG_USE_OFFICIAL` | Use official neo4j-graphrag backend (default: false) |
