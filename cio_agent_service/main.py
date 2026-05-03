"""CIO Agent Service - Standalone container for code analysis.

This service provides the CIO Agent functionality as a separate container
that can be optionally started alongside the main application.
"""
import json
import csv
import io
import uuid
import asyncio
import hashlib
import os
from pathlib import Path
from datetime import datetime
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

from code_analyzer import CodeAnalyzer, Suggestion

app = FastAPI(title="CIO Agent Service", description="Code analysis and improvement suggestion system")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUGGESTIONS_FILE = Path.home() / ".cio-intelligence-hub" / "cio_suggestions.json"
SCAN_HISTORY_FILE = Path.home() / ".cio-intelligence-hub" / "cio_scan_history.json"

_analysis_cancelled = False
_analysis_in_progress = False

DEFAULT_CIO_TARGET_DIR = Path(os.environ.get("CIO_TARGET_DIR", "/workspace"))

class ToggleRequest(BaseModel):
    enabled: bool
    auto_scan: bool | None = None
    include_tests: bool | None = None
    include_understanding: bool | None = None
    exclude_dirs: list[str] | None = None
    exclude_files: list[str] | None = None
    target_dir: str | None = None

class AnalyzeRequest(BaseModel):
    include_tests: bool | None = None
    include_understanding: bool | None = None
    exclude_dirs: list[str] | None = None
    exclude_files: list[str] | None = None
    target_dir: str | None = None

class BatchUpdateRequest(BaseModel):
    suggestion_ids: list[str]
    status: str
    note: str | None = None

class BatchApplyRequest(BaseModel):
    suggestion_ids: list[str]

def _load_suggestions() -> list[dict]:
    if SUGGESTIONS_FILE.exists():
        try:
            with open(SUGGESTIONS_FILE) as f:
                return json.load(f)
        except Exception:
            return []
    return []

def _save_suggestions(suggestions: list[dict]) -> None:
    SUGGESTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SUGGESTIONS_FILE, 'w') as f:
        json.dump(suggestions, f, indent=2)

def _load_scan_history() -> list[dict]:
    if SCAN_HISTORY_FILE.exists():
        try:
            with open(SCAN_HISTORY_FILE) as f:
                return json.load(f)
        except Exception:
            return []
    return []

def _save_scan_history(history: list[dict]) -> None:
    SCAN_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SCAN_HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

def _dedup_key(s: dict) -> str:
    return hashlib.md5(
        f"{s.get('file_path','')}:{s.get('line_start',0)}:{s.get('title','')}".encode()
    ).hexdigest()

def _deduplicate_suggestions(suggestions: list[dict]) -> list[dict]:
    seen = {}
    for s in suggestions:
        key = _dedup_key(s)
        if key not in seen:
            seen[key] = s
        else:
            existing = seen[key]
            if s.get('status', 'pending') not in ('dismissed',) and existing.get('status', 'pending') in ('dismissed',):
                seen[key] = s
            elif s.get('timestamp', '') > existing.get('timestamp', ''):
                seen[key] = s
    return list(seen.values())

def _suggestion_to_dict(s: Suggestion) -> dict:
    result = {
        "id": s.id,
        "timestamp": s.timestamp,
        "category": s.category,
        "priority": s.priority,
        "file_path": s.file_path,
        "line_start": s.line_start,
        "line_end": s.line_end,
        "title": s.title,
        "description": s.description,
        "current_code": s.current_code,
        "suggested_code": s.suggested_code,
        "rationale": s.rationale,
        "status": s.status
    }
    if hasattr(s, 'impact') and s.impact:
        result["impact"] = {
            "impact_score": s.impact.impact_score,
            "effort_score": s.impact.effort_score,
            "impact_rationale": s.impact.impact_rationale,
            "effort_rationale": s.impact.effort_rationale,
            "downstream_affected": s.impact.downstream_affected,
            "dependencies_count": s.impact.dependencies_count
        }
    if hasattr(s, 'hypothesis') and s.hypothesis:
        result["hypothesis"] = s.hypothesis
    if hasattr(s, 'evidence') and s.evidence:
        result["evidence"] = s.evidence
    if hasattr(s, 'pkb_refs') and s.pkb_refs:
        result["pkb_refs"] = s.pkb_refs
    if hasattr(s, 'insight_type') and s.insight_type:
        result["insight_type"] = s.insight_type
    return result

def _config_to_status() -> dict:
    suggestions = _load_suggestions()
    pending = sum(1 for s in suggestions if s.get('status') == 'pending')
    understanding_count = sum(1 for s in suggestions if s.get('insight_type') == 'understanding')
    improvement_count = sum(1 for s in suggestions if s.get('insight_type') == 'improvement' or not s.get('insight_type'))

    understanding_categories = {}
    for s in suggestions:
        if s.get('insight_type') == 'understanding':
            cat = s.get('category', 'unknown')
            understanding_categories[cat] = understanding_categories.get(cat, 0) + 1

    return {
        "enabled": True,
        "auto_scan": False,
        "include_tests": True,
        "include_understanding": True,
        "last_scan": None,
        "target_dir": str(DEFAULT_CIO_TARGET_DIR),
        "suggestion_count": len(suggestions),
        "pending_count": pending,
        "improvement_count": improvement_count,
        "understanding_count": understanding_count,
        "understanding_categories": understanding_categories,
        "analysis_in_progress": _analysis_in_progress,
        "version": "3.0.0",
        "container": "cio-agent"
    }

def _record_scan(status: str, count: int, target_dir: str, error: str | None = None) -> None:
    history = _load_scan_history()
    history.append({
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.utcnow().isoformat(),
        "status": status,
        "suggestion_count": count,
        "target_dir": target_dir,
        "error": error
    })
    if len(history) > 50:
        history = history[-50:]
    _save_scan_history(history)

def _apply_code_change(s: dict, code_to_apply: str, target_dir: Path | None = None) -> dict:
    file_path = s.get('file_path')
    if not file_path:
        raise HTTPException(status_code=400, detail="Suggestion has no file_path")

    base_dir = target_dir or DEFAULT_CIO_TARGET_DIR
    safe_path = (base_dir / file_path).resolve()
    if not str(safe_path).startswith(str(base_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not safe_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    with open(safe_path) as f:
        original_content = f.read()

    current_code = s.get('current_code', '')
    line_start = s.get('line_start', 1)
    line_end = s.get('line_end', line_start)

    if current_code and current_code in original_content:
        new_content = original_content.replace(current_code, code_to_apply, 1)
    else:
        lines = original_content.split('\n')
        line_start = max(1, line_start)
        line_end = min(len(lines), line_end)
        new_lines = lines[:line_start - 1] + [code_to_apply] + lines[line_end:]
        new_content = '\n'.join(new_lines)

    backup_key = hashlib.md5(original_content.encode()).hexdigest()[:12]

    with open(safe_path, 'w') as f:
        f.write(new_content)

    return {
        "safe_path": safe_path,
        "original_content": original_content,
        "backup_key": backup_key,
        "file_path": file_path,
        "new_content": new_content
    }

@app.get("/status")
async def get_status():
    return _config_to_status()

@app.post("/toggle")
async def toggle(request: ToggleRequest):
    return _config_to_status()

@app.post("/stop")
async def stop_analysis():
    global _analysis_cancelled
    if not _analysis_in_progress:
        return {"status": "idle", "message": "No analysis running"}
    _analysis_cancelled = True
    return {"status": "stopping", "message": "Analysis stop requested"}

@app.post("/purge")
async def purge_suggestions():
    global _analysis_cancelled
    _analysis_cancelled = True
    suggestions = _load_suggestions()
    kept = [s for s in suggestions if s.get('status') in ('applied', 'dismissed', 'adapted')]
    _save_suggestions(kept)
    return {"status": "success", "message": f"Deleted {len(suggestions) - len(kept)} suggestions, kept {len(kept)}"}

@app.get("/stats")
async def get_stats():
    suggestions = _load_suggestions()
    by_category = {}
    by_priority = {}
    by_status = {}
    by_file = {}
    total_impact = 0
    total_effort = 0
    impact_count = 0
    for s in suggestions:
        cat = s.get('category', 'unknown')
        pri = s.get('priority', 'unknown')
        sta = s.get('status', 'pending')
        fp = s.get('file_path', 'unknown')
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
        by_status[sta] = by_status.get(sta, 0) + 1
        by_file[fp] = by_file.get(fp, 0) + 1
        impact_data = s.get('impact')
        if impact_data:
            total_impact += impact_data.get('impact_score', 0)
            total_effort += impact_data.get('effort_score', 0)
            impact_count += 1

    avg_impact = round(total_impact / impact_count, 1) if impact_count else 0
    avg_effort = round(total_effort / impact_count, 1) if impact_count else 0

    top_files = sorted(by_file.items(), key=lambda x: -x[1])[:10]

    history = _load_scan_history()
    last_scan = history[-1] if history else None

    return {
        "total": len(suggestions),
        "by_category": by_category,
        "by_priority": by_priority,
        "by_status": by_status,
        "top_files": [{"file": f, "count": c} for f, c in top_files],
        "avg_impact_score": avg_impact,
        "avg_effort_score": avg_effort,
        "last_scan": last_scan,
        "scan_count": len(history)
    }

@app.get("/files-summary")
async def get_files_summary():
    suggestions = _load_suggestions()
    file_map = {}
    for s in suggestions:
        fp = s.get('file_path', 'unknown')
        if fp not in file_map:
            file_map[fp] = {
                "file_path": fp,
                "total": 0,
                "pending": 0,
                "applied": 0,
                "dismissed": 0,
                "adapted": 0,
                "categories": {},
                "max_priority": "low",
                "avg_impact": 0,
                "impact_scores": []
            }
        entry = file_map[fp]
        entry["total"] += 1
        sta = s.get('status', 'pending')
        entry[sta] = entry.get(sta, 0) + 1
        cat = s.get('category', 'unknown')
        entry["categories"][cat] = entry["categories"].get(cat, 0) + 1
        pri = s.get('priority', 'low')
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        if priority_order.get(pri, 0) > priority_order.get(entry["max_priority"], 0):
            entry["max_priority"] = pri
        impact_data = s.get('impact')
        if impact_data:
            entry["impact_scores"].append(impact_data.get('impact_score', 0))

    for fp, entry in file_map.items():
        scores = entry.pop("impact_scores")
        entry["avg_impact"] = round(sum(scores) / len(scores), 1) if scores else 0

    files = sorted(file_map.values(), key=lambda x: -x["total"])
    return {"files": files, "total_files": len(files)}

@app.get("/scan-history")
async def get_scan_history(limit: int = 20):
    history = _load_scan_history()
    history = history[-limit:]
    return {"scans": history, "total": len(_load_scan_history())}

@app.get("/suggestions")
async def get_suggestions(
    category: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    file_path: str | None = None,
    search: str | None = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    limit: int = 0,
    offset: int = 0
):
    suggestions = _load_suggestions()
    suggestions = _deduplicate_suggestions(suggestions)

    if category:
        suggestions = [s for s in suggestions if s.get('category') == category]
    if status:
        suggestions = [s for s in suggestions if s.get('status') == status]
    if priority:
        suggestions = [s for s in suggestions if s.get('priority') == priority]
    if file_path:
        suggestions = [s for s in suggestions if file_path in (s.get('file_path') or '')]
    if search:
        search_lower = search.lower()
        suggestions = [s for s in suggestions if (
            search_lower in (s.get('title') or '').lower() or
            search_lower in (s.get('description') or '').lower() or
            search_lower in (s.get('file_path') or '').lower()
        )]

    valid_sorts = {'timestamp', 'priority', 'category', 'file_path'}
    if sort_by not in valid_sorts:
        sort_by = 'timestamp'
    reverse = sort_order == 'desc'

    priority_order = {'high': 3, 'medium': 2, 'low': 1}

    def sort_key(s):
        if sort_by == 'priority':
            return priority_order.get(s.get('priority', 'low'), 0)
        return s.get(sort_by, '')

    suggestions.sort(key=sort_key, reverse=reverse)

    total = len(suggestions)
    if offset > 0:
        suggestions = suggestions[offset:]
    if limit > 0:
        suggestions = suggestions[:limit]

    return {"suggestions": suggestions, "total": total}

@app.get("/suggestions/export")
async def export_suggestions(format: str = "json", status: str | None = None, category: str | None = None):
    suggestions = _load_suggestions()
    if status:
        suggestions = [s for s in suggestions if s.get('status') == status]
    if category:
        suggestions = [s for s in suggestions if s.get('category') == category]

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "timestamp", "category", "priority", "file_path", "line_start",
                         "line_end", "title", "description", "status", "rationale"])
        for s in suggestions:
            writer.writerow([
                s.get('id', ''), s.get('timestamp', ''), s.get('category', ''),
                s.get('priority', ''), s.get('file_path', ''), s.get('line_start', ''),
                s.get('line_end', ''), s.get('title', ''), s.get('description', ''),
                s.get('status', ''), s.get('rationale', '')
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cio_suggestions.csv"}
        )

    return Response(
        content=json.dumps(suggestions, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=cio_suggestions.json"}
    )

@app.get("/suggestion/{suggestion_id}")
async def get_suggestion(suggestion_id: str):
    suggestions = _load_suggestions()
    for s in suggestions:
        if s.get('id') == suggestion_id:
            return s
    raise HTTPException(status_code=404, detail="Suggestion not found")

@app.patch("/suggestion/{suggestion_id}")
async def update_suggestion(suggestion_id: str, update: dict):
    suggestions = _load_suggestions()
    for i, s in enumerate(suggestions):
        if s.get('id') == suggestion_id:
            allowed_fields = {'status', 'note', 'priority'}
            for field in allowed_fields:
                if field in update:
                    suggestions[i][field] = update[field]
            _save_suggestions(suggestions)
            return suggestions[i]
    raise HTTPException(status_code=404, detail="Suggestion not found")

@app.delete("/suggestions")
async def delete_suggestions(purge_all: bool = False, status: str | None = None):
    suggestions = _load_suggestions()
    if purge_all:
        count = len(suggestions)
        _save_suggestions([])
        return {"status": "success", "message": f"Deleted all {count} suggestions"}
    elif status:
        original_count = len(suggestions)
        suggestions = [s for s in suggestions if s.get('status') != status]
        _save_suggestions(suggestions)
        deleted = original_count - len(suggestions)
        return {"status": "success", "message": f"Deleted {deleted} suggestions with status '{status}'", "remaining": len(suggestions)}
    else:
        kept = [s for s in suggestions if s.get('status') in ('applied', 'dismissed', 'adapted')]
        _save_suggestions(kept)
        return {"status": "success", "message": f"Deleted {len(suggestions) - len(kept)} pending suggestions, kept {len(kept)}"}

@app.post("/suggestions/batch")
async def batch_update_suggestions(request: BatchUpdateRequest):
    if request.status not in ('applied', 'dismissed', 'adapted', 'pending'):
        raise HTTPException(status_code=400, detail=f"Invalid status: {request.status}")
    suggestions = _load_suggestions()
    updated = []
    not_found = []
    for sid in request.suggestion_ids:
        found = False
        for i, s in enumerate(suggestions):
            if s.get('id') == sid:
                suggestions[i]['status'] = request.status
                if request.note:
                    suggestions[i]['note'] = request.note
                suggestions[i]['updated_at'] = datetime.utcnow().isoformat()
                updated.append(suggestions[i])
                found = True
                break
        if not found:
            not_found.append(sid)
    _save_suggestions(suggestions)
    return {"updated": len(updated), "not_found": len(not_found), "suggestions": updated}

@app.post("/suggestions/batch-apply")
async def batch_apply_suggestions(request: BatchApplyRequest):
    suggestions = _load_suggestions()
    applied = []
    failed = []
    not_found = []
    for sid in request.suggestion_ids:
        found = False
        for i, s in enumerate(suggestions):
            if s.get('id') == sid:
                found = True
                code_to_apply = s.get('suggested_code')
                if not code_to_apply:
                    failed.append({"id": sid, "reason": "No suggested_code"})
                    break
                try:
                    result = _apply_code_change(s, code_to_apply)
                    suggestions[i]['status'] = 'applied'
                    suggestions[i]['applied_code'] = code_to_apply
                    suggestions[i]['applied_at'] = datetime.utcnow().isoformat()
                    suggestions[i]['original_content_hash'] = result['backup_key']
                    applied.append({"id": sid, "file_path": str(result['safe_path']), "status": "applied"})
                except HTTPException as e:
                    failed.append({"id": sid, "reason": e.detail})
                break
        if not found:
            not_found.append(sid)
    _save_suggestions(suggestions)
    return {"applied": len(applied), "failed": len(failed), "not_found": len(not_found),
            "details": {"applied": applied, "failed": failed}}

@app.post("/suggestion/{suggestion_id}/apply-adapted")
async def apply_adapted_suggestion(suggestion_id: str, adapted_code: str = Body(...)):
    suggestions = _load_suggestions()
    for i, s in enumerate(suggestions):
        if s.get('id') == suggestion_id:
            try:
                result = _apply_code_change(s, adapted_code)
            except HTTPException:
                raise

            suggestions[i]['status'] = 'adapted'
            suggestions[i]['applied_code'] = adapted_code
            suggestions[i]['adapted_from'] = s.get('suggested_code')
            suggestions[i]['applied_at'] = datetime.utcnow().isoformat()
            suggestions[i]['original_content_hash'] = result['backup_key']
            _save_suggestions(suggestions)

            return {
                "success": True,
                "suggestion_id": suggestion_id,
                "file_path": str(result['safe_path']),
                "status": "adapted",
                "message": f"Successfully applied adapted suggestion to {result['safe_path'].name}"
            }

    raise HTTPException(status_code=404, detail="Suggestion not found")

@app.post("/suggestion/{suggestion_id}/apply")
async def apply_suggestion(suggestion_id: str, adapted_code: str | None = Body(default=None)):
    suggestions = _load_suggestions()
    for i, s in enumerate(suggestions):
        if s.get('id') == suggestion_id:
            code_to_apply = adapted_code if adapted_code is not None else s.get('suggested_code')
            if not code_to_apply:
                raise HTTPException(status_code=400, detail="Suggestion has no suggested_code to apply")

            try:
                result = _apply_code_change(s, code_to_apply)
            except HTTPException:
                raise

            suggestions[i]['status'] = 'applied'
            suggestions[i]['applied_code'] = code_to_apply
            suggestions[i]['applied_at'] = datetime.utcnow().isoformat()
            suggestions[i]['original_content_hash'] = result['backup_key']
            if adapted_code:
                suggestions[i]['adapted_from'] = s.get('suggested_code')
            _save_suggestions(suggestions)

            return {
                "success": True,
                "suggestion_id": suggestion_id,
                "file_path": str(result['safe_path']),
                "status": suggestions[i]['status'],
                "message": f"Successfully applied suggestion to {result['safe_path'].name}"
            }

    raise HTTPException(status_code=404, detail="Suggestion not found")

@app.post("/suggestion/{suggestion_id}/revert")
async def revert_suggestion(suggestion_id: str):
    suggestions = _load_suggestions()
    for i, s in enumerate(suggestions):
        if s.get('id') == suggestion_id:
            if s.get('status') not in ('applied', 'adapted'):
                raise HTTPException(status_code=400, detail="Can only revert applied or adapted suggestions")

            if not s.get('current_code'):
                raise HTTPException(status_code=400, detail="No original code available to revert")

            file_path = s.get('file_path')
            if not file_path:
                raise HTTPException(status_code=400, detail="Suggestion has no file_path")

            safe_path = (DEFAULT_CIO_TARGET_DIR / file_path).resolve()
            if not str(safe_path).startswith(str(DEFAULT_CIO_TARGET_DIR.resolve())):
                raise HTTPException(status_code=400, detail="Invalid file path")
            if not safe_path.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

            try:
                with open(safe_path) as f:
                    content = f.read()

                current_code_in_file = s.get('applied_code') or s.get('suggested_code', '')
                if current_code_in_file and current_code_in_file in content:
                    new_content = content.replace(current_code_in_file, s['current_code'], 1)
                else:
                    line_start = max(1, s.get('line_start', 1))
                    line_end = min(len(content.split('\n')), s.get('line_end', line_start))
                    lines = content.split('\n')
                    new_lines = lines[:line_start - 1] + [s['current_code']] + lines[line_end:]
                    new_content = '\n'.join(new_lines)

                with open(safe_path, 'w') as f:
                    f.write(new_content)

                suggestions[i]['status'] = 'reverted'
                suggestions[i]['reverted_at'] = datetime.utcnow().isoformat()
                _save_suggestions(suggestions)

                return {
                    "success": True,
                    "suggestion_id": suggestion_id,
                    "file_path": str(safe_path),
                    "status": "reverted",
                    "message": f"Successfully reverted suggestion in {safe_path.name}"
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to revert: {str(e)}")

    raise HTTPException(status_code=404, detail="Suggestion not found")

@app.post("/suggestion/{suggestion_id}/adapt")
async def adapt_suggestion(suggestion_id: str, adapted_code: str = Body(...)):
    suggestions = _load_suggestions()
    for i, s in enumerate(suggestions):
        if s.get('id') == suggestion_id:
            suggestions[i]['status'] = 'adapted'
            suggestions[i]['adapted_code'] = adapted_code
            suggestions[i]['adapted_at'] = datetime.utcnow().isoformat()
            suggestions[i]['original_suggested_code'] = s.get('suggested_code')
            _save_suggestions(suggestions)
            return suggestions[i]
    raise HTTPException(status_code=404, detail="Suggestion not found")

@app.post("/analyze")
async def trigger_analysis(request: AnalyzeRequest | None = None):
    global _analysis_cancelled, _analysis_in_progress

    include_tests = request.include_tests if request and request.include_tests is not None else True
    include_understanding = request.include_understanding if request and request.include_understanding is not None else True
    exclude_dirs = request.exclude_dirs if request and request.exclude_dirs is not None else None
    exclude_files = request.exclude_files if request and request.exclude_files is not None else None
    target_dir = request.target_dir if request and request.target_dir else str(DEFAULT_CIO_TARGET_DIR)

    code_root = target_dir if target_dir else str(DEFAULT_CIO_TARGET_DIR)

    asyncio.create_task(_run_analysis(code_root, include_tests, exclude_dirs, exclude_files, include_understanding))

    return {"status": "started", "message": "Analysis started in background", "target_dir": code_root, "include_understanding": include_understanding, "exclude_dirs": exclude_dirs, "exclude_files": exclude_files}

async def _run_analysis(root_path: str, include_tests: bool = False, exclude_dirs: list[str] | None = None, exclude_files: list[str] | None = None, include_understanding: bool = True) -> list[dict]:
    global _analysis_in_progress, _analysis_cancelled
    suggestions = []
    _analysis_in_progress = True
    _analysis_cancelled = False

    if root_path and Path(root_path).exists():
        code_root = str(Path(root_path).resolve())
    else:
        code_root = str(DEFAULT_CIO_TARGET_DIR)

    analyzer = CodeAnalyzer(code_root, include_tests, exclude_dirs=exclude_dirs, exclude_files=exclude_files, include_understanding=include_understanding)
    try:
        async for suggestion in analyzer.analyze():
            if _analysis_cancelled:
                break
            suggestions.append(_suggestion_to_dict(suggestion))
        _record_scan("completed", len(suggestions), code_root)
    except Exception as e:
        _record_scan("error", len(suggestions), code_root, error=str(e))
    finally:
        _analysis_in_progress = False

    return suggestions

def _append_suggestion(suggestion: dict) -> None:
    SUGGESTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing = []
    if SUGGESTIONS_FILE.exists():
        try:
            with open(SUGGESTIONS_FILE) as f:
                existing = json.load(f)
        except Exception:
            existing = []

    existing = [s for s in existing if s.get('id') != suggestion.get('id')]

    dup_key = _dedup_key(suggestion)
    existing = [s for s in existing if _dedup_key(s) != dup_key]
    existing.append(suggestion)

    with open(SUGGESTIONS_FILE, 'w') as f:
        json.dump(existing, f, indent=2)

@app.get("/stream")
async def stream_analysis():
    global _analysis_in_progress, _analysis_cancelled

    code_root = str(DEFAULT_CIO_TARGET_DIR)

    async def generate():
        global _analysis_in_progress, _analysis_cancelled
        _analysis_in_progress = True
        _analysis_cancelled = False

        existing = _load_suggestions()
        kept = [s for s in existing if s.get('status') in ('applied', 'dismissed', 'adapted')]
        _save_suggestions(kept)

        yield f"data: {json.dumps({'type': 'start', 'message': 'Starting analysis...', 'target_dir': code_root})}\n\n"

        count = 0
        analyzer = CodeAnalyzer(code_root, True, exclude_dirs=None, exclude_files=None, include_understanding=True)

        files_to_analyze = analyzer.get_files_to_analyze()
        yield f"data: {json.dumps({'type': 'progress', 'message': f'Found {len(files_to_analyze)} files to analyze in {Path(code_root).name}'})}\n\n"

        try:
            async for suggestion in analyzer.analyze():
                if _analysis_cancelled:
                    yield f"data: {json.dumps({'type': 'cancelled', 'count': count})}\n\n"
                    break
                count += 1

                yield f"data: {json.dumps({'type': 'suggestion', 'suggestion': suggestion.to_dict()})}\n\n"

                _append_suggestion(suggestion.to_dict())

            if not _analysis_cancelled:
                _record_scan("completed", count, code_root)
                yield f"data: {json.dumps({'type': 'complete', 'count': count})}\n\n"
            else:
                _record_scan("cancelled", count, code_root)
        except Exception as e:
            _record_scan("error", count, code_root, error=str(e))
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            _analysis_in_progress = False

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@app.post("/analyze-and-save")
async def analyze_and_save(include_tests: bool | None = None, include_understanding: bool | None = None):
    global _analysis_in_progress, _analysis_cancelled

    if include_tests is None:
        include_tests = True
    if include_understanding is None:
        include_understanding = True

    code_root = str(DEFAULT_CIO_TARGET_DIR)

    existing = _load_suggestions()
    kept = [s for s in existing if s.get('status') in ('applied', 'dismissed', 'adapted')]
    _save_suggestions(kept)

    count = 0
    analyzer = CodeAnalyzer(code_root, include_tests, exclude_dirs=None, exclude_files=None, include_understanding=include_understanding)
    try:
        async for suggestion in analyzer.analyze():
            count += 1
            _append_suggestion(suggestion.to_dict())
        _record_scan("completed", count, code_root)
    except Exception as e:
        _record_scan("error", count, code_root, error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return {
        "status": "complete",
        "count": count,
        "last_scan": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "cio-agent"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CIO_AGENT_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)