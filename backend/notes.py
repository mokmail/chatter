"""Persistent Notes management with agentic tool calling support."""
import json
import time
import uuid
from pathlib import Path
from typing import Optional, Literal

from pydantic import BaseModel, Field


class NoteMessage(BaseModel):
    """A single message in a note's chat history."""
    role: str
    content: str
    timestamp: float = Field(default_factory=time.time)


class Note(BaseModel):
    """A persistent note."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str = ""
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    tags: list[str] = Field(default_factory=list)
    archived: bool = False
    pinned: bool = False
    note_type: Literal['rich', 'simple', 'voice', 'meeting', 'research', 'project', 'daily', 'documentation', 'bug', 'feature', 'recipe', 'book'] = 'rich'
    chat_history: list[NoteMessage] = Field(default_factory=list)


class NotesStore:
    """File-based notes storage."""

    def __init__(self):
        self.dir_path = Path.home() / ".cio-intelligence-hub" / "notes"
        self.dir_path.mkdir(parents=True, exist_ok=True)

    def _note_file(self, note_id: str) -> Path:
        return self.dir_path / f"{note_id}.json"

    def list_all(self, include_archived: bool = False) -> list[Note]:
        """List all notes, optionally including archived ones."""
        notes = []
        for f in self.dir_path.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                note = Note(**data)
                if include_archived or not note.archived:
                    notes.append(note)
            except Exception:
                continue
        return sorted(notes, key=lambda x: x.updated_at, reverse=True)

    def get(self, note_id: str) -> Note | None:
        """Get a note by ID."""
        path = self._note_file(note_id)
        if not path.exists():
            return None
        try:
            return Note(**json.loads(path.read_text()))
        except Exception:
            return None

    def create(self, title: str, content: str = "", tags: list[str] = None, note_type: str = 'rich') -> Note:
        """Create a new note."""
        note = Note(title=title, content=content, tags=tags or [], note_type=note_type)
        self._save(note)
        return note

    def update(self, note_id: str, title: str = None, content: str = None, tags: list[str] = None, pinned: bool = None, note_type: str = None) -> Note | None:
        """Update a note's fields."""
        note = self.get(note_id)
        if not note:
            return None
        if title is not None:
            note.title = title
        if content is not None:
            note.content = content
        if tags is not None:
            note.tags = tags
        if pinned is not None:
            note.pinned = pinned
        if note_type is not None:
            note.note_type = note_type
        note.updated_at = time.time()
        self._save(note)
        return note

    def replace_content(self, note_id: str, new_content: str) -> Note | None:
        """Replace the entire content of a note."""
        note = self.get(note_id)
        if not note:
            return None
        note.content = new_content
        note.updated_at = time.time()
        self._save(note)
        return note

    def delete(self, note_id: str) -> bool:
        """Permanently delete a note."""
        path = self._note_file(note_id)
        if path.exists():
            path.unlink()
            return True
        return False

    def archive(self, note_id: str) -> Note | None:
        """Archive a note (soft delete)."""
        note = self.get(note_id)
        if not note:
            return None
        note.archived = True
        note.updated_at = time.time()
        self._save(note)
        return note

    def search(self, query: str) -> list[Note]:
        """Search notes by title or content (case-insensitive)."""
        query_lower = query.lower()
        results = []
        for note in self.list_all(include_archived=True):
            if query_lower in note.title.lower() or query_lower in note.content.lower():
                results.append(note)
        return sorted(results, key=lambda x: x.updated_at, reverse=True)

    def _save(self, note: Note) -> None:
        """Save note to file."""
        path = self._note_file(note.id)
        path.write_text(json.dumps(note.model_dump(), indent=2))


_store = NotesStore()


def list_notes(include_archived: bool = False) -> list[Note]:
    """List all notes."""
    return _store.list_all(include_archived=include_archived)


def get_note(note_id: str) -> Note | None:
    """Get a note by ID."""
    return _store.get(note_id)


def create_note(title: str, content: str = "", tags: list[str] = None, note_type: str = 'rich') -> Note:
    """Create a new note."""
    return _store.create(title, content, tags, note_type)


def update_note(note_id: str, title: str = None, content: str = None, tags: list[str] = None, pinned: bool = None, note_type: str = None) -> Note | None:
    """Update a note."""
    return _store.update(note_id, title, content, tags, pinned, note_type)


def replace_note_content(note_id: str, new_content: str) -> Note | None:
    """Replace the entire content of a note."""
    return _store.replace_content(note_id, new_content)


def delete_note(note_id: str) -> bool:
    """Delete a note."""
    return _store.delete(note_id)


def archive_note(note_id: str) -> Note | None:
    """Archive a note."""
    return _store.archive(note_id)


def search_notes(query: str) -> list[Note]:
    """Search notes by query."""
    return _store.search(query)


def add_note_message(note_id: str, role: str, content: str) -> Note | None:
    """Add a message to a note's chat history."""
    note = _store.get(note_id)
    if not note:
        return None
    note.chat_history.append(NoteMessage(role=role, content=content))
    note.updated_at = time.time()
    _store._save(note)
    return note


def get_note_chat_history(note_id: str) -> list[NoteMessage] | None:
    """Get the chat history for a note."""
    note = _store.get(note_id)
    if not note:
        return None
    return note.chat_history


def clear_note_chat_history(note_id: str) -> Note | None:
    """Clear the chat history for a note."""
    note = _store.get(note_id)
    if not note:
        return None
    note.chat_history = []
    note.updated_at = time.time()
    _store._save(note)
    return note


# --- Tool Definitions for Agentic Calling ---

NOTE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_notes",
            "description": "Search for notes by title or content snippet. Returns a list of matching notes with their IDs, titles, and previews.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find notes by title or content."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "view_note",
            "description": "View the full content of a specific note by its ID. Use this after search_notes to get the complete content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note to view."
                    }
                },
                "required": ["note_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_note",
            "description": "Create a new note with a title and initial content. Use this when the user wants to save new information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the new note."
                    },
                    "content": {
                        "type": "string",
                        "description": "The initial content/body of the note."
                    }
                },
                "required": ["title", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "replace_note_content",
            "description": "Update the entire content of an existing note. Use this to overwrite or significantly revise a note's content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note to update."
                    },
                    "new_content": {
                        "type": "string",
                        "description": "The new content to replace the existing note content."
                    }
                },
                "required": ["note_id", "new_content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_note",
            "description": "Update specific fields of an existing note including title, content, tags, or pinned status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note to update."
                    },
                    "title": {
                        "type": "string",
                        "description": "The new title for the note."
                    },
                    "content": {
                        "type": "string",
                        "description": "The new content for the note."
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The new list of tags for the note."
                    },
                    "pinned": {
                        "type": "boolean",
                        "description": "Whether the note should be pinned."
                    }
                },
                "required": ["note_id"]
            }
        }
    }
]


def execute_note_tool(tool_name: str, arguments: dict) -> dict:
    """Execute a note tool and return the result."""
    try:
        if tool_name == "search_notes":
            query = arguments.get("query", "")
            results = search_notes(query)
            return {
                "success": True,
                "count": len(results),
                "notes": [
                    {"id": n.id, "title": n.title, "preview": n.content[:200], "updated_at": n.updated_at}
                    for n in results
                ]
            }

        elif tool_name == "view_note":
            note_id = arguments.get("note_id", "")
            note = get_note(note_id)
            if not note:
                return {"success": False, "error": f"Note with ID '{note_id}' not found."}
            return {
                "success": True,
                "note": {
                    "id": note.id,
                    "title": note.title,
                    "content": note.content,
                    "created_at": note.created_at,
                    "updated_at": note.updated_at,
                    "tags": note.tags
                }
            }

        elif tool_name == "write_note":
            title = arguments.get("title", "")
            content = arguments.get("content", "")
            if not title:
                return {"success": False, "error": "Title is required to create a note."}
            note = create_note(title=title, content=content)
            return {
                "success": True,
                "note": {
                    "id": note.id,
                    "title": note.title,
                    "content": note.content,
                    "created_at": note.created_at
                }
            }

        elif tool_name == "replace_note_content":
            note_id = arguments.get("note_id", "")
            new_content = arguments.get("new_content", "")
            note = replace_note_content(note_id, new_content)
            if not note:
                return {"success": False, "error": f"Note with ID '{note_id}' not found."}
            return {
                "success": True,
                "note": {
                    "id": note.id,
                    "title": note.title,
                    "content": note.content,
                    "updated_at": note.updated_at
                }
            }

        elif tool_name == "update_note":
            note_id = arguments.get("note_id", "")
            title = arguments.get("title")
            content = arguments.get("content")
            tags = arguments.get("tags")
            pinned = arguments.get("pinned")
            note = update_note(note_id, title=title, content=content, tags=tags, pinned=pinned)
            if not note:
                return {"success": False, "error": f"Note with ID '{note_id}' not found."}
            return {
                "success": True,
                "note": {
                    "id": note.id,
                    "title": note.title,
                    "content": note.content,
                    "tags": note.tags,
                    "pinned": note.pinned,
                    "updated_at": note.updated_at
                }
            }

        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        return {"success": False, "error": str(e)}
