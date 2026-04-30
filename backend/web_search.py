"""Agentic Web Search & URL Fetching tools for CIO Intelligence Hub.

This module implements Native Mode (Agentic Mode) web search functionality:
- search_web: Returns snippets directly; no RAG/chunking/Vector DB
- fetch_url: Fetches full page content directly into model context

Based on Open WebUI's agentic search approach with Interleaved Thinking support.
"""
import json
import re
import html
from typing import Optional
from urllib.parse import urlparse

import httpx

MAX_FETCH_CHARS = 50000


WEB_SEARCH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for information using a search engine. Returns a list of search results with titles, URLs, and snippets. Use this when you need current information, facts, or content that you don't have in your training data. The model should analyze the snippets and decide if follow-up is needed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find information on the web."
                    },
                    "count": {
                        "type": "integer",
                        "description": "The number of search results to return (default: 10, max varies by provider)."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Fetch the full content of a web page and extract its main text. Returns the page content directly to the model context (up to 50,000 characters). Use this when search result snippets are insufficient and you need to read a page in detail to find specific information, verify facts, or follow links mentioned on the page.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL of the web page to fetch and extract text from."
                    }
                },
                "required": ["url"]
            }
        }
    },
]


def search_web(query: str, count: int = 10) -> dict:
    """Execute a web search and return results with snippets.

    Returns a dict with success status and results array containing
    title, url, and snippet for each result.
    """
    from config import get_config
    cfg = get_config()

    provider = cfg.web_search_provider
    api_key = cfg.web_search_api_key
    result_count = min(count, cfg.web_search_result_count)

    try:
        if provider == "serpapi":
            return _search_serpapi(query, result_count, api_key, cfg.web_search_serpapi_base_url)
        elif provider == "searxng":
            return _search_searxng(query, result_count, cfg.web_search_searxng_base_url)
        else:
            return _search_duckduckgo(query, result_count)
    except Exception as e:
        return {"success": False, "error": str(e), "results": []}


def _search_duckduckgo(query: str, count: int) -> dict:
    """Search using DuckDuckGo HTML parser (no API key required)."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        params = {
            "q": query,
            "kl": "en-us",
        }

        url = "https://html.duckduckgo.com/html/"
        results = []

        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()

            html_content = response.text
            result_pattern = re.compile(
                r'<a class="result__a" href="([^"]+)">([^<]+)</a>.*?'
                r'<a class="result__snippet" href="[^"]+">([^<]+)</a>',
                re.DOTALL
            )

            for match in result_pattern.finditer(html_content):
                url_val = match.group(1).strip()
                title = html.unescape(match.group(2).strip())
                snippet = html.unescape(match.group(3).strip()).replace('<b>', '').replace('</b>', '')

                if url_val and title and not url_val.startswith('/'):
                    results.append({
                        "title": title,
                        "url": url_val,
                        "snippet": snippet
                    })

                if len(results) >= count:
                    break

            if not results:
                snippet_pattern = re.compile(r'<p class="result__snippet">([^<]+)</p>')
                for i, snippet_match in enumerate(snippet_pattern.finditer(html_content)):
                    snippet = html.unescape(snippet_match.group(1)).replace('<b>', '').replace('</b>', '')
                    results.append({
                        "title": f"Result {i+1}",
                        "url": "#",
                        "snippet": snippet
                    })
                    if len(results) >= count:
                        break

        return {"success": True, "query": query, "count": len(results), "results": results}

    except Exception as e:
        return {"success": False, "error": str(e), "results": []}


def _search_serpapi(query: str, count: int, api_key: str | None, base_url: str | None) -> dict:
    """Search using SerpAPI (supports Google, Bing, etc.)."""
    if not api_key:
        return {"success": False, "error": "SerpAPI API key not configured", "results": []}

    try:
        params = {
            "q": query,
            "api_key": api_key,
            "engine": "google",
            "num": count,
        }

        base = base_url or "https://serpapi.com/search"

        with httpx.AsyncClient(timeout=60.0) as client:
            response = httpx.get(base, params=params)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("organic_results", [])[:count]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", "")
            })

        return {"success": True, "query": query, "count": len(results), "results": results}

    except Exception as e:
        return {"success": False, "error": str(e), "results": []}


def _search_searxng(query: str, count: int, base_url: str | None) -> dict:
    """Search using a self-hosted SearXNG instance."""
    if not base_url:
        return {"success": False, "error": "SearXNG base URL not configured", "results": []}

    try:
        params = {
            "q": query,
            "format": "json",
            "engines": "google,bing,duckduckgo",
            "categories": "general",
        }

        headers = {
            "User-Agent": "CIO-Intelligence-Hub/1.0"
        }

        with httpx.Client(timeout=30.0) as client:
            response = client.get(base_url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", [])[:count]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("content", "")
            })

        return {"success": True, "query": query, "count": len(results), "results": results}

    except Exception as e:
        return {"success": False, "error": str(e), "results": []}


def fetch_url(url: str) -> dict:
    """Fetch a URL and extract its main text content.

    Returns the page content directly (up to MAX_FETCH_CHARS characters).
    """
    if not _is_valid_url(url):
        return {"success": False, "error": "Invalid URL format", "content": ""}

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; CIO-Intelligence-Hub/1.0; +https://github.com/username/cio-intelligence-hub)"
        }

        with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                text = response.text[:MAX_FETCH_CHARS]
                return {
                    "success": True,
                    "url": url,
                    "title": url.split("/")[-1],
                    "content": text,
                    "truncated": len(response.text) > MAX_FETCH_CHARS
                }

            html_content = response.text
            text = _extract_text_from_html(html_content)

            if len(text) > MAX_FETCH_CHARS:
                text = text[:MAX_FETCH_CHARS]
                truncated = True
            else:
                truncated = len(html_content) > MAX_FETCH_CHARS

            title = _extract_title_from_html(html_content)

            return {
                "success": True,
                "url": url,
                "title": title or url,
                "content": text,
                "truncated": truncated
            }

    except Exception as e:
        return {"success": False, "error": str(e), "content": "", "url": url}


def _is_valid_url(url: str) -> bool:
    """Check if a string is a valid URL."""
    try:
        result = urlparse(url)
        return all([result.scheme in ("http", "https"), result.netloc])
    except Exception:
        return False


def _extract_text_from_html(html_content: str) -> str:
    """Extract readable text from HTML content."""
    text = html_content

    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<nav[^>]*>.*?</nav>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<footer[^>]*>.*?</footer>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<header[^>]*>.*?</header>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<aside[^>]*>.*?</aside>', '', text, flags=re.DOTALL | re.IGNORECASE)

    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</div>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)

    text = html.unescape(text)

    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = text.strip()

    return text


def _extract_title_from_html(html_content: str) -> str | None:
    """Extract the page title from HTML."""
    title_match = re.search(r'<title[^>]*>([^<]+)</title>', html_content, re.IGNORECASE)
    if title_match:
        return html.unescape(title_match.group(1).strip())

    h1_match = re.search(r'<h1[^>]*>([^<]+)</h1>', html_content, re.IGNORECASE)
    if h1_match:
        return html.unescape(h1_match.group(1).strip())

    return None


def execute_web_tool(tool_name: str, arguments: dict) -> dict:
    """Execute a web search tool and return the result with clear source attribution."""
    try:
        if tool_name == "search_web":
            query = arguments.get("query", "")
            count = arguments.get("count", 10)
            result = search_web(query, count)

            if result.get("success") and result.get("results"):
                sources_md = ["**Sources from Web Search:**\n"]
                for i, r in enumerate(result["results"], 1):
                    sources_md.append(f"{i}. **{r['title']}**")
                    sources_md.append(f"   URL: {r['url']}")
                    sources_md.append(f"   Snippet: {r['snippet'][:200]}..." if len(r.get('snippet', '')) > 200 else f"   Snippet: {r.get('snippet', '')}")
                    sources_md.append("")

                result["formatted_response"] = "\n".join(sources_md)

            return result

        elif tool_name == "fetch_url":
            url = arguments.get("url", "")
            result = fetch_url(url)

            if result.get("success"):
                title = result.get("title", "Unknown Page")
                result["formatted_response"] = f"""**Content Fetched from: {title}**

**URL:** {url}

---

{result.get('content', '')[:10000]}{'...(content truncated)' if result.get('truncated') else ''}"""

            return result

        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        return {"success": False, "error": str(e)}