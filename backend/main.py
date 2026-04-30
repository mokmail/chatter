"""CIO Intelligence Hub - Open WebUI-inspired AI Chat Application."""
import json
import uuid
import time
from pathlib import Path
from typing import AsyncGenerator

import httpx
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from chat import list_models, stream_chat, embed_text
from config import Config, get_config, update_config, save_config, ProviderConfig
from history import (
    add_to_history, clear_history, get_history, get_session_kbs, update_session_kb,
    edit_message, delete_message, evaluate_message, branch_from_message, fork_from_message,
    regenerate_last, get_last_message, get_message_by_id, get_session as get_chat_session, list_sessions,
    switch_session, delete_chat_session, archive_chat_session, archive_all_chat_sessions,
    delete_all_chat_sessions, update_session, mark_session_read, export_session, import_session,
    search_history, create_kb_session,
)
from knowledge import (
    create_knowledge_base,
    delete_knowledge_base,
    get_knowledge_base,
    list_knowledge_bases,
    update_knowledge_base,
    add_file_to_knowledge_base,
    update_file_in_knowledge_base,
    remove_file_from_knowledge_base,
    remove_files_by_source,
)
from reasoning import ReasoningConfig, extract_reasoning, serialize_reasoning
from vectorstore import add_to_vectorstore, get_kb_embeddings, delete_vectorstore, delete_source_chunks, get_collection, retrieve_relevant_chunks
from loaders import process_upload
from source_processor import fetch_source
from notes import (
    list_notes, get_note, create_note, update_note, delete_note, archive_note, search_notes,
    NOTE_TOOLS, execute_note_tool, add_note_message, get_note_chat_history, clear_note_chat_history
)
from code_executor import execute_code, create_session, delete_session, get_session_ids
from web_search import WEB_SEARCH_TOOLS, execute_web_tool, search_web, fetch_url
from followups import generate_followups
from artifacts import detect_artifact_content, create_artifact, get_artifact, get_current_artifact, update_artifact, get_artifact_versions, switch_artifact_version


app = FastAPI(title="CIO Intelligence Hub", description="Open WebUI-inspired AI Chat Application")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"GLOBAL ERROR: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "traceback": traceback.format_exc()},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---
class ChatRequest(BaseModel):
    message: str
    model: str | None = None
    provider_id: str | None = None
    knowledge_base_ids: list[str] = []
    notes: list[str] = []
    parent_id: str | None = None
    regenerate: bool = False
    no_history: bool = False


class ConfigUpdate(BaseModel):
    providers: list[dict] | None = None
    active_model: str | None = None
    active_provider_id: str | None = None
    followup_auto_generate: bool | None = None
    followup_keep_in_chat: bool | None = None
    followup_insert_to_input: bool | None = None
    iframe_same_origin: bool | None = None
    artifacts_enabled: bool | None = None
    artifacts_auto_open: bool | None = None
    reasoning_enabled: bool | None = None
    reasoning_mode: str | None = None
    reasoning_custom_start: str | None = None
    reasoning_custom_end: str | None = None
    ollama_think: bool | None = None
    reasoning_effort: str | None = None
    rag_system_context: bool | None = None
    rag_chunk_size: int | None = None
    rag_chunk_overlap: int | None = None
    rag_min_chunk_size: int | None = None
    rag_hybrid_search: bool | None = None
    rag_reranking: bool | None = None
    rag_top_k: int | None = None
    web_search_enabled: bool | None = None
    web_search_provider: str | None = None
    web_search_api_key: str | None = None
    web_search_result_count: int | None = None
    web_search_serpapi_base_url: str | None = None
    web_search_searxng_base_url: str | None = None


class SessionUpdate(BaseModel):
    title: str | None = None
    tags: list[str] | None = None
    archived: bool | None = None


class SearchRequest(BaseModel):
    query: str
    search_type: str = "all"  # all, title, content, tag
    limit: int = 20


class KBCreate(BaseModel):
    name: str
    description: str = ""
    kb_type: str = "knowledge"  # knowledge, vectorstore


class KBUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    kb_type: str | None = None
    retrieval_mode: str | None = None
    hybrid_search: bool | None = None
    reranking: bool | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None
    config: dict | None = None


class KBFileAdd(BaseModel):
    name: str
    content: str = ""
    file_type: str = "text"
    content_url: str = ""  # For web/API type KBs
    metadata: dict = {}


class KBScrapeUrl(BaseModel):
    url: str


# --- API Routes ---
@app.get("/api/models")
async def get_models(provider_id: str | None = None):
    """Get list of available models."""
    models = await list_models(provider_id)
    cfg = get_config()
    return {
        "models": models,
        "active_model": cfg.active_model,
        "active_provider_id": cfg.active_provider_id
    }


async def _build_messages_with_rag(history_msgs, user_message, session_kb_ids, current_kb_ids, notes, rag_system_context=False):
    """Build messages list injecting KB context per Q&A pair.

    Args:
        rag_system_context: If True, RAG context is placed in system message at position 0
        to enable KV cache optimization for Ollama and similar engines.
    """
    # Combine session KBs + current message KBs
    all_kb_ids = list(set(session_kb_ids + current_kb_ids))
    if not all_kb_ids:
        return None, None  # No KBs, no context needed

    # Build conversation text for context-aware retrieval
    conv_history = []
    for m in history_msgs:
        conv_history.append({"role": m["role"], "content": m["content"]})

    context_parts_by_kb = {}  # kb_id -> list of context strings

    for kb_id in all_kb_ids:
        kb = get_knowledge_base(kb_id)
        if not kb or not kb.files:
            continue

        # Check retrieval mode
        if kb.retrieval_mode == "full":
            # Inject entire KB content
            file_parts = [f"## {f.name}\n{f.content}" for f in kb.files if f.content]
            if file_parts:
                file_text = "\n\n---\n\n".join(file_parts)
                context_parts_by_kb[kb_id] = [
                    f"The user has activated the knowledge base \"{kb.name}\" in FULL CONTEXT mode. "
                    f"The entire content follows:\n\n{file_text}"
                ]
            continue

        # Default focused retrieval (either vectorstore or built-in file store)
        if kb.kb_type == "vectorstore":
            try:
                embedding_model = kb.config.get("embeddingModel")
                embedding_provider = kb.config.get("embeddingProvider")
                # Use conversation context for better retrieval
                conv_text = "\n".join([f"{m['role']}: {m['content']}" for m in conv_history[-4:]])
                query = f"{conv_text}\n\nuser: {user_message}"
                relevant_chunks = await retrieve_relevant_chunks(
                    kb_id, query,
                    n_results=kb.config.get("topK", 10),
                    provider_id=embedding_provider,
                    embedding_model=embedding_model,
                    hybrid=kb.hybrid_search,
                    rerank=kb.reranking
                )
            except Exception as e:
                print(f"KB retrieval error for {kb.name}, skipping: {e}")
                relevant_chunks = []
            if relevant_chunks:
                chunk_text = "\n\n---\n\n".join(relevant_chunks)
                context_parts_by_kb[kb_id] = [
                    f"The user has activated the knowledge base \"{kb.name}\" with the following retrieved context. "
                    f"Use this to answer the user's question. When the question relates to this content, "
                    f"cite or reference the relevant parts:\n\n{chunk_text}"
                ]
        else:
            # For non-vector KBs, we still use full context if they are small, or we could chunk them on the fly
            # For now, stick to the original logic for non-vector KBs but respect retrieval_mode if specified
            file_parts = [f"## {f.name}\n{f.content}" for f in kb.files if f.content]
            if file_parts:
                file_text = "\n\n---\n\n".join(file_parts)
                context_parts_by_kb[kb_id] = [
                    f"The user has activated the knowledge base \"{kb.name}\". "
                    f"Use the following documents to answer the user's question:\n\n{file_text}"
                ]

    if not context_parts_by_kb:
        return None, None

    all_contexts = []
    for kb_id in all_kb_ids:
        if kb_id in context_parts_by_kb:
            all_contexts.extend(context_parts_by_kb[kb_id])

    full_context = "\n\n".join(all_contexts)

    # Notes content
    notes_content = ""
    if notes:
        notes_content = "\n\n".join(f"[User Note]: {n}" for n in notes)

    if rag_system_context:
        # KV Cache Optimization: RAG context in system message at position 0
        # This keeps RAG context at a fixed position so providers can cache it
        messages = [{"role": "system", "content": full_context}]
        if notes_content:
            messages.append({"role": "system", "content": f"Notes for this turn:\n{notes_content}"})
        messages.extend({"role": m["role"], "content": m["content"]} for m in history_msgs)
        messages.append({"role": "user", "content": user_message})
    else:
        # Standard structure: RAG context + notes combined
        combined = full_context
        if notes_content:
            combined += "\n\n" + notes_content
        messages = [{"role": "system", "content": combined}]
        messages.extend({"role": m["role"], "content": m["content"]} for m in history_msgs)
        messages.append({"role": "user", "content": user_message})

    return messages, full_context


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Send a chat message and stream the response."""
    cfg = get_config()
    model = req.model or cfg.active_model
    provider_id = req.provider_id or cfg.active_provider_id

    reasoning_cfg = ReasoningConfig(
        enabled=cfg.reasoning_enabled,
        mode=cfg.reasoning_mode,
        custom_start=cfg.reasoning_custom_start,
        custom_end=cfg.reasoning_custom_end,
        ollama_think=cfg.ollama_think,
        reasoning_effort=cfg.reasoning_effort,
    )

    user_message = req.message
    session_kb_ids = get_session_kbs()
    current_kb_ids = list(req.knowledge_base_ids)

    # If the session is scoped to a KB, always include that KB
    session = get_chat_session()
    if session.knowledge_base_id and session.knowledge_base_id not in current_kb_ids:
        current_kb_ids.append(session.knowledge_base_id)

    if current_kb_ids:
        update_session_kb(current_kb_ids)
        session_kb_ids = get_session_kbs()

    history = get_history()

    history_messages = []
    for m in history:
        content = m.content
        if m.role == "assistant" and m.reasoning and reasoning_cfg.is_enabled():
            content = serialize_reasoning(m.reasoning, m.content, reasoning_cfg)
        history_messages.append({"role": m.role, "content": content})

    messages, rag_context = await _build_messages_with_rag(
        history_messages, user_message, session_kb_ids, current_kb_ids, req.notes,
        rag_system_context=cfg.rag_system_context
    )

    if not messages:
        messages = history_messages + [{"role": "user", "content": user_message}]

    if not req.no_history:
        add_to_history("user", user_message, knowledge_base_ids=current_kb_ids, notes=list(req.notes), parent_id=req.parent_id)

    async def generate():
        full_response = ""
        async for chunk in stream_chat(messages, model, provider_id, reasoning_config=reasoning_cfg.model_dump()):
            full_response += chunk
            yield chunk
        if not req.no_history:
            extracted_reasoning, display = extract_reasoning(full_response, reasoning_cfg)
            add_to_history("assistant", display, reasoning=extracted_reasoning)

    return StreamingResponse(generate(), media_type="text/plain")


@app.get("/api/history")
async def get_chat_history():
    """Get chat history and session KBs."""
    messages = get_history()
    session_kbs = get_session_kbs()
    session = get_chat_session()
    return {
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in messages],
        "knowledge_base_ids": session_kbs,
        "knowledge_base_id": session.knowledge_base_id,
    }


@app.delete("/api/history")
async def delete_chat_history():
    """Clear chat history."""
    clear_history()
    return {"status": "ok"}


# --- New Features: Branch, Fork, Edit, Evaluate, Continue, Regenerate ---
# IMPORTANT: Static routes must be defined BEFORE parameterized routes

@app.post("/api/messages/continue")
async def api_continue():
    last_msg = get_last_message()
    if not last_msg:
        return JSONResponse({"error": "No messages to continue from"}, status_code=404)
    return {"id": last_msg.id, "role": last_msg.role}


@app.post("/api/messages/regenerate")
async def api_regenerate():
    removed = regenerate_last()
    if not removed:
        return JSONResponse({"error": "No assistant message to regenerate"}, status_code=404)
    return {"id": removed.id, "content": removed.content}


@app.post("/api/messages/{msg_id}/edit")
async def api_edit_message(msg_id: str, req: Request):
    body = await req.json()
    new_content = body.get("content", "")
    msg = edit_message(msg_id, new_content)
    if not msg:
        return JSONResponse({"error": "Message not found"}, status_code=404)
    return {"id": msg.id, "content": msg.content, "timestamp": msg.timestamp}


@app.delete("/api/messages/{msg_id}")
async def api_delete_message(msg_id: str):
    ok = delete_message(msg_id)
    if not ok:
        return JSONResponse({"error": "Message not found"}, status_code=404)
    return {"deleted": msg_id}


@app.post("/api/messages/{msg_id}/evaluate")
async def api_evaluate_message(msg_id: str, req: Request):
    body = await req.json()
    rating = body.get("rating", "")
    if rating not in ("good", "bad", None):
        return JSONResponse({"error": "Rating must be 'good' or 'bad'"}, status_code=400)
    msg = evaluate_message(msg_id, rating)
    if not msg:
        return JSONResponse({"error": "Message not found"}, status_code=404)
    return {"id": msg.id, "rating": msg.rating}


@app.post("/api/messages/{msg_id}/branch")
async def api_branch_from_message(msg_id: str):
    session = branch_from_message(msg_id)
    return {
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages]
    }


@app.post("/api/messages/{msg_id}/fork")
async def api_fork_from_message(msg_id: str):
    session = fork_from_message(msg_id)
    return {
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages]
    }


@app.get("/api/messages/{msg_id}")
async def api_get_message(msg_id: str):
    msg = get_message_by_id(msg_id)
    if not msg:
        return JSONResponse({"error": "Message not found"}, status_code=404)
    return {
        "id": msg.id, "role": msg.role, "content": msg.content,
        "timestamp": msg.timestamp, "parent_id": msg.parent_id,
        "children_ids": msg.children_ids, "rating": msg.rating,
    }


@app.get("/api/sessions")
async def api_list_sessions(knowledge_base_id: str | None = None):
    """List all chat sessions, optionally filtered by knowledge_base_id.
    If knowledge_base_id is '__none__', only return sessions without a KB scope."""
    if knowledge_base_id == "__none__":
        sessions = list_sessions(knowledge_base_id=None)
        sessions = [s for s in sessions if s.get("knowledge_base_id") is None]
        return {"sessions": sessions}
    return {"sessions": list_sessions(knowledge_base_id=knowledge_base_id)}


@app.post("/api/sessions/switch")
async def api_switch_session(req: Request):
    body = await req.json()
    session_id = body.get("session_id")
    session = switch_session(session_id)
    if not session:
        return JSONResponse({"error": "Session not found"}, status_code=404)
    return {
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages],
        "knowledge_base_ids": session.knowledge_base_ids,
        "knowledge_base_id": session.knowledge_base_id,
    }


@app.post("/api/sessions/create")
async def api_create_session(req: Request):
    """Create a new session, optionally scoped to a knowledge base."""
    body = await req.json()
    knowledge_base_id = body.get("knowledge_base_id")
    if knowledge_base_id:
        session = create_kb_session(knowledge_base_id)
    else:
        from history import _history
        session = _history._create_session()
    return {
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages],
        "knowledge_base_ids": session.knowledge_base_ids,
        "knowledge_base_id": session.knowledge_base_id,
    }


@app.delete("/api/sessions/{session_id}")
async def api_delete_session(session_id: str):
    """Delete a chat session."""
    ok = delete_chat_session(session_id)
    if not ok:
        return JSONResponse({"error": "Session not found"}, status_code=404)
    session = get_chat_session()
    return {
        "status": "ok",
        "deleted_session_id": session_id,
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages],
        "sessions": list_sessions(),
    }


@app.post("/api/sessions/{session_id}/archive")
async def api_archive_session(session_id: str):
    """Archive a chat session."""
    ok = archive_chat_session(session_id)
    if not ok:
        return JSONResponse({"error": "Session not found"}, status_code=404)
    session = get_chat_session()
    return {
        "status": "ok",
        "archived_session_id": session_id,
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages],
        "sessions": list_sessions(),
    }


@app.post("/api/sessions/archive-all")
async def api_archive_all_sessions():
    """Archive all chat sessions."""
    archived_count = archive_all_chat_sessions()
    session = get_chat_session()
    return {
        "status": "ok",
        "archived_count": archived_count,
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages],
        "sessions": list_sessions(),
    }


@app.delete("/api/sessions")
async def api_delete_all_sessions():
    """Delete all chat sessions."""
    deleted_count = delete_all_chat_sessions()
    session = get_chat_session()
    return {
        "status": "ok",
        "deleted_count": deleted_count,
        "session_id": session.id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "timestamp": m.timestamp, "reasoning": m.reasoning} for m in session.messages],
        "sessions": list_sessions(),
    }


@app.patch("/api/sessions/{session_id}")
async def api_update_session(session_id: str, req: SessionUpdate):
    """Update session metadata (title, tags, archive status)."""
    session = update_session(session_id, title=req.title, tags=req.tags, archived=req.archived)
    if session:
        return session.model_dump()
    return JSONResponse(status_code=404, content={"error": "Session not found"})


@app.post("/api/sessions/{session_id}/read")
async def api_mark_session_read(session_id: str):
    """Mark a session as read."""
    success = mark_session_read(session_id)
    return {"status": "ok", "success": success}


@app.get("/api/sessions/{session_id}/export")
async def api_export_session(session_id: str):
    """Export a session as JSON."""
    data = export_session(session_id)
    if data:
        return data
    return JSONResponse(status_code=404, content={"error": "Session not found"})


@app.post("/api/sessions/import")
async def api_import_session(req: dict):
    """Import a session from JSON."""
    try:
        session = import_session(req)
        return session.model_dump()
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.get("/api/search")
async def api_search(q: str = "", type: str = "all", limit: int = 20):
    """Search across session titles and message content."""
    results = search_history(q, search_type=type, limit=limit)
    return {"results": results}


@app.get("/api/search/all")
async def api_search_all(q: str = "", limit: int = 20):
    """Unified search across all data: chats, notes, and knowledge bases."""
    if not q:
        return {"chats": [], "notes": [], "knowledge": [], "total": 0}

    query_lower = q.lower()

    chat_results = search_history(q, search_type="all", limit=limit)

    note_results = []
    for note in search_notes(q):
        snippet = ""
        if query_lower in note.content.lower():
            idx = note.content.lower().find(query_lower)
            start = max(0, idx - 50)
            end = min(len(note.content), idx + len(q) + 100)
            snippet = note.content[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(note.content):
                snippet = snippet + "..."
        elif query_lower in note.title.lower():
            snippet = note.title[:150]

        note_results.append({
            "id": note.id,
            "title": note.title,
            "snippet": snippet,
            "note_type": note.note_type,
            "tags": note.tags,
            "updated_at": note.updated_at,
            "pinned": note.pinned,
        })
    note_results = note_results[:limit]

    kb_results = []
    for kb in list_knowledge_bases():
        kb_match = False
        snippet = ""
        relevance = 0.0

        if query_lower in kb.name.lower():
            kb_match = True
            relevance = 0.9
            snippet = kb.name
        elif kb.description and query_lower in kb.description.lower():
            kb_match = True
            relevance = 0.8
            snippet = kb.description[:200]
        else:
            for f in kb.files:
                if query_lower in f.name.lower():
                    kb_match = True
                    relevance = max(relevance, 0.7)
                    snippet = f"File: {f.name}"
                    break
                if f.content and query_lower in f.content.lower():
                    kb_match = True
                    relevance = max(relevance, 0.6)
                    idx = f.content.lower().find(query_lower)
                    start = max(0, idx - 50)
                    end = min(len(f.content), idx + len(q) + 100)
                    snippet = f.content[start:end]
                    if start > 0:
                        snippet = "..." + snippet
                    if end < len(f.content):
                        snippet = snippet + "..."
                    break

        if kb_match:
            kb_results.append({
                "id": kb.id,
                "name": kb.name,
                "description": kb.description[:150],
                "kb_type": kb.kb_type,
                "snippet": snippet,
                "file_count": len(kb.files),
                "updated_at": kb.updated_at,
                "relevance": relevance,
            })
    kb_results.sort(key=lambda x: -x["relevance"])
    kb_results = kb_results[:limit]

    total = len(chat_results) + len(note_results) + len(kb_results)
    return {
        "chats": chat_results,
        "notes": note_results,
        "knowledge": kb_results,
        "total": total,
    }


@app.get("/api/config")
async def get_settings():
    """Get current configuration."""
    cfg = get_config()
    # Mask API keys in providers list
    providers_masked = []
    for p in cfg.providers:
        p_dict = p.model_dump()
        if p_dict.get("api_key"):
            p_dict["api_key"] = "********"
        providers_masked.append(p_dict)
        
    # Build full config dict with all fields
    config_dict = cfg.model_dump()
    config_dict["providers"] = providers_masked
    return config_dict


@app.post("/api/config")
async def update_settings(cfg_update: ConfigUpdate):
    """Update configuration."""
    current_cfg = get_config()
    update_data = {}
    
    if cfg_update.providers is not None:
        # Handle masked keys: if key is ********, keep original
        new_providers = []
        for p_new in cfg_update.providers:
            p_orig = next((p for p in current_cfg.providers if p.id == p_new.get("id")), None)
            if p_new.get("api_key") == "********" and p_orig:
                p_new["api_key"] = p_orig.api_key
            new_providers.append(ProviderConfig(**p_new))
        update_data["providers"] = new_providers
        
    if cfg_update.active_model is not None:
        update_data["active_model"] = cfg_update.active_model
    if cfg_update.active_provider_id is not None:
        update_data["active_provider_id"] = cfg_update.active_provider_id
    if cfg_update.followup_auto_generate is not None:
        update_data["followup_auto_generate"] = cfg_update.followup_auto_generate
    if cfg_update.followup_keep_in_chat is not None:
        update_data["followup_keep_in_chat"] = cfg_update.followup_keep_in_chat
    if cfg_update.followup_insert_to_input is not None:
        update_data["followup_insert_to_input"] = cfg_update.followup_insert_to_input
    if cfg_update.iframe_same_origin is not None:
        update_data["iframe_same_origin"] = cfg_update.iframe_same_origin
    if cfg_update.artifacts_enabled is not None:
        update_data["artifacts_enabled"] = cfg_update.artifacts_enabled
    if cfg_update.artifacts_auto_open is not None:
        update_data["artifacts_auto_open"] = cfg_update.artifacts_auto_open
    if cfg_update.reasoning_enabled is not None:
        update_data["reasoning_enabled"] = cfg_update.reasoning_enabled
    if cfg_update.reasoning_mode is not None:
        update_data["reasoning_mode"] = cfg_update.reasoning_mode
    if cfg_update.reasoning_custom_start is not None:
        update_data["reasoning_custom_start"] = cfg_update.reasoning_custom_start
    if cfg_update.reasoning_custom_end is not None:
        update_data["reasoning_custom_end"] = cfg_update.reasoning_custom_end
    if cfg_update.ollama_think is not None:
        update_data["ollama_think"] = cfg_update.ollama_think
    if cfg_update.reasoning_effort is not None:
        update_data["reasoning_effort"] = cfg_update.reasoning_effort
    if cfg_update.rag_system_context is not None:
        update_data["rag_system_context"] = cfg_update.rag_system_context
    if cfg_update.rag_chunk_size is not None:
        update_data["rag_chunk_size"] = cfg_update.rag_chunk_size
    if cfg_update.rag_chunk_overlap is not None:
        update_data["rag_chunk_overlap"] = cfg_update.rag_chunk_overlap
    if cfg_update.rag_min_chunk_size is not None:
        update_data["rag_min_chunk_size"] = cfg_update.rag_min_chunk_size
    if cfg_update.rag_hybrid_search is not None:
        update_data["rag_hybrid_search"] = cfg_update.rag_hybrid_search
    if cfg_update.rag_reranking is not None:
        update_data["rag_reranking"] = cfg_update.rag_reranking
    if cfg_update.rag_top_k is not None:
        update_data["rag_top_k"] = cfg_update.rag_top_k
    if cfg_update.web_search_enabled is not None:
        update_data["web_search_enabled"] = cfg_update.web_search_enabled
    if cfg_update.web_search_provider is not None:
        update_data["web_search_provider"] = cfg_update.web_search_provider
    if cfg_update.web_search_api_key is not None:
        update_data["web_search_api_key"] = cfg_update.web_search_api_key
    if cfg_update.web_search_result_count is not None:
        update_data["web_search_result_count"] = cfg_update.web_search_result_count
    if cfg_update.web_search_serpapi_base_url is not None:
        update_data["web_search_serpapi_base_url"] = cfg_update.web_search_serpapi_base_url
    if cfg_update.web_search_searxng_base_url is not None:
        update_data["web_search_searxng_base_url"] = cfg_update.web_search_searxng_base_url

    cfg = update_config(**update_data)
    return await get_settings()


# --- Knowledge Base Routes ---
@app.get("/api/knowledge")
async def list_kb():
    """List all knowledge bases."""
    kbs = list_knowledge_bases()
    return {
        "knowledge_bases": [
            {
                "id": kb.id,
                "name": kb.name,
                "description": kb.description,
                "kb_type": kb.kb_type,
                "retrieval_mode": kb.retrieval_mode,
                "embedding_model": kb.embedding_model,
                "embedding_dimensions": kb.embedding_dimensions,
                "storage_path": kb.storage_path,
                "file_count": len(kb.files),
                "config": kb.config,
                "created_at": kb.created_at,
                "updated_at": kb.updated_at
            } for kb in kbs
        ]
    }


@app.post("/api/knowledge")
async def create_kb(req: KBCreate):
    """Create a new knowledge base."""
    # Generate ID first so we can set storage path before initial save
    kb_id = str(uuid.uuid4())
    storage_path = str(Path.home() / ".cio-intelligence-hub" / "knowledge" / f"{kb_id}")
    
    # Create with the pre-generated ID
    kb = create_knowledge_base(req.name, req.description, req.kb_type, kb_id=kb_id)
    
    # Now update fields that depend on the ID
    kb.storage_path = storage_path
    update_knowledge_base(kb)
    
    return {
        "id": kb.id, 
        "name": kb.name, 
        "description": kb.description, 
        "kb_type": kb.kb_type, 
        "storage_path": kb.storage_path,
        "file_count": 0, 
        "created_at": kb.created_at, 
        "updated_at": kb.updated_at
    }


@app.get("/api/knowledge/{kb_id}")
async def get_kb(kb_id: str):
    """Get a knowledge base with its files."""
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "kb_type": kb.kb_type,
        "retrieval_mode": kb.retrieval_mode,
        "hybrid_search": kb.hybrid_search,
        "reranking": kb.reranking,
        "chunk_size": kb.chunk_size,
        "chunk_overlap": kb.chunk_overlap,
        "storage_path": kb.storage_path,
        "embedding_model": kb.embedding_model,
        "embedding_dimensions": kb.embedding_dimensions,
        "files": [
            {
                "id": f.id, 
                "name": f.name, 
                "file_type": f.file_type, 
                "content_url": f.content_url, 
                "size_bytes": f.size_bytes,
                "token_count": f.token_count,
                "chunks_count": f.chunks_count,
                "is_embedded": f.is_embedded,
                "metadata": f.metadata,
                "created_at": f.created_at
            } for f in kb.files
        ],
        "config": kb.config,
        "created_at": kb.created_at,
        "updated_at": kb.updated_at,
    }


@app.put("/api/knowledge/{kb_id}")
async def update_kb(kb_id: str, req: KBUpdate):
    """Update a knowledge base."""
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
    if req.name is not None:
        kb.name = req.name
    if req.description is not None:
        kb.description = req.description
    if req.kb_type is not None:
        kb.kb_type = req.kb_type
    if req.retrieval_mode is not None:
        kb.retrieval_mode = req.retrieval_mode
    if req.hybrid_search is not None:
        kb.hybrid_search = req.hybrid_search
    if req.reranking is not None:
        kb.reranking = req.reranking
    if req.chunk_size is not None:
        kb.chunk_size = req.chunk_size
    if req.chunk_overlap is not None:
        kb.chunk_overlap = req.chunk_overlap
    if req.config is not None:
        kb.config = {**(kb.config or {}), **req.config}
    kb = update_knowledge_base(kb)
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "kb_type": kb.kb_type,
        "retrieval_mode": kb.retrieval_mode,
        "hybrid_search": kb.hybrid_search,
        "reranking": kb.reranking,
        "chunk_size": kb.chunk_size,
        "chunk_overlap": kb.chunk_overlap,
        "config": kb.config,
        "file_count": len(kb.files),
        "created_at": kb.created_at,
        "updated_at": kb.updated_at
    }


@app.delete("/api/knowledge/{kb_id}")
async def delete_kb(kb_id: str):
    """Delete a knowledge base."""
    success = delete_knowledge_base(kb_id)
    return {"status": "ok" if success else "not_found"}


@app.post("/api/knowledge/{kb_id}/files")
async def add_kb_file(kb_id: str, req: KBFileAdd):
    """Add a file to a knowledge base."""
    file = add_file_to_knowledge_base(kb_id, req.name, req.content, req.file_type, req.content_url, req.metadata)
    if not file:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
    return {"id": file.id, "name": file.name, "file_type": file.file_type, "content_url": file.content_url, "created_at": file.created_at}


@app.post("/api/knowledge/{kb_id}/scrape")
async def scrape_url(kb_id: str, req: KBScrapeUrl):
    """Scrape content from a URL and add it to the KB."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; CIO-Intelligence-Hub/1.0)"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(req.url, headers=headers)
            response.raise_for_status()
            content = response.text[:10000]
            
        file = add_file_to_knowledge_base(
            kb_id, 
            req.url.split("/")[-1] or req.url, 
            content, 
            "webpage",
            req.url
        )
        if not file:
            return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
        return {"id": file.id, "name": file.name, "file_type": file.file_type, "content_url": file.content_url, "created_at": file.created_at}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.delete("/api/knowledge/{kb_id}/files/{file_id}")
async def remove_kb_file(kb_id: str, file_id: str):
    """Remove a file from a knowledge base."""
    success = remove_file_from_knowledge_base(kb_id, file_id)
    return {"status": "ok" if success else "not_found"}


@app.post("/api/knowledge/{kb_id}/upload")
async def upload_file(kb_id: str, file: UploadFile = File(...), source_id: str = Form(None)):
    """Upload a file, process its content, and add it to the KB."""
    content = await file.read()
    text_content = process_upload(content, file.filename)
    
    # Estimate token count (simple word-based estimation for now)
    token_count = len(text_content.split())
    
    metadata = {}
    if source_id:
        metadata["source_id"] = source_id

    kb_file = add_file_to_knowledge_base(
        kb_id, 
        file.filename, 
        text_content, 
        file.content_type or "application/octet-stream",
        metadata=metadata
    )
    
    if not kb_file:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)

    # Update metadata
    kb_file.size_bytes = len(content)
    kb_file.token_count = token_count
    update_file_in_knowledge_base(kb_id, kb_file.id, {
        "size_bytes": kb_file.size_bytes,
        "token_count": kb_file.token_count
    })
        
    return {
        "id": kb_file.id, 
        "name": kb_file.name, 
        "file_type": kb_file.file_type, 
        "size_bytes": kb_file.size_bytes,
        "token_count": kb_file.token_count,
        "created_at": kb_file.created_at
    }


@app.get("/api/knowledge/{kb_id}/files/{file_id}")
async def get_kb_file(kb_id: str, file_id: str):
    """Get a file's content from a knowledge base."""
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
    for f in kb.files:
        if f.id == file_id:
            return {"id": f.id, "name": f.name, "content": f.content, "file_type": f.file_type, "content_url": f.content_url, "created_at": f.created_at}
    return JSONResponse({"error": "File not found"}, status_code=404)


@app.post("/api/knowledge/{kb_id}/embed")
async def embed_kb(kb_id: str, file_id: str = None, source_id: str = None):
    """Process all files in a KB and store their embeddings (streaming progress)."""
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
    
    embedding_model = kb.config.get("embeddingModel", "nomic-embed-text")
    embedding_provider = kb.config.get("embeddingProvider")
    
    files_to_process = kb.files
    if file_id:
        files_to_process = [f for f in files_to_process if f.id == file_id]
    elif source_id:
        files_to_process = [f for f in files_to_process if f.metadata.get('source_id') == source_id]

    total_files = len(files_to_process)
    
    async def generate():
        total_chunks = 0
        total_token_count = 0
        dimensions = 0
        
        for idx, file in enumerate(files_to_process):
            if not file.content:
                continue
            
            yield f"event: file_start\ndata: {json.dumps({'file_index': idx, 'file_name': file.name, 'file_count': total_files})}\n\n"
            
            chunks_count = await add_to_vectorstore(
                kb_id, 
                file.content, 
                metadata={"file_id": file.id, "file_name": file.name, **({'source_id': source_id} if source_id else {})},
                chunk_size=kb.chunk_size,
                chunk_overlap=kb.chunk_overlap,
                provider_id=embedding_provider,
                embedding_model=embedding_model
            )
            file.chunks_count = chunks_count
            file.is_embedded = True
            total_chunks += chunks_count
            total_token_count += file.token_count
            
            if dimensions == 0 and chunks_count > 0:
                sample_embedding = await embed_text(
                    file.content[:100], 
                    provider_id=embedding_provider, 
                    model=embedding_model
                )
                dimensions = len(sample_embedding)
            
            yield f"event: file_progress\ndata: {json.dumps({'file_index': idx, 'file_name': file.name, 'chunks_created': chunks_count})}\n\n"
        
        kb.embedding_model = embedding_model
        kb.embedding_dimensions = dimensions
        kb.updated_at = time.time()
        update_knowledge_base(kb)
        
        yield f"event: complete\ndata: {json.dumps({'status': 'ok', 'chunks': total_chunks, 'tokens': total_token_count, 'embedding_model': embedding_model, 'embedding_dimensions': dimensions})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/knowledge/{kb_id}/embeddings")
async def list_kb_embeddings(kb_id: str):
    """List all stored embeddings/chunks for a KB."""
    items = get_kb_embeddings(kb_id)
    return {"embeddings": items}


@app.post("/api/knowledge/{kb_id}/sources/{source_id}/sync")
async def sync_source(kb_id: str, source_id: str):
    """Fetch data from a single source, store as files, and embed."""
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
    
    sources = kb.config.get("sources", [])
    source = next((s for s in sources if s.get("id") == source_id), None)
    if not source:
        return JSONResponse({"error": "Source not found"}, status_code=404)
    
    # Update source status to syncing
    for s in sources:
        if s.get("id") == source_id:
            s["status"] = "syncing"
            s["last_synced"] = None
    kb.config["sources"] = sources
    update_knowledge_base(kb)
    
    try:
        # Fetch content from source
        fetched = await fetch_source(source)
        
        if not fetched:
            for s in sources:
                if s.get("id") == source_id:
                    s["status"] = "active"
                    s["last_synced"] = time.time()
            kb.config["sources"] = sources
            update_knowledge_base(kb)
            return {"status": "ok", "files_added": 0, "chunks_created": 0}
        
        # Remove ALL old files and embeddings for this source to avoid duplicates
        old_file_ids = [f.id for f in kb.files if f.metadata.get("source_id") == source_id]
        if old_file_ids:
            kb.files = [f for f in kb.files if f.metadata.get("source_id") != source_id]
            update_knowledge_base(kb)
        delete_source_chunks(kb_id, source_id)
        
        # Add fetched content as files to the KB
        files_added = 0
        total_chunks = 0
        embedding_model = kb.config.get("embeddingModel", "nomic-embed-text")
        embedding_provider = kb.config.get("embeddingProvider")
        
        for item in fetched:
            name = item.get("name", "untitled")
            content = item.get("content", "")
            if not content.strip():
                continue
            
            file_type = item.get("file_type", "text")
            content_url = item.get("content_url", "")
            metadata = item.get("metadata", {})
            
            # Add the file
            kb_file = add_file_to_knowledge_base(
                kb_id, name, content, file_type, content_url,
                metadata={**metadata, "source_id": source_id}
            )
            files_added += 1
            
            # Embed if KB is in focused retrieval mode
            if kb.retrieval_mode == "focused" and content.strip():
                try:
                    chunks = await add_to_vectorstore(
                        kb_id, content,
                        metadata={"file_id": kb_file.id, "file_name": name, "source_id": source_id},
                        chunk_size=kb.chunk_size,
                        chunk_overlap=kb.chunk_overlap,
                        provider_id=embedding_provider,
                        embedding_model=embedding_model
                    )
                    total_chunks += chunks
                    # Update file embedding status
                    update_file_in_knowledge_base(kb_id, kb_file.id, {
                        "is_embedded": True,
                        "chunks_count": chunks,
                    })
                except Exception as e:
                    print(f"Embedding error for {name}: {e}")
        
        # Update source status
        kb = get_knowledge_base(kb_id)
        sources = kb.config.get("sources", [])
        for s in sources:
            if s.get("id") == source_id:
                s["status"] = "active"
                s["last_synced"] = time.time()
                s["files_count"] = files_added
                s["chunks_count"] = total_chunks
        kb.config["sources"] = sources
        
        # Update embedding model info
        if total_chunks > 0 and not kb.embedding_model:
            kb.embedding_model = embedding_model
        update_knowledge_base(kb)
        
        return {"status": "ok", "files_added": files_added, "chunks_created": total_chunks}
    
    except Exception as e:
        # Update source status to error
        kb = get_knowledge_base(kb_id)
        sources = kb.config.get("sources", [])
        for s in sources:
            if s.get("id") == source_id:
                s["status"] = "error"
                s["error"] = str(e)[:200]
        kb.config["sources"] = sources
        update_knowledge_base(kb)
        return JSONResponse({"error": f"Sync failed: {str(e)}"}, status_code=500)


@app.delete("/api/knowledge/{kb_id}/sources/{source_id}")
async def delete_source(kb_id: str, source_id: str):
    """Delete a source and all its associated files and embeddings."""
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)

    sources = kb.config.get("sources", [])
    source = next((s for s in sources if s.get("id") == source_id), None)
    if not source:
        return JSONResponse({"error": "Source not found"}, status_code=404)

    removed_file_ids = remove_files_by_source(kb_id, source_id)
    delete_source_chunks(kb_id, source_id)

    kb = get_knowledge_base(kb_id)
    kb.config["sources"] = [s for s in sources if s.get("id") != source_id]
    update_knowledge_base(kb)

    return {"status": "ok", "files_removed": len(removed_file_ids)}


@app.post("/api/knowledge/{kb_id}/sync")
async def sync_all_sources(kb_id: str):
    """Fetch data from all sources in a KB, store as files, and embed."""
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)
    
    sources = kb.config.get("sources", [])
    if not sources:
        return {"status": "ok", "sources_synced": 0, "total_files": 0, "total_chunks": 0}
    
    total_files = 0
    total_chunks = 0
    sources_synced = 0
    errors = []
    
    for source in sources:
        source_id = source.get("id", "")
        try:
            result = await sync_source(kb_id, source_id)
            if isinstance(result, dict) and not result.get("error"):
                total_files += result.get("files_added", 0)
                total_chunks += result.get("chunks_created", 0)
                sources_synced += 1
            else:
                errors.append({"source_id": source_id, "error": result.get("error", "Unknown error") if isinstance(result, dict) else "Failed"})
        except Exception as e:
            errors.append({"source_id": source_id, "error": str(e)[:200]})
    
    return {
        "status": "ok",
        "sources_synced": sources_synced,
        "total_sources": len(sources),
        "total_files": total_files,
        "total_chunks": total_chunks,
        "errors": errors,
    }



# --- Notes Routes ---

class NoteCreate(BaseModel):
    title: str
    content: str = ""
    tags: list[str] = []
    note_type: str = "rich"  # rich, simple, voice, meeting, research, project, daily, documentation, bug, feature, recipe, book


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    pinned: bool | None = None
    note_type: str | None = None


def _format_note(n, note_kb_map):
    """Helper to format a note for API response."""
    return {
        "id": n.id,
        "title": n.title,
        "preview": n.content[:200],
        "content": n.content,
        "created_at": n.created_at,
        "updated_at": n.updated_at,
        "tags": n.tags,
        "archived": n.archived,
        "pinned": n.pinned,
        "note_type": n.note_type,
        "has_chat": len(n.chat_history) > 0,
        "chat_count": len(n.chat_history),
        "knowledge_bases": note_kb_map.get(n.id, []),
    }


@app.get("/api/notes")
async def api_list_notes(include_archived: bool = False):
    """List all notes with their KB associations."""
    notes = list_notes(include_archived=include_archived)
    kbs = list_knowledge_bases()
    
    # Map note_id to list of KBs
    note_kb_map = {}
    for kb in kbs:
        for f in kb.files:
            nid = f.metadata.get("note_id")
            if nid:
                if nid not in note_kb_map:
                    note_kb_map[nid] = []
                note_kb_map[nid].append({"id": kb.id, "name": kb.name})

    return {
        "notes": [_format_note(n, note_kb_map) for n in notes]
    }


@app.post("/api/notes")
async def api_create_note(req: NoteCreate):
    """Create a new note."""
    note = create_note(title=req.title, content=req.content, tags=req.tags, note_type=req.note_type)
    return _format_note(note, {})


@app.get("/api/notes/search")
async def api_search_notes(query: str):
    """Search notes by query."""
    results = search_notes(query)
    kbs = list_knowledge_bases()
    
    # Map note_id to list of KBs
    note_kb_map = {}
    for kb in kbs:
        for f in kb.files:
            nid = f.metadata.get("note_id")
            if nid:
                if nid not in note_kb_map:
                    note_kb_map[nid] = []
                note_kb_map[nid].append({"id": kb.id, "name": kb.name})

    return {
        "query": query,
        "count": len(results),
        "notes": [_format_note(n, note_kb_map) for n in results]
    }


@app.get("/api/notes/{note_id}")
async def api_get_note(note_id: str):
    """Get a specific note with its KB associations."""
    note = get_note(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)
        
    kbs = list_knowledge_bases()
    associated_kbs = []
    for kb in kbs:
        if any(f.metadata.get("note_id") == note_id for f in kb.files):
            associated_kbs.append({"id": kb.id, "name": kb.name})

    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
        "tags": note.tags,
        "archived": note.archived,
        "pinned": note.pinned,
        "has_chat": len(note.chat_history) > 0,
        "chat_count": len(note.chat_history),
        "knowledge_bases": associated_kbs,
    }


@app.put("/api/notes/{note_id}")
async def api_update_note(note_id: str, req: NoteUpdate):
    """Update a note."""
    note = update_note(
        note_id,
        title=req.title,
        content=req.content,
        tags=req.tags,
        pinned=req.pinned,
        note_type=req.note_type,
    )
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)
    return _format_note(note, {})


@app.delete("/api/notes/{note_id}")
async def api_delete_note(note_id: str):
    """Delete a note permanently."""
    success = delete_note(note_id)
    if not success:
        return JSONResponse({"error": "Note not found"}, status_code=404)
    return {"status": "ok", "deleted_id": note_id}


@app.post("/api/notes/{note_id}/archive")
async def api_archive_note(note_id: str):
    """Archive a note."""
    note = archive_note(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)
    return {
        "id": note.id,
        "title": note.title,
        "archived": note.archived,
        "updated_at": note.updated_at,
    }


@app.post("/api/notes/{note_id}/save-to-kb/{kb_id}")
async def api_save_note_to_kb(note_id: str, kb_id: str):
    """Save a note's content as a file in a knowledge base."""
    note = get_note(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)
    kb = get_knowledge_base(kb_id)
    if not kb:
        return JSONResponse({"error": "Knowledge base not found"}, status_code=404)

    file = add_file_to_knowledge_base(
        kb_id,
        name=note.title or "Untitled Note",
        content=note.content,
        file_type="text",
        metadata={"source": "note", "note_id": note.id, "tags": note.tags}
    )
    if not file:
        return JSONResponse({"error": "Failed to add file to knowledge base"}, status_code=500)

    return {"status": "ok", "file_id": file.id, "file_name": file.name}


# --- Note Enhancement & Export ---


class NoteEnhanceRequest(BaseModel):
    note_id: str
    selected_text: str = ""
    instruction: str = ""


@app.post("/api/notes/enhance")
async def api_enhance_note(req: NoteEnhanceRequest):
    """Enhance note text via LLM with SSE streaming."""
    note = get_note(req.note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)

    if not req.instruction:
        return JSONResponse({"error": "Instruction is required"}, status_code=400)

    cfg = get_config()
    provider_id = req.note_id  # Use note_id slot for provider resolution
    model = None
    provider = None

    # Resolve enhance provider/model
    if cfg.enhance_provider:
        provider = next((p for p in cfg.providers if p.id == cfg.enhance_provider), None)
    if not provider:
        provider = next((p for p in cfg.providers if p.id == cfg.active_provider_id), None)
    if not provider and cfg.providers:
        provider = cfg.providers[0]

    if not provider:
        return JSONResponse({"error": "No provider configured"}, status_code=500)

    enhance_model = cfg.enhance_model or cfg.active_model

    # Build text to enhance
    text_to_enhance = req.selected_text if req.selected_text else note.content
    system_prompt = "You are a writing assistant. Rewrite the following text according to the user's instruction. Return only the rewritten text, no explanations, no prefixes."
    user_message = f"Instruction: {req.instruction}\n\nText to rewrite:\n{text_to_enhance}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    async def generate():
        async for chunk in stream_chat(messages, enhance_model, provider.id):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")


@app.get("/api/notes/export/{note_id}")
async def api_export_note(note_id: str, format: str = "txt"):
    """Export a note as txt, md, or pdf."""
    note = get_note(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)

    if format not in ("txt", "md"):
        return JSONResponse({"error": "Invalid format. Use txt or md."}, status_code=400)

    # Sanitize title for filename
    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in (note.title or "untitled")).strip()
    filename = f"{safe_title}.{format}"

    if format == "txt":
        return StreamingResponse(
            iter([note.content]),
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:  # md
        return StreamingResponse(
            iter([note.content]),
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )


@app.get("/api/notes/enhance-config")
async def api_get_enhance_config():
    """Get current enhance model/provider settings."""
    cfg = get_config()
    available_models = []
    try:
        available_models = await list_models()
    except Exception:
        pass
    return {
        "enhance_provider": cfg.enhance_provider,
        "enhance_model": cfg.enhance_model,
        "available_models": available_models,
    }


class EnhanceConfigUpdate(BaseModel):
    enhance_provider: str | None = None
    enhance_model: str | None = None


@app.put("/api/notes/enhance-config")
async def api_update_enhance_config(req: EnhanceConfigUpdate):
    """Update enhance model/provider settings."""
    cfg = get_config()
    if req.enhance_provider is not None:
        cfg.enhance_provider = req.enhance_provider
    if req.enhance_model is not None:
        cfg.enhance_model = req.enhance_model
    save_config(cfg)
    return {"enhance_provider": cfg.enhance_provider, "enhance_model": cfg.enhance_model}


class NoteChatRequest(BaseModel):
    message: str


@app.post("/api/notes/{note_id}/chat")
async def api_note_chat(note_id: str, req: NoteChatRequest):
    """Chat about a specific note, with chat history saved to that note."""
    note = get_note(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)

    cfg = get_config()
    provider = None
    if cfg.active_provider_id:
        provider = next((p for p in cfg.providers if p.id == cfg.active_provider_id), None)
    if not provider and cfg.providers:
        provider = cfg.providers[0]
    if not provider:
        return JSONResponse({"error": "No provider configured"}, status_code=500)

    model = cfg.active_model

    history = get_note_chat_history(note_id) or []
    system_prompt = f"""You are a helpful assistant discussing the following note:

Title: {note.title}
Content:
{note.content}

Answer questions about this note. Be helpful and concise."""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})

    add_note_message(note_id, "user", req.message)

    async def generate():
        full_content = ""
        async for chunk in stream_chat(messages, model, provider.id):
            yield chunk
            full_content += chunk

        if full_content:
            add_note_message(note_id, "assistant", full_content)

    return StreamingResponse(generate(), media_type="text/plain")


@app.get("/api/notes/{note_id}/chat")
async def api_get_note_chat_history(note_id: str):
    """Get the chat history for a note."""
    history = get_note_chat_history(note_id)
    if history is None:
        return JSONResponse({"error": "Note not found"}, status_code=404)
    return {"messages": [{"role": m.role, "content": m.content, "timestamp": m.timestamp} for m in history]}


@app.delete("/api/notes/{note_id}/chat")
async def api_clear_note_chat_history(note_id: str):
    """Clear the chat history for a note."""
    note = clear_note_chat_history(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)
    return {"status": "ok"}


class NoteChatMessageUpdate(BaseModel):
    index: int
    content: str


@app.put("/api/notes/{note_id}/chat")
async def api_update_note_chat_message(note_id: str, req: NoteChatMessageUpdate):
    """Update a specific chat message in a note's chat history."""
    note = get_note(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)

    if req.index < 0 or req.index >= len(note.chat_history):
        return JSONResponse({"error": "Message index out of range"}, status_code=400)

    note.chat_history[req.index].content = req.content
    note.updated_at = time.time()
    from notes import _store
    _store._save(note)

    return {"status": "ok", "message": note.chat_history[req.index]}


@app.delete("/api/notes/{note_id}/chat/{message_index}")
async def api_delete_note_chat_message(note_id: str, message_index: int):
    """Delete a specific chat message from a note's chat history."""
    note = get_note(note_id)
    if not note:
        return JSONResponse({"error": "Note not found"}, status_code=404)

    if message_index < 0 or message_index >= len(note.chat_history):
        return JSONResponse({"error": "Message index out of range"}, status_code=400)

    del note.chat_history[message_index]
    note.updated_at = time.time()
    from notes import _store
    _store._save(note)

    return {"status": "ok"}


# --- Agentic Chat with Tool Calling ---

class AgentChatRequest(BaseModel):
    message: str
    model: str | None = None
    provider_id: str | None = None
    enable_notes_tools: bool = True
    enable_web_search: bool = True


SYSTEM_PROMPT_TOOLS = """You are a helpful assistant with access to tools for managing the user's notes.
When the user asks about notes, wants to create, update, search, or view notes, use the appropriate tool.
Always confirm actions to the user after using a tool.
If a tool fails, explain the error and suggest alternatives."""

SYSTEM_PROMPT_WEB_SEARCH = """You have access to web search and URL fetching tools for researching information.

**Web Search (search_web):**
- Use when you need current information, facts, or content beyond your training data
- Returns search results with snippets - analyze them to determine if follow-up is needed
- If snippets answer the question, respond directly without further tool calls
- If more detail is needed, use fetch_url to read specific pages

**URL Fetching (fetch_url):**
- Use when search snippets are insufficient and you need full page content
- Returns up to 50,000 characters of page text directly to your context
- Extract specific information, verify facts, or follow links mentioned on pages
- When you find a useful URL on a fetched page, you can fetch it too (link following)

**Interleaved Thinking Research Loop:**
1. THINK: Analyze what information you still need
2. SEARCH: Use search_web to find relevant sources
3. EVALUATE: Check if snippets contain the answer
4. FETCH: If needed, use fetch_url for full page content
5. REPEAT: Continue until you have comprehensive information
6. SYNTHESIZE: Present a well-rounded answer from multiple sources

**Source Citation (MANDATORY):**
- ALWAYS cite your sources using markdown links: [Source Title](URL)
- When using search results, cite each fact to its corresponding source
- When fetching a URL, cite the page title and URL for any information derived from it
- Format: Use [^1], [^2], etc. for inline citations and list sources at the end
- Example: "The capital of France is Paris[^1]\n\n[^1]: [Wikipedia - France](https://en.wikipedia.org/wiki/France)"
- NEVER present information without citing its source
- If multiple sources confirm the same fact, cite all confirming sources

Be thorough but efficient - don't fetch pages unnecessarily if snippets suffice."""


async def _stream_with_tools(
    messages: list[dict],
    model: str,
    provider_id: str | None,
    tools: list[dict],
    max_iterations: int = 5,
    reasoning_config: dict | None = None,
) -> AsyncGenerator[str | dict, None]:
    """Agent loop: stream chat with native tool calling support.

    Yields text chunks and dicts. Tracks all web sources used.
    Final dict yields include: {"type": "sources", "sources": [...]}
    """
    cfg = get_config()
    provider = None
    if provider_id:
        provider = next((p for p in cfg.providers if p.id == provider_id), None)
    if not provider and cfg.active_provider_id:
        provider = next((p for p in cfg.providers if p.id == cfg.active_provider_id), None)
    if not provider:
        if cfg.providers:
            provider = cfg.providers[0]
        else:
            raise ValueError("No providers configured")

    model = model or cfg.active_model

    iteration = 0
    current_messages = list(messages)
    collected_sources = []
    tool_chain = []

    while iteration < max_iterations:
        iteration += 1

        if provider.type == "openai":
            async for chunk in _agent_loop_openai(provider, model, current_messages, tools, reasoning_config):
                if isinstance(chunk, dict) and chunk.get("type") == "tool_calls":
                    tool_results = []
                    for tc in chunk["tool_calls"]:
                        if tc["name"] == "execute_code":
                            result = execute_code(create_session(), tc["arguments"].get("code", ""))
                            result.pop("session_id", None)
                            tool_results.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "name": tc["name"],
                                "content": json.dumps(result),
                            })
                        elif tc["name"] in ("search_web", "fetch_url"):
                            result = execute_web_tool(tc["name"], tc["arguments"])
                            content = result.get("formatted_response") or json.dumps(result)
                            tool_results.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "name": tc["name"],
                                "content": content,
                            })
                            _collect_sources(collected_sources, tool_chain, tc, result)
                        else:
                            result = execute_note_tool(tc["name"], tc["arguments"])
                            tool_results.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "name": tc["name"],
                                "content": json.dumps(result),
                            })
                    current_messages.extend(tool_results)
                    tool_names = [tc["name"] for tc in chunk["tool_calls"]]
                    yield f"\n[Research: {', '.join(tool_names)} executed]\n"
                    break
                elif isinstance(chunk, dict) and chunk.get("type") == "final":
                    yield chunk["content"]
                    yield {"type": "sources", "sources": collected_sources, "chain": tool_chain}
                    return
                else:
                    yield chunk
            else:
                yield {"type": "sources", "sources": collected_sources, "chain": tool_chain}
                return

        elif provider.type == "anthropic":
            async for chunk in _agent_loop_anthropic(provider, model, current_messages, tools, reasoning_config):
                if isinstance(chunk, dict) and chunk.get("type") == "tool_calls":
                    tool_results = []
                    for tc in chunk["tool_calls"]:
                        if tc["name"] == "execute_code":
                            result = execute_code(create_session(), tc["arguments"].get("code", ""))
                            result.pop("session_id", None)
                            tool_results.append({
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": tc["id"],
                                        "content": json.dumps(result),
                                    }
                                ],
                            })
                        elif tc["name"] in ("search_web", "fetch_url"):
                            result = execute_web_tool(tc["name"], tc["arguments"])
                            content = result.get("formatted_response") or json.dumps(result)
                            tool_results.append({
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": tc["id"],
                                        "content": content,
                                    }
                                ],
                            })
                            _collect_sources(collected_sources, tool_chain, tc, result)
                        else:
                            result = execute_note_tool(tc["name"], tc["arguments"])
                            tool_results.append({
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": tc["id"],
                                        "content": json.dumps(result),
                                    }
                                ],
                            })
                    current_messages.extend(tool_results)
                    tool_names = [tc["name"] for tc in chunk["tool_calls"]]
                    yield f"\n[Research: {', '.join(tool_names)} executed]\n"
                    break
                elif isinstance(chunk, dict) and chunk.get("type") == "final":
                    yield chunk["content"]
                    yield {"type": "sources", "sources": collected_sources, "chain": tool_chain}
                    return
                else:
                    yield chunk
            else:
                yield {"type": "sources", "sources": collected_sources, "chain": tool_chain}
                return

        elif provider.type == "ollama":
            async for chunk in _agent_loop_ollama(provider, model, current_messages, tools):
                if isinstance(chunk, dict) and chunk.get("type") == "tool_calls":
                    tool_results = []
                    for tc in chunk["tool_calls"]:
                        if tc["name"] == "execute_code":
                            result = execute_code(create_session(), tc["arguments"].get("code", ""))
                            result.pop("session_id", None)
                            tool_results.append({
                                "role": "tool",
                                "content": json.dumps(result),
                            })
                        elif tc["name"] in ("search_web", "fetch_url"):
                            result = execute_web_tool(tc["name"], tc["arguments"])
                            content = result.get("formatted_response") or json.dumps(result)
                            tool_results.append({
                                "role": "tool",
                                "content": content,
                            })
                            _collect_sources(collected_sources, tool_chain, tc, result)
                        else:
                            result = execute_note_tool(tc["name"], tc["arguments"])
                            tool_results.append({
                                "role": "tool",
                                "content": json.dumps(result),
                            })
                    current_messages.extend(tool_results)
                    tool_names = [tc["name"] for tc in chunk["tool_calls"]]
                    yield f"\n[Research: {', '.join(tool_names)} executed]\n"
                    break
                elif isinstance(chunk, dict) and chunk.get("type") == "final":
                    yield chunk["content"]
                    yield {"type": "sources", "sources": collected_sources, "chain": tool_chain}
                    return
                else:
                    yield chunk
            else:
                yield {"type": "sources", "sources": collected_sources, "chain": tool_chain}
                return
        else:
            async for chunk in stream_chat(current_messages, model, provider_id, reasoning_config):
                yield chunk
            return


def _collect_sources(collected: list, chain: list, tc: dict, result: dict):
    """Collect sources and tool chain info from web tool results."""
    chain.append({
        "iteration": len(chain) + 1,
        "tool": tc["name"],
        "args": tc.get("arguments", {}),
    })

    if tc["name"] == "search_web" and result.get("results"):
        for r in result["results"]:
            source = {"title": r["title"], "url": r["url"], "snippet": r.get("snippet", "")[:300]}
            if not any(s["url"] == source["url"] for s in collected):
                collected.append(source)

    elif tc["name"] == "fetch_url":
        url = tc.get("arguments", {}).get("url", "")
        title = result.get("title", url)
        if not any(s["url"] == url for s in collected):
            collected.append({"title": title, "url": url, "snippet": result.get("content", "")[:300]})


async def _agent_loop_openai(
    provider: ProviderConfig,
    model: str,
    messages: list[dict],
    tools: list[dict],
    reasoning_config: dict | None = None,
) -> AsyncGenerator[str | dict, None]:
    """OpenAI-compatible agent loop iteration."""
    url = f"{provider.base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {provider.api_key}"} if provider.api_key else {}

    payload = {
        "model": model,
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto",
        "stream": True,
    }

    tool_calls_buffer = []
    full_content = ""
    in_tool_call = False

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                delta = data.get("choices", [{}])[0].get("delta", {})

                # Check for tool calls
                if "tool_calls" in delta:
                    in_tool_call = True
                    for tc in delta["tool_calls"]:
                        idx = tc.get("index", 0)
                        if len(tool_calls_buffer) <= idx:
                            tool_calls_buffer.append({"id": "", "name": "", "arguments": ""})
                        if tc.get("id"):
                            tool_calls_buffer[idx]["id"] = tc["id"]
                        if tc.get("function", {}).get("name"):
                            tool_calls_buffer[idx]["name"] = tc["function"]["name"]
                        if tc.get("function", {}).get("arguments"):
                            tool_calls_buffer[idx]["arguments"] += tc["function"]["arguments"]
                    continue

                # Regular content
                content = delta.get("content", "")
                if content:
                    full_content += content
                    yield content

    # After stream completes, check if we have tool calls
    if in_tool_call and tool_calls_buffer:
        parsed_tool_calls = []
        for tc in tool_calls_buffer:
            try:
                args = json.loads(tc["arguments"]) if tc["arguments"] else {}
            except json.JSONDecodeError:
                args = {}
            parsed_tool_calls.append({
                "id": tc["id"],
                "name": tc["name"],
                "arguments": args,
            })
        yield {"type": "tool_calls", "tool_calls": parsed_tool_calls}
    else:
        yield {"type": "final", "content": full_content}


async def _agent_loop_anthropic(
    provider: ProviderConfig,
    model: str,
    messages: list[dict],
    tools: list[dict],
    reasoning_config: dict | None = None,
) -> AsyncGenerator[str | dict, None]:
    """Anthropic agent loop iteration."""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": provider.api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    # Separate system prompt
    system_prompt = ""
    refined_messages = []
    for m in messages:
        if m["role"] == "system":
            system_prompt += m["content"] + "\n"
        else:
            refined_messages.append(m)

    payload = {
        "model": model,
        "messages": refined_messages,
        "tools": [{"name": t["function"]["name"], "description": t["function"]["description"], "input_schema": t["function"]["parameters"]} for t in tools],
        "max_tokens": 4096,
        "stream": True,
    }
    if system_prompt:
        payload["system"] = system_prompt.strip()

    tool_use_buffer = {"id": "", "name": "", "input_json": ""}
    full_content = ""
    in_tool_use = False

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:]
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                event_type = data.get("type")

                if event_type == "content_block_start":
                    block = data.get("content_block", {})
                    if block.get("type") == "tool_use":
                        in_tool_use = True
                        tool_use_buffer = {
                            "id": block.get("id", ""),
                            "name": block.get("name", ""),
                            "input_json": "",
                        }

                elif event_type == "content_block_delta":
                    delta = data.get("delta", {})
                    if delta.get("type") == "text_delta":
                        text = delta.get("text", "")
                        full_content += text
                        yield text
                    elif delta.get("type") == "input_json_delta":
                        tool_use_buffer["input_json"] += delta.get("partial_json", "")

    if in_tool_use and tool_use_buffer["name"]:
        try:
            args = json.loads(tool_use_buffer["input_json"]) if tool_use_buffer["input_json"] else {}
        except json.JSONDecodeError:
            args = {}
        yield {
            "type": "tool_calls",
            "tool_calls": [{
                "id": tool_use_buffer["id"],
                "name": tool_use_buffer["name"],
                "arguments": args,
            }],
        }
    else:
        yield {"type": "final", "content": full_content}


async def _agent_loop_ollama(
    provider: ProviderConfig,
    model: str,
    messages: list[dict],
    tools: list[dict],
    reasoning_config: dict | None = None,
) -> AsyncGenerator[str | dict, None]:
    """Ollama agent loop iteration."""
    url = f"{provider.base_url}/api/chat"

    payload = {
        "model": model,
        "messages": messages,
        "tools": [{"type": "function", "function": t["function"]} for t in tools],
        "stream": True,
    }
    if reasoning_config and reasoning_config.get("ollama_think") is not None:
        payload["think"] = reasoning_config["ollama_think"]

    full_message = {}
    full_content = ""

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload) as resp:
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                msg = data.get("message", {})
                if msg.get("role") == "assistant":
                    full_message = msg
                    content = msg.get("content", "")
                    if content:
                        full_content += content
                        yield content

    # Check for tool calls in the final message
    if full_message.get("tool_calls"):
        parsed = []
        for tc in full_message["tool_calls"]:
            func = tc.get("function", {})
            try:
                args = json.loads(func.get("arguments", "{}")) if isinstance(func.get("arguments"), str) else func.get("arguments", {})
            except json.JSONDecodeError:
                args = func.get("arguments", {}) if not isinstance(func.get("arguments"), str) else {}
            parsed.append({
                "id": tc.get("id", f"ollama_tool_{len(parsed)}"),
                "name": func.get("name", ""),
                "arguments": args,
            })
        yield {"type": "tool_calls", "tool_calls": parsed}
    else:
        yield {"type": "final", "content": full_content}


# --- Code Execution Routes ---

class CodeExecuteRequest(BaseModel):
    code: str
    session_id: str | None = None


@app.post("/api/code/execute")
async def api_code_execute(req: CodeExecuteRequest):
    """Execute Python code in an isolated subprocess and return results."""
    result = execute_code(req.session_id or create_session(), req.code)
    return result


@app.post("/api/code/session")
async def api_code_create_session():
    """Create a new code execution session."""
    session_id = create_session()
    return {"session_id": session_id}


@app.delete("/api/code/session/{session_id}")
async def api_code_delete_session(session_id: str):
    """Delete a code execution session."""
    delete_session(session_id)
    return {"status": "ok"}


@app.get("/api/code/sessions")
async def api_code_list_sessions():
    """List active code execution sessions."""
    return {"sessions": get_session_ids()}


EXECUTE_CODE_TOOL = {
    "type": "function",
    "function": {
        "name": "execute_code",
        "description": "Execute Python code in an isolated sandbox. Supports pandas, matplotlib, and standard libraries. Charts/images are automatically captured.",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The Python code to execute"
                },
            },
            "required": ["code"],
        },
    },
}


@app.post("/api/chat/agent")
async def agent_chat(req: AgentChatRequest):
    """Chat with agentic tool calling for notes, code, and web search.

    The LLM can autonomously call tools for notes management, code execution,
    and web search (when enabled).
    """
    cfg = get_config()
    model = req.model or cfg.active_model
    provider_id = req.provider_id or cfg.active_provider_id

    # Build combined tools
    all_tools = []
    if req.enable_notes_tools:
        all_tools.extend(NOTE_TOOLS)
    all_tools.append(EXECUTE_CODE_TOOL)
    if req.enable_web_search and cfg.web_search_enabled:
        all_tools.extend(WEB_SEARCH_TOOLS)

    # Build system prompt
    sys_prompt = SYSTEM_PROMPT_TOOLS + """

You also have access to a code execution tool. When the user asks you to write or run code, use the execute_code tool.
- The code runs in an isolated Python sandbox with matplotlib and common libraries.
- Matplotlib figures are automatically captured as images.
- Always use print() to display results you want the user to see.
- Use execute_code for: data analysis, charts, calculations, file processing, and any computational task."""

    if req.enable_web_search and cfg.web_search_enabled:
        sys_prompt += "\n\n" + SYSTEM_PROMPT_WEB_SEARCH

    messages = [{"role": "system", "content": sys_prompt}]
    messages.append({"role": "user", "content": req.message})

    async def generate():
        full_response = ""
        sources = []
        reasoning_cfg = ReasoningConfig(
            enabled=cfg.reasoning_enabled,
            mode=cfg.reasoning_mode,
            custom_start=cfg.reasoning_custom_start,
            custom_end=cfg.reasoning_custom_end,
            ollama_think=cfg.ollama_think,
            reasoning_effort=cfg.reasoning_effort,
        )
        async for chunk in _stream_with_tools(
            messages, model, provider_id,
            tools=all_tools,
            reasoning_config=reasoning_cfg.model_dump(),
        ):
            if isinstance(chunk, dict) and chunk.get("type") == "sources":
                sources = chunk.get("sources", [])
            else:
                full_response += chunk
                yield chunk

        if sources:
            source_block = "\n\n---\n## Sources\n\n"
            for i, s in enumerate(sources, 1):
                source_block += f"{i}. **[{s['title']}]({s['url']})**\n"
            full_response += source_block
            yield source_block

        extracted_reasoning, display = extract_reasoning(full_response, reasoning_cfg)
        add_to_history("user", req.message)
        add_to_history("assistant", display, reasoning=extracted_reasoning, sources=sources)

    return StreamingResponse(generate(), media_type="text/plain")


# --- Follow-up Suggestions Routes ---

class FollowUpRequest(BaseModel):
    message: str
    context: list[str] = []
    count: int = 3


@app.post("/api/followups/generate")
async def api_followups_generate(req: FollowUpRequest):
    """Generate follow-up suggestions for a message."""
    suggestions = await generate_followups(req.message, req.context, req.count)
    return {"suggestions": suggestions}


@app.post("/api/followups/regenerate")
async def api_followups_regenerate(req: FollowUpRequest):
    """Regenerate follow-up suggestions for a message."""
    suggestions = await generate_followups(req.message, req.context, req.count)
    return {"suggestions": suggestions}


class WebSearchRequest(BaseModel):
    query: str
    count: int = 10


class FetchUrlRequest(BaseModel):
    url: str


@app.post("/api/web/search")
async def api_web_search(req: WebSearchRequest):
    """Test web search directly."""
    result = search_web(req.query, req.count)
    return result


@app.post("/api/web/fetch")
async def api_web_fetch(req: FetchUrlRequest):
    """Test URL fetching directly."""
    result = fetch_url(req.url)
    return result


class ArtifactDetectRequest(BaseModel):
    content: str
    session_id: str = ""


class ArtifactCreateRequest(BaseModel):
    session_id: str
    message_id: str
    content: str
    content_type: str


class ArtifactUpdateRequest(BaseModel):
    content: str


class ArtifactVersionSwitchRequest(BaseModel):
    version_index: int


@app.post("/api/artifacts/detect")
async def api_artifacts_detect(req: ArtifactDetectRequest):
    """Detect if content contains an artifact."""
    result = detect_artifact_content(req.content)
    return result


@app.post("/api/artifacts")
async def api_artifacts_create(req: ArtifactCreateRequest):
    """Create a new artifact."""
    artifact = create_artifact(
        session_id=req.session_id,
        message_id=req.message_id,
        content=req.content,
        content_type=req.content_type,
    )
    return artifact.to_dict()


@app.get("/api/artifacts/current")
async def api_artifacts_current(session_id: str):
    """Get the current artifact for a session."""
    artifact = get_current_artifact(session_id)
    if artifact:
        return artifact.to_dict()
    return None


@app.get("/api/artifacts/{artifact_id}")
async def api_artifacts_get(artifact_id: str):
    """Get a specific artifact by ID."""
    artifact = get_artifact(artifact_id)
    if artifact:
        return artifact.to_dict()
    return JSONResponse(status_code=404, content={"error": "Artifact not found"})


@app.put("/api/artifacts/{artifact_id}")
async def api_artifacts_update(artifact_id: str, req: ArtifactUpdateRequest):
    """Update an artifact's content, creating a new version."""
    artifact = update_artifact(artifact_id, req.content)
    if artifact:
        return artifact.to_dict()
    return JSONResponse(status_code=404, content={"error": "Artifact not found"})


@app.get("/api/artifacts/{session_id}/versions")
async def api_artifacts_versions(session_id: str):
    """Get all versions of the current artifact for a session."""
    artifacts = get_artifact_versions(session_id)
    return [a.to_dict() for a in artifacts]


@app.post("/api/artifacts/{session_id}/switch-version")
async def api_artifacts_switch_version(session_id: str, req: ArtifactVersionSwitchRequest):
    """Switch to a specific version of the current artifact."""
    artifact = switch_artifact_version(session_id, req.version_index)
    if artifact:
        return artifact.to_dict()
    return JSONResponse(status_code=404, content={"error": "Version not found"})


@app.get("/api/tools")
async def api_get_tools():
    """Get available tools for agentic search and chat management."""
    return {
        "tools": [
            {
                "name": "search_chats",
                "description": "Search across chat session titles and message content",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Text to search for"},
                        "limit": {"type": "integer", "description": "Max results to return", "default": 10}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "view_chat",
                "description": "Get the full message history of a specific chat session",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "session_id": {"type": "string", "description": "The session ID to view"}
                    },
                    "required": ["session_id"]
                }
            },
            {
                "name": "list_sessions",
                "description": "List all available chat sessions",
                "input_schema": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
