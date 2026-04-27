"""Content filter for roleplay protection."""
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent / "data"
BLOCKLIST_FILE = DATA_DIR / "blocklist.json"

HARDCODED_BLOCKLIST = {
    "version": 1,
    "patterns": [
        {"type": "keyword", "value": "adult_content_placeholder_high", "severity": "high"},
        {"type": "keyword", "value": "adult_content_placeholder_medium", "severity": "medium"},
    ],
    "allowlist": ["medical_term", "educational_term"]
}


@dataclass
class FilterResult:
    """Result of a content filter check."""
    is_blocked: bool = False
    matched_patterns: list[str] = field(default_factory=list)
    redacted_text: str = ""


class ContentFilter:
    """Content filter for blocking adult content in roleplay."""

    def __init__(self):
        self.enabled: bool = True
        self.mode: str = "strict"
        self._blocklist: dict = {}
        self._allowlist: set[str] = set()
        self._keywords_high: list[str] = []
        self._keywords_medium: list[str] = []
        self._regexes_high: list[re.Pattern] = []
        self._regexes_medium: list[re.Pattern] = []
        self.load_blocklist()

    def load_blocklist(self) -> None:
        """Load blocklist from file, falling back to hardcoded list."""
        try:
            if BLOCKLIST_FILE.exists():
                with open(BLOCKLIST_FILE, 'r') as f:
                    self._blocklist = json.load(f)
            else:
                self._blocklist = HARDCODED_BLOCKLIST
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading blocklist: {e}, using hardcoded fallback")
            self._blocklist = HARDCODED_BLOCKLIST

        self._allowlist = set(self._blocklist.get("allowlist", []))
        self._keywords_high = []
        self._keywords_medium = []
        self._regexes_high = []
        self._regexes_medium = []

        for pattern in self._blocklist.get("patterns", []):
            ptype = pattern.get("type", "keyword")
            value = pattern.get("value", "")
            severity = pattern.get("severity", "low")

            if not value:
                continue

            if ptype == "keyword":
                if severity == "high":
                    self._keywords_high.append(value.lower())
                elif severity == "medium":
                    self._keywords_medium.append(value.lower())
            elif ptype == "regex":
                try:
                    compiled = re.compile(value, re.IGNORECASE)
                    if severity == "high":
                        self._regexes_high.append(compiled)
                    elif severity == "medium":
                        self._regexes_medium.append(compiled)
                except re.error as e:
                    print(f"Invalid regex in blocklist: {value}, error: {e}")

    def check_text(self, text: str) -> FilterResult:
        """Check text for blocked content.

        Returns FilterResult with is_blocked, matched_patterns, and redacted_text.
        """
        if not text:
            return FilterResult()

        if not self.enabled:
            return FilterResult()

        matched: list[str] = []
        redacted = text
        text_lower = text.lower()

        for keyword in self._keywords_high:
            if keyword in text_lower:
                matched.append(keyword)
                redacted = redacted.replace(keyword, "***")
                redacted = redacted.replace(keyword.title(), "***")
                redacted = redacted.replace(keyword.upper(), "***")

        for keyword in self._keywords_medium:
            if self.mode == "strict" and keyword in text_lower:
                matched.append(keyword)
                redacted = redacted.replace(keyword, "***")
                redacted = redacted.replace(keyword.title(), "***")
                redacted = redacted.replace(keyword.upper(), "***")

        for regex in self._regexes_high:
            for match in regex.finditer(text):
                matched.append(match.group())
                redacted = redacted.replace(match.group(), "***")

        if self.mode == "strict":
            for regex in self._regexes_medium:
                for match in regex.finditer(text):
                    matched.append(match.group())
                    redacted = redacted.replace(match.group(), "***")

        is_blocked = len(matched) > 0

        return FilterResult(
            is_blocked=is_blocked,
            matched_patterns=matched,
            redacted_text=redacted if matched else text
        )

    def should_block(self, text: str) -> bool:
        """Quick check if text should be blocked."""
        if not self.enabled:
            return False
        return self.check_text(text).is_blocked


_global_filter: Optional[ContentFilter] = None


def get_content_filter() -> ContentFilter:
    """Get or create the global content filter instance."""
    global _global_filter
    if _global_filter is None:
        _global_filter = ContentFilter()
    return _global_filter