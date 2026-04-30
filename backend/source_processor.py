"""Source processors for fetching data from various knowledge base sources."""
import asyncio
import json
import re
import time
import hashlib
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx


async def fetch_source(source: dict) -> list[dict]:
    """Fetch content from a source config. Returns list of {name, content, content_url, file_type, metadata}."""
    source_type = source.get("type", "notes")
    config = source.get("config", {})
    
    fetchers = {
        "notes": _fetch_notes,
        "files": _fetch_files,
        "url": _fetch_url,
        "repository": _fetch_repository,
        "api": _fetch_api,
        "directory": _fetch_directory,
        "service": _fetch_service,
        "workflow": _fetch_workflow,
    }
    
    fetcher = fetchers.get(source_type)
    if not fetcher:
        raise ValueError(f"Unknown source type: {source_type}")
    
    return await fetcher(config)


async def _fetch_notes(config: dict) -> list[dict]:
    """Fetch notes content - directly stores the text."""
    content = config.get("content", "")
    if not content.strip():
        return []
    return [{
        "name": "notes",
        "content": content,
        "content_url": "",
        "file_type": "text",
        "metadata": {"source_type": "notes"},
    }]


async def _fetch_files(config: dict) -> list[dict]:
    """Files are handled via upload endpoints, not fetched."""
    return []


async def _fetch_url(config: dict) -> list[dict]:
    """Fetch and parse content from URLs with crawling support."""
    start_url = config.get("url", "").strip()
    if not start_url:
        return []
    
    max_pages = int(config.get("maxPages", 100))
    crawl_depth = int(config.get("crawlDepth", 1))
    follow_links = config.get("followLinks", True)
    respect_robots = config.get("respectRobots", True)
    exclude_patterns = [p.strip() for p in config.get("excludePatterns", "").split(",") if p.strip()]
    
    results = []
    visited = set()
    visited_content_hashes = set()
    to_visit = [(start_url, 0)]
    base_domain = urlparse(start_url).netloc
    
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        while to_visit and len(results) < max_pages:
            url, depth = to_visit.pop(0)
            
            if url in visited:
                continue
            if depth > crawl_depth:
                continue
            
            # Check exclude patterns
            skip = False
            for pattern in exclude_patterns:
                if pattern in url:
                    skip = True
                    break
            if skip:
                continue
            
            visited.add(url)
            
            try:
                resp = await client.get(url, headers={"User-Agent": "KnowledgeBot/1.0"})
                content_type = resp.headers.get("content-type", "")
                
                if "text/html" in content_type:
                    text = _extract_text_from_html(resp.text)
                    content_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
                    links = []
                    if follow_links and depth < crawl_depth:
                        links = _extract_links(resp.text, start_url, base_domain)
                    
                    if content_hash not in visited_content_hashes:
                        visited_content_hashes.add(content_hash)
                        results.append({
                            "name": _url_to_name(url),
                            "content": text,
                            "content_url": url,
                            "file_type": "html",
                            "metadata": {"source_type": "url", "url": url, "depth": depth, "content_hash": content_hash},
                        })
                    
                    for link in links:
                        if link not in visited and len(visited) < max_pages:
                            to_visit.append((link, depth + 1))
                
                elif "text/" in content_type or "json" in content_type or "xml" in content_type:
                    content_hash = hashlib.sha256(resp.text.encode()).hexdigest()[:16]
                    if content_hash not in visited_content_hashes:
                        visited_content_hashes.add(content_hash)
                        results.append({
                            "name": _url_to_name(url),
                            "content": resp.text,
                            "content_url": url,
                            "file_type": content_type.split(";")[0].split("/")[-1],
                            "metadata": {"source_type": "url", "url": url, "content_hash": content_hash},
                        })
            except Exception as e:
                print(f"Error fetching {url}: {e}")
                continue
    
    return results


async def _fetch_repository(config: dict) -> list[dict]:
    """Clone a git repository and read its files."""
    repo_url = config.get("repoUrl", "").strip()
    if not repo_url:
        return []
    
    branch = config.get("branch", "main")
    depth = config.get("depth", "1")
    file_patterns = [p.strip() for p in config.get("filePatterns", "*.md,*.txt,*.py,*.js").split(",") if p.strip()]
    exclude_patterns = [p.strip() for p in config.get("excludePatterns", "node_modules/,__pycache__,.git/").split(",") if p.strip()]
    parse_code = config.get("parseCode", True)
    access_token = config.get("accessToken", "")
    
    import subprocess
    import tempfile
    import fnmatch
    
    # Clone repo to temp directory
    tmp_dir = tempfile.mkdtemp(prefix="kb_repo_")
    clone_depth = ["--depth", depth] if depth != "full" else []
    env = {}
    if access_token:
        if "github.com" in repo_url:
            auth_url = repo_url.replace("https://", f"https://{access_token}@")
        else:
            auth_url = repo_url
        env["GIT_TERMINAL_PROMPT"] = "0"
    else:
        auth_url = repo_url
    
    try:
        cmd = ["git", "clone", "--branch", branch] + clone_depth + [auth_url, tmp_dir]
        result = subprocess.run(cmd, capture_output=True, text=True, env={**subprocess.os.environ, **env}, timeout=120)
        if result.returncode != 0:
            # Try without branch specification
            cmd = ["git", "clone"] + clone_depth + [auth_url, tmp_dir]
            result = subprocess.run(cmd, capture_output=True, text=True, env={**subprocess.os.environ, **env}, timeout=120)
            if result.returncode != 0:
                return [{"name": "repo_error", "content": f"Failed to clone repository: {result.stderr[:500]}", "content_url": repo_url, "file_type": "text", "metadata": {"source_type": "repository", "error": True}}]
    except subprocess.TimeoutExpired:
        return [{"name": "repo_timeout", "content": "Repository clone timed out", "content_url": repo_url, "file_type": "text", "metadata": {"source_type": "repository", "error": True}}]
    except Exception as e:
        return [{"name": "repo_error", "content": f"Error cloning repository: {str(e)[:500]}", "content_url": repo_url, "file_type": "text", "metadata": {"source_type": "repository", "error": True}}]
    
    results = []
    visited_content_hashes = set()
    repo_path = Path(tmp_dir)
    
    # Walk through files
    max_files = 200
    files_processed = 0
    
    for file_path in repo_path.rglob("*"):
        if files_processed >= max_files:
            break
        
        if not file_path.is_file():
            continue
        
        rel_path = str(file_path.relative_to(repo_path))
        
        # Check exclude patterns
        skip = False
        for exc in exclude_patterns:
            if exc in rel_path or fnmatch.fnmatch(rel_path, exc):
                skip = True
                break
        if skip:
            continue
        
        # Check file patterns
        matched = False
        for pattern in file_patterns:
            if fnmatch.fnmatch(file_path.name, pattern):
                matched = True
                break
        if not matched:
            continue
        
        # Skip binary files by extension
        binary_exts = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".avi", ".mov", ".zip", ".gz", ".tar"}
        if file_path.suffix.lower() in binary_exts:
            continue
        
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
            if not content.strip():
                continue
            
            content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
            if content_hash in visited_content_hashes:
                continue
            visited_content_hashes.add(content_hash)
            
            # Add code structure info if parse_code enabled
            header = ""
            if parse_code and file_path.suffix in (".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".java", ".c", ".cpp", ".h"):
                header = f"File: {rel_path}\n\n"
            
            results.append({
                "name": rel_path,
                "content": header + content,
                "content_url": f"{repo_url}/blob/{branch}/{rel_path}",
                "file_type": file_path.suffix.lstrip(".") or "text",
                "metadata": {"source_type": "repository", "repo_url": repo_url, "branch": branch, "file_path": rel_path},
            })
            files_processed += 1
        except Exception:
            continue
    
    # Clean up
    import shutil
    try:
        shutil.rmtree(tmp_dir)
    except Exception:
        pass
    
    return results


async def _fetch_api(config: dict) -> list[dict]:
    """Fetch data from a REST API endpoint."""
    endpoint = config.get("apiEndpoint", "").strip()
    if not endpoint:
        return []
    
    method = config.get("method", "GET").upper()
    auth_type = config.get("authType", "none")
    api_key = config.get("apiKey", "")
    headers_raw = config.get("headers", "")
    query_params = config.get("queryParams", "")
    transform_script = config.get("transformScript", "")
    
    # Build headers
    headers = {"Accept": "application/json"}
    if auth_type == "bearer" and api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif auth_type == "api_key" and api_key:
        headers["X-API-Key"] = api_key
    elif auth_type == "basic" and api_key:
        import base64
        headers["Authorization"] = f"Basic {base64.b64encode(api_key.encode()).decode()}"
    
    if headers_raw:
        try:
            custom_headers = json.loads(headers_raw)
            headers.update(custom_headers)
        except json.JSONDecodeError:
            pass
    
    # Build URL with query params
    url = endpoint
    if query_params:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}{query_params}"
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if method == "GET":
                resp = await client.get(url, headers=headers)
            elif method == "POST":
                resp = await client.post(url, headers=headers)
            elif method == "PUT":
                resp = await client.put(url, headers=headers)
            else:
                resp = await client.get(url, headers=headers)
        
        content = resp.text
        
        # Try to parse and transform
        if transform_script:
            try:
                # Simple transform: expect a JS-like expression
                data = resp.json() if "json" in resp.headers.get("content-type", "") else {}
                # Run transform - for now, just stringify if the script exists
                content = json.dumps(data, indent=2) if isinstance(data, (dict, list)) else str(data)
            except Exception:
                pass
        
        return [{
            "name": f"API: {endpoint.split('/')[-1] or endpoint}",
            "content": content,
            "content_url": endpoint,
            "file_type": "json" if "json" in resp.headers.get("content-type", "") else "text",
            "metadata": {"source_type": "api", "endpoint": endpoint, "method": method, "status_code": resp.status_code},
        }]
    except Exception as e:
        return [{"name": f"API Error", "content": f"Failed to fetch from {endpoint}: {str(e)}", "content_url": endpoint, "file_type": "text", "metadata": {"source_type": "api", "error": True}}]


async def _fetch_directory(config: dict) -> list[dict]:
    """Read files from a local directory."""
    dir_path = config.get("directoryPath", "").strip()
    if not dir_path:
        return []
    
    import fnmatch
    
    path = Path(dir_path).expanduser()
    if not path.exists() or not path.is_dir():
        return []
    
    file_patterns = [p.strip() for p in config.get("filePatterns", "*.md,*.txt,*.pdf,*.docx").split(",") if p.strip()]
    exclude_patterns = [p.strip() for p in config.get("excludePatterns", ".git/,.git/,node_modules/,__pycache__/").split(",") if p.strip()]
    recursive = config.get("recursive", True)
    
    results = []
    visited_content_hashes = set()
    max_files = 200
    
    glob_fn = path.rglob if recursive else path.glob
    
    for file_path in glob_fn("*"):
        if len(results) >= max_files:
            break
        if not file_path.is_file():
            continue
        
        rel_path = str(file_path.relative_to(path))
        
        # Check exclude
        skip = False
        for exc in exclude_patterns:
            if exc in rel_path:
                skip = True
                break
        if skip:
            continue
        
        # Check include patterns
        matched = False
        for pattern in file_patterns:
            if fnmatch.fnmatch(file_path.name, pattern):
                matched = True
                break
        if not matched:
            continue
        
        # Skip binary
        binary_exts = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".gz", ".tar"}
        if file_path.suffix.lower() in binary_exts:
            continue
        
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
            if not content.strip():
                continue
            content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
            if content_hash in visited_content_hashes:
                continue
            visited_content_hashes.add(content_hash)
            results.append({
                "name": rel_path,
                "content": content,
                "content_url": str(file_path),
                "file_type": file_path.suffix.lstrip(".") or "text",
                "metadata": {"source_type": "directory", "path": str(file_path)},
            })
        except Exception:
            continue
    
    return results


async def _fetch_service(config: dict) -> list[dict]:
    """Fetch data from connected services (placeholder implementations)."""
    service_type = config.get("serviceType", "notion")
    access_token = config.get("accessToken", "")
    workspace = config.get("workspace", "")
    
    if not access_token:
        return []
    
    # Service-specific fetching logic
    if service_type == "notion":
        return await _fetch_notion(access_token, workspace)
    elif service_type == "github":
        return await _fetch_github(access_token, workspace)
    elif service_type == "gitlab":
        return await _fetch_gitlab(access_token, workspace)
    
    # Generic service fetch
    return [{"name": f"{service_type}_placeholder", "content": f"Service '{service_type}' integration is not yet implemented. Please use URL or API source type instead.", "content_url": "", "file_type": "text", "metadata": {"source_type": "service", "service_type": service_type}}]


async def _fetch_notion(token: str, workspace: str = "") -> list[dict]:
    """Fetch pages from Notion."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            # Search for pages
            body = {"page_size": 50}
            if workspace:
                body["filter"] = {"property": "workspace", "value": workspace}
            
            resp = await client.post("https://api.notion.com/v1/search", headers=headers, json=body)
            data = resp.json()
            
            for page in data.get("results", []):
                page_id = page.get("id", "")
                title = ""
                for prop in page.get("properties", {}).values():
                    if prop.get("type") == "title":
                        title_list = prop.get("title", [])
                        title = " ".join(t.get("plain_text", "") for t in title_list)
                        break
                
                # Fetch page content
                try:
                    content_resp = await client.get(f"https://api.notion.com/v1/blocks/{page_id}/children", headers=headers)
                    blocks = content_resp.json().get("results", [])
                    text_parts = []
                    for block in blocks:
                        rt = block.get("rich_text", [])
                        for segment in rt:
                            text_parts.append(segment.get("plain_text", ""))
                    
                    content = "\n".join(text_parts)
                    if content.strip():
                        results.append({
                            "name": title or page_id,
                            "content": content,
                            "content_url": page.get("url", ""),
                            "file_type": "text",
                            "metadata": {"source_type": "service", "service": "notion", "page_id": page_id},
                        })
                except Exception:
                    continue
        except Exception as e:
            results.append({"name": "notion_error", "content": f"Error fetching from Notion: {str(e)[:500]}", "content_url": "", "file_type": "text", "metadata": {"source_type": "service", "service": "notion", "error": True}})
    
    return results


async def _fetch_github(token: str, workspace: str = "") -> list[dict]:
    """Fetch repository contents from GitHub."""
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"}
    
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            # Get user's repos
            url = "https://api.github.com/user/repos?per_page=20&sort=updated"
            resp = await client.get(url, headers=headers)
            repos = resp.json()
            
            for repo in repos[:10]:  # Limit to 10 repos
                repo_name = repo.get("full_name", "")
                # Get README
                try:
                    readme_resp = await client.get(f"https://api.github.com/repos/{repo_name}/readme", headers=headers)
                    if readme_resp.status_code == 200:
                        import base64
                        readme_data = readme_resp.json()
                        content = base64.b64decode(readme_data.get("content", "")).decode("utf-8", errors="replace")
                        results.append({
                            "name": f"{repo_name}/README.md",
                            "content": content,
                            "content_url": readme_data.get("html_url", ""),
                            "file_type": "md",
                            "metadata": {"source_type": "service", "service": "github", "repo": repo_name},
                        })
                except Exception:
                    continue
        except Exception as e:
            results.append({"name": "github_error", "content": f"Error fetching from GitHub: {str(e)[:500]}", "content_url": "", "file_type": "text", "metadata": {"source_type": "service", "service": "github", "error": True}})
    
    return results


async def _fetch_gitlab(token: str, workspace: str = "") -> list[dict]:
    """Fetch projects from GitLab."""
    headers = {"PRIVATE-TOKEN": token}
    
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            url = "https://gitlab.com/api/v4/projects?membership=true&per_page=20&order_by=updated_at"
            resp = await client.get(url, headers=headers)
            projects = resp.json()
            
            for project in projects[:10]:
                project_id = project.get("id", "")
                project_name = project.get("path_with_namespace", "")
                try:
                    readme_resp = await client.get(f"https://gitlab.com/api/v4/projects/{project_id}/repository/files/README.md/raw?ref=main", headers=headers)
                    if readme_resp.status_code == 200:
                        results.append({
                            "name": f"{project_name}/README.md",
                            "content": readme_resp.text,
                            "content_url": project.get("web_url", ""),
                            "file_type": "md",
                            "metadata": {"source_type": "service", "service": "gitlab", "project": project_name},
                        })
                except Exception:
                    continue
        except Exception as e:
            results.append({"name": "gitlab_error", "content": f"Error fetching from GitLab: {str(e)[:500]}", "content_url": "", "file_type": "text", "metadata": {"source_type": "service", "service": "gitlab", "error": True}})
    
    return results


async def _fetch_workflow(config: dict) -> list[dict]:
    """Workflows are pipelines that combine other sources. Return placeholder."""
    return [{"name": "workflow_placeholder", "content": "Workflow execution is not yet implemented. Please add individual sources instead.", "content_url": "", "file_type": "text", "metadata": {"source_type": "workflow"}}]


def _extract_text_from_html(html: str) -> str:
    """Extract readable text from HTML content."""
    # Remove script and style
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Remove tags
    html = re.sub(r'<br\s*/?>', '\n', html)
    html = re.sub(r'</p>', '\n', html)
    html = re.sub(r'</div>', '\n', html)
    html = re.sub(r'</h[1-6]>', '\n', html)
    html = re.sub(r'</li>', '\n', html)
    html = re.sub(r'<[^>]+>', '', html)
    # Clean up whitespace
    html = re.sub(r'\n{3,}', '\n\n', html)
    html = re.sub(r'[ \t]+', ' ', html)
    return html.strip()


def _extract_links(html: str, base_url: str, base_domain: str) -> list[str]:
    """Extract same-domain links from HTML."""
    links = []
    for match in re.finditer(r'href=[\'"]([^\'"]+)[\'"]', html):
        href = match.group(1)
        if href.startswith('/'):
            parsed = urlparse(base_url)
            href = f"{parsed.scheme}://{parsed.netloc}{href}"
        elif not href.startswith('http'):
            continue
        parsed = urlparse(href)
        if parsed.netloc == base_domain and '#' not in href:
            # Remove query params and fragments for dedup
            clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if clean not in links:
                links.append(clean)
    return links[:50]  # Limit links


def _url_to_name(url: str) -> str:
    """Convert URL to a readable name."""
    parsed = urlparse(url)
    path = parsed.path.strip('/').replace('/', '_') or 'index'
    return f"{parsed.netloc}_{path[:80]}"