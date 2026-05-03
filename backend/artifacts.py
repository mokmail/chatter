"""Artifact management for renderable content (HTML, SVG, Three.js, D3).

Each artifact is versioned: updates create a new version rather than
mutating in place.  Session state tracks which version is currently
active so users can browse the history of an artifact within a chat.
"""
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

# All artifact data is persisted to a single JSON file under the data directory.
DATA_DIR = Path(__file__).parent / "data"
ARTIFACTS_FILE = DATA_DIR / "artifacts.json"


class Artifact:
    """Represents a single artifact version."""
    def __init__(
        self,
        id: str,
        session_id: str,
        message_id: str,
        content: str,
        content_type: str,
        version: int = 1,
        created_at: Optional[float] = None,
    ):
        self.id = id
        self.session_id = session_id
        self.message_id = message_id
        self.content = content
        self.content_type = content_type
        self.version = version
        # Use provided timestamp or generate a new one
        self.created_at = created_at or datetime.now().timestamp()

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "message_id": self.message_id,
            "content": self.content,
            "content_type": self.content_type,
            "version": self.version,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)


class ArtifactSessionState:
    """Tracks the current artifact state for a chat session.

    Maintains a list of version IDs and an index into it so the
    frontend can navigate between versions.
    """
    def __init__(
        self,
        session_id: str,
        current_artifact_id: Optional[str] = None,
        versions: Optional[list] = None,
        active_version_index: int = 0,
    ):
        self.session_id = session_id
        self.current_artifact_id = current_artifact_id
        self.versions = versions or []
        self.active_version_index = active_version_index

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "current_artifact_id": self.current_artifact_id,
            "versions": self.versions,
            "active_version_index": self.active_version_index,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            session_id=data["session_id"],
            current_artifact_id=data.get("current_artifact_id"),
            versions=data.get("versions", []),
            active_version_index=data.get("active_version_index", 0),
        )


def _load_artifacts() -> dict:
    """Load artifacts from the JSON file. Returns empty structure if missing."""
    if ARTIFACTS_FILE.exists():
        with open(ARTIFACTS_FILE) as f:
            return json.load(f)
    return {"artifacts": {}, "sessions": {}}


def _save_artifacts(data: dict) -> None:
    """Persist artifacts to disk, ensuring the data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(ARTIFACTS_FILE, "w") as f:
        json.dump(data, f, indent=2)


# Minimum content length to even consider artifact detection — short
# messages are unlikely to contain renderable artifacts.
_MIN_ARTIFACT_LENGTH = 500


def detect_artifact_content(content: str) -> Optional[dict]:
    """Detect if content contains a renderable artifact.

    Returns dict with:
        - has_artifact: bool
        - content_type: str ("html", "svg", "threejs", "d3")
        - artifact_content: str
        - snippet: str (first 200 chars)
    """
    if not content or len(content) < _MIN_ARTIFACT_LENGTH:
        return {"has_artifact": False}

    # Extract the first fenced code block (optionally labelled as html)
    code_block_match = re.search(r"```(?:html)?\s*([\s\S]*?)```", content)
    if not code_block_match:
        return {"has_artifact": False}

    code = code_block_match.group(1).strip()

    # Detect specific artifact types — only recognise something as an
    # artifact if it is a *complete*, self-contained renderable page.
    is_svg = code.startswith("<svg") or 'xmlns="http://www.w3.org/2000/svg"' in code
    is_full_html = "<!DOCTYPE" in code or "<html" in code or ("<head" in code and "<body" in code)
    has_threejs = re.search(r"<script[^>]*three", code, re.I) and "<canvas" in code
    has_d3 = re.search(r"<script[^>]*d3", code, re.I) and "<svg" in code

    if not is_svg and not is_full_html and not has_threejs and not has_d3:
        return {"has_artifact": False}

    # Priority: svg > threejs > d3 > html
    content_type = "svg" if is_svg else "threejs" if has_threejs else "d3" if has_d3 else "html"

    return {
        "has_artifact": True,
        "content_type": content_type,
        "artifact_content": code,
        # Provide a short preview for the frontend to show in collapsed state
        "snippet": code[:200] + "..." if len(code) > 200 else code,
    }


def create_artifact(
    session_id: str,
    message_id: str,
    content: str,
    content_type: str,
) -> Artifact:
    """Create a new artifact and initialise its session state."""
    data = _load_artifacts()

    artifact_id = str(uuid.uuid4())
    artifact = Artifact(
        id=artifact_id,
        session_id=session_id,
        message_id=message_id,
        content=content,
        content_type=content_type,
        version=1,
    )

    data["artifacts"][artifact_id] = artifact.to_dict()

    # Each session tracks which artifact is active and a list of version IDs
    if session_id not in data["sessions"]:
        data["sessions"][session_id] = {
            "session_id": session_id,
            "current_artifact_id": artifact_id,
            "versions": [artifact_id],
            "active_version_index": 0,
        }

    _save_artifacts(data)
    return artifact


def get_artifact(artifact_id: str) -> Optional[Artifact]:
    """Retrieve an artifact by ID."""
    data = _load_artifacts()
    artifact_data = data["artifacts"].get(artifact_id)
    if artifact_data:
        return Artifact.from_dict(artifact_data)
    return None


def get_current_artifact(session_id: str) -> Optional[Artifact]:
    """Return the currently active artifact for a session."""
    data = _load_artifacts()
    session = data["sessions"].get(session_id)
    if not session or not session.get("current_artifact_id"):
        return None
    return get_artifact(session["current_artifact_id"])


def update_artifact(artifact_id: str, new_content: str) -> Optional[Artifact]:
    """Update an artifact's content, creating a new version.

    Rather than mutating the existing artifact in place, we create a
    brand-new Artifact with an incremented version number.  The session
    state is then updated so that the new version becomes active.
    """
    data = _load_artifacts()
    artifact_data = data["artifacts"].get(artifact_id)
    if not artifact_data:
        return None

    # Carry over metadata from the old version; only content and version change
    old_artifact = Artifact.from_dict(artifact_data)
    new_artifact = Artifact(
        id=str(uuid.uuid4()),
        session_id=old_artifact.session_id,
        message_id=old_artifact.message_id,
        content=new_content,
        content_type=old_artifact.content_type,
        version=old_artifact.version + 1,
    )

    data["artifacts"][new_artifact.id] = new_artifact.to_dict()

    # Point the session to the new version and append it to the history
    session_id = old_artifact.session_id
    if session_id in data["sessions"]:
        session = data["sessions"][session_id]
        session["current_artifact_id"] = new_artifact.id
        session["versions"].append(new_artifact.id)
        session["active_version_index"] = len(session["versions"]) - 1

    _save_artifacts(data)
    return new_artifact


def get_artifact_versions(session_id: str) -> list[Artifact]:
    """Get all versions of the current artifact for a session."""
    data = _load_artifacts()
    session = data["sessions"].get(session_id)
    if not session or not session.get("versions"):
        return []

    artifacts = []
    for vid in session["versions"]:
        artifact_data = data["artifacts"].get(vid)
        if artifact_data:
            artifacts.append(Artifact.from_dict(artifact_data))
    return artifacts


def switch_artifact_version(session_id: str, version_index: int) -> Optional[Artifact]:
    """Switch to a specific version by index and persist the change."""
    data = _load_artifacts()
    session = data["sessions"].get(session_id)
    if not session or version_index >= len(session["versions"]):
        return None

    # Update the active index so the frontend knows which version to display
    session["active_version_index"] = version_index
    artifact_id = session["versions"][version_index]
    _save_artifacts(data)

    return get_artifact(artifact_id)