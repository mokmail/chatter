"""Follow-up suggestions generator using the configured LLM."""
import json
import re
from typing import AsyncGenerator

from chat import stream_chat
from config import get_config, ProviderConfig


FOLLOWUP_SYSTEM_PROMPT = """You are a helpful assistant that generates follow-up questions.
Given a conversation's last assistant message, generate {count} concise, diverse, and relevant follow-up questions that a user might ask next.

Guidelines:
- Keep each question under 60 characters
- Make them natural, conversational questions
- Cover different angles of the topic
- Do NOT number them, just list the questions
- Output ONLY the questions, one per line, no preamble"""


async def generate_followups(
    message: str,
    context: list[str] | None = None,
    count: int = 3,
) -> list[dict]:
    """Generate follow-up questions for a given assistant message."""
    cfg = get_config()
    provider_id = cfg.active_provider_id
    model = cfg.active_model

    system = FOLLOWUP_SYSTEM_PROMPT.format(count=count)
    if context:
        system += "\n\nConversation context:\n" + "\n".join(context[-4:])

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Generate {count} follow-up questions for:\n\n{message}"},
    ]

    provider = None
    if provider_id:
        provider = next((p for p in cfg.providers if p.id == provider_id), None)
    if not provider and cfg.providers:
        provider = cfg.providers[0]
    if not provider:
        return []

    full_text = ""
    try:
        async for chunk in stream_chat(messages, model, provider_id=provider.id):
            full_text += chunk
    except Exception as e:
        print(f"Follow-up generation error: {e}")
        return []

    lines = [line.strip("-•* ") for line in full_text.strip().splitlines() if line.strip()]
    suggestions = []
    for i, text in enumerate(lines[:count]):
        text = re.sub(r'^\d+[.)]\s*', '', text)
        suggestions.append({"id": f"fu_{i}_{hash(text) & 0xFFFFFFFF}", "text": text})
    return suggestions
