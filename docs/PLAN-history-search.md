# History & Search Feature Specification

## Context

Open WebUI provides a comprehensive system for managing and navigating previous conversations. CIO Intelligence Hub already has basic session/chat history via `/api/sessions`, but lacks: global fuzzy search across titles and message content, unread indicators, auto-generated titles, archival, per-chat read state, native tool-calling for agentic search, and import/export.

## Goals

1. **Chat History Sidebar** — Grouped by time period, with unread indicators and auto-generated titles
2. **Global Search** — Fuzzy search across titles, message content, and tags via Cmd+K / Ctrl+K
3. **Native Conversation Search (Agentic)** — Model can search history autonomously using built-in tools
4. **Data Management** — Export/import chats as JSON, delete individual or all

---

## Part 1: Backend Design

### Database Schema Changes

Add to existing session/message storage:

**ChatSession** (extend existing):
- `title`: str (auto-generated or manual)
- `is_archived`: bool (default: false)
- `is_unread`: bool (default: false)
- `tags`: list[str] (optional)
- `updated_at`: float

**ChatMessage** (existing):
- Already has: id, role, content, timestamp, parentId, sessionId

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Fuzzy search across sessions and messages |
| PUT | `/api/sessions/:id` | Update session (title, tags, archive) |
| PUT | `/api/sessions/:id/read` | Mark session as read |
| GET | `/api/sessions/:id/export` | Export session as JSON |
| POST | `/api/sessions/import` | Import session from JSON |
| DELETE | `/api/sessions/:id` | Delete a session |
| POST | `/api/sessions/archive-all` | Archive all sessions |
| DELETE | `/api/sessions` | Delete all sessions |
| GET | `/api/roleplay/tools` | Expose native history tools for agentic search |

### Search Implementation

**GET `/api/search`**
```
// Request Query Params
?q=string          // Search query
&type=all|title|content|tag  // Filter type
&limit=20         // Max results

// Response
{
  "results": [
    {
      "session_id": "uuid",
      "title": "string",
      "snippet": "matching message snippet...",
      "match_type": "title" | "content" | "tag",
      "relevance_score": 0.85,
      "timestamp": 1234567890
    }
  ]
}
```

- Use SQLite FTS5 (full-text search) on session titles and message content
- Fuzzy matching via Levenshtein distance for titles
- Snippet extraction: return 150-char context window around match

### Agentic Search Tools

Expose via `/api/roleplay/tools` (or new `/api/tools`):

```json
{
  "tools": [
    {
      "name": "search_chats",
      "description": "Simple text search across chat titles and message content",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" },
          "limit": { "type": "integer", "default": 10 }
        }
      }
    },
    {
      "name": "view_chat",
      "description": "Read and return the full message history of a specific chat",
      "input_schema": {
        "type": "object",
        "properties": {
          "session_id": { "type": "string" }
        }
      }
    }
  ]
}
```

These tools are available when using models with native function calling. The model invokes them to answer user questions like "What was the feedback on my last email draft?"

### Title Auto-Generation

- On first user message in a new session, generate a short title (≤ 50 chars)
- Use a focused LLM prompt: "Summarize this conversation in 3-5 words"
- Cache in session record — only regenerate if user edits or message count > 20

---

## Part 2: Frontend Design

### Sidebar — Chat History Section

**Time Grouping:**
```
Today
  ├── Chat Title A          ● (unread dot)
  └── Chat Title B

Yesterday
  ├── Chat Title C

Previous 7 Days
  ├── Chat Title D
  └── Chat Title E

Previous 30 Days
  └── ...

Archived
  └── (collapsed, separate section)
```

**Session Item:**
- Title (auto-generated or edited)
- Unread dot indicator (magenta/red)
- Last updated timestamp ("2m ago", "Yesterday")
- Hover: show archive/delete actions
- Click: load session

**Title Editing:**
- Pencil icon appears on hover
- Click to edit inline
- Enter to save, Escape to cancel

### Global Search Modal

**Trigger:** Search icon in sidebar OR Cmd+K / Ctrl+K

**UI:**
```
┌─────────────────────────────────────────┐
│ 🔍 Search conversations...          [X] │
├─────────────────────────────────────────┤
│ [All] [Titles] [Content] [Tags:___]    │
├─────────────────────────────────────────┤
│ Results                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Chat Title                          │ │
│ │ "...matching snippet with query     │ │
│ │ highlighted..."                     │ │
│ │ 3 days ago                          │ │
│ └─────────────────────────────────────┘ │
│ (more results...)                       │
└─────────────────────────────────────────┘
```

- Instant search as you type (debounced 300ms)
- Click result → navigate to that session
- Filter tabs: All, Titles, Content, Tags

### Settings — Chat Management

Add new "Chats" section in Settings Modal:

| Setting | Description |
|---------|-------------|
| Delete All Chats | Button with confirmation modal |
| Export All Chats | Download button (JSON) |
| Archive All Chats | Button to archive all |

Session context menu (right-click or kebab menu):
- Rename
- Archive
- Delete
- Export

### Data Import

- Drag-and-drop JSON file onto sidebar
- Detect import file format, validate schema
- Merge or replace prompt (with confirmation)

---

## Part 3: State Management

### useChat.js Changes

```javascript
// New state
const [searchResults, setSearchResults] = useState([])
const [isSearching, setIsSearching] = useState(false)

// New functions
const searchHistory = useCallback(async (query, type = 'all') => { ... })
const updateSession = useCallback(async (sessionId, updates) => { ... })
const markSessionRead = useCallback(async (sessionId) => { ... })
const deleteSession = useCallback(async (sessionId) => { ... })
const archiveSession = useCallback(async (sessionId) => { ... })
const exportSession = useCallback(async (sessionId) => { ... })
const importSession = useCallback(async (file) => { ... })
```

### Session List Grouping

Group sessions in sidebar by time period:
```javascript
const groupSessionsByTime = (sessions) => {
  const now = Date.now() / 1000
  const groups = { today: [], yesterday: [], prev7days: [], prev30days: [], older: [], archived: [] }
  sessions.forEach(s => {
    if (s.is_archived) groups.archived.push(s)
    else if (isToday(s.updated_at)) groups.today.push(s)
    // ...
  })
  return groups
}
```

---

## Part 4: File Structure

```
frontend/src/
├── components/
│   ├── Sidebar.jsx              # Add Chat History section
│   ├── SearchModal.jsx          # New: global search modal
│   ├── SessionItem.jsx          # New: session row in sidebar
│   ├── ChatMessage.jsx          # (existing)
│   └── SettingsModal.jsx        # Add chat management settings
├── hooks/
│   └── useChat.js               # Add search, session management
└── App.jsx                      # Add search modal + Cmd+K listener

backend/
├── main.py                      # Add search routes, export/import
├── history.py                   # Extend with FTS, title gen
└── followups.py                 # (existing)
```

---

## Part 5: Dependencies

No new external dependencies. SQLite FTS5 is built into Python's stdlib `sqlite3` via the `fts5` extension (available in Python 3.12).

---

## Implementation Order

### Phase 1 — Core Backend
1. Add database columns (title, is_archived, is_unread, tags)
2. Implement title auto-generation on new sessions
3. Add FTS5 virtual table for full-text search
4. Add `/api/search` endpoint with fuzzy search
5. Add session update/read/export/import/delete endpoints

### Phase 2 — Core Frontend
6. Group sessions by time period in Sidebar
7. Add unread indicator styling
8. Inline title editing
9. Session context menu (archive, delete, export)

### Phase 3 — Search UI
10. Create `SearchModal.jsx`
11. Add Cmd+K / Ctrl+K listener
12. Implement search with debounce and filters
13. Click-to-navigate from results

### Phase 4 — Agentic Search
14. Add `/api/tools` endpoint exposing `search_chats` and `view_chat`
15. Wire into chat system so model can call them

### Phase 5 — Data Management
16. Export/import JSON functionality
17. Settings UI for delete all / export all
18. Drag-and-drop import on sidebar
