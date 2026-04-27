"""Chat history management with branching, editing, evaluating, continue, regenerate."""
import json
import time
import uuid
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single chat message."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: float = Field(default_factory=time.time)
    knowledge_base_ids: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    rating: Optional[str] = None
    parent_id: Optional[str] = None
    children_ids: list[str] = Field(default_factory=list)
    reasoning: str = ""


class ChatSession(BaseModel):
    """A chat session with its metadata."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    messages: list[ChatMessage] = Field(default_factory=list)
    knowledge_base_ids: list[str] = Field(default_factory=list)
    active_model: str = ""
    active_provider_id: str = ""
    created_at: float = Field(default_factory=time.time)
    branch_root_id: Optional[str] = None
    archived_at: Optional[float] = None
    title: Optional[str] = None
    is_unread: bool = False
    tags: list[str] = Field(default_factory=list)
    updated_at: float = Field(default_factory=time.time)


class ChatHistory:
    """File-based chat history storage with branching support."""

    def __init__(self):
        self.sessions_dir = Path.home() / ".chatter" / "sessions"
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.active_session_file = Path.home() / ".chatter" / "active_session.json"
        self._ensure_active_session()

    def _ensure_active_session(self):
        if not self.active_session_file.exists():
            session = ChatSession()
            self._save_session(session)
            self._set_active_id(session.id)

    def _session_path(self, session_id: str) -> Path:
        return self.sessions_dir / f"{session_id}.json"

    def _set_active_id(self, session_id: str):
        self.active_session_file.write_text(json.dumps({"active_session_id": session_id}))

    def _get_active_id(self) -> str:
        if self.active_session_file.exists():
            try:
                return json.loads(self.active_session_file.read_text()).get("active_session_id", "")
            except Exception:
                pass
        return ""

    def _load_session(self, session_id: str) -> Optional[ChatSession]:
        path = self._session_path(session_id)
        if path.exists():
            try:
                data = json.loads(path.read_text())
                if data.get("messages"):
                    data["messages"] = [ChatMessage(**m) for m in data["messages"]]
                return ChatSession(**data)
            except Exception:
                pass
        return None

    def _save_session(self, session: ChatSession) -> None:
        path = self._session_path(session.id)
        path.write_text(json.dumps(session.model_dump(), indent=2))

    def _create_session(self) -> ChatSession:
        session = ChatSession()
        self._save_session(session)
        self._set_active_id(session.id)
        return session

    def _load_all_sessions(self) -> list[ChatSession]:
        sessions = []
        for path in self.sessions_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text())
                if data.get("messages"):
                    data["messages"] = [ChatMessage(**m) for m in data["messages"]]
                sessions.append(ChatSession(**data))
            except Exception:
                continue
        return sessions

    def get_session(self) -> ChatSession:
        """Load the current active session (or create new one)."""
        active_id = self._get_active_id()
        session = self._load_session(active_id) if active_id else None
        if not session:
            session = self._create_session()
        return session

    def switch_session(self, session_id: str) -> Optional[ChatSession]:
        """Switch to an existing session."""
        session = self._load_session(session_id)
        if session:
            self._set_active_id(session_id)
        return session

    def list_sessions(self) -> list[dict]:
        """List all available sessions."""
        sessions = []
        for session in self._load_all_sessions():
            sessions.append({
                "id": session.id,
                "message_count": len(session.messages),
                "created_at": session.created_at,
                "updated_at": session.updated_at,
                "branch_root_id": session.branch_root_id,
                "preview": session.messages[0].content[:80] if session.messages else "",
                "archived": session.archived_at is not None,
                "archived_at": session.archived_at,
                "title": session.title,
                "is_unread": session.is_unread,
                "tags": session.tags,
            })
        sessions.sort(key=lambda s: (s["archived"], -s["created_at"]))
        return sessions

    def add_message(self, role: str, content: str, knowledge_base_ids: list[str] = None, notes: list[str] = None, parent_id: str = None, reasoning: str = "") -> ChatMessage:
        """Add a new message to the current session."""
        session = self.get_session()
        msg = ChatMessage(
            role=role,
            content=content,
            knowledge_base_ids=knowledge_base_ids or [],
            notes=notes or [],
            parent_id=parent_id,
            reasoning=reasoning,
        )
        if parent_id:
            parent = next((m for m in session.messages if m.id == parent_id), None)
            if parent:
                parent.children_ids.append(msg.id)

        session.messages.append(msg)
        if knowledge_base_ids:
            session.knowledge_base_ids = list(set(session.knowledge_base_ids + knowledge_base_ids))
        self._save_session(session)
        return msg

    def get_messages(self) -> list[ChatMessage]:
        """Get all messages from current session."""
        return self.get_session().messages

    def get_message(self, msg_id: str) -> Optional[ChatMessage]:
        """Get a specific message by ID."""
        session = self.get_session()
        for m in session.messages:
            if m.id == msg_id:
                return m
        return None

    def edit_message(self, msg_id: str, new_content: str) -> Optional[ChatMessage]:
        """Edit a message's content. Removes all messages after it (creating a branch)."""
        session = self.get_session()
        idx = next((i for i, m in enumerate(session.messages) if m.id == msg_id), None)
        if idx is None:
            return None

        msg = session.messages[idx]
        msg.content = new_content
        msg.timestamp = time.time()

        session.messages = session.messages[:idx + 1]
        self._save_session(session)
        return msg

    def delete_message(self, msg_id: str) -> bool:
        """Delete a message by id. Returns True if found and removed."""
        session = self.get_session()
        idx = next((i for i, m in enumerate(session.messages) if m.id == msg_id), None)
        if idx is None:
            return False
        session.messages.pop(idx)
        self._save_session(session)
        return True

    def evaluate_message(self, msg_id: str, rating: Optional[str]) -> Optional[ChatMessage]:
        """Rate a message (good/bad), or None to clear rating."""
        session = self.get_session()
        msg = next((m for m in session.messages if m.id == msg_id), None)
        if not msg:
            return None
        msg.rating = rating
        self._save_session(session)
        return msg

    def branch_from_message(self, msg_id: str) -> ChatSession:
        """Create a new session that branches from a specific message.
        All messages up to and including msg_id are copied to the new session.
        """
        source_session = self.get_session()
        idx = next((i for i, m in enumerate(source_session.messages) if m.id == msg_id), None)
        if idx is None:
            return source_session

        branch_messages = source_session.messages[:idx + 1]
        branch_messages = [ChatMessage(**m.model_dump()) for m in branch_messages]

        new_session = ChatSession(
            messages=branch_messages,
            knowledge_base_ids=list(source_session.knowledge_base_ids),
            active_model=source_session.active_model,
            active_provider_id=source_session.active_provider_id,
            branch_root_id=msg_id,
        )
        self._save_session(new_session)
        self._set_active_id(new_session.id)
        return new_session

    def fork_from_message(self, msg_id: str) -> ChatSession:
        """Create a brand new standalone session that starts with the context
        up to (and including) a given message. Unlike branch which stays linked,
        fork is a fresh copy.
        """
        return self.branch_from_message(msg_id)

    def continue_from_last(self) -> Optional[ChatMessage]:
        """Mark last assistant message as parent for the next user message.
        Returns the last message (assistant or user).
        """
        session = self.get_session()
        if not session.messages:
            return None
        return session.messages[-1]

    def regenerate_last(self) -> Optional[ChatMessage]:
        """Remove the last assistant message so it can be regenerated.
        Returns the removed message if found, or None.
        """
        session = self.get_session()
        if not session.messages or session.messages[-1].role != "assistant":
            return None
        removed = session.messages.pop()
        self._save_session(session)
        return removed

    def clear(self) -> None:
        """Clear the current session (creates a new one)."""
        self._create_session()

    def delete_session(self, session_id: str) -> bool:
        """Delete a specific session and its file. Returns True if deleted."""
        path = self._session_path(session_id)
        if path.exists():
            path.unlink()
            # If we deleted the active session, create a fresh one
            if self._get_active_id() == session_id:
                self._create_session()
            return True
        return False

    def archive_session(self, session_id: str) -> bool:
        """Archive a specific session. Returns True if archived."""
        session = self._load_session(session_id)
        if not session:
            return False

        session.archived_at = time.time()
        self._save_session(session)

        if self._get_active_id() == session_id:
            self._create_session()
        return True

    def archive_all_sessions(self) -> int:
        """Archive all sessions. Returns the number archived."""
        sessions = self._load_all_sessions()
        archived_count = 0
        for session in sessions:
            if session.archived_at is None:
                session.archived_at = time.time()
                self._save_session(session)
                archived_count += 1

        if sessions:
            self._create_session()
        return archived_count

    def delete_all_sessions(self) -> int:
        """Delete all sessions. Returns the number removed."""
        sessions = list(self.sessions_dir.glob("*.json"))
        removed_count = 0
        for path in sessions:
            try:
                path.unlink()
                removed_count += 1
            except Exception:
                continue

        if self.active_session_file.exists():
            try:
                self.active_session_file.unlink()
            except Exception:
                pass

        self._create_session()
        return removed_count

    def update_session_kb(self, kb_ids: list[str]) -> None:
        """Update the session's active KB list."""
        session = self.get_session()
        session.knowledge_base_ids = list(set(session.knowledge_base_ids + kb_ids))
        self._save_session(session)

    def get_session_kbs(self) -> list[str]:
        """Get the KB IDs associated with this session."""
        return self.get_session().knowledge_base_ids


_history = ChatHistory()


def get_history() -> list[ChatMessage]:
    """Get all chat messages."""
    return _history.get_messages()


def add_to_history(role: str, content: str, knowledge_base_ids: list[str] = None, notes: list[str] = None, parent_id: str = None, reasoning: str = "") -> ChatMessage:
    """Add a message to history."""
    return _history.add_message(role, content, knowledge_base_ids, notes, parent_id, reasoning)


def clear_history() -> None:
    """Clear chat history."""
    _history.clear()


def list_sessions() -> list[dict]:
    return _history.list_sessions()


def switch_session(session_id: str) -> Optional[ChatSession]:
    return _history.switch_session(session_id)


def delete_chat_session(session_id: str) -> bool:
    return _history.delete_session(session_id)


def archive_chat_session(session_id: str) -> bool:
    return _history.archive_session(session_id)


def archive_all_chat_sessions() -> int:
    return _history.archive_all_sessions()


def delete_all_chat_sessions() -> int:
    return _history.delete_all_sessions()


def get_session() -> ChatSession:
    return _history.get_session()


def edit_message(msg_id: str, new_content: str) -> Optional[ChatMessage]:
    return _history.edit_message(msg_id, new_content)


def evaluate_message(msg_id: str, rating: Optional[str]) -> Optional[ChatMessage]:
    return _history.evaluate_message(msg_id, rating)


def delete_message(msg_id: str) -> bool:
    return _history.delete_message(msg_id)


def branch_from_message(msg_id: str) -> ChatSession:
    return _history.branch_from_message(msg_id)


def fork_from_message(msg_id: str) -> ChatSession:
    return _history.fork_from_message(msg_id)


def regenerate_last() -> Optional[ChatMessage]:
    return _history.regenerate_last()


def get_last_message() -> Optional[ChatMessage]:
    return _history.continue_from_last()


def get_message_by_id(msg_id: str) -> Optional[ChatMessage]:
    return _history.get_message(msg_id)


def get_session_kbs() -> list[str]:
    """Get the KB IDs for the current session."""
    return _history.get_session_kbs()


def update_session_kb(kb_ids: list[str]) -> None:
    """Update the session's active KB list."""
    _history.update_session_kb(kb_ids)


def update_session(session_id: str, title: Optional[str] = None, tags: Optional[list[str]] = None, archived: Optional[bool] = None) -> Optional[ChatSession]:
    """Update session metadata (title, tags, archive status)."""
    session = _history._load_session(session_id)
    if not session:
        return None
    if title is not None:
        session.title = title
    if tags is not None:
        session.tags = tags
    if archived is not None:
        if archived:
            session.archived_at = time.time()
        else:
            session.archived_at = None
    session.updated_at = time.time()
    _history._save_session(session)
    return session


def mark_session_read(session_id: str) -> bool:
    """Mark a session as read."""
    session = _history._load_session(session_id)
    if not session:
        return False
    session.is_unread = False
    _history._save_session(session)
    return True


def mark_session_unread(session_id: str) -> bool:
    """Mark a session as unread."""
    session = _history._load_session(session_id)
    if not session:
        return False
    session.is_unread = True
    _history._save_session(session)
    return True


def export_session(session_id: str) -> Optional[dict]:
    """Export a session as a dictionary (for JSON export)."""
    session = _history._load_session(session_id)
    if not session:
        return None
    return session.model_dump()


def import_session(data: dict) -> ChatSession:
    """Import a session from a dictionary."""
    if data.get("messages"):
        data["messages"] = [ChatMessage(**m) for m in data["messages"]]
    session = ChatSession(**data)
    # Generate new ID to avoid conflicts
    session.id = str(uuid.uuid4())
    _history._save_session(session)
    return session


def search_history(query: str, search_type: str = "all", limit: int = 20) -> list[dict]:
    """Search across session titles and message content."""
    if not query:
        return []

    query_lower = query.lower()
    results = []

    for session in _history._load_all_sessions():
        # Skip archived by default
        if session.archived_at:
            continue

        relevance_score = 0.0
        match_type = None
        snippet = ""

        # Search in title
        if session.title and search_type in ("all", "title", "tag"):
            title_lower = session.title.lower()
            if query_lower in title_lower:
                relevance_score = max(relevance_score, 0.9)
                match_type = "title"
                snippet = session.title[:100]
            # Also check for word boundary matches
            elif any(word.startswith(query_lower) for word in title_lower.split()):
                relevance_score = max(relevance_score, 0.7)
                match_type = "title"
                snippet = session.title[:100]

        # Search in tags
        if search_type in ("all", "tag"):
            for tag in session.tags:
                tag_lower = tag.lower()
                if query_lower in tag_lower or any(word.startswith(query_lower) for word in tag_lower.split()):
                    relevance_score = max(relevance_score, 0.85)
                    match_type = "tag"
                    snippet = f"Tag: {tag}"
                    break

        # Search in message content
        if search_type in ("all", "content"):
            for msg in session.messages:
                if not msg.content:
                    continue
                content_lower = msg.content.lower()
                if query_lower in content_lower:
                    relevance_score = max(relevance_score, 0.7)
                    match_type = "content"
                    # Extract snippet around match
                    idx = content_lower.find(query_lower)
                    start = max(0, idx - 50)
                    end = min(len(msg.content), idx + len(query) + 100)
                    snippet = msg.content[start:end]
                    if start > 0:
                        snippet = "..." + snippet
                    if end < len(msg.content):
                        snippet = snippet + "..."
                    break
                # Also check for partial word matches
                elif any(word.startswith(query_lower) for word in content_lower.split()[:10]):
                    relevance_score = max(relevance_score, 0.5)
                    match_type = "content"
                    snippet = msg.content[:150] + "..." if len(msg.content) > 150 else msg.content
                    break

        if relevance_score > 0:
            first_msg = session.messages[0] if session.messages else None
            title = session.title or (first_msg.content[:50] if first_msg and first_msg.content else "Untitled")
            results.append({
                "session_id": session.id,
                "title": title,
                "snippet": snippet,
                "match_type": match_type,
                "relevance_score": relevance_score,
                "timestamp": session.updated_at,
            })

    # Sort by relevance
    results.sort(key=lambda r: -r["relevance_score"])
    return results[:limit]
