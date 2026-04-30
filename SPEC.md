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
- **Key dependencies**: fastapi, uvicorn, httpx, python-dotenv, fastapi-sessions, chromadb (for vector store)

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
4. **Chat History** — Persistent conversation history stored in backend
5. **Dark/Light Mode** — Toggle with persistent preference
6. **Responsive Design** — Works on desktop and mobile
7. **Dynamic Sidebar** — Extensible page system via PAGES registry
8. **Knowledge Base (RAG)** — Multiple knowledge source types for retrieval-augmented generation
9. **Roleplay Engine** — Character-based immersive roleplay with custom personas, scene settings, and user roles

### Roleplay Engine

The Roleplay Engine enables immersive character-based conversations with the AI.

| Feature | Description |
|---------|-------------|
| **Mode Switching** | Switch between Standard and Roleplay modes dynamically |
| **Character Creation** | Create custom characters with personality, background, vocabulary, knowledge, and constraints |
| **User Role** | Define your own role and relationship to the character |
| **Scene Setting** | Configure the scene/location for the roleplay |
| **Memory Depth** | Control how much context the character remembers (low/medium/high) |
| **Temperature** | Adjust creativity level (0.0-1.0) |
| **System Commands** | Use `SYSTEM: END ROLEPLAY` to exit, `SYSTEM: CLEAR HISTORY` to reset |

### Knowledge Base Types

| Type | Icon | Description | Settings |
|------|------|-------------|----------|
| Notes | Pencil | Personal notes and text snippets | chunkSize, overlap |
| Documents | File | PDF, DOC, TXT files for RAG | allowedTypes, maxFileSize, extractText, chunkSize, chunkOverlap |
| Web Search | Globe | Search results as knowledge source | searchProvider, maxResults, maxContentLength, chunkSize |
| API Sources | Lightning | External API data integration | apiEndpoint, apiKey, headers, method, responseFormat, refreshInterval |
| Vector DB | Database | Chroma, Qdrant, Pinecone collections | vectorDB, collectionName, embeddingModel, embeddingDimensions, indexMethod |

### Pages
1. **Chat** — Main chat interface
2. **Knowledge Base** — RAG configuration with 5 knowledge source types
3. **Info** — Architecture documentation with mermaid diagrams

## 4. Backend Design

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List available models from Ollama/OpenAI |
| POST | `/api/chat` | Send chat message, receive streaming response |
| GET | `/api/history` | Get chat history |
| DELETE | `/api/history` | Clear chat history |
| POST | `/api/config` | Update Ollama/OpenAI configuration |
| GET | `/api/knowledge` | List all knowledge bases |
| POST | `/api/knowledge` | Create a new knowledge base |
| PUT | `/api/knowledge/:id` | Update a knowledge base |
| DELETE | `/api/knowledge/:id` | Delete a knowledge base |
| POST | `/api/knowledge/:id/files` | Upload files to a knowledge base |
| POST | `/scrape` | Scrape web content |
| GET | `/api/roleplay/characters` | List all roleplay characters |
| POST | `/api/roleplay/characters` | Create a new character |
| GET | `/api/roleplay/characters/:id` | Get character details |
| PUT | `/api/roleplay/characters/:id` | Update a character |
| DELETE | `/api/roleplay/characters/:id` | Delete a character |
| GET | `/api/roleplay/session` | Get current roleplay session |
| POST | `/api/roleplay/activate` | Activate roleplay mode |
| POST | `/api/roleplay/deactivate` | Deactivate roleplay mode |
| PUT | `/api/roleplay/session` | Update session settings |
| GET | `/api/roleplay/system-prompt` | Get the roleplay system prompt |

### Data Models

**ChatMessage**:
- `id`: str (UUID)
- `role`: str ("user" | "assistant" | "system")
- `content`: str
- `timestamp`: float

**KnowledgeBase**:
- `id`: str (UUID)
- `name`: str
- `description`: str
- `kb_type`: str ("notes" | "files" | "web" | "api" | "vectorstore")
- `config`: dict (type-specific settings)
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

**Config**:
- `provider`: str ("ollama" | "openai")
- `ollama_base_url`: str
- `openai_base_url`: str
- `openai_api_key`: str
- `model`: str

**Character**:
- `id`: str (UUID)
- `name`: str
- `description`: str
- `personality`: str
- `background`: str
- `vocabulary`: str
- `knowledge`: str
- `constraints`: str
- `avatar`: str
- `created_at`: float
- `updated_at`: float

**RoleplaySession**:
- `id`: str (UUID)
- `mode`: str ("Standard" | "Roleplay")
- `character_id`: str | null
- `user_role`: UserRole
- `scene_setting`: str
- `memory_depth`: str ("low" | "medium" | "high")
- `temperature`: float
- `custom_instructions`: str
- `is_active`: bool

**UserRole**:
- `name`: str
- `description`: str
- `background`: str
- `relationship_to_character`: str

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

## 6. File Structure

```
cio-intelligence-hub/
├── backend/
│   ├── main.py              # FastAPI app + routes
│   ├── config.py            # Configuration management
│   ├── chat.py              # Chat/LLM integration
│   ├── history.py           # Chat history management
│   ├── knowledge.py         # Knowledge base storage
│   ├── roleplay.py          # Roleplay engine
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
│   │   │   └── RoleplayEngine.jsx
│   │   ├── hooks/
│   │   │   ├── useChat.js
│   │   │   └── useRoleplay.js
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```
