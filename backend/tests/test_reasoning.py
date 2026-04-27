import pytest
from reasoning import (
    DEFAULT_REASONING_TAGS,
    extract_reasoning,
    serialize_reasoning,
    ReasoningConfig,
)


class TestExtractReasoning:
    def test_extracts_think_tags(self):
        content = "<think>Let me work this out...</think>The answer is 42."
        config = ReasoningConfig(enabled=True)
        reasoning, display = extract_reasoning(content, config)
        assert reasoning == "Let me work this out..."
        assert display == "The answer is 42."

    def test_no_tags_returns_empty_reasoning(self):
        content = "The answer is 42."
        config = ReasoningConfig(enabled=True)
        reasoning, display = extract_reasoning(content, config)
        assert reasoning == ""
        assert display == "The answer is 42."

    def test_disabled_returns_no_extraction(self):
        content = "<think>secrethello</think>"
        config = ReasoningConfig(enabled=False)
        reasoning, display = extract_reasoning(content, config)
        assert reasoning == ""
        assert display == "<think>secrethello</think>"

    def test_custom_tags(self):
        content = "<reason>step 1</reason>done"
        config = ReasoningConfig(enabled=True, mode="custom", custom_start="<reason>", custom_end="</reason>")
        reasoning, display = extract_reasoning(content, config)
        assert reasoning == "step 1"
        assert display == "done"

    def test_multiple_tag_pairs_uses_first_match(self):
        content = "<think>a<thinking>b</thinking>rest"
        config = ReasoningConfig(enabled=True)
        reasoning, display = extract_reasoning(content, config)
        assert reasoning == "a"
        assert display == "<thinking>b</thinking>rest"

    def test_opening_tag_without_closing(self):
        content = "<think>incomplete"
        config = ReasoningConfig(enabled=True)
        reasoning, display = extract_reasoning(content, config)
        assert reasoning == "incomplete"
        assert display == ""

    def test_nested_tags_not_supported(self):
        content = "<think>outer<think>inner"
        config = ReasoningConfig(enabled=True)
        reasoning, display = extract_reasoning(content, config)
        assert reasoning == "outer<think>inner"
        assert display == ""


class TestSerializeReasoning:
    def test_serializes_with_default_tags(self):
        config = ReasoningConfig(enabled=True)
        result = serialize_reasoning("step 1", "answer", config)
        assert result == "<think>step 1</think>answer"

    def test_serializes_with_custom_tags(self):
        config = ReasoningConfig(enabled=True, mode="custom", custom_start="<reason>", custom_end="</reason>")
        result = serialize_reasoning("step 1", "answer", config)
        assert result == "<reason>step 1</reason>answer"

    def test_empty_reasoning_returns_display_only(self):
        config = ReasoningConfig(enabled=True)
        result = serialize_reasoning("", "answer", config)
        assert result == "answer"


class TestReasoningConfig:
    def test_default_config(self):
        cfg = ReasoningConfig()
        assert cfg.enabled is True
        assert cfg.mode == "default"
        assert cfg.custom_start == ""
        assert cfg.custom_end == ""
        assert cfg.ollama_think is None
        assert cfg.reasoning_effort is None


class TestConfigIntegration:
    def test_config_has_reasoning_fields(self):
        from config import Config
        cfg = Config()
        assert hasattr(cfg, "reasoning_enabled")
        assert hasattr(cfg, "reasoning_mode")
        assert hasattr(cfg, "reasoning_custom_start")
        assert hasattr(cfg, "reasoning_custom_end")
        assert hasattr(cfg, "ollama_think")
        assert hasattr(cfg, "reasoning_effort")


class TestChatMessageReasoning:
    def test_chat_message_has_reasoning_field(self):
        from history import ChatMessage
        msg = ChatMessage(role="assistant", content="hello", reasoning="step 1")
        assert msg.reasoning == "step 1"
        assert msg.model_dump()["reasoning"] == "step 1"
