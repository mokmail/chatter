"""CIO Agent Adapter - Proxies requests to external CIO Agent service."""
from typing import Any

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse


CIO_AGENT_ROUTE_PREFIX = "/api/cio-agent"


async def _proxy_request(path: str, cio_agent_url: str, method: str = "GET", body: dict | None = None) -> Response:
    stripped_path = path.replace(CIO_AGENT_ROUTE_PREFIX, "")
    url = f"{cio_agent_url}{stripped_path}"
    headers = {"Content-Type": "application/json"} if body else {}

    async with httpx.AsyncClient(timeout=300.0) as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=body)
        elif method == "PATCH":
            response = await client.patch(url, headers=headers, json=body)
        elif method == "DELETE":
            response = await client.delete(url, headers=headers)
        else:
            return Response(content="Method not supported", status_code=405)

        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers)
        )


async def proxy_cio_agent_request(path: str, cio_agent_url: str, method: str = "GET", body: dict | None = None) -> Response:
    return await _proxy_request(path, cio_agent_url, method, body)


def proxy_event_stream(path: str, cio_agent_url: str):
    stripped_path = path.replace(CIO_AGENT_ROUTE_PREFIX, "")

    async def event_generator():
        url = f"{cio_agent_url}{stripped_path}"
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream("GET", url) as response:
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def register_cio_agent_proxy_routes(app: FastAPI, cio_agent_url: str, provider_config: Any) -> None:
    """Register proxy routes for CIO Agent service."""

    @app.get("/api/cio-agent/status")
    async def get_status():
        return await proxy_cio_agent_request("/api/cio-agent/status", cio_agent_url)

    @app.post("/api/cio-agent/toggle")
    async def toggle(request: Request):
        body = await request.json()
        return await proxy_cio_agent_request("/api/cio-agent/toggle", cio_agent_url, method="POST", body=body)

    @app.post("/api/cio-agent/analyze")
    async def analyze(request: Request):
        body = await request.json() if request.body else None
        return await proxy_cio_agent_request("/api/cio-agent/analyze", cio_agent_url, method="POST", body=body)

    @app.post("/api/cio-agent/analyze-and-save")
    async def analyze_and_save(request: Request):
        body = await request.json() if request.body else None
        return await proxy_cio_agent_request("/api/cio-agent/analyze-and-save", cio_agent_url, method="POST", body=body)

    @app.get("/api/cio-agent/stream")
    async def stream():
        return proxy_event_stream("/api/cio-agent/stream", cio_agent_url)

    @app.get("/api/cio-agent/suggestions")
    async def get_suggestions():
        return await proxy_cio_agent_request("/api/cio-agent/suggestions", cio_agent_url)

    @app.post("/api/cio-agent/suggestion/{suggestion_id}")
    async def update_suggestion(suggestion_id: str, request: Request):
        body = await request.json()
        return await proxy_cio_agent_request(f"/api/cio-agent/suggestion/{suggestion_id}", cio_agent_url, method="POST", body=body)

    @app.post("/api/cio-agent/suggestion/{suggestion_id}/apply")
    async def apply_suggestion(suggestion_id: str):
        return await proxy_cio_agent_request(f"/api/cio-agent/suggestion/{suggestion_id}/apply", cio_agent_url, method="POST")

    @app.post("/api/cio-agent/suggestion/{suggestion_id}/adapt")
    async def adapt_suggestion(suggestion_id: str, request: Request):
        body = await request.json()
        return await proxy_cio_agent_request(f"/api/cio-agent/suggestion/{suggestion_id}/adapt", cio_agent_url, method="POST", body=body)

    @app.post("/api/cio-agent/suggestion/{suggestion_id}/apply-adapted")
    async def apply_adapted(suggestion_id: str, request: Request):
        body = await request.json()
        return await proxy_cio_agent_request(f"/api/cio-agent/suggestion/{suggestion_id}/apply-adapted", cio_agent_url, method="POST", body=body)

    @app.post("/api/cio-agent/suggestion/{suggestion_id}/revert")
    async def revert_suggestion(suggestion_id: str):
        return await proxy_cio_agent_request(f"/api/cio-agent/suggestion/{suggestion_id}/revert", cio_agent_url, method="POST")

    @app.post("/api/cio-agent/stop")
    async def stop_analysis():
        return await proxy_cio_agent_request("/api/cio-agent/stop", cio_agent_url, method="POST")

    @app.post("/api/cio-agent/purge")
    async def purge(request: Request):
        body = await request.json() if request.body else None
        return await proxy_cio_agent_request("/api/cio-agent/purge", cio_agent_url, method="POST", body=body)

    @app.delete("/api/cio-agent/suggestions")
    async def delete_suggestions(request: Request):
        url = f"{cio_agent_url}/api/cio-agent/suggestions"
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.delete(url, params=request.query_params)
            return Response(content=response.content, status_code=response.status_code)

    @app.get("/api/cio-agent/suggestions/export")
    async def export_suggestions(format: str = "json", status: str | None = None, category: str | None = None):
        url = f"{cio_agent_url}/api/cio-agent/suggestions/export"
        params = {"format": format}
        if status:
            params["status"] = status
        if category:
            params["category"] = category
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(url, params=params)
            return Response(content=response.content, status_code=response.status_code, headers=dict(response.headers))

    @app.post("/api/cio-agent/suggestions/batch")
    async def batch_update(request: Request):
        body = await request.json()
        return await proxy_cio_agent_request("/api/cio-agent/suggestions/batch", cio_agent_url, method="POST", body=body)

    @app.post("/api/cio-agent/suggestions/batch-apply")
    async def batch_apply(request: Request):
        body = await request.json()
        return await proxy_cio_agent_request("/api/cio-agent/suggestions/batch-apply", cio_agent_url, method="POST", body=body)

    @app.get("/api/cio-agent/stats")
    async def get_stats():
        return await proxy_cio_agent_request("/api/cio-agent/stats", cio_agent_url)

    @app.get("/api/cio-agent/scan-history")
    async def get_scan_history():
        return await proxy_cio_agent_request("/api/cio-agent/scan-history", cio_agent_url)

    print(f"CIO Agent adapter registered, proxying to {cio_agent_url}")