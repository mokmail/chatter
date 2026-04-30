# Follow-Up Prompts Feature Specification

## Context

Open WebUI provides an intelligent follow-up prompt system that generates contextual follow-up questions after each AI response. This helps users explore topics further without manually typing new prompts. We need to implement this feature in CIO Intelligence Hub.

## Goals

1. Auto-generate follow-up question suggestions after each model response
2. Allow suggestions to appear as clickable chips below responses
3. Provide settings to control behavior (enable/disable, persistence, insertion mode)
4. Support regenerating follow-up suggestions

---

## Part 1: Backend Design

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/followups/generate` | Generate follow-up prompts for a given message |
| POST | `/api/followups/regenerate` | Regenerate follow-up prompts |

### Request/Response Shapes

**POST `/api/followups/generate`**
```json
// Request
{
  "message": "string",        // The assistant message to generate follow-ups for
  "context": ["string"],       // Recent conversation context (optional)
  "count": 3                  // Number of suggestions (default: 3)
}

// Response
{
  "suggestions": [
    { "id": "uuid", "text": "Follow-up question 1" },
    { "id": "uuid", "text": "Follow-up question 2" },
    { "id": "uuid", "text": "Follow-up question 3" }
  ]
}
```

**POST `/api/followups/regenerate`**
Same request/response as above — regenerates with different randomness.

### Implementation Notes

- Use the configured LLM (Ollama/OpenAI) to generate suggestions via a focused prompt
- Prompt engineering: ask model to generate 3 diverse, contextually relevant follow-up questions
- Store suggestions in memory only (not persisted to disk) — they are ephemeral
- Generation should be async/non-blocking on the chat path (client fetches separately or streams)

---

## Part 2: Frontend Design

### Settings

Add to existing Settings Modal under "Interface" section:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `followupAutoGenerate` | boolean | true | Auto-generate follow-up prompts after each response |
| `followupKeepInChat` | boolean | false | Keep follow-up prompts visible for all messages |
| `followupInsertToInput` | boolean | false | Insert text to input field instead of sending directly |

### UI Components

**FollowUpPrompts Component** (`FollowUpPrompts.jsx`)
- Renders 3 clickable chip buttons below a message
- Each chip shows the follow-up text
- Click behavior based on `followupInsertToInput` setting:
  - `false`: Immediately send as new message
  - `true`: Insert text into ChatInput field for editing before send
- Regenerate button (circular arrow icon) to get new suggestions
- States: loading (dots animation), loaded, error, empty

**Message Integration**
- Follow-up prompts appear below assistant messages only
- When `followupKeepInChat` is false: only show for most recent message
- When `followupKeepInChat` is true: show for any message that has suggestions stored

### State Management

In `useChat.js`:
```javascript
const [followups, setFollowups] = useState({})  // { [messageId]: [{ id, text }] }
```

New functions:
- `generateFollowups(messageId, messageText)` — call backend, store results
- `regenerateFollowups(messageId, messageText)` — regenerate for specific message
- `clearFollowups(messageId)` — remove suggestions for a message

### Chat Flow Integration

1. After streaming completes and assistant message is added to state
2. If `followupAutoGenerate` is true, automatically call `generateFollowups()`
3. Display suggestions below the assistant message

---

## Part 3: Visual Design

### Chip Styling

- Rounded-full pills with border and subtle background
- Hover: slightly elevated shadow, border color change
- Font: 13px, text-secondary color
- Padding: 6px 12px
- Gap between chips: 8px

### Colors

- Default chip: `var(--surface)` background, `var(--border)` border
- Hover: `var(--bg-hover)` background, `var(--accent)` border
- Regenerate button: icon only, `var(--text-tertiary)` color

### Layout

```
[Assistant Message Content]

[Follow-up 1] [Follow-up 2] [Follow-up 3]  [↻]
```

---

## Part 4: File Structure

```
frontend/src/
├── components/
│   ├── FollowUpPrompts.jsx       # New component
│   └── ChatMessage.jsx           # Add follow-up prompts below content
├── hooks/
│   └── useChat.js               # Add follow-up state and functions
└── App.jsx                      # Pass follow-up settings

backend/
├── main.py                      # Add follow-up routes
├── chat.py                      # (existing)
└── followups.py                 # New: follow-up generation logic
```

---

## Part 5: Dependencies

No new frontend dependencies. Backend uses existing LLM integration.

---

## Implementation Order

1. **Backend**: Create `followups.py`, add routes to `main.py`
2. **Frontend**: Add settings to SettingsModal
3. **Frontend**: Create `FollowUpPrompts.jsx` component
4. **Frontend**: Integrate into `ChatMessage.jsx`
5. **Frontend**: Add state management in `useChat.js`
6. **Testing**: E2E test the full flow
