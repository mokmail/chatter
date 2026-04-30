"""Roleplay Engine for CIO Intelligence Hub - Character and session management."""
import json
import uuid
from dataclasses import dataclass, field, asdict
from typing import Optional
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from content_filter import get_content_filter

# Storage path for roleplay data
DATA_DIR = Path(__file__).parent / "data"
ROLEPLAY_FILE = DATA_DIR / "roleplay.json"


@dataclass
class Character:
    """AI character definition."""
    id: str
    name: str
    description: str = ""
    personality: str = ""  # How the character behaves
    background: str = ""     # Character's backstory
    vocabulary: str = ""     # Speaking style/words they use
    knowledge: str = ""      # What the character knows
    constraints: str = ""    # Behavioral constraints/rules
    avatar: str = ""         # Optional avatar URL or emoji
    created_at: float = field(default_factory=lambda: __import__('time').time())
    updated_at: float = field(default_factory=lambda: __import__('time').time())


@dataclass
class UserRole:
    """User's role in the roleplay."""
    name: str = "User"
    description: str = ""
    background: str = ""
    relationship_to_character: str = ""  # How the user relates to the AI character


@dataclass
class RoleplaySession:
    """Active roleplay session state."""
    id: str
    mode: str = "Standard"  # "Standard" or "Roleplay"
    character_id: Optional[str] = None
    character: Optional[Character] = None
    user_role: UserRole = field(default_factory=UserRole)
    scene_setting: str = ""  # Current scene/location description
    memory_depth: str = "medium"  # "low", "medium", "high"
    temperature: float = 0.7
    custom_instructions: str = ""  # Extra system instructions
    is_active: bool = False
    created_at: float = field(default_factory=lambda: __import__('time').time())
    updated_at: float = field(default_factory=lambda: __import__('time').time())


class RoleplayEngine:
    """Manages roleplay characters and sessions."""
    
    def __init__(self):
        self._characters: dict[str, Character] = {}
        self._session: Optional[RoleplaySession] = None
        self._ensure_data_dir()
        self._load_data()
    
    def _ensure_data_dir(self):
        """Ensure data directory exists."""
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    def _load_data(self):
        """Load roleplay data from disk."""
        if not ROLEPLAY_FILE.exists():
            self._create_default_data()
            return
        
        try:
            with open(ROLEPLAY_FILE, 'r') as f:
                data = json.load(f)
            
            # Load characters
            for char_data in data.get('characters', []):
                char = Character(**char_data)
                self._characters[char.id] = char
            
            # Load session
            session_data = data.get('session')
            if session_data:
                # Reconstruct user_role as UserRole dataclass if stored as dict
                if isinstance(session_data.get('user_role'), dict):
                    session_data['user_role'] = UserRole(**session_data['user_role'])
                self._session = RoleplaySession(**session_data)
                # Restore character reference
                if self._session.character_id and self._session.character_id in self._characters:
                    self._session.character = self._characters[self._session.character_id]
        except Exception as e:
            print(f"Error loading roleplay data: {e}")
            self._create_default_data()
    
    def _save_data(self):
        """Save roleplay data to disk."""
        data = {
            'characters': [asdict(c) for c in self._characters.values()],
            'session': asdict(self._session) if self._session else None
        }
        with open(ROLEPLAY_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _create_default_data(self):
        """Create default characters."""
        default_chars = [
            Character(
                id=str(uuid.uuid4()),
                name="Helpful Assistant",
                description="A helpful AI assistant",
                personality="Friendly, professional, and knowledgeable",
                vocabulary="Clear and concise language",
            ),
            Character(
                id=str(uuid.uuid4()),
                name="Wise Mentor",
                description="An experienced mentor offering guidance",
                personality="Patient, wise, encouraging, and thoughtful",
                vocabulary="Thoughtful and eloquent",
                background="A lifelong teacher who has guided many students",
            ),
            Character(
                id=str(uuid.uuid4()),
                name="Creative Storyteller",
                description="A creative writer and storyteller",
                personality="Imaginative, expressive, and enthusiastic",
                vocabulary="Vivid, descriptive, and colorful",
                background="A bard who has traveled the world collecting tales",
            ),
        ]
        for char in default_chars:
            self._characters[char.id] = char
        
        # Create default session
        self._session = RoleplaySession(
            id=str(uuid.uuid4()),
            mode="Standard",
            is_active=False
        )
        self._save_data()
    
    # --- Character Management ---
    
    def list_characters(self) -> list[Character]:
        """Get all characters."""
        return list(self._characters.values())
    
    def get_character(self, char_id: str) -> Optional[Character]:
        """Get a character by ID."""
        return self._characters.get(char_id)
    
    def create_character(self, **kwargs) -> tuple[Optional[Character], Optional[str]]:
        """Create a new character. Returns (character, error_message)."""
        text_fields = ['name', 'description', 'personality', 'background',
                       'vocabulary', 'knowledge', 'constraints']
        cf = get_content_filter()

        for field in text_fields:
            value = kwargs.get(field, '')
            if value and cf.should_block(value):
                return None, f"Content blocked in field '{field}' by content filter"

        char_id = kwargs.get('id') or str(uuid.uuid4())
        char = Character(id=char_id, **{k: v for k, v in kwargs.items() if k != 'id'})
        self._characters[char.id] = char
        self._save_data()
        return char, None
    
    def update_character(self, char_id: str, **kwargs) -> tuple[Optional[Character], Optional[str]]:
        """Update a character. Returns (character, error_message)."""
        char = self._characters.get(char_id)
        if not char:
            return None, None

        cf = get_content_filter()
        text_fields = ['name', 'description', 'personality', 'background',
                       'vocabulary', 'knowledge', 'constraints']

        for key, value in kwargs.items():
            if key in text_fields and value and cf.should_block(value):
                return None, f"Content blocked in field '{key}' by content filter"

        for key, value in kwargs.items():
            if hasattr(char, key):
                setattr(char, key, value)

        char.updated_at = __import__('time').time()
        self._save_data()
        return char, None
    
    def delete_character(self, char_id: str) -> bool:
        """Delete a character."""
        if char_id in self._characters:
            del self._characters[char_id]
            # If this character was active, clear it
            if self._session and self._session.character_id == char_id:
                self._session.character_id = None
                self._session.character = None
                self._session.is_active = False
            self._save_data()
            return True
        return False
    
    # --- Session Management ---
    
    def get_session(self) -> Optional[RoleplaySession]:
        """Get current session."""
        return self._session
    
    def set_mode(self, mode: str) -> RoleplaySession:
        """Set session mode (Standard or Roleplay)."""
        if not self._session:
            self._session = RoleplaySession(id=str(uuid.uuid4()))
        
        self._session.mode = mode
        self._session.is_active = (mode == "Roleplay")
        self._session.updated_at = __import__('time').time()
        self._save_data()
        return self._session
    
    def activate_roleplay(self, character_id: str, user_role: Optional[dict] = None,
                         scene_setting: str = "", memory_depth: str = "medium",
                         temperature: float = 0.7, custom_instructions: str = "") -> Optional[RoleplaySession]:
        """Activate roleplay mode with a character."""
        char = self._characters.get(character_id)
        if not char:
            return None
        
        if not self._session:
            self._session = RoleplaySession(id=str(uuid.uuid4()))
        
        self._session.mode = "Roleplay"
        self._session.character_id = character_id
        self._session.character = char
        self._session.user_role = UserRole(**user_role) if user_role else UserRole()
        self._session.scene_setting = scene_setting
        self._session.memory_depth = memory_depth
        self._session.temperature = temperature
        self._session.custom_instructions = custom_instructions
        self._session.is_active = True
        self._session.updated_at = __import__('time').time()
        
        self._save_data()
        return self._session
    
    def deactivate_roleplay(self) -> RoleplaySession:
        """Deactivate roleplay and return to Standard mode."""
        if not self._session:
            self._session = RoleplaySession(id=str(uuid.uuid4()))
        
        self._session.mode = "Standard"
        self._session.is_active = False
        self._session.character_id = None
        self._session.character = None
        self._session.updated_at = __import__('time').time()
        
        self._save_data()
        return self._session
    
    def update_session(self, **kwargs) -> Optional[RoleplaySession]:
        """Update session settings."""
        if not self._session:
            return None
        
        for key, value in kwargs.items():
            if hasattr(self._session, key):
                setattr(self._session, key, value)
        
        self._session.updated_at = __import__('time').time()
        self._save_data()
        return self._session
    
    def clear_session(self):
        """Clear the current session and create a new one."""
        self._session = RoleplaySession(id=str(uuid.uuid4()))
        self._save_data()
    
    def is_roleplay_active(self) -> bool:
        """Check if roleplay mode is active."""
        return self._session is not None and self._session.is_active
    
    def get_system_prompt(self) -> tuple[Optional[str], Optional[str]]:
        """Generate system prompt for the current roleplay session.

        Returns (prompt, error_message). If content is blocked, returns (None, error).
        """
        if not self._session or not self._session.is_active or not self._session.character:
            return None, None

        char = self._session.character
        user = self._session.user_role

        prompt_parts = []

        # Character identity
        prompt_parts.append(f"# Roleplay Session")
        prompt_parts.append(f"\n## Your Character: {char.name}")
        if char.description:
            prompt_parts.append(f"Description: {char.description}")
        if char.personality:
            prompt_parts.append(f"Personality: {char.personality}")
        if char.background:
            prompt_parts.append(f"Background: {char.background}")
        if char.vocabulary:
            prompt_parts.append(f"Speaking Style: {char.vocabulary}")
        if char.knowledge:
            prompt_parts.append(f"Knowledge: {char.knowledge}")
        if char.constraints:
            prompt_parts.append(f"Behavioral Constraints: {char.constraints}")

        # User role
        prompt_parts.append(f"\n## User's Role: {user.name}")
        if user.description:
            prompt_parts.append(f"User Description: {user.description}")
        if user.background:
            prompt_parts.append(f"User Background: {user.background}")
        if user.relationship_to_character:
            prompt_parts.append(f"Relationship: {user.relationship_to_character}")

        # Scene setting
        if self._session.scene_setting:
            prompt_parts.append(f"\n## Scene Setting")
            prompt_parts.append(self._session.scene_setting)

        # Instructions
        prompt_parts.append(f"\n## Instructions")
        prompt_parts.append(f"- Stay completely in character as {char.name}")
        prompt_parts.append(f"- Address the user as {user.name}")
        prompt_parts.append(f"- Memory depth: {self._session.memory_depth}")
        prompt_parts.append("- Never break character unless explicitly instructed with 'SYSTEM: END ROLEPLAY'")

        if self._session.custom_instructions:
            prompt_parts.append(f"\n## Additional Instructions")
            prompt_parts.append(self._session.custom_instructions)

        full_prompt = "\n".join(prompt_parts)

        cf = get_content_filter()
        if cf.should_block(full_prompt):
            return None, "System prompt content blocked by content filter"

        return full_prompt, None
    
    def parse_message(self, message: str) -> tuple[str, bool]:
        """Parse a message for system commands.
        
        Returns (cleaned_message, is_system_command)
        """
        if message.strip().startswith("SYSTEM:"):
            return message.strip(), True
        return message, False
    
    def handle_system_command(self, message: str) -> tuple[bool, str]:
        """Handle a system command.

        Returns (command_handled, response_message)
        """
        cmd = message.strip()[7:].strip().upper()  # Remove "SYSTEM: " prefix

        if cmd == "END ROLEPLAY":
            self.deactivate_roleplay()
            return True, "Roleplay mode ended. Returning to Standard mode."

        if cmd == "CLEAR HISTORY":
            return True, "COMMAND:CLEAR_HISTORY"

        if cmd.startswith("SWITCH CHARACTER "):
            char_name = message.strip()[23:].strip()
            # Find character by name
            for char in self._characters.values():
                if char.name.lower() == char_name.lower():
                    self.activate_roleplay(char.id)
                    return True, f"Switched to character: {char.name}"
            return True, f"Character '{char_name}' not found."

        if cmd == "TOGGLE PROTECTION":
            cf = get_content_filter()
            cf.enabled = not cf.enabled
            status = "enabled" if cf.enabled else "disabled"
            return True, f"Content protection {status}."

        if cmd == "PROTECTION ON":
            cf = get_content_filter()
            cf.enabled = True
            return True, "Content protection enabled."

        if cmd == "PROTECTION OFF":
            cf = get_content_filter()
            cf.enabled = False
            return True, "Content protection disabled."

        return True, f"Unknown system command: {cmd}"


# Global engine instance
_engine: Optional[RoleplayEngine] = None


def get_roleplay_engine() -> RoleplayEngine:
    """Get or create the global roleplay engine."""
    global _engine
    if _engine is None:
        _engine = RoleplayEngine()
    return _engine
