# Roleplay Engine 2.0 — Reimagined & Content Protection

## Overview
This specification covers the transformation of the Roleplay Engine into a cinematic, immersive "Visual Novel / RPG" experience. It integrates a state-aware narrative platform with dynamic visuals, character stats, and a modular architecture, alongside the previously defined content protection system.

## 1. Design Vision
The Roleplay Engine moves away from a standard chat interface to a cinematic presentation:
- **Visual Novel Aesthetic**: Split-screen view with a character profile on the left and a dialogue scene on the right.
- **Glassmorphism**: High-quality frosted glass effects, vibrant accents, and smooth transitions.
- **Dynamic Backgrounds**: Scenes are set against blurred, high-resolution imagery that reflects the current location.

## 2. Character RPG Mechanics
Characters now possess dynamic states tracked during the session:
- **Relationship Stats**: A visual "Bond" or "Affinity" meter (0-100%) tracking how close the user is to the character.
- **Mood Tracking**: Displays the character's current emotional disposition (e.g., Calm, Hostile, Excited).
- **Physical States**: (Future) Tracking energy, health, or other relevant attributes.

## 3. Architecture & Components
The engine is broken down into modular components for better maintainability and polish:

| Component | Description |
|---|---|
| `RPSceneCanvas` | The orchestrator of the background atmosphere and scene transitions. |
| `RPCharacterCard` | Displays the high-res avatar, bio, and dynamic RPG stats. |
| `RPDialogueBox` | Cinematic chat interface for message history and "Action" inputs. |
| `RPSessionControls` | Collapsible management for scenario settings and content protection. |

## 4. Content Protection (Core Guardrails)
- **Enabled by Default**: All sessions start with protection enabled.
- **Three-Tier Filtering**:
    - **User Input**: Checked via `content_filter.py` before sending.
    - **LLM Streaming**: Chunks containing blocked content are replaced with `[content filtered]`.
    - **System-Wide**: Character creation and system prompts are also validated.
- **UI shortcut**: Blocked messages include a "Disable Protection" button that triggers a confirmation modal.

## 5. Technical Data Flow
1. **Action Sent**: User input is sent to `/api/chat` with `is_roleplay: true`.
2. **Context Assembly**: Backend assembles character bio, user role, scene setting, and character states into a structured system prompt.
3. **Filtering**: Input and output are passed through the global `ContentFilter`.
4. **State Sync**: Frontend syncs relationship and mood states (mocked for now, real tracking coming in Phase 2).

## Files Involved
- `backend/content_filter.py` (Protection Logic)
- `frontend/src/components/RoleplayEngine.jsx` (Main Orchestrator)
- `frontend/src/components/roleplay/` (Modular UI Components)
- `frontend/src/index.css` (Visual Design Tokens)
