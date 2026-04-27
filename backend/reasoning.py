"""Reasoning/thinking tag parser for LLM responses."""
from pydantic import BaseModel
from typing import Optional

DEFAULT_REASONING_TAGS = [
    ("<think>", "</think>"),
    ("<thinking>", "</thinking>"),
    ("<reason>", "</reason>"),
    ("<reasoning>", "</reasoning>"),
    ("<thought>", "</thought>"),
    ("<|begin_of_thought|>", "<|end_of_thought|>"),
]


class ReasoningConfig(BaseModel):
    """Configuration for reasoning tag parsing."""
    enabled: bool = True
    mode: str = "default"
    custom_start: str = ""
    custom_end: str = ""
    ollama_think: Optional[bool] = None
    reasoning_effort: Optional[str] = None

    def is_enabled(self) -> bool:
        if self.mode == "disabled":
            return False
        if not self.enabled:
            return False
        return True

    def get_tags(self) -> list[tuple[str, str]]:
        """Return the active tag pairs to search for."""
        if self.mode == "custom" and self.custom_start and self.custom_end:
            return [(self.custom_start, self.custom_end)]
        return list(DEFAULT_REASONING_TAGS)


def extract_reasoning(content: str, config: ReasoningConfig) -> tuple[str, str]:
    """Extract reasoning content from a message.

    Returns (reasoning_text, display_content).
    If no reasoning tags are found, returns ("", content).
    If config is disabled, returns ("", content) without parsing.
    """
    if not config.is_enabled() or not content:
        return "", content

    tags = config.get_tags()

    for start_tag, end_tag in tags:
        start_idx = content.find(start_tag)
        if start_idx == -1:
            continue

        end_idx = content.find(end_tag, start_idx + len(start_tag))
        if end_idx == -1:
            # Find next opening tag to determine boundary
            next_open = len(content)
            for next_start, _ in tags:
                if next_start == start_tag:
                    continue
                pos = content.find(next_start, start_idx + len(start_tag))
                if pos != -1 and pos < next_open:
                    next_open = pos

            if next_open < len(content):
                reasoning = content[start_idx + len(start_tag):next_open]
                display = content[:start_idx] + content[next_open:]
            else:
                reasoning = content[start_idx + len(start_tag):]
                display = content[:start_idx]
            return reasoning.strip(), display.strip()

        reasoning = content[start_idx + len(start_tag):end_idx]
        display = content[:start_idx] + content[end_idx + len(end_tag):]
        return reasoning.strip(), display.strip()

    return "", content


def serialize_reasoning(reasoning: str, display_content: str, config: ReasoningConfig) -> str:
    """Serialize reasoning back into tagged text for sending to the LLM."""
    if not reasoning:
        return display_content

    tags = config.get_tags()
    if not tags:
        return display_content

    start_tag, end_tag = tags[0]
    return f"{start_tag}{reasoning}{end_tag}{display_content}"