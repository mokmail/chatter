# Notes Enhancement — Design Spec

## Overview

Enhance the existing Notes feature with AI-assisted writing (Enhance), a Markdown formatting toolbar, a slide-over chat drawer for AI conversation about note content, pinning, and export (txt/md/pdf). Notes remain plain-text/Markdown for full compatibility with agentic AI read/write access.

## Architecture

### Data Model Changes

**`backend/notes.py` — Note model:**
- Add `pinned: bool = False` field
- All existing fields unchanged — backward compatible

**`backend/config.py` — AppConfig:**
- Add optional `enhance_provider: str | None = None`
- Add optional `enhance_model: str | None = None`
- If not set, `enhance_provider` falls back to main `provider`, `enhance_model` falls back to main `model`

### Backend — New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `backend/notes.py` | **Modify** | Add `pinned` field to Note model; add `update_note` to NOTE_TOOLS |
| `backend/config.py` | **Modify** | Add `enhance_provider`, `enhance_model` fields |
| `backend/main.py` | **Modify** | Add enhance endpoint, export endpoints, enhance-config endpoints |

### Frontend — New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/Notes.jsx` | **Modify** | Add formatting toolbar, enhance UI, chat drawer, pin toggle, export dropdown |
| `frontend/src/components/NoteChatDrawer.jsx` | **Create** | Slide-over drawer with mini chat for note context conversation |
| `frontend/src/hooks/useNotes.js` | **Modify** | Add enhance, export, pin API calls |
| `frontend/package.json` | **Modify** | Add `html2pdf.js` dependency |

## Backend Design

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notes/enhance` | Rewrite selected text via LLM (SSE streamed) |
| GET | `/api/notes/export/{note_id}` | Export note as txt or md (Content-Disposition download) |
| GET | `/api/notes/enhance-config` | Get current enhance model/provider settings |
| PUT | `/api/notes/enhance-config` | Update enhance model/provider settings |

### `POST /api/notes/enhance`

**Request:**
```json
{
  "note_id": "uuid",
  "selected_text": "text to rewrite or empty for full note",
  "instruction": "make it more concise, expand, fix grammar, etc."
}
```

**Behavior:**
1. Reads the enhance LLM config (provider + model), falling back to main config
2. Constructs a system prompt: `"You are a writing assistant. Rewrite the following text according to the user's instruction. Return only the rewritten text, no explanations, no prefixes."`
3. Calls the provider (Ollama/OpenAI) with the system prompt + selected text + instruction
4. Streams the response back as SSE (same pattern as `/api/chat`)

**Error cases:**
- Note not found → 404
- LLM unreachable → 502 with error message
- Empty instruction → 400

### `GET /api/notes/export/{note_id}?format=txt|md`

**Behavior:**
- `.txt`: returns `Content-Type: text/plain`, `Content-Disposition: attachment; filename="{title}.txt"`
- `.md`: returns `Content-Type: text/markdown`, `Content-Disposition: attachment; filename="{title}.md"`
- Uses the note's title for the filename, sanitized

**Error cases:**
- Note not found → 404
- Invalid format → 400

### `GET /api/notes/enhance-config` / `PUT /api/notes/enhance-config`

- GET returns `{ enhance_provider, enhance_model, available_models }`
- PUT accepts `{ enhance_provider?, enhance_model? }`
- Available models fetched from the provider (reuses existing model listing logic)

### NOTE_TOOLS Update

Add `update_note` to the agentic tools array so AI agents can modify existing notes (e.g., add a task to a todo note).

## Frontend Design

### Markdown Formatting Toolbar

- Floating toolbar appears when text is selected in the textarea editor
- Positioned above the selection using `window.getSelection()` coordinates
- Disappears when selection is cleared or user clicks elsewhere
- Buttons:

| Button | Markdown Insertion |
|--------|-------------------|
| **Bold** | `**selected**` |
| *Italic* | `*selected*` |
| ~~Strikethrough~~ | `~~selected~~` |
| `Code` | `` `selected` `` (inline) or `` ```\nselected\n``` `` (multi-line) |
| H1-H3 | `# selected`, `## selected`, `### selected` |
| Bullet List | `- selected` on each line |
| Numbered List | `1. selected` on each line |
| Blockquote | `> selected` on each line |
| Horizontal Rule | inserts `---` after selection |

- Implementation: pure DOM manipulation of the textarea (inserting/replacing text at selection range)
- No external dependencies needed

### Word & Character Count

- Displayed as a bar below the editor toolbar: "142 words · 892 characters"
- Updates as the user types (debounced)

### AI Enhance

- Sparkle icon (✨) button in the editor toolbar
- **With text selected:** Opens a small popover with preset instruction chips + custom input field
  - Presets: "Make Concise", "Expand", "Improve", "Fix Grammar"
  - Custom: text input with "Enhance" button
- **Without selection:** Applies to the entire note content
- Calls `POST /api/notes/enhance` via fetch with SSE reading
- On stream start: replaces the editor content with streaming partial text
- On complete: final text in place, tracked by Undo/Redo stack
- **Undo/Redo:** The existing app already has undo/redo mechanisms (top-right). AI Enhance changes push onto this stack.

### Chat Drawer (`NoteChatDrawer.jsx`)

- Slide-over panel from the right edge
- Width: 400px, full height of the notes editor area
- Semi-transparent backdrop overlay
- Contains a mini chat interface:
  - Message list (scrollable) with user/assistant bubbles
  - Text input with send button
- When opened:
  - Sends a system context message with the current note content
  - Uses the main chat LLM config (provider/model from settings)
  - Messages are **ephemeral** — lost when drawer closes
- Close button (X) in the top-right of the drawer
- Keyboard: Escape to close

### Pinning

- Pin icon (📌) button in the note editor toolbar (toggles pin on/off)
- Pin icon also visible on each note in the list sidebar
- Pinned notes section at the top of the note list, separated by a header + divider
- Pin state synced to backend immediately on toggle

### Export

- Export dropdown button in the editor toolbar (or overflow menu)
- Options: `.txt`, `.md`, `.pdf`
- `.txt` / `.md`: calls backend endpoint, triggers browser download via temporary `<a>` link
- `.pdf`: uses `html2pdf.js` — clones the note content div, renders to PDF, triggers download
- PDF uses the app's current theme (dark/light detected automatically by html2pdf.js)

### Note List Sidebar Updates

The existing sidebar gets a pinned section:

```
┌─────────────────────────┐
│ 📌 Pinned               │
│ ├── My Important Note   │
│ └── Reference Docs      │
│                         │
│ ─── All Notes ───       │
│ ├── Random Idea         │
│ ├── Shopping List       │
│ └── ...                 │
└─────────────────────────┘
```

## Data Flow

```
User selects text in editor
  → Floating formatting toolbar appears
  → User clicks Bold → `**text**` inserted around selection

User clicks Enhance (with selection)
  → Popover with instruction options
  → User picks "Make Concise" → POST /api/notes/enhance
  → Backend calls LLM with enhance config
  → SSE stream returned → editor text replaced in-place
  → Undo stack updated

User clicks AI Chat button
  → NoteChatDrawer opens from right
  → Current note content injected as system message
  → User types question → POST /api/chat with note context
  → Response streamed into drawer's message list

User clicks Export → .pdf
  → Frontend renders note via html2pdf.js → triggers download
  → For .txt/.md: GET /api/notes/export/{id}?format=txt → download
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Enhance endpoint returns error | Show inline error in the Enhance popover |
| LLM unreachable for Enhance | Error toast: "AI Enhance failed — check your provider connection" |
| Export note not found | Error toast: "Note not found" |
| PDF generation fails | Error toast: "PDF export failed" |
| Chat drawer LLM error | Error message bubble in the drawer's message list |

## Dependencies

- **Backend:** No new Python dependencies — reuses existing httpx + Ollama/OpenAI integration
- **Frontend:** `html2pdf.js` added to package.json (for PDF export)
