# Artifacts Feature Specification

## Context

Open WebUI's Artifacts feature displays standalone, renderable content (HTML websites, SVG graphics, ThreeJS/D3.js visualizations) in a dedicated panel to the right of the chat, enabling iterative editing, version tracking, and full rewrites via natural language. CIO Intelligence Hub already has basic HTML preview in code blocks — this extends that into a first-class Artifacts system.

## Goals

1. **Artifact Detection** — Automatically detect when model output qualifies as an Artifact (complete HTML/SVG/ThreeJS/D3)
2. **Artifacts Panel** — Dock to the right of chat, show latest artifact with version history
3. **Version Selector** — Track all versions of an artifact, switch between them
4. **Targeted & Full Rewrites** — Allow the model to update or replace artifact content via chat
5. **Content Types** — Support: single-page HTML websites, SVG, ThreeJS visualizations, D3.js charts

---

## Part 1: Backend Design

### Artifact Detection

When streaming a chat response, the backend inspects output for Artifact-qualifying content:

**Trigger Conditions (all must be true):**
1. Content type is HTML, SVG, or contains `<canvas>` / ThreeJS / D3.js references
2. Content is "standalone" — HTML has `</html>` closing tag or complete structure; SVG has `<svg>` element
3. Length > 500 chars (avoids small snippets)
4. Content does NOT already exist as a code block within the message

**Detection Algorithm:**
```
1. During streaming, accumulate the output
2. Check for complete HTML documents: regex /<html[\s\S]*<\/html>/i
3. Check for standalone SVG: regex /<svg[\s\S]*<\/svg>/i
4. Check for ThreeJS: /<script[^>]*three/i AND /<canvas/i
5. Check for D3.js: /<script[^>]*d3/i AND /<svg/i
6. If detected, flag message as having_artifact = true
```

### Data Model

**Artifact**:
- `id`: str (UUID)
- `session_id`: str
- `message_id`: str (assistant message that generated it)
- `content`: str (the full artifact content)
- `content_type`: str ("html" | "svg" | "threejs" | "d3")
- `version`: int (starts at 1)
- `created_at`: float

**ArtifactSessionState**:
- `current_artifact_id`: str | null
- `versions`: list[Artifact] (all versions for current session)
- `active_version_index`: int

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/artifacts/current` | Get current artifact for session |
| GET | `/api/artifacts/:id` | Get specific artifact by ID |
| POST | `/api/artifacts` | Create new artifact (from model rewrite) |
| PUT | `/api/artifacts/:id` | Update artifact content |
| GET | `/api/artifacts/:id/version-history` | Get all versions of an artifact |
| POST | `/api/artifacts/detect` | Analyze message content for artifacts (called by frontend after streaming) |

**POST `/api/artifacts/detect`**
```json
// Request
{
  "content": "string"   // Full message content to analyze
}

// Response
{
  "has_artifact": true,
  "content_type": "html",
  "artifact_content": "<html>...</html>",
  "snippet": "first 200 chars..."
}
```

### Artifact Update Flow

When user asks to "change the color" or "rewrite":
1. Frontend detects artifact-update intent (keyword matching: "change", "update", "rewrite", "modify")
2. Frontend sends updated content to `POST /api/artifacts` or `PUT /api/artifacts/:id`
3. New version is created; frontend updates the panel

---

## Part 2: Frontend Design

### Layout

Add a resizable **Artifacts Panel** docked to the right side of the main chat area:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Sidebar │          Chat Area         │       Artifacts Panel         │
│         │                            │                                │
│  Chat   │  [User message]           │  ┌──────────────────────────┐  │
│  KB     │  [Assistant response]    │  │ Artifact preview         │  │
│  Notes  │                          │  │ (iframe or webgl)        │  │
│  About  │  [Follow-up prompts]      │  │                          │  │
│         │                          │  ├──────────────────────────┤  │
│         │                          │  │ [v1] [v2] [v3] ◀ version  │  │
│         │                          │  ├──────────────────────────┤  │
│         │                          │  │ [Copy] [Expand] [Close] │  │
│         │                          │  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Artifacts Panel Component (`ArtifactsPanel.jsx`)

**States:**
- `empty`: No artifact — show placeholder message "Generate code or HTML to create an artifact"
- `loading`: Fetching artifact — show spinner
- `rendering`: Content detected — show iframe/webgl preview
- `error`: Invalid content — show error with "View Raw" fallback

**Sub-components:**
- **Preview Frame**: `<iframe>` for HTML/SVG, `<canvas>` or ThreeJS renderer for WebGL
- **Version Bar**: Bottom-left chips showing v1, v2, v3... (clickable)
- **Action Bar**: Bottom-right — Copy, Expand (fullscreen), Close buttons

### Detection Trigger

After streaming completes:
1. Frontend calls `POST /api/artifacts/detect` with assistant message content
2. If `has_artifact: true`, open Artifacts Panel and render
3. If `followupInsertToInput` or user clicks edit, send update to model

### Artifact Content Types

**HTML (Single-page website):**
- Render in sandboxed `<iframe>` with srcdoc
- Style isolation: `sandbox="allow-scripts allow-same-origin"`
- Auto-resize iframe height to content

**SVG:**
- Inline SVG directly in DOM (not iframe) for better interaction
- If SVG is embedded in HTML, render as HTML

**ThreeJS:**
- Detect `<script>` tags loading ThreeJS CDN + `<canvas>`
- Initialize ThreeJS renderer pointing to canvas element
- Handle resize events

**D3.js:**
- Detect D3 CDN + SVG chart
- Initialize D3 in isolated scope
- Handle data binding if dynamic content

### Settings

Add to SettingsModal > Interface section:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `artifactsEnabled` | boolean | true | Enable Artifacts panel |
| `artifactsPanelWidth` | number | 45 | Panel width as percentage (30-60) |
| `artifactsAutoOpen` | boolean | true | Automatically open panel when artifact is created |

### State Management

In `useChat.js`:
```javascript
const [artifact, setArtifact] = useState(null)        // Current artifact
const [artifactVersions, setArtifactVersions] = useState([])
const [activeArtifactVersion, setActiveArtifactVersion] = useState(0)
const [artifactsPanelOpen, setArtifactsPanelOpen] = useState(false)

const detectArtifact = useCallback(async (content) => { ... })
const createArtifact = useCallback(async (content, contentType) => { ... })
const updateArtifact = useCallback(async (id, newContent) => { ... })
const switchArtifactVersion = useCallback(async (versionIndex) => { ... })
```

---

## Part 3: Version Tracking

### Version Selector UI

- Bottom-left of Artifacts panel
- Horizontal chip list: `[v1] [v2] [v3]`
- Active version highlighted (accent border)
- Click to switch — replaces preview instantly (no re-render from backend)
- Max 10 versions stored (configurable); oldest dropped when exceeded

### Version History

```
v1: Initial HTML website (2024-01-15 10:30)
v2: Changed header color (2024-01-15 10:32)
v3: Redesigned with new layout (2024-01-15 10:35)
```

- Stored in backend as ordered list
- Each version: id, content, timestamp, label (optional user description)

---

## Part 4: Edit & Iteration Flow

### Targeted Updates

User says: "Change the bar chart color from blue to red"

1. Frontend detects update intent from user message
2. Appends as context: "Current artifact content:\n[content]\n\nUser request: change bar chart color from blue to red"
3. Send to `/api/chat` with artifact ID attached
4. Backend generates updated content
5. New version created; panel updates to show new version

### Full Rewrites

User says: "Rewrite this as a landing page"

1. Same flow as targeted update, but prompt says "completely rewrite"
2. New artifact created (new version)

### Model Instructions for Artifact Updates

System prompt for artifact-capable models:
```
When generating HTML, SVG, ThreeJS, or D3.js visualizations, output the complete standalone code.
Wrap artifact content in markers:
<!-- ARTIFACT START -->
[content here]
<!-- ARTIFACT END -->
```

---

## Part 5: File Structure

```
frontend/src/
├── components/
│   ├── ArtifactsPanel.jsx       # New: main panel container
│   ├── ArtifactPreview.jsx      # New: iframe/canvas renderer
│   ├── VersionSelector.jsx      # New: version chips
│   ├── ChatMessage.jsx          # Modify: detect artifacts after streaming
│   └── ChatInput.jsx           # Modify: handle artifact update intents
├── hooks/
│   └── useChat.js               # Add artifact state and functions
└── App.jsx                      # Modify: add ArtifactsPanel layout

backend/
├── main.py                      # Add artifact routes
├── artifacts.py                 # New: artifact detection, storage, versioning
└── followups.py                 # (existing)
```

---

## Part 6: Dependencies

Frontend:
- `iframe-resizer` (optional, for auto-sizing iframes) — or use built-in postMessage

Backend:
- No new dependencies (content detection via regex)
- Existing SQLite storage for artifacts table

---

## Implementation Order

### Phase 1 — Detection & Storage
1. Add artifacts table to SQLite schema
2. Create `artifacts.py` with detection logic
3. Add `/api/artifacts` endpoints to `main.py`
4. Implement `POST /api/artifacts/detect` with HTML/SVG/ThreeJS/D3 detection

### Phase 2 — Panel UI
5. Create `ArtifactsPanel.jsx` layout with placeholder
6. Add panel toggle state to App.jsx
7. Implement `ArtifactPreview.jsx` with sandboxed iframe
8. Wire artifact detection after streaming completes

### Phase 3 — Versioning
9. Implement version storage and retrieval
10. Build `VersionSelector.jsx` chips
11. Add version switching (instant, no backend round-trip for display)

### Phase 4 — Iteration
12. Detect artifact-update intents in user messages
13. Build update flow: context → model → new version
14. Add settings to SettingsModal

### Phase 5 — Polish
15. Add "Expand to fullscreen" modal view
16. Add Copy raw content button
17. Handle resize events for responsive preview
18. ThreeJS/D3.js rendering (if time allows, can be stretch goal)
