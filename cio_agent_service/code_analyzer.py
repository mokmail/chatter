"""Code analysis engine for CIO Agent v2.

Implements:
- Incremental Ingestion Strategy (sliding window, breadth-first mapping, resource throttling)
- Persistent Knowledge Base (PKB) for cross-referencing and consolidation
- Decision Making Framework (Impact vs Effort categorization)
- Operational Guardrails (resource monitoring, token budgeting, read-only enforcement)
"""
import os
import re
import json
import uuid
import asyncio
import psutil
from pathlib import Path
from typing import AsyncGenerator, NamedTuple, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime
from collections import defaultdict

from chat import complete_chat


# Resource thresholds
MEMORY_THRESHOLD = 70  # % - pause if system memory exceeds this
CPU_THRESHOLD = 80     # % - slow down if CPU exceeds this
TOKEN_BUDGET_PER_HOUR = 50000  # tokens processed per hour limit


@dataclass
class ChunkInfo:
    """Information about a code chunk for context tracking."""
    file_path: str
    chunk_type: str  # 'function', 'class', 'module'
    name: str
    start_line: int
    end_line: int
    overlap_with_previous: int = 10  # % overlap


@dataclass
class PKBEntry:
    """Persistent Knowledge Base entry for cross-referencing."""
    id: str
    timestamp: str
    observation: str
    file_path: str
    line: int
    chunk_id: str | None
    category: str  # 'module', 'auth', 'api', 'database', etc.
    tags: list[str]
    consolidated: bool = False
    consolidated_into: str | None = None


@dataclass
class ImpactAssessment:
    """Impact vs Effort assessment for a suggestion."""
    impact_score: int  # 1-10
    effort_score: int  # 1-10 (1 = low effort, 10 = high effort)
    impact_rationale: str
    effort_rationale: str
    downstream_affected: list[str]  # files/modules that depend on this
    dependencies_count: int


@dataclass 
class Suggestion:
    """A single insight or improvement suggestion with impact assessment.
    
    Categories for improvements: functionality, documentation, refactoring, 
    enhancement, security, performance, bug, maintainability, ui, api, data, config, testing, core
    Categories for understanding: architecture, feature_map, dependency, design_pattern, data_flow, cross_cutting
    
    insight_type: 'improvement' for code fix suggestions, 'understanding' for architectural insights
    """
    id: str
    timestamp: str
    category: str  # see docstring above for valid categories
    priority: str  # high, medium, low
    impact: ImpactAssessment
    file_path: str
    line_start: int
    line_end: int
    title: str
    description: str
    current_code: str
    suggested_code: str
    rationale: str
    status: str = "pending"
    hypothesis: str = ""
    evidence: list[str] = field(default_factory=list)
    pkb_refs: list[str] = field(default_factory=list)
    insight_type: str = "improvement"  # 'improvement' or 'understanding'

    def to_dict(self):
        result = asdict(self)
        return result


class ResourceMonitor:
    """Monitors system resources and throttles processing if needed."""
    
    def __init__(self, memory_threshold: float = MEMORY_THRESHOLD, cpu_threshold: float = CPU_THRESHOLD):
        self.memory_threshold = memory_threshold
        self.cpu_threshold = cpu_threshold
        self.tokens_processed_this_hour = 0
        self.hour_window_start = datetime.utcnow()
        self.processed_files = 0
        
    def should_pause(self) -> bool:
        """Check if we should pause due to high resource usage."""
        memory_percent = psutil.virtual_memory().percent
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        return memory_percent > self.memory_threshold or cpu_percent > self.cpu_threshold
    
    def check_token_budget(self, tokens: int) -> bool:
        """Check if we're within token budget for this hour."""
        now = datetime.utcnow()
        hour_elapsed = (now - self.hour_window_start).total_seconds() / 3600
        
        if hour_elapsed >= 1:
            self.tokens_processed_this_hour = 0
            self.hour_window_start = now
            
        self.tokens_processed_this_hour += tokens
        return self.tokens_processed_this_hour <= TOKEN_BUDGET_PER_HOUR
    
    async def wait_if_needed(self):
        """Wait if resources are constrained."""
        while self.should_pause():
            await asyncio.sleep(2)  # wait 2 seconds before checking again
            
        if not self.check_token_budget(100):  # rough estimate per chunk
            await asyncio.sleep(1)  # slow down if approaching token budget


class PersistentKnowledgeBase:
    """Stores observations for cross-referencing and consolidation."""
    
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.entries: list[PKBEntry] = []
        self._load()
        
    def _get_storage_path(self) -> Path:
        return self.storage_path / "cio_pkb.json"
        
    def _load(self):
        """Load PKB from disk."""
        pkb_file = self._get_storage_path()
        if pkb_file.exists():
            try:
                with open(pkb_file) as f:
                    data = json.load(f)
                    self.entries = [PKBEntry(**e) for e in data.get('entries', [])]
            except Exception:
                self.entries = []
                
    def _save(self):
        """Save PKB to disk."""
        self._get_storage_path().parent.mkdir(parents=True, exist_ok=True)
        with open(self._get_storage_path(), 'w') as f:
            json.dump({
                'entries': [asdict(e) for e in self.entries],
                'last_updated': datetime.utcnow().isoformat()
            }, f, indent=2)
            
    def add(self, observation: str, file_path: str, line: int, 
            category: str, tags: list[str], chunk_id: str | None = None) -> PKBEntry:
        """Add a new observation to the PKB."""
        entry = PKBEntry(
            id=str(hash(f"{file_path}:{line}:{observation}"))[:16],
            timestamp=datetime.utcnow().isoformat(),
            observation=observation,
            file_path=file_path,
            line=line,
            chunk_id=chunk_id,
            category=category,
            tags=tags
        )
        self.entries.append(entry)
        self._save()
        return entry
        
    def find_related(self, entry_id: str) -> list[PKBEntry]:
        """Find entries related to a given entry (same category/tags or nearby lines)."""
        target = next((e for e in self.entries if e.id == entry_id), None)
        if not target:
            return []
            
        related = []
        for e in self.entries:
            if e.id == entry_id:
                continue
            # Same category or overlapping tags
            if e.category == target.category:
                related.append(e)
            elif any(t in target.tags for t in e.tags):
                related.append(e)
            # Same file, nearby lines
            elif e.file_path == target.file_path and abs(e.line - target.line) < 20:
                related.append(e)
                
        return related
        
    def consolidate(self, entry_ids: list[str], consolidated_observation: str, 
                    consolidated_category: str, consolidated_tags: list[str]) -> PKBEntry:
        """Consolidate multiple entries into one."""
        entries_to_consolidate = [e for e in self.entries if e.id in entry_ids]
        
        # Mark originals as consolidated
        for e in entries_to_consolidate:
            e.consolidated = True
            e.consolidated_into = str(hash(consolidated_observation))[:16]
            
        # Create consolidated entry
        first = entries_to_consolidate[0]
        consolidated_entry = PKBEntry(
            id=str(hash(consolidated_observation))[:16],
            timestamp=datetime.utcnow().isoformat(),
            observation=consolidated_observation,
            file_path=first.file_path,
            line=first.line,
            chunk_id=first.chunk_id,
            category=consolidated_category,
            tags=consolidated_tags,
            consolidated=False
        )
        self.entries.append(consolidated_entry)
        self._save()
        return consolidated_entry
        
    def get_by_category(self, category: str) -> list[PKBEntry]:
        """Get all entries in a category."""
        return [e for e in self.entries if e.category == category and not e.consolidated]
        
    def clear(self):
        """Clear all entries."""
        self.entries = []
        self._save()


class CodeArchitectureMap:
    """Builds a high-level mental map of the codebase architecture."""
    
    def __init__(self):
        self.modules: dict[str, dict] = defaultdict(lambda: {
            'files': [],
            'dependencies': set(),
            'public_api': [],
            'icon': '📦'
        })
        self.readme_summary = ""
        
    def process_readme(self, content: str):
        """Extract key info from README."""
        self.readme_summary = content[:500]  # First 500 chars
        
    def add_module(self, file_path: Path, module_type: str, name: str):
        """Register a module in the architecture map."""
        module_key = self._get_module_key(file_path)
        self.modules[module_key]['files'].append(str(file_path))
        self.modules[module_key]['type'] = module_type
        self.modules[module_key]['name'] = name
        
    def _get_module_key(self, file_path: Path) -> str:
        """Get module key from file path."""
        parts = file_path.parts
        if 'backend' in parts:
            idx = parts.index('backend')
            return '/'.join(parts[idx:idx+2]) if len(parts) > idx + 2 else '/'.join(parts[idx:])
        elif 'frontend' in parts:
            idx = parts.index('frontend')
            return '/'.join(parts[idx:idx+2]) if len(parts) > idx + 2 else '/'.join(parts[idx:])
        return str(file_path.parent)
        
    def get_module_for_file(self, file_path: str) -> str:
        """Get the module key for a file."""
        path = Path(file_path)
        return self._get_module_key(path)


class CodeAnalyzer:
    """Analyzes code files with incremental ingestion and PKB support."""

    PYTHON_EXTENSIONS = {'.py'}
    JS_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx'}
    MARKDOWN_EXTENSIONS = {'.md', '.mdx'}
    IGNORE_DIRS = {
        'node_modules', '__pycache__', '.git', 'venv', 'env', '.venv', '.env',
        'dist', 'build', 'backup', '.vscode', '.pytest_cache', '.claude',
        '.mypy_cache', '.ruff_cache', '.tox', 'coverage', '.coverage',
        '.copilot', '.idea', '.next', 'out', '.nuxt', '.output',
    }
    SCAN_SUBDIRS = {'backend', 'frontend', 'docs', 'src'}
    
    # Chunking parameters
    MAX_CHUNK_LINES = 200  # max lines per chunk
    CHUNK_OVERLAP_LINES = 20  # 10-15% overlap for context continuity

    def __init__(self, root_path: str, include_tests: bool = False, pkb_path: str | None = None, exclude_dirs: list[str] | None = None, exclude_files: list[str] | None = None, include_understanding: bool = True):
        self.root_path = Path(root_path).resolve()
        self.include_tests = include_tests
        self.include_understanding = include_understanding
        self.exclude_dirs = set(exclude_dirs) if exclude_dirs else set()
        self.exclude_files = set(exclude_files) if exclude_files else set()
        
        # Initialize subsystems
        self.pkb = PersistentKnowledgeBase(Path(pkb_path) if pkb_path else Path.home() / ".cio-intelligence-hub")
        self.arch_map = CodeArchitectureMap()
        self.resource_monitor = ResourceMonitor()
        
        # State tracking
        self.processed_chunks: list[ChunkInfo] = []
        self.current_phase = "idle"  # idle, mapping, understanding, analyzing, consolidating
        self.total_files = 0
        self.processed_files = 0
        
    def get_files_to_analyze(self) -> list[Path]:
        """Get all code files to analyze, focusing on key project subdirectories."""
        all_extensions = self.PYTHON_EXTENSIONS | self.JS_EXTENSIONS | self.MARKDOWN_EXTENSIONS
        files = []

        # Check if we are already inside a relevant subdirectory (e.g. backend/ in Docker)
        # by looking for common markers
        is_inside_subdir = False
        if (self.root_path / 'main.py').exists() or (self.root_path / 'App.jsx').exists() or (self.root_path / 'package.json').exists():
            is_inside_subdir = True

        # Scan focused subdirectories
        found_subdirs = False
        for subdir_name in self.SCAN_SUBDIRS:
            subdir = self.root_path / subdir_name
            if subdir.exists() and subdir.is_dir():
                found_subdirs = True
                for ext in all_extensions:
                    files.extend(subdir.rglob(f'*{ext}'))

        # If we are inside a subdir or no standard subdirs were found, scan the current root
        if is_inside_subdir or not found_subdirs:
            for ext in all_extensions:
                files.extend(self.root_path.rglob(f'*{ext}'))

        # Also scan root-level files (not in subdirs)
        for ext in all_extensions:
            for f in self.root_path.glob(f'*{ext}'):
                files.append(f)

        filtered = []
        seen = set()
        for f in files:
            try:
                f_resolved = f.resolve()
                if f_resolved in seen:
                    continue
                
                # Check for standard ignored directories in ANY part of the path
                if any(ignore in f.parts for ignore in self.IGNORE_DIRS):
                    continue
                    
                if self.exclude_dirs and any(ex in f.parts for ex in self.exclude_dirs):
                    continue
                if self.exclude_files and f.name in self.exclude_files:
                    continue
                if not self.include_tests and ('test' in f.name.lower() or 'tests' in f.parent.name.lower()):
                    continue
                if not self.include_tests and f.name.startswith('test_'):
                    continue
                    
                seen.add(f_resolved)
                filtered.append(f)
            except Exception:
                continue
        
        # Sort for deterministic ordering
        filtered.sort(key=lambda p: str(p))
        self.total_files = len(filtered)
        return filtered
        
    def _extract_readme(self, files: list[Path]) -> str | None:
        """Extract README content for architecture mapping."""
        for name in ['README.md', 'readme.md', 'README', 'readme']:
            for f in files:
                if f.name.lower() == name.lower():
                    try:
                        return f.read_text(encoding='utf-8', errors='ignore')[:1000]
                    except Exception:
                        continue
        return None
        
    def _chunk_python_code(self, content: str, file_path: str) -> list[tuple[int, str, str]]:
        """Split Python code into logical chunks (functions/classes) with overlap.
        
        Returns: list of (start_line, chunk_content, chunk_type)
        """
        lines = content.split('\n')
        chunks = []
        
        current_chunk_lines = []
        current_chunk_start = 0
        current_chunk_type = "module"
        current_chunk_name = "module"
        
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            
            # Detect function or class definition
            if stripped.startswith('def ') or stripped.startswith('async def '):
                func_name = re.match(r'(?:async\s+)?def\s+(\w+)', stripped)
                if func_name:
                    # Save previous chunk if exists
                    if current_chunk_lines:
                        chunk_content = '\n'.join(current_chunk_lines)
                        chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                    
                    current_chunk_start = i
                    current_chunk_lines = [line]
                    current_chunk_type = "function"
                    current_chunk_name = func_name.group(1)
                    i += 1
                    continue
                    
            elif stripped.startswith('class '):
                class_name = re.match(r'class\s+(\w+)', stripped)
                if class_name:
                    if current_chunk_lines:
                        chunk_content = '\n'.join(current_chunk_lines)
                        chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                    
                    current_chunk_start = i
                    current_chunk_lines = [line]
                    current_chunk_type = "class"
                    current_chunk_name = class_name.group(1)
                    i += 1
                    continue
                    
            elif stripped.startswith('import ') or stripped.startswith('from '):
                current_chunk_type = "module"
                
            current_chunk_lines.append(line)
            
            # Yield chunk if it exceeds max size
            if len(current_chunk_lines) >= self.MAX_CHUNK_LINES:
                chunk_content = '\n'.join(current_chunk_lines[:-self.CHUNK_OVERLAP_LINES])
                if chunk_content.strip():
                    chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                current_chunk_lines = current_chunk_lines[-self.CHUNK_OVERLAP_LINES:]
                current_chunk_start = i - len(current_chunk_lines) + 1
                
            i += 1
            
        # Yield final chunk
        if current_chunk_lines:
            chunk_content = '\n'.join(current_chunk_lines)
            if chunk_content.strip():
                chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                
        return chunks
        
    def _chunk_markdown_code(self, content: str, file_path: str) -> list[tuple[int, str, str]]:
        """Split Markdown content into sections by headings."""
        lines = content.split('\n')
        chunks = []
        current_chunk_lines = []
        current_chunk_start = 0
        current_chunk_type = "section"

        for i, line in enumerate(lines):
            if re.match(r'^#{1,4}\s+', line):
                if current_chunk_lines:
                    chunk_content = '\n'.join(current_chunk_lines)
                    if chunk_content.strip():
                        chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                current_chunk_start = i
                current_chunk_lines = [line]
                current_chunk_type = "section"
            else:
                current_chunk_lines.append(line)

            if len(current_chunk_lines) >= self.MAX_CHUNK_LINES:
                chunk_content = '\n'.join(current_chunk_lines[:-self.CHUNK_OVERLAP_LINES])
                if chunk_content.strip():
                    chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                current_chunk_lines = current_chunk_lines[-self.CHUNK_OVERLAP_LINES:]
                current_chunk_start = i - len(current_chunk_lines) + 1

        if current_chunk_lines:
            chunk_content = '\n'.join(current_chunk_lines)
            if chunk_content.strip():
                chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))

        return chunks

    async def _analyze_markdown_chunk(self, content: str, lines: list[str], file_path: str,
                                       start_line: int, chunk_type: str, chunk_info: ChunkInfo,
                                       impact: ImpactAssessment, hypothesis: str,
                                       evidence: list[str], pkb_ref: str) -> AsyncGenerator[Suggestion, None]:
        """Analyze Markdown chunk for documentation issues."""
        stripped_lines = [l.strip() for l in lines]

        # --- Missing alt text on images ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'!\[[\s]*\]\(', line):
                yield self._create_suggestion(
                    category='documentation',
                    priority='medium',
                    title="Image missing alt text",
                    description="Markdown images should have descriptive alt text for accessibility.",
                    current_code=lines[i][:80],
                    suggested_code="# Add descriptive alt text: ![description](url)",
                    rationale="Alt text improves accessibility and SEO.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Accessibility issue - missing image alt text",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Broken link placeholders ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\[[^\]]*\]\(\s*\)', line):
                yield self._create_suggestion(
                    category='documentation',
                    priority='high',
                    title="Empty link URL detected",
                    description="Markdown link has an empty URL. Links should point to valid resources.",
                    current_code=lines[i][:80],
                    suggested_code="# Replace empty URL with actual link: [text](url)",
                    rationale="Broken links make documentation unusable.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Documentation quality - empty link",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- TODO/FIXME in docs ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'(TODO|FIXME|XXX)\b', line, re.IGNORECASE):
                yield self._create_suggestion(
                    category='enhancement',
                    priority='medium',
                    title=f"Unresolved TODO in docs: {line[:50]}",
                    description="Documentation contains unresolved TODO/FIXME markers.",
                    current_code=lines[i][:80],
                    suggested_code="# Resolve the TODO or create a tracked issue",
                    rationale="Unresolved TODOs in docs indicate incomplete documentation.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Incomplete documentation",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Long sections without subheadings ---
        if chunk_type == 'section' and len(lines) > 60:
            subheadings = [l for l in stripped_lines if l.startswith('#')]
            if len(subheadings) <= 1:
                yield self._create_suggestion(
                    category='documentation',
                    priority='low',
                    title=f"Long section without subheadings ({len(lines)} lines)",
                    description="Long documentation sections should be broken into subsections with headings.",
                    current_code=lines[0][:80],
                    suggested_code="# Add ## Subheadings to break this section into digestible parts",
                    rationale="Subheadings improve scannability and navigation.",
                    file_path=file_path,
                    line_start=start_line,
                    line_end=start_line + len(lines),
                    impact=impact,
                    hypothesis="Readability - long undivided section",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Code blocks without language specifier ---
        for i, line in enumerate(stripped_lines):
            if line.startswith('```') and len(line) == 3:
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Code block missing language specifier",
                    description="Fenced code blocks should specify a language for syntax highlighting.",
                    current_code=lines[i],
                    suggested_code="```python  # or javascript, bash, etc.",
                    rationale="Language hints enable syntax highlighting and better readability.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Enhancement - missing code language",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Outdated URLs (http instead of https) ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'http://[^\s)\]]+', line) and 'localhost' not in line and '127.0.0.1' not in line:
                yield self._create_suggestion(
                    category='security',
                    priority='low',
                    title="Insecure HTTP link in documentation",
                    description="Documentation links should use HTTPS when available.",
                    current_code=lines[i][:80],
                    suggested_code="# Use https:// instead of http:// for external links",
                    rationale="HTTPS provides security and is preferred for external references.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Security - insecure documentation link",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Hardcoded secrets/keys in markdown ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'(password|secret|api_key|token|apikey)\s*[:=]\s*[\'\"]?\w{8,}', line, re.IGNORECASE):
                if 'env' not in line.lower() and 'example' not in line.lower() and 'placeholder' not in line.lower():
                    yield self._create_suggestion(
                        category='security',
                        priority='high',
                        title="Potential secret in documentation",
                        description="Documentation may contain hardcoded secrets. Use placeholders instead.",
                        current_code=lines[i][:80],
                        suggested_code="# Use placeholders like YOUR_API_KEY_HERE instead of real values",
                        rationale="Secrets in documentation can be accidentally committed and leaked.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Security - potential secret in docs",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

    def _chunk_js_code(self, content: str, file_path: str) -> list[tuple[int, str, str]]:
        """Split JS/React code into logical chunks with overlap."""
        lines = content.split('\n')
        chunks = []
        
        current_chunk_lines = []
        current_chunk_start = 0
        current_chunk_type = "module"
        
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            
            # Detect component/function definitions
            if re.match(r'^(export\s+)?(?:const|function|class)\s+\w+', stripped):
                # Always save current chunk when starting a new definition
                if current_chunk_lines:
                    chunk_content = '\n'.join(current_chunk_lines)
                    if chunk_content.strip():
                        chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                    current_chunk_start = i
                    current_chunk_lines = [line]
                
                if 'const' in stripped and '=' in stripped:
                    current_chunk_type = "component" if 'React' in content or 'jsx' in file_path else "function"
                elif 'function' in stripped:
                    current_chunk_type = "function"
                elif 'class' in stripped:
                    current_chunk_type = "class"
                continue
            elif stripped.startswith('import ') or stripped.startswith('export '):
                current_chunk_type = "module"
                
            current_chunk_lines.append(line)
            
            if len(current_chunk_lines) >= self.MAX_CHUNK_LINES:
                chunk_content = '\n'.join(current_chunk_lines[:-self.CHUNK_OVERLAP_LINES])
                if chunk_content.strip():
                    chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                current_chunk_lines = current_chunk_lines[-self.CHUNK_OVERLAP_LINES:]
                current_chunk_start = i - len(current_chunk_lines) + 1
                
            i += 1
            
        if current_chunk_lines:
            chunk_content = '\n'.join(current_chunk_lines)
            if chunk_content.strip():
                chunks.append((current_chunk_start + 1, chunk_content, current_chunk_type))
                
        return chunks
        
    def _assess_impact(self, chunk_type: str, content: str, file_path: str) -> ImpactAssessment:
        """Assess Impact vs Effort for a chunk."""
        impact_score = 5
        effort_score = 5
        downstream = []
        dep_count = 0
        
        # High impact indicators
        if 'api' in file_path.lower() or 'route' in file_path.lower():
            impact_score += 2
            downstream.append('API consumers')
        if 'auth' in file_path.lower() or 'login' in file_path.lower():
            impact_score += 3
            downstream.append('Security layer')
        if 'database' in file_path.lower() or 'model' in file_path.lower():
            impact_score += 2
            downstream.append('Data layer')
            
        # Check for dependencies (imports)
        imports = re.findall(r'(?:from|import)\s+[\'"](\w+)', content)
        dep_count = len(imports)
        
        # Low effort indicators
        if 'TODO' in content or 'FIXME' in content:
            effort_score -= 2  # Easy to fix known issues
        if len(content.split('\n')) < 20:
            effort_score -= 1  # Small changes
        if 'console.log' in content or 'debug' in content:
            effort_score -= 2  # Quick cleanup
            
        # High effort indicators
        if 'async' in content or 'await' in content:
            effort_score += 1  # Async complexity
        if 'test' in file_path.lower():
            effort_score += 1
            
        # Clamp scores
        impact_score = max(1, min(10, impact_score))
        effort_score = max(1, min(10, effort_score))
        
        return ImpactAssessment(
            impact_score=impact_score,
            effort_score=effort_score,
            impact_rationale=self._get_impact_rationale(impact_score, downstream),
            effort_rationale=self._get_effort_rationale(effort_score),
            downstream_affected=downstream,
            dependencies_count=dep_count
        )
        
    def _get_impact_rationale(self, score: int, downstream: list[str]) -> str:
        """Generate rationale for impact score."""
        if score >= 8:
            return f"High-impact area affecting: {', '.join(downstream) if downstream else 'core functionality'}"
        elif score >= 5:
            return f"Moderate impact area"
        else:
            return "Low impact - localized change only"
            
    def _get_effort_rationale(self, score: int) -> str:
        """Generate rationale for effort score."""
        if score <= 3:
            return "Low effort - quick fix or cleanup"
        elif score <= 6:
            return "Moderate effort - requires some refactoring"
        else:
            return "High effort - significant changes needed"
            
    def _detect_category_from_tags(self, file_path: str, content: str) -> str:
        """Detect category from file path and content patterns."""
        path_lower = file_path.lower()
        
        if any(k in path_lower for k in ['auth', 'login', 'password', 'session']):
            return 'security'
        elif any(k in path_lower for k in ['api', 'route', 'endpoint', 'controller']):
            return 'api'
        elif any(k in path_lower for k in ['database', 'model', 'schema', 'migration']):
            return 'data'
        elif any(k in path_lower for k in ['config', 'settings', 'env']):
            return 'config'
        elif any(k in path_lower for k in ['test', 'spec', 'mock']):
            return 'testing'
        elif 'component' in path_lower or 'jsx' in path_lower:
            return 'ui'
        return 'core'
        
    def _generate_hypothesis(self, chunk_type: str, content: str, chunk_info: ChunkInfo) -> str:
        """Generate initial hypothesis about what this chunk does."""
        lines = content.split('\n')[:10]
        
        # Look for patterns
        if 'TODO' in content:
            return "Known incomplete work that needs resolution"
        if 'console.log' in content:
            return "Debug code potentially left in production"
        if chunk_type == 'function':
            return "Function may benefit from better documentation or type hints"
        if chunk_type == 'class':
            return "Class interface could be cleaner with docstrings"
            
        return f"{chunk_type.title()} chunk at lines {chunk_info.start_line}-{chunk_info.end_line}"
        
    async def analyze(self, include_understanding: bool | None = None) -> AsyncGenerator[Suggestion, None]:
        """Run analysis with incremental ingestion and PKB support.
        
        Phases:
        1. Architecture mapping (breadth-first)
        1.5. Architecture understanding (feature map, dependencies, patterns, data flows)
        2. Incremental analysis with resource monitoring
        3. Consolidation check
        """
        if include_understanding is None:
            include_understanding = self.include_understanding

        files = self.get_files_to_analyze()
        
        # Phase 1: Architecture mapping (breadth-first)
        self.current_phase = "mapping"
        readme_content = self._extract_readme(files)
        if readme_content:
            self.arch_map.process_readme(readme_content)
            
        yield self._create_meta_suggestion("mapping", "Architecture mapping in progress...")

        # Phase 1.5: Architecture understanding (general overview)
        if include_understanding:
            self.current_phase = "understanding"
            arch_analyzer = ArchitectureAnalyzer(
                str(self.root_path), self.arch_map, self.pkb, self.resource_monitor,
                include_tests=self.include_tests,
                exclude_dirs=list(self.exclude_dirs) if self.exclude_dirs else None,
                exclude_files=list(self.exclude_files) if self.exclude_files else None
            )
            async for insight in arch_analyzer.analyze():
                yield insight
        
        # Phase 2: Incremental analysis with resource monitoring
        self.current_phase = "analyzing"
        
        for file_path in files:
            await self.resource_monitor.wait_if_needed()
            
            if self.resource_monitor.should_pause():
                yield self._create_meta_suggestion("status", "Paused - high resource usage, waiting...")
                while self.resource_monitor.should_pause():
                    await asyncio.sleep(2)
                    
            self.processed_files += 1
            progress = int((self.processed_files / self.total_files) * 100)
            yield self._create_meta_suggestion("progress", f"Analyzing: {file_path.name} ({progress}%)")
            
            async for suggestion in self._analyze_file(file_path):
                yield suggestion
                
        # Phase 3: Consolidation check
        self.current_phase = "consolidating"
        yield self._create_meta_suggestion("consolidating", "Consolidating findings...")
        await self._consolidate_findings()
        
        yield self._create_meta_suggestion("complete", f"Analysis complete. Processed {self.processed_files} files.")
        
    async def _analyze_file(self, file_path: Path) -> AsyncGenerator[Suggestion, None]:
        """Analyze a single file with chunking + file-level + optional LLM deep analysis."""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            relative_path = file_path.relative_to(self.root_path)
            str_path = str(relative_path)

            # File-level analysis first
            async for suggestion in self._analyze_file_level(file_path, content, str_path):
                yield suggestion

            # Get chunks
            if file_path.suffix == '.py':
                chunks = self._chunk_python_code(content, str_path)
            elif file_path.suffix in ('.md', '.mdx'):
                chunks = self._chunk_markdown_code(content, str_path)
            else:
                chunks = self._chunk_js_code(content, str_path)

            # Register module
            if file_path.suffix == '.py':
                module_type = 'python'
            elif file_path.suffix in ('.md', '.mdx'):
                module_type = 'markdown'
            else:
                module_type = 'javascript'
            self.arch_map.add_module(relative_path, module_type, str_path)

            prev_chunk_id = None
            for start_line, chunk_content, chunk_type in chunks:
                # Track chunk info
                chunk_id = str(hash(f"{str_path}:{start_line}"))[:16]
                chunk_info = ChunkInfo(
                    file_path=str_path,
                    chunk_type=chunk_type,
                    name=str_path.split('/')[-1],
                    start_line=start_line,
                    end_line=start_line + chunk_content.count('\n')
                )
                self.processed_chunks.append(chunk_info)

                # Add to PKB
                category = self._detect_category_from_tags(str_path, chunk_content)
                pkb_entry = self.pkb.add(
                    observation=f"Analyzed {chunk_type}: {chunk_info.name}",
                    file_path=str_path,
                    line=start_line,
                    category=category,
                    tags=[chunk_type, str_path.split('/')[-2] if '/' in str_path else 'root'],
                    chunk_id=chunk_id
                )

                # Check for related PKB entries (cross-reference)
                related = self.pkb.find_related(pkb_entry.id)
                evidence = [f"Cross-ref: {r.observation}" for r in related[:3]]

                # Generate hypothesis
                hypothesis = self._generate_hypothesis(chunk_type, chunk_content, chunk_info)

                # Analyze chunk
                async for suggestion in self._analyze_chunk(
                    chunk_content, str_path, start_line,
                    chunk_type, chunk_info, hypothesis, evidence, pkb_entry.id, prev_chunk_id
                ):
                    yield suggestion

                prev_chunk_id = chunk_id

            # LLM-powered deep analysis for additional suggestions
            async for suggestion in self._analyze_file_with_llm(file_path, content):
                yield suggestion

        except Exception as e:
            yield self._create_meta_suggestion("error", f"Error analyzing {file_path}: {str(e)}")
            
    async def _analyze_chunk(self, content: str, file_path: str, start_line: int,
                             chunk_type: str, chunk_info: ChunkInfo,
                             hypothesis: str, evidence: list[str], 
                             pkb_ref: str, prev_chunk_id: str | None) -> AsyncGenerator[Suggestion, None]:
        """Analyze a single chunk and yield suggestions."""
        lines = content.split('\n')
        relative_path = Path(file_path)
        
        # Impact assessment
        impact = self._assess_impact(chunk_type, content, file_path)
        
        # Analyze based on chunk type and language
        if file_path.endswith('.py'):
            async for suggestion in self._analyze_python_chunk(
                content, lines, file_path, start_line, chunk_type,
                chunk_info, impact, hypothesis, evidence, pkb_ref
            ):
                yield suggestion
        elif file_path.endswith(('.md', '.mdx')):
            async for suggestion in self._analyze_markdown_chunk(
                content, lines, file_path, start_line, chunk_type,
                chunk_info, impact, hypothesis, evidence, pkb_ref
            ):
                yield suggestion
        else:
            async for suggestion in self._analyze_js_chunk(
                content, lines, file_path, start_line, chunk_type,
                chunk_info, impact, hypothesis, evidence, pkb_ref
            ):
                yield suggestion
                
    async def _analyze_python_chunk(self, content: str, lines: list[str], file_path: str,
                                    start_line: int, chunk_type: str, chunk_info: ChunkInfo,
                                    impact: ImpactAssessment, hypothesis: str,
                                    evidence: list[str], pkb_ref: str) -> AsyncGenerator[Suggestion, None]:
        """Analyze Python chunk with extensive static checks."""
        stripped_lines = [l.strip() for l in lines]
        full_content_lower = content.lower()

        # --- Documentation ---
        if chunk_type in ('function', 'class') and '"""' not in content and "'''" not in content:
            name_match = re.search(r'(?:def|class)\s+(\w+)', content)
            if name_match:
                name = name_match.group(1)
                yield self._create_suggestion(
                    category='documentation',
                    priority='low',
                    title=f"Missing docstring: `{name}`",
                    description=f"{chunk_type.title()} `{name}` lacks documentation explaining purpose and usage.",
                    current_code=content.split('\n')[0],
                    suggested_code=f'{content.split(chr(10))[0]}\n    """Description of {name}."""',
                    rationale="Docstrings improve maintainability and help AI tools understand usage.",
                    file_path=file_path,
                    line_start=start_line,
                    line_end=start_line + len(lines),
                    impact=impact,
                    hypothesis=f"Documentation gap detected in {name}",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- TODO/FIXME/XXX ---
        for i, line in enumerate(stripped_lines):
            if 'TODO' in line or 'FIXME' in line or 'XXX' in line:
                yield self._create_suggestion(
                    category='enhancement',
                    priority='medium',
                    title=f"Unresolved: {line[:60]}",
                    description="TODO/FIXME indicates incomplete work that should be addressed.",
                    current_code=lines[i],
                    suggested_code=f"# TODO: {line.lstrip('# ')} - RESOLVE",
                    rationale="Resolving TODOs prevents technical debt accumulation.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Known incomplete work flagged",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Type hints ---
        for i, line in enumerate(stripped_lines):
            if line.startswith('def ') and '->' not in line:
                if ': ' in line and 'self' in line:
                    yield self._create_suggestion(
                        category='enhancement',
                        priority='low',
                        title="Add return type annotation",
                        description="Function lacks return type annotation for type safety.",
                        current_code=lines[i],
                        suggested_code=lines[i].rstrip(')') + ') -> None:',
                        rationale="Type hints improve code clarity and enable static checking.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Type safety opportunity identified",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Missing parameter type annotations ---
        for i, line in enumerate(stripped_lines):
            if re.match(r'(?:async\s+)?def\s+\w+\s*\(([^)]*)\)', line):
                params_raw = re.match(r'(?:async\s+)?def\s+\w+\s*\(([^)]*)\)', line).group(1)
                params = [p.strip().split('=')[0].split(':')[0].strip().replace('*', '') for p in params_raw.split(',')]
                untyped = [p for p in params if p and p not in ('self', 'cls') and ':' not in params_raw]
                if untyped and len(untyped) >= 2:
                    yield self._create_suggestion(
                        category='enhancement',
                        priority='low',
                        title="Missing parameter type annotations",
                        description=f"Function has {len(untyped)} parameters without type hints.",
                        current_code=lines[i],
                        suggested_code="# Add parameter types: def func(x: int, y: str) -> bool:",
                        rationale="Parameter type annotations improve IDE support and catch bugs early.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Type safety - missing parameter annotations",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Redundant .keys() in for loop ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'for\s+\w+\s+in\s+\w+\.keys\(\)', line):
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Redundant .keys() in for loop",
                    description="`for k in d.keys()` can be simplified to `for k in d`.",
                    current_code=lines[i][:80],
                    suggested_code="# for k in d:  # .keys() is implicit",
                    rationale="Iterating over a dict implicitly iterates over keys. .keys() is redundant.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Simplification - redundant .keys() call",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Long functions ---
        if chunk_type == 'function' and len(lines) > 30:
            yield self._create_suggestion(
                category='refactoring',
                priority='medium' if len(lines) < 100 else 'high',
                title=f"Long function detected ({len(lines)} lines)",
                description=f"Function exceeds 50 lines. Consider breaking into smaller, focused functions.",
                current_code=lines[0],
                suggested_code="# Consider extracting helper functions for better maintainability",
                rationale="Short, focused functions are easier to test and maintain.",
                file_path=file_path,
                line_start=start_line,
                line_end=start_line + len(lines),
                impact=impact,
                hypothesis=f"Complexity detected - {len(lines)} lines in single function",
                evidence=evidence,
                pkb_refs=[pkb_ref]
            )

        # --- Deep nesting ---
        max_indent = 0
        for i, line in enumerate(lines):
            indent = len(line) - len(line.lstrip())
            if indent >= 12 and line.strip() and not line.strip().startswith('#'):
                max_indent = max(max_indent, indent)
                if indent >= 20:
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='medium',
                        title="Deep nesting detected",
                        description="Code is nested more than 6 levels deep. Consider flattening with early returns or helper functions.",
                        current_code=lines[i][:80],
                        suggested_code="# Refactor to reduce nesting using early returns or extract helpers",
                        rationale="Deep nesting reduces readability and increases cognitive load.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Structural complexity - excessive nesting",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                )

        # --- Debug print statements ---
        for i, line in enumerate(stripped_lines):
            if line.startswith('print(') and 'debug' not in line.lower():
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Debug print statement detected",
                    description="print() statement found. Remove or replace with proper logging.",
                    current_code=lines[i],
                    suggested_code="# Remove debug print or use logging module",
                    rationale="Debug statements should be removed or replaced with logging.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Debug code left in place",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Bare except clauses ---
        for i, line in enumerate(stripped_lines):
            if re.match(r'except\s*:', line):
                yield self._create_suggestion(
                    category='functionality',
                    priority='high',
                    title="Bare except clause detected",
                    description="Catching all exceptions with bare `except:` can hide bugs and make debugging difficult. Catch specific exceptions.",
                    current_code=lines[i],
                    suggested_code="except SpecificException:",
                    rationale="Bare except clauses catch KeyboardInterrupt and SystemExit, which is usually undesirable.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Reliability risk - overly broad exception handling",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Mutable default arguments ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'def\s+\w+\s*\([^)]*=\s*(\[|\{)', line):
                yield self._create_suggestion(
                    category='functionality',
                    priority='high',
                    title="Mutable default argument detected",
                    description="Using mutable default arguments (list or dict) causes unexpected shared state across calls.",
                    current_code=lines[i],
                    suggested_code="def func(arg=None):\n    if arg is None:\n        arg = []",
                    rationale="Mutable defaults are evaluated once at definition time and shared across calls.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Bug risk - mutable default argument",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- '== None' / '== True' / '== False' ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'==\s*None|!=\s*None', line) and 'isinstance' not in line:
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Use 'is' / 'is not' for None comparison",
                    description="Comparing to None with == is not idiomatic. Use 'is None' or 'is not None'.",
                    current_code=lines[i],
                    suggested_code=line.replace('== None', 'is None').replace('!= None', 'is not None'),
                    rationale="`is` checks identity, which is the correct way to compare with None.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Style issue - non-idiomatic None comparison",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Hardcoded credentials ---
        credential_patterns = [
            (r'(password|secret|token|api_key|apikey)\s*=\s*["\'][^"\']+["\']', "Hardcoded credential detected"),
            (r'auth\s*=\s*["\'][^"\']+["\']', "Potential hardcoded auth value"),
        ]
        for pattern, title in credential_patterns:
            for i, line in enumerate(stripped_lines):
                if re.search(pattern, line, re.IGNORECASE) and 'env' not in line.lower() and 'config' not in line.lower() and 'getenv' not in line.lower():
                    yield self._create_suggestion(
                        category='security',
                        priority='high',
                        title=title,
                        description="Hardcoded secrets should be moved to environment variables or a secrets manager.",
                        current_code=lines[i][:80],
                        suggested_code="# Use os.environ.get('SECRET_NAME') or a secrets manager",
                        rationale="Hardcoded credentials are a security risk and make rotation difficult.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Security risk - hardcoded sensitive data",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- SQL injection risk ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'(execute|cursor\.execute|raw)\s*\(', line) and ('f"' in line or "f'" in line or '.format(' in line or '%s' not in line):
                if 'select' in line.lower() or 'insert' in line.lower() or 'update' in line.lower() or 'delete' in line.lower():
                    yield self._create_suggestion(
                        category='security',
                        priority='high',
                        title="Potential SQL injection risk",
                        description="String formatting in SQL queries can lead to SQL injection. Use parameterized queries.",
                        current_code=lines[i][:80],
                        suggested_code="cursor.execute('SELECT * FROM table WHERE id = %s', (value,))",
                        rationale="Parameterized queries prevent SQL injection attacks.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Security risk - SQL injection via string formatting",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- open() without context manager ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'=\s*open\(', line) and 'with ' not in lines[max(0, i-1)]:
                if 'close()' not in full_content_lower:
                    yield self._create_suggestion(
                        category='functionality',
                        priority='medium',
                        title="File opened without context manager",
                        description="Using open() without a `with` statement can lead to resource leaks.",
                        current_code=lines[i],
                        suggested_code="with open(path, 'r') as f:\n    data = f.read()",
                        rationale="Context managers ensure files are properly closed even if exceptions occur.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Resource leak - file not managed with context manager",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- eval / exec / compile ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\beval\s*\(|\bexec\s*\(|\bcompile\s*\(', line):
                yield self._create_suggestion(
                    category='security',
                    priority='high',
                    title="Dangerous function call detected",
                    description="eval/exec/compile can execute arbitrary code and are serious security risks.",
                    current_code=lines[i][:80],
                    suggested_code="# Use ast.literal_eval for literal expressions or safer alternatives",
                    rationale="Dynamic code execution is a major security vulnerability.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Security risk - arbitrary code execution",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- os.system / subprocess.call with shell=True ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'os\.system\s*\(', line):
                yield self._create_suggestion(
                    category='security',
                    priority='high',
                    title="os.system() usage detected",
                    description="os.system() is unsafe and inflexible. Use subprocess.run() instead.",
                    current_code=lines[i][:80],
                    suggested_code="subprocess.run(['command', 'arg1'], capture_output=True)",
                    rationale="subprocess.run is more secure, testable, and portable.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Security and reliability risk - os.system usage",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )
            if re.search(r'subprocess\.\w+\s*\([^)]*shell\s*=\s*True', line):
                yield self._create_suggestion(
                    category='security',
                    priority='high',
                    title="subprocess with shell=True detected",
                    description="Using shell=True with subprocess is dangerous if arguments include user input.",
                    current_code=lines[i][:80],
                    suggested_code="subprocess.run(['command', arg], capture_output=True)",
                    rationale="Avoiding shell=True prevents shell injection vulnerabilities.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Security risk - shell injection via subprocess",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- import * ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'from\s+\S+\s+import\s+\*', line):
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Wildcard import detected",
                    description="`from module import *` pollutes the namespace and makes code harder to understand.",
                    current_code=lines[i],
                    suggested_code="# Import only what you need: from module import specific_name",
                    rationale="Explicit imports improve readability and avoid name collisions.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Maintainability issue - wildcard import",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- type() comparison instead of isinstance() ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'type\s*\(\s*\w+\s*\)\s*(==|!=|is|is not)', line):
                yield self._create_suggestion(
                    category='bug',
                    priority='medium',
                    title="type() comparison instead of isinstance()",
                    description="Using `type(x) == Y` fails with subclasses. Use `isinstance(x, Y)` for robust type checking.",
                    current_code=lines[i][:80],
                    suggested_code="# isinstance(obj, ClassName) handles inheritance correctly",
                    rationale="isinstance respects inheritance and is the Pythonic way to check types.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Bug - type comparison breaks subclass compatibility",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- 'not x in y' instead of 'x not in y' ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\bnot\s+\w+\s+in\s+', line):
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Non-idiomatic 'not in' syntax",
                    description="`not x in y` is less readable than `x not in y`.",
                    current_code=lines[i][:80],
                    suggested_code="# Use 'x not in y' for better readability",
                    rationale="Python's `not in` operator is more readable and idiomatic.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Style - non-idiomatic membership test",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Redundant if/else returning booleans ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'if\s+[^:]+:\s*return\s+True', line) or re.search(r'if\s+[^:]+:\s*return\s+False', line):
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Redundant boolean return pattern",
                    description="`if x: return True else: return False` can be simplified to `return bool(x)`.",
                    current_code=lines[i][:80],
                    suggested_code="# return bool(condition)",
                    rationale="Simpler code is easier to read and less prone to errors.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Simplification - redundant boolean return",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Using list()/dict() instead of literals ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'=\s*list\s*\(\s*\)', line):
                yield self._create_suggestion(
                    category='performance',
                    priority='low',
                    title="Use [] instead of list()",
                    description="`[]` is faster and more idiomatic than `list()`.",
                    current_code=lines[i][:80],
                    suggested_code="# Use [] for empty lists",
                    rationale="Literals are faster and more Pythonic than constructors.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Performance - list() constructor overhead",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )
            if re.search(r'=\s*dict\s*\(\s*\)', line):
                yield self._create_suggestion(
                    category='performance',
                    priority='low',
                    title="Use {} instead of dict()",
                    description="`{}` is faster and more idiomatic than `dict()`.",
                    current_code=lines[i][:80],
                    suggested_code="# Use {} for empty dicts",
                    rationale="Literals are faster and more Pythonic than constructors.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Performance - dict() constructor overhead",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- String formatting with % or .format() instead of f-string ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'%\s*\(|\.format\s*\(', line):
                if 'f"' not in line and "f'" not in line:
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title="Legacy string formatting",
                        description="`%` formatting and `.format()` are legacy. Use f-strings for readability and performance.",
                        current_code=lines[i][:80],
                        suggested_code="# Use f-strings: f'Hello {name}'",
                        rationale="f-strings are faster, more readable, and the modern Python standard.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Readability - legacy string formatting",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- String concatenation in loops ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\+?=\s*["\']', line) and 'join' not in full_content_lower:
                # Check if we're inside a for/while loop by looking at surrounding lines
                for j in range(max(0, i-3), min(len(lines), i+3)):
                    if re.search(r'\b(for|while)\b', lines[j]):
                        yield self._create_suggestion(
                            category='performance',
                            priority='low',
                            title="String concatenation in loop",
                            description="Building strings with += in a loop is O(n^2). Use list + join or io.StringIO.",
                            current_code=lines[i],
                            suggested_code="results = []\nfor item in items:\n    results.append(str(item))\noutput = ''.join(results)",
                            rationale="String concatenation in loops creates many temporary objects.",
                            file_path=file_path,
                            line_start=start_line + i,
                            line_end=start_line + i + 1,
                            impact=impact,
                            hypothesis="Performance issue - inefficient string building",
                            evidence=evidence,
                            pkb_refs=[pkb_ref]
                        )

        # --- Missing __main__ guard in scripts ---
        if chunk_type == 'module' and 'def main(' in content:
            if 'if __name__' not in content:
                for i, line in enumerate(stripped_lines):
                    if 'def main(' in line:
                        yield self._create_suggestion(
                            category='functionality',
                            priority='medium',
                            title="Missing __main__ guard",
                            description="Script defines a main() function but lacks `if __name__ == '__main__':` guard.",
                            current_code=lines[i],
                            suggested_code="if __name__ == '__main__':\n    main()",
                            rationale="The __main__ guard prevents code from running when the module is imported.",
                            file_path=file_path,
                            line_start=start_line + i,
                            line_end=start_line + i + 1,
                            impact=impact,
                            hypothesis="Reliability issue - missing main guard",
                            evidence=evidence,
                            pkb_refs=[pkb_ref]
                        )

        # --- Threading without daemon ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'Thread\s*\(', line) and 'daemon' not in line.lower():
                yield self._create_suggestion(
                    category='functionality',
                    priority='low',
                    title="Thread without daemon flag",
                    description="Non-daemon threads can prevent the application from exiting cleanly.",
                    current_code=lines[i][:80],
                    suggested_code="threading.Thread(target=func, daemon=True)",
                    rationale="Daemon threads are killed when the main program exits, preventing hangs.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Reliability issue - thread may block shutdown",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Empty except body ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'except\s+\w+', line):
                # Check next few lines for pass or empty body
                for j in range(i+1, min(len(stripped_lines), i+4)):
                    if stripped_lines[j] == 'pass' or stripped_lines[j] == '...':
                        if j == i+1 or all(not stripped_lines[k].strip() or stripped_lines[k].startswith('#') for k in range(i+1, j)):
                            yield self._create_suggestion(
                                category='functionality',
                                priority='medium',
                                title="Empty exception handler",
                                description="Swallowing exceptions with pass hides errors and makes debugging difficult.",
                                current_code=lines[i] + '\n    ' + lines[j],
                                suggested_code="# Log the exception or handle it meaningfully",
                                rationale="Silent failures are difficult to diagnose and can mask serious bugs.",
                                file_path=file_path,
                                line_start=start_line + i,
                                line_end=start_line + j + 1,
                                impact=impact,
                                hypothesis="Reliability risk - silently swallowed exception",
                                evidence=evidence,
                                pkb_refs=[pkb_ref]
                        )

        # --- List/dict comprehension opportunity ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\bfor\b', line) and '=' in line and 'append' in full_content_lower:
                # Simple heuristic: look for for-loop with append nearby
                yield self._create_suggestion(
                    category='performance',
                    priority='low',
                    title="Consider list/dict comprehension",
                    description="Loops that build lists with append can often be replaced with comprehensions for clarity.",
                    current_code=lines[i][:80],
                    suggested_code="# [func(item) for item in items]",
                    rationale="Comprehensions are more readable and often faster than manual loops.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Readability improvement - comprehension opportunity",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Unused variables (simple heuristic) ---
        if chunk_type == 'function':
            assigned = set()
            used = set()
            for line in stripped_lines:
                # Very basic: variable = something
                for match in re.finditer(r'\b(\w+)\s*=\s*', line):
                    var = match.group(1)
                    if var not in ('self', 'cls', 'if', 'for', 'while', 'return', 'yield', 'with', 'as', 'except'):
                        assigned.add(var)
                for match in re.finditer(r'\b(\w+)\b', line):
                    used.add(match.group(1))
            # Don't flag parameters
            params = set()
            for line in stripped_lines:
                func_def = re.match(r'def\s+\w+\s*\(([^)]*)\)', line)
                if func_def:
                    for p in func_def.group(1).split(','):
                        p = p.strip().split('=')[0].split(':')[0].strip().replace('*', '')
                        if p:
                            params.add(p)
            unused = assigned - used - params
            for var in unused:
                if len(var) > 1 and not var.startswith('_'):
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title=f"Potentially unused variable: `{var}`",
                        description=f"Variable `{var}` appears to be assigned but never used.",
                        current_code=f"{var} = ...",
                        suggested_code="# Remove unused variable or use it",
                        rationale="Unused variables clutter code and may indicate incomplete logic.",
                        file_path=file_path,
                        line_start=start_line,
                        line_end=start_line + len(lines),
                        impact=impact,
                        hypothesis="Dead code - unused variable",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Missing comments in long functions/classes ---
        if chunk_type in ('function', 'class') and len(lines) > 10:
            comment_lines = [l for l in stripped_lines if l.startswith('#')]
            if len(comment_lines) < 1:
                yield self._create_suggestion(
                    category='documentation',
                    priority='low',
                    title=f"{chunk_type.title()} lacks inline comments",
                    description=f"This {chunk_type} is {len(lines)} lines long but has no inline comments. Consider explaining complex logic.",
                    current_code=lines[0],
                    suggested_code="# Add comments explaining complex logic and design decisions",
                    rationale="Long blocks without comments are harder to understand and maintain.",
                    file_path=file_path,
                    line_start=start_line,
                    line_end=start_line + len(lines),
                    impact=impact,
                    hypothesis=f"Documentation gap - {chunk_type} without inline comments",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Too many parameters ---
        if chunk_type == 'function':
            for i, line in enumerate(stripped_lines):
                func_def = re.match(r'(?:async\s+)?def\s+\w+\s*\(([^)]*)\)', line)
                if func_def:
                    params_raw = func_def.group(1)
                    # Count non-empty parameters
                    params_list = [p.strip() for p in params_raw.split(',') if p.strip() and p.strip() not in ('self', 'cls', '*args', '**kwargs')]
                    if len(params_list) > 5:
                        yield self._create_suggestion(
                            category='refactoring',
                            priority='medium',
                            title=f"Function has {len(params_list)} parameters",
                            description="Functions with many parameters are hard to use and understand. Consider using a dataclass or kwargs.",
                            current_code=lines[i],
                            suggested_code="# Reduce parameters by grouping related ones into an object",
                            rationale="Fewer parameters improve readability and make refactoring easier.",
                            file_path=file_path,
                            line_start=start_line + i,
                            line_end=start_line + i + 1,
                            impact=impact,
                            hypothesis="Complexity - excessive parameters",
                            evidence=evidence,
                            pkb_refs=[pkb_ref]
                        )

        # --- Complex expressions (deep nesting) ---
        for i, line in enumerate(stripped_lines):
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
            paren_depth = 0
            max_depth = 0
            for ch in stripped:
                if ch == '(':
                    paren_depth += 1
                    max_depth = max(max_depth, paren_depth)
                elif ch == ')':
                    paren_depth -= 1
            if max_depth >= 4:
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Complex nested expression",
                    description="Expression has deep nesting of parentheses. Consider breaking into intermediate variables.",
                    current_code=lines[i][:80],
                    suggested_code="# Extract intermediate variables to flatten nesting",
                    rationale="Deeply nested expressions are harder to read and debug.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Complexity - deeply nested expression",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Commented-out code ---
        for i, line in enumerate(stripped_lines):
            if line.startswith('#') and len(line) > 10:
                code_part = line.lstrip('#').strip()
                if re.match(r'^(def|class|import|from|if|for|while|return|try|except)', code_part):
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title="Commented-out code detected",
                        description="Dead code should be removed rather than commented out. Version control preserves history.",
                        current_code=lines[i],
                        suggested_code="# Remove commented-out code",
                        rationale="Commented-out code clutters files and confuses readers.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Dead code - commented-out blocks",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

    async def _analyze_js_chunk(self, content: str, lines: list[str], file_path: str,
                                 start_line: int, chunk_type: str, chunk_info: ChunkInfo,
                                 impact: ImpactAssessment, hypothesis: str,
                                 evidence: list[str], pkb_ref: str) -> AsyncGenerator[Suggestion, None]:
        """Analyze JavaScript/React chunk with extensive static checks."""
        stripped_lines = [l.strip() for l in lines]
        full_content_lower = content.lower()
        is_react = 'react' in full_content_lower or 'jsx' in file_path.lower()

        # --- PropTypes / TypeScript interfaces ---
        if is_react:
            if re.match(r'^(export\s+)?const\s+\w+\s*=\s*\(', content):
                if 'propTypes' not in content and 'interface' not in content and ': React.FC' not in content and 'Props' not in content:
                    yield self._create_suggestion(
                        category='enhancement',
                        priority='medium',
                        title="Add PropTypes or TypeScript interface",
                        description="React component lacks prop type definitions.",
                        current_code=lines[0] if lines else "",
                        suggested_code=f"{lines[0] if lines else ''}\n// Add PropTypes or use TypeScript",
                        rationale="PropTypes catch bugs early and serve as documentation.",
                        file_path=file_path,
                        line_start=start_line,
                        line_end=start_line + len(lines),
                        impact=impact,
                        hypothesis="Type safety gap in React component",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Missing JSDoc / function documentation ---
        if chunk_type in ('function', 'component') and not re.search(r'/\*\*', content):
            func_name_match = re.search(r'(?:const|function|let)\s+(\w+)', lines[0] if lines else '')
            if func_name_match:
                func_name = func_name_match.group(1)
                yield self._create_suggestion(
                    category='documentation',
                    priority='low',
                    title=f"Missing JSDoc: `{func_name}`",
                    description=f"Function `{func_name}` lacks JSDoc documentation explaining parameters and return value.",
                    current_code=lines[0] if lines else "",
                    suggested_code=f"/**\n * Description of {func_name}\n * @param {{type}} paramName - description\n * @returns {{type}} description\n */",
                    rationale="JSDoc comments improve IDE support and code understanding.",
                    file_path=file_path,
                    line_start=start_line,
                    line_end=start_line + len(lines),
                    impact=impact,
                    hypothesis=f"Documentation gap - {chunk_type} without JSDoc",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- TODO/FIXME ---
        for i, line in enumerate(stripped_lines):
            if 'TODO' in line or 'FIXME' in line or 'HACK' in line:
                yield self._create_suggestion(
                    category='enhancement',
                    priority='medium',
                    title=f"Unresolved: {line[:60]}",
                    description="TODO/FIXME indicates incomplete work.",
                    current_code=lines[i],
                    suggested_code="// TODO: RESOLVE",
                    rationale="Resolving TODOs keeps codebase clean.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Known incomplete work flagged",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- console.log / debug ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'console\.(log|debug|info|warn)', line) and '// debug' not in line.lower():
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Debug code detected",
                    description="console.log/debug statements found. Remove before production.",
                    current_code=lines[i],
                    suggested_code=re.sub(r'console\.(log|debug|info|warn)\([^)]+\);?', '// console.debug(...)', lines[i]),
                    rationale="Debug statements should be removed or replaced with proper logging.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Debug code left in production",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Inline styles ---
        for i, line in enumerate(stripped_lines):
            if 'style={' in line or 'style={{' in line:
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Inline style detected",
                    description="Consider using CSS classes instead of inline styles.",
                    current_code=lines[i][:80],
                    suggested_code="// Use className instead of inline styles",
                    rationale="Inline styles are harder to maintain. Use CSS classes.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Styling could be more maintainable",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- var instead of const/let ---
        for i, line in enumerate(stripped_lines):
            if re.match(r'var\s+\w+\s*=', line):
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Use const/let instead of var",
                    description="`var` has function-scoping and hoisting issues. Prefer `const` or `let`.",
                    current_code=lines[i],
                    suggested_code=line.replace('var ', 'const '),
                    rationale="`const`/`let` have block scope and prevent accidental re-declaration.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Legacy JS pattern - var usage",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- == instead of === ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\b==\b', line) and '===' not in line and '!==' not in line:
                # Simple heuristic to avoid false positives on comments
                code_part = line.split('//')[0]
                if re.search(r'\b==\b', code_part):
                    yield self._create_suggestion(
                        category='enhancement',
                        priority='medium',
                        title="Use strict equality (===)",
                        description="`==` performs type coercion. Use `===` for predictable comparisons.",
                        current_code=lines[i],
                        suggested_code=code_part.replace(' == ', ' === ').replace(' != ', ' !== '),
                        rationale="Strict equality avoids unexpected type coercion bugs.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Bug risk - loose equality operator",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- eval() usage ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\beval\s*\(', line):
                yield self._create_suggestion(
                    category='security',
                    priority='high',
                    title="eval() usage detected",
                    description="eval() executes arbitrary code and is a serious security risk.",
                    current_code=lines[i][:80],
                    suggested_code="// Use JSON.parse or safer alternatives",
                    rationale="eval() can execute malicious code from untrusted sources.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Security risk - arbitrary code execution",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- parseInt without radix ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'parseInt\s*\([^,]+\)', line):
                if '10' not in line and '16' not in line and '8' not in line:
                    yield self._create_suggestion(
                        category='bug',
                        priority='medium',
                        title="parseInt without radix",
                        description="`parseInt` without a radix can lead to unexpected behavior (octal parsing for leading zeros).",
                        current_code=lines[i][:80],
                        suggested_code="parseInt(value, 10)",
                        rationale="Always specify radix to avoid ambiguous parsing.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Bug - ambiguous parseInt parsing",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- innerHTML usage ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\.innerHTML\s*=', line):
                yield self._create_suggestion(
                    category='security',
                    priority='medium',
                    title="innerHTML assignment detected",
                    description="Setting innerHTML can introduce XSS vulnerabilities if the content is user-controlled.",
                    current_code=lines[i][:80],
                    suggested_code="element.textContent = sanitizedValue",
                    rationale="textContent is safer than innerHTML as it doesn't parse HTML.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Security risk - innerHTML XSS vector",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Using 'arguments' object ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\barguments\b', line):
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Legacy 'arguments' object usage",
                    description="`arguments` is a legacy pseudo-array. Use rest parameters `...args` instead.",
                    current_code=lines[i][:80],
                    suggested_code="function foo(...args) { }",
                    rationale="Rest parameters are real arrays and have modern array methods.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Modernization - legacy arguments object",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- 'with' statement ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\bwith\s*\(', line):
                yield self._create_suggestion(
                    category='security',
                    priority='high',
                    title="'with' statement detected",
                    description="`with` is deprecated and makes code harder to optimize and secure.",
                    current_code=lines[i][:80],
                    suggested_code="// Avoid 'with'; use explicit variable references",
                    rationale="`with` is forbidden in strict mode and causes unpredictable behavior.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Security and reliability - deprecated with statement",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Missing key prop in map ---
        if is_react:
            for i, line in enumerate(stripped_lines):
                if re.search(r'\.map\s*\(', line):
                    # Check if key prop is present in the same or next line
                    nearby = ' '.join(stripped_lines[i:min(len(stripped_lines), i+3)])
                    if 'key=' not in nearby:
                        yield self._create_suggestion(
                            category='functionality',
                            priority='medium',
                            title="Missing key prop in list rendering",
                            description="React elements rendered in a loop need a unique `key` prop.",
                            current_code=lines[i][:80],
                            suggested_code="items.map(item => <Component key={item.id} {...item} />)",
                            rationale="Missing keys cause rendering issues and performance problems.",
                            file_path=file_path,
                            line_start=start_line + i,
                            line_end=start_line + i + 1,
                            impact=impact,
                            hypothesis="React bug risk - missing key prop",
                            evidence=evidence,
                            pkb_refs=[pkb_ref]
                        )

        # --- useEffect without cleanup ---
        if is_react and 'useEffect' in content:
            for i, line in enumerate(stripped_lines):
                if 'useEffect' in line:
                    nearby = '\n'.join(stripped_lines[i:min(len(stripped_lines), i+8)])
                    if 'addEventListener' in nearby or 'setInterval' in nearby or 'setTimeout' in nearby:
                        if 'return' not in nearby.split('useEffect')[1].split('}')[0] if 'useEffect' in nearby else True:
                            yield self._create_suggestion(
                                category='functionality',
                                priority='medium',
                                title="useEffect may need cleanup",
                                description="useEffect sets up subscriptions/timers but may not clean them up.",
                                current_code=lines[i][:80],
                                suggested_code="useEffect(() => {\n  const id = setInterval(...);\n  return () => clearInterval(id);\n}, [])",
                                rationale="Missing cleanup causes memory leaks and unexpected behavior.",
                                file_path=file_path,
                                line_start=start_line + i,
                                line_end=start_line + i + 1,
                                impact=impact,
                                hypothesis="Memory leak - missing useEffect cleanup",
                                evidence=evidence,
                                pkb_refs=[pkb_ref]
                            )

        # --- useState inside loops/conditions ---
        if is_react:
            for i, line in enumerate(stripped_lines):
                if 'useState(' in line:
                    # Check if inside a loop or if block by looking at indentation
                    prev_lines = stripped_lines[max(0, i-3):i]
                    for prev in prev_lines:
                        if prev.startswith('if ') or prev.startswith('for ') or prev.startswith('while ') or prev.startswith('for('):
                            yield self._create_suggestion(
                                category='functionality',
                                priority='high',
                                title="useState called inside loop/condition",
                                description="Hooks must be called at the top level of the component, not inside loops or conditions.",
                                current_code=lines[i],
                                suggested_code="// Move useState to top level before any conditions/loops",
                                rationale="React hooks rely on call order. Conditional calls break this.",
                                file_path=file_path,
                                line_start=start_line + i,
                                line_end=start_line + i + 1,
                                impact=impact,
                                hypothesis="React rules violation - conditional hook",
                                evidence=evidence,
                                pkb_refs=[pkb_ref]
                            )

        # --- Direct DOM manipulation ---
        if is_react:
            for i, line in enumerate(stripped_lines):
                if re.search(r'document\.(getElementById|querySelector|createElement)', line):
                    yield self._create_suggestion(
                        category='enhancement',
                        priority='medium',
                        title="Direct DOM manipulation in React",
                        description="Manipulating the DOM directly bypasses React's virtual DOM and can cause inconsistencies.",
                        current_code=lines[i][:80],
                        suggested_code="// Use refs and React state instead of direct DOM manipulation",
                        rationale="React manages the DOM. Direct manipulation can cause sync issues.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="React anti-pattern - direct DOM access",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Large component files ---
        if is_react and chunk_type == 'module' and len(lines) > 150:
            yield self._create_suggestion(
                category='refactoring',
                priority='medium',
                title=f"Large component file ({len(lines)} lines)",
                description="Component file exceeds 150 lines. Consider splitting into smaller components.",
                current_code=lines[0][:80],
                suggested_code="// Extract sub-components or custom hooks",
                rationale="Smaller components are easier to test, review, and maintain.",
                file_path=file_path,
                line_start=start_line,
                line_end=start_line + len(lines),
                impact=impact,
                hypothesis="Complexity - component file too large",
                evidence=evidence,
                pkb_refs=[pkb_ref]
            )

        # --- Missing await in async ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'async\s+(function|const|let|var|\w+)', line):
                nearby = '\n'.join(stripped_lines[i:min(len(stripped_lines), i+15)])
                if 'await' not in nearby and 'return' not in nearby:
                    yield self._create_suggestion(
                        category='functionality',
                        priority='medium',
                        title="Async function without await",
                        description="Function is marked async but doesn't use await. May indicate missing async operation.",
                        current_code=lines[i][:80],
                        suggested_code="// Remove async keyword or add await for async operations",
                        rationale="Unnecessary async creates extra promise overhead.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Potential bug - async without await",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- any type in TypeScript ---
        if file_path.endswith('.ts') or file_path.endswith('.tsx'):
            for i, line in enumerate(stripped_lines):
                if ': any' in line or 'as any' in line:
                    yield self._create_suggestion(
                        category='enhancement',
                        priority='low',
                        title="Avoid using 'any' type",
                        description="Using `any` disables TypeScript's type checking. Prefer specific types.",
                        current_code=lines[i][:80],
                        suggested_code="// Use specific type or unknown instead of any",
                        rationale="`any` defeats the purpose of TypeScript's type safety.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Type safety gap - any usage",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Prop spreading without validation ---
        if is_react:
            for i, line in enumerate(stripped_lines):
                if '{...' in line and 'props' in line.lower():
                    yield self._create_suggestion(
                        category='enhancement',
                        priority='low',
                        title="Prop spreading detected",
                        description="Spreading props can pass unexpected attributes and bypass type checking.",
                        current_code=lines[i][:80],
                        suggested_code="// Pass props explicitly for better control and type safety",
                        rationale="Explicit props are safer and more maintainable.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Maintainability - uncontrolled prop spreading",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- setInterval without clearInterval ---
        for i, line in enumerate(stripped_lines):
            if 'setInterval(' in line:
                nearby = '\n'.join(stripped_lines[i:min(len(stripped_lines), i+10)])
                if 'clearInterval' not in nearby:
                    yield self._create_suggestion(
                        category='functionality',
                        priority='medium',
                        title="setInterval without cleanup",
                        description="Intervals that are never cleared can cause memory leaks and unexpected behavior.",
                        current_code=lines[i][:80],
                        suggested_code="const id = setInterval(...);\nreturn () => clearInterval(id);",
                        rationale="Always clear intervals to prevent memory leaks.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Memory leak - uncleaned interval",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Nested ternary operators ---
        for i, line in enumerate(stripped_lines):
            if line.count('?') >= 2 and line.count(':') >= 2:
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Nested ternary detected",
                    description="Nested ternary operators are hard to read. Consider using if/else or a helper function.",
                    current_code=lines[i][:80],
                    suggested_code="// Replace with if/else or extract a helper function",
                    rationale="Nested ternaries reduce readability and increase cognitive load.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Readability issue - nested ternary",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Inline event handlers ---
        if is_react:
            for i, line in enumerate(stripped_lines):
                if re.search(r'on\w+\s*=\s*\{.*=>.*\}', line):
                    yield self._create_suggestion(
                        category='performance',
                        priority='low',
                        title="Inline event handler",
                        description="Defining functions inline in JSX creates a new function on every render.",
                        current_code=lines[i][:80],
                        suggested_code="// Define handler outside JSX or use useCallback",
                        rationale="Inline handlers hurt performance and can cause unnecessary re-renders.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Performance - inline handler recreation",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- alert() / confirm() usage ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\b(alert|confirm|prompt)\s*\(', line):
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Blocking dialog detected",
                    description="alert/confirm/prompt block the main thread and provide poor UX.",
                    current_code=lines[i][:80],
                    suggested_code="// Use a custom modal component for better UX",
                    rationale="Native dialogs are blocking and inaccessible. Custom modals are preferred.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="UX issue - blocking native dialog",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Hardcoded API endpoints ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'["\']https?://[^"\']+["\']', line):
                if 'process.env' not in line and 'import.meta.env' not in line and 'config' not in line.lower():
                    yield self._create_suggestion(
                        category='security',
                        priority='medium',
                        title="Hardcoded API endpoint",
                        description="Hardcoded URLs make environment switching difficult and may expose internal endpoints.",
                        current_code=lines[i][:80],
                        suggested_code="// Use environment variables for API base URLs",
                        rationale="Environment variables make deployment and testing more flexible.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Maintainability - hardcoded URL",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Console.log left in code ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'\bconsole\.(log|warn|error|debug|info)\s*\(', line):
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Debugging console statement",
                    description="console.log and friends should not be committed to production code.",
                    current_code=lines[i][:80],
                    suggested_code="// Remove console statements or use a proper logging library",
                    rationale="Console statements clutter output and may expose sensitive data in production.",
                    file_path=file_path,
                    line_start=start_line + i,
                    line_end=start_line + i + 1,
                    impact=impact,
                    hypothesis="Debugging - console statement left in code",
                    evidence=evidence,
                    pkb_refs=[pkb_ref]
                )

        # --- Commented-out code ---
        for i, line in enumerate(stripped_lines):
            if line.startswith('//') and len(line) > 10:
                code_part = line.lstrip('/').strip()
                if re.match(r'^(function|const|let|var|import|export|if|for|while|return|class|try)', code_part):
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title="Commented-out code detected",
                        description="Dead code should be removed rather than commented out. Version control preserves history.",
                        current_code=lines[i],
                        suggested_code="// Remove commented-out code",
                        rationale="Commented-out code clutters files and confuses readers.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Dead code - commented-out blocks",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Large object/array literals ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'[\{\[]\s*$', line):
                # Check if next 5 lines form a large literal
                literal_lines = 0
                brace_depth = 0
                for j in range(i, min(i+15, len(stripped_lines))):
                    s = stripped_lines[j]
                    brace_depth += s.count('{') + s.count('[') - s.count('}') - s.count(']')
                    literal_lines += 1
                    if brace_depth <= 0:
                        break
                if literal_lines > 8:
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title="Large inline object/array literal",
                        description=f"This {literal_lines}-line literal is hard to read. Consider extracting it to a named constant.",
                        current_code=lines[i][:80],
                        suggested_code="// Extract to a named constant for readability and reuse",
                        rationale="Named constants make code self-documenting and reduce duplication.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Readability - large inline literal",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- TODO/FIXME comments ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'(TODO|FIXME|HACK|XXX)\b', line, re.IGNORECASE):
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Unresolved TODO/FIXME comment",
                    description="Unresolved work markers indicate incomplete implementation or known issues.",
                    current_code=lines[i][:80],
                    suggested_code="// Address the TODO or create a proper issue/tracking ticket",
                    rationale="TODOs in code tend to be forgotten. Proper tracking ensures they are addressed.",
                    file_path=file_path,
                    line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Maintenance - unresolved TODO/FIXME",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- setState in render / outside useEffect in loop ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'set\w+\s*\([^)]*\)', line):
                if any(l.startswith('for') or l.startswith('while') for l in stripped_lines[:i+1]):
                    yield self._create_suggestion(
                        category='bug',
                        priority='high',
                        title="setState-like call inside a loop",
                        description="Calling setState inside a loop can cause excessive re-renders and poor performance.",
                        current_code=lines[i][:80],
                        suggested_code="// Batch state updates or use a single state update with computed values",
                        rationale="Multiple state updates in a loop trigger re-renders on each call.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Performance - setState in loop",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Fragments with single child ---
        for i, line in enumerate(stripped_lines):
            if re.search(r'<>\s*<', line) or re.search(r'<React\.Fragment>\s*<', line):
                close_on_same = '</>' in line or '</React.Fragment>' in line
                if close_on_same:
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title="Unnecessary React Fragment",
                        description="Fragment with a single child adds no value and can be removed.",
                        current_code=lines[i][:80],
                        suggested_code="// Remove unnecessary Fragment wrapper",
                        rationale="Simpler JSX is easier to read and has less runtime overhead.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Readability - unnecessary Fragment",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

        # --- Excessive inline styles ---
        for i, line in enumerate(stripped_lines):
            style_count = len(re.findall(r'style\s*=\s*\{', line))
            if style_count > 0:
                total_styles = sum(len(re.findall(r'style\s*=\s*\{', l)) for l in stripped_lines)
                if total_styles > 5:
                    yield self._create_suggestion(
                        category='maintainability',
                        priority='low',
                        title="Excessive inline styles",
                        description=f"Found {total_styles} inline style objects. Consider using CSS classes or a styling library.",
                        current_code=lines[i][:80],
                        suggested_code="// Extract styles to CSS classes or use a design system",
                        rationale="Inline styles are hard to maintain, reuse, and override consistently.",
                        file_path=file_path,
                        line_start=start_line + i,
                        line_end=start_line + i + 1,
                        impact=impact,
                        hypothesis="Maintainability - excessive inline styles",
                        evidence=evidence,
                        pkb_refs=[pkb_ref]
                    )

    async def _analyze_file_level(self, file_path: Path, content: str, str_path: str) -> AsyncGenerator[Suggestion, None]:
        """Analyze the entire file for file-level issues."""
        lines = content.split('\n')
        stripped_lines = [l.strip() for l in lines]
        is_py = file_path.suffix == '.py'
        is_js = file_path.suffix in ('.js', '.jsx', '.ts', '.tsx')
        is_md = file_path.suffix in ('.md', '.mdx')
        is_react = is_js and ('react' in content.lower() or 'jsx' in file_path.suffix.lower())

        # --- File too long ---
        if len(lines) > 300:
            yield self._create_suggestion(
                category='refactoring',
                priority='medium',
                title=f"File exceeds 400 lines ({len(lines)} lines)",
                description="Large files are harder to navigate, test, and maintain. Consider splitting into smaller modules.",
                current_code=lines[0][:80] if lines else "",
                suggested_code="# Extract related functionality into separate files",
                rationale="Files under 400 lines are generally more maintainable.",
                file_path=str_path,
                line_start=1,
                line_end=min(5, len(lines)),
                impact=ImpactAssessment(
                    impact_score=4, effort_score=7,
                    impact_rationale="Moderate impact on maintainability",
                    effort_rationale="Requires careful refactoring to avoid breaking changes",
                    downstream_affected=[], dependencies_count=0
                ),
                hypothesis="File size exceeds recommended threshold",
                evidence=[],
                pkb_refs=[]
            )

        # --- Low comment density ---
        non_empty = [l for l in stripped_lines if l]
        comment_lines = [l for l in stripped_lines if l.startswith('#') or l.startswith('//')]
        if len(non_empty) > 30 and len(comment_lines) / len(non_empty) < 0.05:
            yield self._create_suggestion(
                category='documentation',
                priority='low',
                title="Low comment density",
                description=f"File has only {len(comment_lines)} comment lines out of {len(non_empty)} non-empty lines. Consider adding inline comments for complex logic.",
                current_code=lines[0][:80] if lines else "",
                suggested_code="# Add comments explaining non-obvious logic and design decisions",
                rationale="Comments help future maintainers understand intent and edge cases.",
                file_path=str_path,
                line_start=1,
                line_end=min(5, len(lines)),
                impact=ImpactAssessment(
                    impact_score=3, effort_score=2,
                    impact_rationale="Low impact - localized to understanding",
                    effort_rationale="Low effort - add explanatory comments",
                    downstream_affected=[], dependencies_count=0
                ),
                hypothesis="Documentation gap - insufficient inline comments",
                evidence=[],
                pkb_refs=[]
            )

        # --- Long lines ---
        for i, line in enumerate(lines):
            if len(line) > 120:
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Line exceeds 120 characters",
                    description="Long lines reduce readability, especially on smaller screens and during side-by-side reviews.",
                    current_code=line[:80] + "...",
                    suggested_code="# Break into multiple lines or extract variables",
                    rationale="Shorter lines improve readability and reduce horizontal scrolling.",
                    file_path=str_path,
                    line_start=i + 1,
                    line_end=i + 1,
                    impact=ImpactAssessment(
                        impact_score=2, effort_score=1,
                        impact_rationale="Low impact - readability only",
                        effort_rationale="Quick formatting fix",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Readability issue - line too long",
                    evidence=[],
                    pkb_refs=[]
                )

        # --- Trailing whitespace ---
        trailing_ws_lines = [i for i, line in enumerate(lines) if line.rstrip() != line and line.strip()]
        if len(trailing_ws_lines) >= 3:
            yield self._create_suggestion(
                category='enhancement',
                priority='low',
                title="Trailing whitespace detected",
                description=f"Found trailing whitespace on {len(trailing_ws_lines)} lines. This causes unnecessary diff noise.",
                current_code=lines[trailing_ws_lines[0]].rstrip() + "<trailing>",
                suggested_code="# Configure editor to trim trailing whitespace on save",
                rationale="Trailing whitespace creates noisy diffs and can cause linter warnings.",
                file_path=str_path,
                line_start=trailing_ws_lines[0] + 1,
                line_end=trailing_ws_lines[0] + 1,
                impact=ImpactAssessment(
                    impact_score=1, effort_score=1,
                    impact_rationale="Minimal impact - code hygiene",
                    effort_rationale="Automated fix with formatter",
                    downstream_affected=[], dependencies_count=0
                ),
                hypothesis="Code hygiene - trailing whitespace",
                evidence=[],
                pkb_refs=[]
            )

        # --- Python-specific file-level checks ---
        if is_py:
            # Missing __init__.py in package directory
            parent = file_path.parent
            if parent != self.root_path and not (parent / '__init__.py').exists():
                # Only suggest if this file is in a subdirectory
                if parent.relative_to(self.root_path).parts:
                    yield self._create_suggestion(
                        category='functionality',
                        priority='medium',
                        title="Missing __init__.py in package",
                        description=f"Directory `{parent.relative_to(self.root_path)}` lacks `__init__.py`, making it an implicit namespace package.",
                        current_code="# Directory exists without __init__.py",
                        suggested_code="# Add an __init__.py file to make it an explicit package",
                        rationale="Explicit packages are clearer and avoid subtle import issues.",
                        file_path=str_path,
                        line_start=1,
                        line_end=1,
                        impact=ImpactAssessment(
                            impact_score=5, effort_score=2,
                            impact_rationale="Can cause import behavior changes across Python versions",
                            effort_rationale="Simple - create empty __init__.py",
                            downstream_affected=[], dependencies_count=0
                        ),
                        hypothesis="Package structure issue - missing __init__.py",
                        evidence=[],
                        pkb_refs=[]
                    )

            # Unused imports (simple heuristic)
            imports = []
            for i, line in enumerate(stripped_lines):
                if line.startswith('import '):
                    match = re.match(r'import\s+([\w.]+)', line)
                    if match:
                        imports.append((i, match.group(1).split('.')[0]))
                elif line.startswith('from '):
                    match = re.match(r'from\s+([\w.]+)\s+import', line)
                    if match:
                        imports.append((i, match.group(1).split('.')[0]))
            for i, imp in imports:
                if imp not in ('typing', 'sys', 'os', 'json', 'pathlib', 'asyncio', 'datetime'):
                    # Check if imported name is used elsewhere
                    used_count = sum(1 for line in stripped_lines if imp in line and not line.startswith('import ') and not line.startswith('from '))
                    if used_count <= 1:
                        yield self._create_suggestion(
                            category='refactoring',
                            priority='low',
                            title=f"Potentially unused import: `{imp}`",
                            description=f"Import `{imp}` appears unused or used only once. Consider removing or verifying necessity.",
                            current_code=lines[i],
                            suggested_code=f"# Remove unused import: {imp}",
                            rationale="Unused imports clutter code and slow startup.",
                            file_path=str_path,
                            line_start=i + 1,
                            line_end=i + 1,
                            impact=ImpactAssessment(
                                impact_score=2, effort_score=1,
                                impact_rationale="Minor cleanup - no functional impact",
                                effort_rationale="Remove single line",
                                downstream_affected=[], dependencies_count=0
                            ),
                            hypothesis="Dead code - unused import",
                            evidence=[],
                            pkb_refs=[]
                        )

            # Magic numbers (simple heuristic)
            for i, line in enumerate(stripped_lines):
                if re.search(r'[^\w](\d{3,})[^\w]', line) and not line.startswith('#') and 'def ' not in line and 'class ' not in line:
                    num = re.search(r'[^\w](\d{3,})[^\w]', line).group(1)
                    if num not in ('200', '201', '204', '400', '401', '403', '404', '500', '502', '503'):
                        yield self._create_suggestion(
                            category='enhancement',
                            priority='low',
                            title=f"Magic number: {num}",
                            description=f"Literal value `{num}` should be extracted as a named constant.",
                            current_code=lines[i][:80],
                            suggested_code=f"const MAX_SIZE = {num}  # or similar named constant",
                            rationale="Named constants improve readability and make changes easier.",
                            file_path=str_path,
                            line_start=i + 1,
                            line_end=i + 1,
                            impact=ImpactAssessment(
                                impact_score=2, effort_score=1,
                                impact_rationale="Readability improvement",
                                effort_rationale="Extract to constant",
                                downstream_affected=[], dependencies_count=0
                            ),
                            hypothesis="Maintainability - magic number",
                            evidence=[],
                            pkb_refs=[]
                        )

        # --- JS-specific file-level checks ---
        if is_js:
            # Check for missing useEffect dependency array
            if 'useEffect' in content:
                for i, line in enumerate(stripped_lines):
                    if 'useEffect(' in line:
                        nearby = '\n'.join(stripped_lines[i:min(len(stripped_lines), i+3)])
                        if ", [])" not in nearby and ", [" not in nearby:
                            yield self._create_suggestion(
                                category='functionality',
                                priority='medium',
                                title="useEffect missing dependency array",
                                description="useEffect should specify a dependency array to control when it runs.",
                                current_code=lines[i][:80],
                                suggested_code="useEffect(() => { ... }, [])  // or [dep1, dep2]",
                                rationale="Missing dependency array causes the effect to run on every render.",
                                file_path=str_path,
                                line_start=i + 1,
                                line_end=i + 1,
                                impact=ImpactAssessment(
                                    impact_score=6, effort_score=2,
                                    impact_rationale="Can cause infinite loops or excessive re-renders",
                                    effort_rationale="Add dependency array",
                                    downstream_affected=[], dependencies_count=0
                                ),
                                hypothesis="React bug risk - uncontrolled effect execution",
                                evidence=[],
                                pkb_refs=[]
                            )

            # Duplicate imports
            imports = []
            for i, line in enumerate(stripped_lines):
                match = re.match(r"import\s+.*?\s+from\s+['\"](.+?)['\"]", line)
                if match:
                    imports.append((i, match.group(1)))
            seen = set()
            for i, module in imports:
                if module in seen:
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title=f"Duplicate import: `{module}`",
                        description=f"Module `{module}` is imported multiple times. Consolidate imports.",
                        current_code=lines[i],
                        suggested_code=f"// Consolidate imports from {module}",
                        rationale="Duplicate imports are redundant and clutter the file.",
                        file_path=str_path,
                        line_start=i + 1,
                        line_end=i + 1,
                        impact=ImpactAssessment(
                            impact_score=2, effort_score=1,
                            impact_rationale="Code hygiene",
                            effort_rationale="Remove duplicate line",
                            downstream_affected=[], dependencies_count=0
                        ),
                        hypothesis="Redundant code - duplicate import",
                        evidence=[],
                        pkb_refs=[]
                    )
                seen.add(module)

            # Mixed import styles
            if any('import * as' in l for l in stripped_lines) and any("import {" in l for l in stripped_lines):
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Inconsistent import styles",
                    description="File mixes `import * as` and named imports. Consider standardizing for consistency.",
                    current_code=lines[0][:80] if lines else "",
                    suggested_code="// Use one import style consistently",
                    rationale="Consistent import style improves readability.",
                    file_path=str_path,
                    line_start=1,
                    line_end=min(5, len(lines)),
                    impact=ImpactAssessment(
                        impact_score=2, effort_score=2,
                        impact_rationale="Style consistency",
                        effort_rationale="Refactor imports",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Style inconsistency - mixed import patterns",
                    evidence=[],
                    pkb_refs=[]
                )

            # Default export naming
            for i, line in enumerate(stripped_lines):
                if 'export default' in line:
                    if 'function' not in line and 'class' not in line and 'const' not in line:
                        if re.search(r'export\s+default\s+\w+', line):
                            name = re.search(r'export\s+default\s+(\w+)', line).group(1)
                            if name.lower() != file_path.stem.lower().replace('-', '').replace('_', ''):
                                yield self._create_suggestion(
                                    category='enhancement',
                                    priority='low',
                                    title="Default export name mismatch",
                                    description=f"Default export `{name}` doesn't match filename `{file_path.name}`.",
                                    current_code=lines[i],
                                    suggested_code=f"// Consider renaming export to match filename",
                                    rationale="Matching export and filename names improves discoverability.",
                                    file_path=str_path,
                                    line_start=i + 1,
                                    line_end=i + 1,
                                    impact=ImpactAssessment(
                                        impact_score=2, effort_score=1,
                                        impact_rationale="Minor discoverability improvement",
                                        effort_rationale="Rename export",
                                        downstream_affected=[], dependencies_count=0
                                    ),
                                    hypothesis="Naming inconsistency - export vs filename",
                                    evidence=[],
                                    pkb_refs=[]
                                )

        # --- Missing final newline ---
        if content and not content.endswith('\n'):
            yield self._create_suggestion(
                category='refactoring',
                priority='low',
                title="Missing final newline",
                description="File does not end with a newline character. POSIX standards and many tools expect a trailing newline.",
                current_code=lines[-1][:80] if lines else "",
                suggested_code="# Ensure file ends with a newline character",
                rationale="Trailing newline prevents 'No newline at end of file' warnings and avoids concatenation bugs.",
                file_path=str_path,
                line_start=len(lines),
                line_end=len(lines),
                impact=ImpactAssessment(
                    impact_score=1, effort_score=1,
                    impact_rationale="Tooling compatibility",
                    effort_rationale="Add newline at EOF",
                    downstream_affected=[], dependencies_count=0
                ),
                hypothesis="Formatting - missing trailing newline",
                evidence=[],
                pkb_refs=[]
            )

        if is_py:
            # --- Star imports (Python) ---
            for i, line in enumerate(stripped_lines):
                if re.match(r'from\s+\S+\s+import\s+\*', line):
                    yield self._create_suggestion(
                        category='maintainability',
                        priority='medium',
                        title="Wildcard import detected",
                        description="`from X import *` pollutes the namespace and makes code harder to understand.",
                        current_code=lines[i],
                        suggested_code="# Import only the names you need explicitly",
                        rationale="Explicit imports improve readability, IDE support, and avoid name collisions.",
                        file_path=str_path,
                        line_start=i + 1,
                        line_end=i + 1,
                        impact=ImpactAssessment(
                            impact_score=4, effort_score=3,
                            impact_rationale="Namespace pollution and IDE issues",
                            effort_rationale="Replace with explicit imports",
                            downstream_affected=[], dependencies_count=0
                        ),
                        hypothesis="Maintainability - wildcard import",
                        evidence=[],
                        pkb_refs=[]
                    )
                    break

            # --- Relative imports without explicit level ---
            for i, line in enumerate(stripped_lines):
                match = re.match(r'from\s+\.([a-zA-Z_])', line)
                if match:
                    yield self._create_suggestion(
                        category='refactoring',
                        priority='low',
                        title="Ambiguous relative import",
                        description="Relative import without explicit level (e.g., `.module`) can be confused with absolute import.",
                        current_code=lines[i],
                        suggested_code="# Use explicit relative imports: from .module import X or from ..module import X",
                        rationale="Explicit relative levels improve clarity and prevent import errors.",
                        file_path=str_path,
                        line_start=i + 1,
                        line_end=i + 1,
                        impact=ImpactAssessment(
                            impact_score=2, effort_score=1,
                            impact_rationale="Clarity improvement",
                            effort_rationale="Add dot prefix",
                            downstream_affected=[], dependencies_count=0
                        ),
                        hypothesis="Clarity - ambiguous relative import",
                        evidence=[],
                        pkb_refs=[]
                    )
                    break

            # --- Mutable default arguments (file-level scan for any) ---
            mutable_defaults = 0
            for i, line in enumerate(stripped_lines):
                if re.search(r'def\s+\w+\s*\([^)]*=\s*(\[\s*\]|\{\s*\})', line):
                    mutable_defaults += 1
            if mutable_defaults > 1:
                yield self._create_suggestion(
                    category='bug',
                    priority='high',
                    title=f"{mutable_defaults} mutable default arguments",
                    description="Multiple functions use mutable defaults (list/dict). This is a well-known Python pitfall.",
                    current_code=lines[0][:80] if lines else "",
                    suggested_code="# Use None as default and initialize mutable inside the function",
                    rationale="Mutable defaults are shared across calls, causing hard-to-debug bugs.",
                    file_path=str_path,
                    line_start=1,
                    line_end=min(10, len(lines)),
                    impact=ImpactAssessment(
                        impact_score=7, effort_score=3,
                        impact_rationale="Multiple mutable defaults increase bug risk",
                        effort_rationale="Replace with None + init",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Bug - multiple mutable default arguments",
                    evidence=[],
                    pkb_refs=[]
                )

        if is_js:
            # --- Missing 'use strict' ---
            if not any("use strict" in l for l in stripped_lines[:5]):
                yield self._create_suggestion(
                    category='enhancement',
                    priority='low',
                    title="Missing 'use strict'",
                    description="File doesn't declare 'use strict' at the top. Strict mode catches common errors and disables unsafe features.",
                    current_code=lines[0][:80] if lines else "",
                    suggested_code="// Add 'use strict'; at the top of the file or module",
                    rationale="Strict mode helps catch silent errors and improves security.",
                    file_path=str_path,
                    line_start=1,
                    line_end=min(5, len(lines)),
                    impact=ImpactAssessment(
                        impact_score=3, effort_score=1,
                        impact_rationale="Error prevention",
                        effort_rationale="Add one line",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Robustness - missing strict mode",
                    evidence=[],
                    pkb_refs=[]
                )

            # --- var declarations in modern JS ---
            var_count = sum(1 for l in stripped_lines if re.match(r'\bvar\s+', l))
            if var_count > 0:
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title=f"Uses `var` {var_count} time(s)",
                    description="`var` has function scope and hoisting issues. Prefer `const` and `let`.",
                    current_code=lines[0][:80] if lines else "",
                    suggested_code="// Replace var with const/let for block scope",
                    rationale="const/let reduce scoping bugs and make intent clearer.",
                    file_path=str_path,
                    line_start=1,
                    line_end=min(10, len(lines)),
                    impact=ImpactAssessment(
                        impact_score=3, effort_score=2,
                        impact_rationale="Scope safety",
                        effort_rationale="Replace var declarations",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Robustness - var scoping issues",
                    evidence=[],
                    pkb_refs=[]
                )

        # --- Mixed tabs and spaces ---
        has_tabs = any('\t' in l for l in lines)
        has_spaces = any(' ' in l and not l.isspace() for l in lines)
        if has_tabs and has_spaces:
            yield self._create_suggestion(
                category='refactoring',
                priority='low',
                title="Mixed tabs and spaces",
                description="File contains both tab and space indentation. This can cause display and alignment issues.",
                current_code=lines[0][:80] if lines else "",
                suggested_code="# Choose one indentation style and enforce it (e.g., 4 spaces)",
                rationale="Consistent indentation prevents formatting issues across editors.",
                file_path=str_path,
                line_start=1,
                line_end=min(5, len(lines)),
                impact=ImpactAssessment(
                    impact_score=2, effort_score=2,
                    impact_rationale="Formatting consistency",
                    effort_rationale="Replace tabs with spaces",
                    downstream_affected=[], dependencies_count=0
                ),
                hypothesis="Formatting - mixed indentation",
                evidence=[],
                pkb_refs=[]
            )

        # --- Markdown file-level checks ---
        if is_md:
            # --- Missing title heading ---
            if lines and not lines[0].lstrip().startswith('#'):
                yield self._create_suggestion(
                    category='documentation',
                    priority='medium',
                    title="Markdown file missing top-level heading",
                    description="Markdown files should start with a # heading for clarity and navigation.",
                    current_code=lines[0][:80] if lines else "",
                    suggested_code=f"# {str_path.replace('-', ' ').replace('_', ' ').title().split('/')[-1]}",
                    rationale="A top-level heading provides context and improves document structure.",
                    file_path=str_path,
                    line_start=1,
                    line_end=1,
                    impact=ImpactAssessment(
                        impact_score=3, effort_score=1,
                        impact_rationale="Documentation clarity",
                        effort_rationale="Add one line",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Documentation structure - missing heading",
                    evidence=[],
                    pkb_refs=[]
                )

            # --- Markdown file too short ---
            if len(lines) < 5:
                yield self._create_suggestion(
                    category='documentation',
                    priority='low',
                    title="Markdown file is very short",
                    description=f"File has only {len(lines)} lines. Consider expanding documentation.",
                    current_code=lines[0][:80] if lines else "",
                    suggested_code="# Add more content or merge with related docs",
                    rationale="Thin documentation files may not provide sufficient value.",
                    file_path=str_path,
                    line_start=1,
                    line_end=min(5, len(lines)),
                    impact=ImpactAssessment(
                        impact_score=2, effort_score=2,
                        impact_rationale="Documentation completeness",
                        effort_rationale="Expand content",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Documentation gap - very short file",
                    evidence=[],
                    pkb_refs=[]
                )

            # --- Missing final newline ---
            if content and not content.endswith('\n'):
                yield self._create_suggestion(
                    category='refactoring',
                    priority='low',
                    title="Missing final newline",
                    description="File does not end with a newline character.",
                    current_code=lines[-1][:80] if lines else "",
                    suggested_code="# Ensure file ends with a newline character",
                    rationale="Trailing newline prevents 'No newline at end of file' warnings.",
                    file_path=str_path,
                    line_start=len(lines),
                    line_end=len(lines),
                    impact=ImpactAssessment(
                        impact_score=1, effort_score=1,
                        impact_rationale="Tooling compatibility",
                        effort_rationale="Add newline at EOF",
                        downstream_affected=[], dependencies_count=0
                    ),
                    hypothesis="Formatting - missing trailing newline",
                    evidence=[],
                    pkb_refs=[]
                )

    async def _analyze_file_with_llm(self, file_path: Path, content: str) -> AsyncGenerator[Suggestion, None]:
        """Use LLM for deeper code analysis on smaller files.
        
        Runs two prompts:
        1. Understanding prompt — architectural role, interfaces, design patterns, cross-cutting concerns
        2. Improvement prompt — code quality suggestions (existing behavior)
        """
        # Skip very large files to avoid token budget issues
        if len(content) > 12000 or len(content.split('\n')) > 400:
            return

        language = 'python' if file_path.suffix == '.py' else ('markdown' if file_path.suffix in ('.md', '.mdx') else 'javascript/react')

        # Phase 1: Understanding prompt
        understanding_prompt = f"""You are a senior engineer auditing a {language} codebase. Analyze this file for architectural understanding.
Return ONLY a JSON array of insights with this exact format:
[{{"category": "architecture|feature_map|dependency|design_pattern|data_flow|cross_cutting",
"priority": "high|medium|low",
"title": "Brief descriptive title",
"description": "Detailed explanation of what this file does, how it fits in the system, what interfaces it exposes, and who depends on it",
"line_start": 1,
"line_end": 1,
"rationale": "Why understanding this matters for the overall system architecture"}}]

Focus on:
1. What functional role this file plays in the larger system
2. Key interfaces/APIs it exposes and their consumers
3. What other modules it depends on and who depends on it
4. Design patterns used or anti-patterns detected
5. Cross-cutting concerns (auth, logging, error handling, config)

If no architectural insights, return [].

File: {file_path.name}
```
{content[:6000]}
```"""
        try:
            response = await complete_chat(
                messages=[
                    {"role": "system", "content": "You are a senior software architect performing a codebase audit. Return ONLY valid JSON."},
                    {"role": "user", "content": understanding_prompt}
                ],
                temperature=0.2,
                max_tokens=2048,
            )
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                insights = json.loads(json_match.group())
                if isinstance(insights, list):
                    relative_path = str(file_path.relative_to(self.root_path))
                    for ins in insights:
                        try:
                            line_start = int(ins.get('line_start', 1))
                            line_end = int(ins.get('line_end', line_start))
                            category = ins.get('category', 'architecture')
                            if category not in ArchitectureAnalyzer.UNDERSTANDING_CATEGORIES:
                                category = 'architecture'
                            yield self._create_suggestion(
                                category=category,
                                priority=ins.get('priority', 'medium'),
                                title=ins.get('title', 'Architectural insight'),
                                description=ins.get('description', ''),
                                current_code='',
                                suggested_code='',
                                rationale=ins.get('rationale', ''),
                                file_path=relative_path,
                                line_start=line_start,
                                line_end=line_end,
                                impact=ImpactAssessment(
                                    impact_score=5,
                                    effort_score=4,
                                    impact_rationale="Architectural understanding aids system comprehension",
                                    effort_rationale="Understanding requires no code changes",
                                    downstream_affected=[],
                                    dependencies_count=0
                                ),
                                hypothesis=f"LLM architectural analysis: {ins.get('title', '')}",
                                evidence=[],
                                pkb_refs=[],
                                insight_type="understanding"
                            )
                        except Exception:
                            continue
        except Exception:
            pass

        # Phase 2: Improvement prompt (existing behavior)
        improvement_prompt = f"""Analyze this {language} file and identify code improvements.
Return ONLY a JSON array of suggestions with this exact format:
[{{"category": "documentation|functionality|refactoring|enhancement|security|performance",
"priority": "high|medium|low",
"title": "Brief title",
"description": "Detailed description",
"line_start": 1,
"line_end": 1,
"current_code": "relevant code snippet",
"suggested_code": "improved code",
"rationale": "why this matters"}}]

If no suggestions, return [].

File: {file_path.name}
```
{content[:6000]}
```"""
        try:
            response = await complete_chat(
                messages=[
                    {"role": "system", "content": "You are a senior code reviewer. Return ONLY valid JSON."},
                    {"role": "user", "content": improvement_prompt}
                ],
                temperature=0.1,
                max_tokens=2048,
            )
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if not json_match:
                return
            suggestions = json.loads(json_match.group())
            if not isinstance(suggestions, list):
                return

            relative_path = str(file_path.relative_to(self.root_path))
            for s in suggestions:
                try:
                    line_start = int(s.get('line_start', 1))
                    line_end = int(s.get('line_end', line_start))
                    yield self._create_suggestion(
                        category=s.get('category', 'enhancement'),
                        priority=s.get('priority', 'medium'),
                        title=s.get('title', 'Suggestion'),
                        description=s.get('description', ''),
                        current_code=s.get('current_code', '')[:200],
                        suggested_code=s.get('suggested_code', ''),
                        rationale=s.get('rationale', ''),
                        file_path=relative_path,
                        line_start=line_start,
                        line_end=line_end,
                        impact=ImpactAssessment(
                            impact_score=5,
                            effort_score=5,
                            impact_rationale="LLM-identified improvement",
                            effort_rationale="See suggestion details",
                            downstream_affected=[],
                            dependencies_count=0,
                        ),
                        hypothesis=f"LLM analysis: {s.get('title', '')}",
                        evidence=[],
                        pkb_refs=[],
                    )
                except Exception:
                    continue
        except Exception:
            # Silently skip LLM failures to avoid breaking analysis
            pass

    async def _consolidate_findings(self):
        """Consolidate related findings in PKB."""
        # Group by category and find potential redundancies
        categories = {}
        for entry in self.pkb.entries:
            if entry.consolidated:
                continue
            cat = entry.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(entry)

        # Consolidate entries in same file with similar observations
        for cat, entries in categories.items():
            file_groups = defaultdict(list)
            for entry in entries:
                file_groups[entry.file_path].append(entry)

            for file_path, file_entries in file_groups.items():
                if len(file_entries) > 3:
                    # Multiple entries in same file - suggest consolidation
                    observation = f"Multiple observations in {file_path}: {', '.join(e.observation[:30] for e in file_entries[:3])}..."
                    self.pkb.consolidate(
                        [e.id for e in file_entries],
                        observation,
                        cat,
                        [file_path.split('/')[-1] if '/' in file_path else 'root']
                    )

    def _create_suggestion(self, category: str, priority: str, title: str, description: str,
                          current_code: str, suggested_code: str, rationale: str,
                          file_path: str, line_start: int, line_end: int,
                          impact: ImpactAssessment, hypothesis: str = "",
                          evidence: list[str] = None, pkb_refs: list[str] = None,
                          insight_type: str = "improvement") -> Suggestion:
        """Create a suggestion with all metadata."""
        return Suggestion(
            id=str(hash(f"{file_path}:{line_start}:{title}"))[:16],
            timestamp=datetime.utcnow().isoformat(),
            category=category,
            priority=priority,
            impact=impact,
            file_path=file_path,
            line_start=line_start,
            line_end=line_end,
            title=title,
            description=description,
            current_code=current_code[:200] if current_code else '',
            suggested_code=suggested_code,
            rationale=rationale,
            hypothesis=hypothesis,
            evidence=evidence or [],
            pkb_refs=pkb_refs or [],
            insight_type=insight_type
        )
        
    def _create_meta_suggestion(self, type_: str, message: str) -> Suggestion:
        """Create a meta suggestion for UI feedback (not stored)."""
        return Suggestion(
            id=f"meta_{type_}_{uuid.uuid4().hex[:8]}",
            timestamp=datetime.utcnow().isoformat(),
            category='meta',
            priority='low',
            impact=ImpactAssessment(
                impact_score=0, effort_score=0,
                impact_rationale="", effort_rationale="",
                downstream_affected=[], dependencies_count=0
            ),
            file_path="",
            line_start=0,
            line_end=0,
            title=f"[{type_.upper()}]",
            description=message,
            current_code="",
            suggested_code="",
            rationale=f"Status update: {message}",
            insight_type="meta"
        )


class ArchitectureAnalyzer:
    """Builds a general understanding of the codebase architecture.
    
    Implements the 'slow-thinking' workflow:
    1. Hypothesis Generation — flags potential architectural patterns and concerns
    2. Evidence Gathering — cross-references with PKB, config, and code patterns
    3. Simulated Impact — calculates how changes propagate through dependencies
    4. Final Recommendation — presents low-effort, high-impact architectural insights first
    
    Yields Suggestion objects with insight_type='understanding' and categories:
    - architecture: High-level architectural observations
    - feature_map: Feature/functionality inventory entries
    - dependency: Cross-module dependency observations
    - design_pattern: Design pattern identification
    - data_flow: Data flow tracing
    - cross_cutting: Cross-cutting concern identification
    """

    UNDERSTANDING_CATEGORIES = {
        'architecture', 'feature_map', 'dependency', 
        'design_pattern', 'data_flow', 'cross_cutting'
    }

    def __init__(self, root_path: str, arch_map: CodeArchitectureMap, 
                 pkb: PersistentKnowledgeBase, resource_monitor: ResourceMonitor,
                 include_tests: bool = False, 
                 exclude_dirs: list[str] | None = None,
                 exclude_files: list[str] | None = None):
        self.root_path = Path(root_path).resolve()
        self.arch_map = arch_map
        self.pkb = pkb
        self.resource_monitor = resource_monitor
        self.include_tests = include_tests
        self.exclude_dirs = set(exclude_dirs) if exclude_dirs else set()
        self.exclude_files = set(exclude_files) if exclude_files else set()

        self.feature_inventory: dict[str, dict] = {}
        self.dependency_graph: dict[str, set[str]] = defaultdict(set)
        self.reverse_deps: dict[str, set[str]] = defaultdict(set)
        self.patterns_found: list[dict] = []
        self.data_flows: list[dict] = []
        self.module_responsibilities: dict[str, dict] = {}

    async def analyze(self) -> AsyncGenerator[Suggestion, None]:
        """Run all understanding analysis phases and yield insights."""
        yield Suggestion(
            id="meta_understanding_start",
            timestamp=datetime.utcnow().isoformat(),
            category='meta',
            priority='low',
            impact=ImpactAssessment(0, 0, "", "", [], 0),
            file_path="", line_start=0, line_end=0,
            title="[UNDERSTANDING]",
            description="Architecture understanding phase started...",
            current_code="", suggested_code="", rationale="",
            insight_type="meta"
        )

        files = self._get_project_files()
        if not files:
            return

        async for insight in self._map_features(files):
            yield insight
        async for insight in self._trace_dependencies(files):
            yield insight
        async for insight in self._identify_patterns(files):
            yield insight
        async for insight in self._trace_data_flows(files):
            yield insight
        async for insight in self._analyze_cross_cutting(files):
            yield insight
        async for insight in self._analyze_module_responsibilities(files):
            yield insight

        await self.resource_monitor.wait_if_needed()

        yield Suggestion(
            id="meta_understanding_complete",
            timestamp=datetime.utcnow().isoformat(),
            category='meta',
            priority='low',
            impact=ImpactAssessment(0, 0, "", "", [], 0),
            file_path="", line_start=0, line_end=0,
            title="[UNDERSTANDING]",
            description=f"Architecture understanding complete. Features: {len(self.feature_inventory)}, "
                        f"Dependencies: {len(self.dependency_graph)}, Patterns: {len(self.patterns_found)}",
            current_code="", suggested_code="", rationale="",
            insight_type="meta"
        )

    def _get_project_files(self) -> list[Path]:
        """Get all project files for analysis."""
        all_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.md', '.mdx'}
        IGNORE = {
            'node_modules', '__pycache__', '.git', 'venv', 'env', '.venv', '.env',
            'dist', 'build', 'backup', '.vscode', '.pytest_cache', '.claude',
            '.mypy_cache', '.ruff_cache', '.tox', 'coverage', '.coverage',
            '.copilot', '.idea', '.next', 'out', '.nuxt', '.output',
        }
        files = []
        for ext in all_extensions:
            for f in self.root_path.rglob(f'*{ext}'):
                if any(ignore in f.parts for ignore in IGNORE):
                    continue
                if self.exclude_dirs and any(ex in f.parts for ex in self.exclude_dirs):
                    continue
                if self.exclude_files and f.name in self.exclude_files:
                    continue
                if not self.include_tests and ('test' in f.name.lower() or 'tests' in f.parent.name.lower()):
                    continue
                files.append(f)
        files.sort(key=lambda p: str(p))
        return files

    async def _map_features(self, files: list[Path]) -> AsyncGenerator[Suggestion, None]:
        """Phase 1: Map features by scanning route definitions, API endpoints, UI components."""
        await self.resource_monitor.wait_if_needed()

        for file_path in files:
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            rel_path = str(file_path.relative_to(self.root_path))

            if file_path.suffix == '.py':
                await self._map_python_features(content, rel_path, file_path)
            elif file_path.suffix in ('.js', '.jsx', '.ts', '.tsx'):
                await self._map_js_features(content, rel_path, file_path)

        for feature_name, feature_info in self.feature_inventory.items():
            modules_involved = feature_info.get('files', [])
            if len(modules_involved) > 3:
                yield Suggestion(
                    id=str(hash(f"feature_map:{feature_name}"))[:16],
                    timestamp=datetime.utcnow().isoformat(),
                    category='feature_map',
                    priority='medium',
                    impact=ImpactAssessment(
                        impact_score=7,
                        effort_score=6,
                        impact_rationale=f"Feature '{feature_name}' spans {len(modules_involved)} modules",
                        effort_rationale="Understanding cross-cutting features requires tracing multiple files",
                        downstream_affected=[f"Feature: {feature_name}"],
                        dependencies_count=len(modules_involved)
                    ),
                    file_path=modules_involved[0] if modules_involved else "",
                    line_start=1, line_end=1,
                    title=f"Feature: {feature_name}",
                    description=f"Feature '{feature_name}' is distributed across {len(modules_involved)} modules: "
                                f"{', '.join(modules_involved[:5])}"
                                f"{'...' if len(modules_involved) > 5 else ''}. "
                                f"This distributed implementation may benefit from consolidation or clearer module boundaries.",
                    current_code="",
                    suggested_code=f"# Consider consolidating {feature_name} logic into a dedicated module or service",
                    rationale=f"Distributed features across many files increase cognitive load and make changes harder to trace. "
                              f"Currently spans: {', '.join(modules_involved)}",
                    hypothesis=f"Feature map analysis identified '{feature_name}' as a cross-cutting concern",
                    evidence=[f"Found in: {f}" for f in modules_involved[:5]],
                    pkb_refs=[],
                    insight_type="understanding"
                )

    async def _map_python_features(self, content: str, rel_path: str, file_path: Path) -> None:
        """Detect features in Python files from route decorators, class definitions, and config references."""
        route_pattern = re.compile(r'@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', re.IGNORECASE)
        for match in route_pattern.finditer(content):
            endpoint_url = match.group(2)
            feature_name = self._extract_feature_from_endpoint(endpoint_url)
            if feature_name not in self.feature_inventory:
                self.feature_inventory[feature_name] = {
                    'files': [], 'endpoints': [], 'type': 'api'
                }
            if rel_path not in self.feature_inventory[feature_name]['files']:
                self.feature_inventory[feature_name]['files'].append(rel_path)
            self.feature_inventory[feature_name]['endpoints'].append(endpoint_url)

            line_num = content[:match.start()].count('\n') + 1
            self.pkb.add(
                observation=f"API endpoint: {match.group(1).upper()} {endpoint_url} (feature: {feature_name})",
                file_path=rel_path, line=line_num,
                category='feature', tags=['api', 'endpoint', feature_name]
            )

        class_pattern = re.compile(r'^class\s+(\w+)', re.MULTILINE)
        for match in class_pattern.finditer(content):
            class_name = match.group(1)
            if any(suffix in class_name for suffix in ['Engine', 'Manager', 'Handler', 'Service', 'Store', 'Processor', 'Analyzer']):
                feature_name = self._snake_case(class_name)
                if feature_name not in self.feature_inventory:
                    self.feature_inventory[feature_name] = {
                        'files': [], 'endpoints': [], 'type': 'service'
                    }
                if rel_path not in self.feature_inventory[feature_name]['files']:
                    self.feature_inventory[feature_name]['files'].append(rel_path)

                line_num = content[:match.start()].count('\n') + 1
                self.pkb.add(
                    observation=f"Service class: {class_name}",
                    file_path=rel_path, line=line_num,
                    category='feature', tags=['service', 'class', class_name.lower()]
                )

    async def _map_js_features(self, content: str, rel_path: str, file_path: Path) -> None:
        """Detect features in JS/JSX files from component names, route definitions, and hooks."""
        component_pattern = re.compile(r'(?:export\s+)?(?:default\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\(|React\.memo|React\.forwardRef)', re.MULTILINE)
        for match in component_pattern.finditer(content):
            name = match.group(1) or match.group(2)
            if name and name[0].isupper():
                feature_name = self._snake_case(name)
                if feature_name not in self.feature_inventory:
                    self.feature_inventory[feature_name] = {
                        'files': [], 'endpoints': [], 'type': 'component'
                    }
                self.feature_inventory[feature_name]['files'].append(rel_path)

                line_num = content[:match.start()].count('\n') + 1
                self.pkb.add(
                    observation=f"React component: {name}",
                    file_path=rel_path, line=line_num,
                    category='feature', tags=['component', 'react', feature_name]
                )

        hook_patterns = re.compile(r'use[A-Z]\w+', re.MULTILINE)
        custom_hooks = set()
        for match in hook_patterns.finditer(content):
            hook_name = match.group()
            if hook_name not in ('useState', 'useEffect', 'useCallback', 'useMemo', 
                                 'useRef', 'useContext', 'useReducer', 'useLayoutEffect'):
                custom_hooks.add(hook_name)

        for hook in custom_hooks:
            feature_name = self._snake_case(hook)
            if feature_name not in self.feature_inventory:
                self.feature_inventory[feature_name] = {
                    'files': [], 'endpoints': [], 'type': 'hook'
                }
            if rel_path not in self.feature_inventory[feature_name]['files']:
                self.feature_inventory[feature_name]['files'].append(rel_path)

    def _extract_feature_from_endpoint(self, endpoint: str) -> str:
        """Extract a feature name from an API endpoint URL.
        
        Uses up to 2 meaningful path segments to create granular feature names.
        E.g. '/api/knowledge' -> 'api_knowledge', '/api/cio-agent/suggestions' -> 'cio_agent_suggestions'
        """
        parts = endpoint.strip('/').split('/')
        feature_parts = [p for p in parts if not p.startswith('{') and not p.startswith('<') and p]
        if len(feature_parts) >= 2:
            return '_'.join(feature_parts[:2]).replace('-', '_')
        elif feature_parts:
            return feature_parts[0].replace('-', '_')
        return 'api_root'

    def _snake_case(self, name: str) -> str:
        """Convert CamelCase to snake_case."""
        result = re.sub(r'([A-Z]+)', r'_\1', name)
        return result.lower().lstrip('_')

    async def _trace_dependencies(self, files: list[Path]) -> AsyncGenerator[Suggestion, None]:
        """Phase 2: Build import dependency graph and identify coupling issues."""
        await self.resource_monitor.wait_if_needed()

        python_files = [f for f in files if f.suffix == '.py']
        js_files = [f for f in files if f.suffix in ('.js', '.jsx', '.ts', '.tsx')]

        for file_path in python_files:
            await self.resource_monitor.wait_if_needed()
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            rel_path = str(file_path.relative_to(self.root_path))
            imports = self._extract_python_imports(content, rel_path)
            self.dependency_graph[rel_path] = imports
            for imp in imports:
                self.reverse_deps[imp].add(rel_path)

        for file_path in js_files:
            await self.resource_monitor.wait_if_needed()
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            rel_path = str(file_path.relative_to(self.root_path))
            imports = self._extract_js_imports(content, rel_path)
            self.dependency_graph[rel_path] = imports
            for imp in imports:
                self.reverse_deps[imp].add(rel_path)

        for module, deps in self.dependency_graph.items():
            if len(deps) > 10:
                yield Suggestion(
                    id=str(hash(f"dependency:broad:{module}"))[:16],
                    timestamp=datetime.utcnow().isoformat(),
                    category='dependency',
                    priority='medium',
                    impact=ImpactAssessment(
                        impact_score=6,
                        effort_score=5,
                        impact_rationale=f"Module imports {len(deps)} dependencies — high coupling",
                        effort_rationale="Refactoring requires untangling many imports",
                        downstream_affected=list(deps)[:5],
                        dependencies_count=len(deps)
                    ),
                    file_path=module,
                    line_start=1, line_end=1,
                    title=f"High coupling: {module} ({len(deps)} imports)",
                    description=f"Module '{module.split('/')[-1]}' imports from {len(deps)} other modules, "
                                f"indicating high coupling. Consider grouping related imports or extracting "
                                f"a facade/adapter to reduce direct dependencies.",
                    current_code="",
                    suggested_code=f"# Extract a facade or adapter to reduce {len(deps)} direct imports in {module.split('/')[-1]}",
                    rationale="High fan-in coupling makes modules fragile — changes in any dependency propagate. "
                              "Target: fewer than 7-8 direct imports per module.",
                    hypothesis=f"Dependency analysis detected high coupling in {module}",
                    evidence=[f"Imports from: {dep}" for dep in list(deps)[:5]],
                    pkb_refs=[],
                    insight_type="understanding"
                )

        for module, dependents in self.reverse_deps.items():
            if len(dependents) > 5:
                yield Suggestion(
                    id=str(hash(f"dependency:fan_out:{module}"))[:16],
                    timestamp=datetime.utcnow().isoformat(),
                    category='dependency',
                    priority='high',
                    impact=ImpactAssessment(
                        impact_score=8,
                        effort_score=7,
                        impact_rationale=f"Module is depended upon by {len(dependents)} modules — changes have broad impact",
                        effort_rationale="Stabilizing this module's API requires careful refactoring",
                        downstream_affected=list(dependents)[:5],
                        dependencies_count=len(dependents)
                    ),
                    file_path=module,
                    line_start=1, line_end=1,
                    title=f"Critical hub: {module} ({len(dependents)} dependents)",
                    description=f"Module '{module.split('/')[-1]}' is depended upon by {len(dependents)} other modules. "
                                f"Changes to this module have cascading effects across the codebase. "
                                f"This is a stability-critical module that needs strong interface contracts.",
                    current_code="",
                    suggested_code=f"# Ensure {module.split('/')[-1]} has stable public API with minimal breaking changes",
                    rationale="High fan-out dependencies mean this module is a system cornerstone. "
                              "Any change can break multiple consumers. Strong typing, deprecation warnings, and "
                              "interface stability are essential.",
                    hypothesis=f"Hub module detected: {module} is a system cornerstone",
                    evidence=[f"Used by: {dep}" for dep in list(dependents)[:5]],
                    pkb_refs=[],
                    insight_type="understanding"
                )

        circular = self._detect_circular_dependencies()
        for cycle in circular:
            yield Suggestion(
                id=str(hash(f"dependency:cycle:{':'.join(sorted(cycle))}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='dependency',
                priority='high',
                impact=ImpactAssessment(
                    impact_score=9,
                    effort_score=8,
                    impact_rationale="Circular dependencies create tight coupling and unpredictable initialization order",
                    effort_rationale="Breaking circular deps requires introducing interfaces or extracting shared logic",
                    downstream_affected=list(cycle)[:5],
                    dependencies_count=len(cycle)
                ),
                file_path=list(cycle)[0] if cycle else "",
                line_start=1, line_end=1,
                title=f"Circular dependency: {' → '.join([m.split('/')[-1] for m in list(cycle)[:4]])}",
                description=f"Circular dependency detected among {len(cycle)} modules: "
                            f"{', '.join([m.split('/')[-1] for m in list(cycle)[:6]])}. "
                            f"Circular dependencies prevent independent testing, cause initialization order issues, "
                            f"and make the system harder to reason about.",
                current_code="",
                suggested_code="# Break circular dependency by extracting shared logic into a separate module "
                               "or introducing dependency inversion",
                rationale="Circular dependencies are a well-known anti-pattern that increases coupling, "
                          "makes testing difficult, and can cause import-order bugs at runtime.",
                hypothesis="Cycle detection in dependency graph",
                evidence=[f"Module: {m}" for m in list(cycle)[:5]],
                pkb_refs=[],
                insight_type="understanding"
            )

    def _extract_python_imports(self, content: str, rel_path: str) -> set[str]:
        """Extract Python import targets as relative module paths."""
        imports = set()
        for match in re.finditer(r'^from\s+([\w.]+)\s+import|^import\s+([\w.]+)', content, re.MULTILINE):
            module = match.group(1) or match.group(2)
            if module:
                module_path = module.replace('.', '/') + '.py'
                imports.add(module_path)
                parts = module.split('.')
                if len(parts) > 1:
                    imports.add('/'.join(parts[:-1]) + '/' + parts[-1] + '.py')
        return imports

    def _extract_js_imports(self, content: str, rel_path: str) -> set[str]:
        """Extract JS/TS import targets as relative paths."""
        imports = set()
        for match in re.finditer(r'(?:import\s+.*?\s+from\s+|require\s*\(\s*)["\']([^"\']+)["\']', content):
            imp = match.group(1)
            if imp.startswith('.'):
                resolved = str(Path(rel_path).parent / imp)
                if not resolved.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    resolved += '/index.js'
                imports.add(resolved)
            else:
                pkg_name = imp.split('/')[0] if imp.startswith('@') else imp.split('/')[0]
                imports.add(f"node_modules/{pkg_name}")
        return imports

    def _detect_circular_dependencies(self) -> list[set[str]]:
        """Detect circular dependencies using DFS on the dependency graph."""
        cycles = []
        visited = set()
        rec_stack = set()

        def dfs(node: str, path: list[str]):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in self.dependency_graph.get(node, set()):
                if neighbor not in visited:
                    cycle = dfs(neighbor, path)
                    if cycle:
                        return cycle
                elif neighbor in rec_stack:
                    cycle_start = path.index(neighbor)
                    cycle_set = set(path[cycle_start:])
                    if cycle_set not in cycles:
                        cycles.append(cycle_set)
                    return cycle_set

            path.pop()
            rec_stack.discard(node)
            return None

        for node in self.dependency_graph:
            if node not in visited:
                dfs(node, [])

        return [c for c in cycles if len(c) > 1]

    async def _identify_patterns(self, files: list[Path]) -> AsyncGenerator[Suggestion, None]:
        """Phase 3: Detect design patterns and anti-patterns in the codebase."""
        await self.resource_monitor.wait_if_needed()

        for file_path in files:
            await self.resource_monitor.wait_if_needed()
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            rel_path = str(file_path.relative_to(self.root_path))

            async for insight in self._detect_patterns_in_file(content, rel_path, file_path):
                yield insight

    async def _detect_patterns_in_file(self, content: str, rel_path: str, file_path: Path) -> AsyncGenerator[Suggestion, None]:
        """Detect design patterns and anti-patterns in a single file."""
        lines = content.split('\n')

        if file_path.suffix == '.py':
            async for insight in self._detect_python_patterns(content, lines, rel_path):
                yield insight
        elif file_path.suffix in ('.js', '.jsx', '.ts', '.tsx'):
            async for insight in self._detect_js_patterns(content, lines, rel_path):
                yield insight

    async def _detect_python_patterns(self, content: str, lines: list[str], rel_path: str) -> AsyncGenerator[Suggestion, None]:
        """Detect Python design patterns and anti-patterns."""

        if re.search(r'class\s+\w+Factory\b', content):
            yield Suggestion(
                id=str(hash(f"design_pattern:factory:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='low',
                impact=ImpactAssessment(
                    impact_score=3, effort_score=2,
                    impact_rationale="Factory pattern provides abstraction over object creation",
                    effort_rationale="Pattern already implemented",
                    downstream_affected=[], dependencies_count=0
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Factory pattern: {rel_path.split('/')[-1]}",
                description=f"The Factory pattern is used in '{rel_path}'. This pattern abstracts object creation, "
                            f"making it easier to extend with new types without modifying client code.",
                current_code="", suggested_code="",
                rationale="Documenting design patterns aids in onboarding and systemic understanding.",
                hypothesis="Factory pattern detected via class naming convention",
                evidence=[f"File: {rel_path}"],
                pkb_refs=[], insight_type="understanding"
            )
            self.patterns_found.append({'pattern': 'factory', 'file': rel_path})

        if re.search(r'class\s+\w+Singleton\b', content):
            yield Suggestion(
                id=str(hash(f"design_pattern:singleton:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='medium',
                impact=ImpactAssessment(
                    impact_score=5, effort_score=3,
                    impact_rationale="Singleton pattern centralizes state — can create hidden coupling",
                    effort_rationale="Consider if dependency injection would be more appropriate",
                    downstream_affected=[], dependencies_count=1
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Singleton pattern: {rel_path.split('/')[-1]}",
                description=f"The Singleton pattern is used in '{rel_path}'. While it ensures a single instance, "
                            f"it can create hidden coupling and make testing difficult. Verify this is intentional.",
                current_code="", suggested_code="",
                rationale="Singletons can be a code smell — they hide dependencies and complicate testing.",
                hypothesis="Singleton pattern detected via class naming convention",
                evidence=[f"File: {rel_path}"],
                pkb_refs=[], insight_type="understanding"
            )
            self.patterns_found.append({'pattern': 'singleton', 'file': rel_path})

        middleware_pattern = re.findall(r'@app\.(?:middleware|before_request|after_request)', content)
        if middleware_pattern:
            yield Suggestion(
                id=str(hash(f"design_pattern:middleware:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='low',
                impact=ImpactAssessment(
                    impact_score=4, effort_score=2,
                    impact_rationale="Middleware pattern provides cross-cutting request processing",
                    effort_rationale="Already implemented",
                    downstream_affected=[], dependencies_count=len(middleware_pattern)
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Middleware pattern: {rel_path.split('/')[-1]} ({len(middleware_pattern)} handlers)",
                description=f"{len(middleware_pattern)} middleware handlers detected in '{rel_path}'. "
                            f"Middleware is a cross-cutting concern pattern — ensure each handler has a single, "
                            f"clear responsibility.",
                current_code="", suggested_code="",
                rationale="Documenting middleware chains aids understanding of request processing flow.",
                hypothesis="Middleware pattern detected via decorators",
                evidence=[f"Handler count: {len(middleware_pattern)}"],
                pkb_refs=[], insight_type="understanding"
            )

        try_pattern = re.findall(r'try:', content)
        bare_except = re.findall(r'except\s*:', content)
        if len(try_pattern) > 5 and len(bare_except) / max(len(try_pattern), 1) > 0.4:
            yield Suggestion(
                id=str(hash(f"design_pattern:over_catch:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='medium',
                impact=ImpactAssessment(
                    impact_score=6, effort_score=4,
                    impact_rationale="Over-broad exception handling masks errors and makes debugging harder",
                    effort_rationale="Replace bare excepts with specific exception types",
                    downstream_affected=[], dependencies_count=0
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Anti-pattern: Broad exception handling ({len(bare_except)} bare excepts)",
                description=f"File '{rel_path.split('/')[-1]}' has {len(try_pattern)} try blocks with "
                            f"{len(bare_except)} bare 'except:' clauses ({len(bare_except)/max(len(try_pattern),1)*100:.0f}%). "
                            f"Bare excepts catch all exceptions including SystemExit and KeyboardInterrupt, "
                            f"masking real errors and making debugging extremely difficult.",
                current_code="", suggested_code="",
                rationale="Specific exception handling (except ValueError, except IOError) is a best practice "
                          "that forces developers to think about what can go wrong.",
                hypothesis="Anti-pattern: over-broad exception handling",
                evidence=[f"{len(bare_except)} bare excepts out of {len(try_pattern)} try blocks"],
                pkb_refs=[], insight_type="understanding"
            )

        god_object_lines = len(lines)
        class_count = len(re.findall(r'^class\s+\w+', content, re.MULTILINE))
        func_count = len(re.findall(r'^\s*def\s+\w+', content, re.MULTILINE))
        if god_object_lines > 500 and class_count <= 2 and func_count > 15:
            yield Suggestion(
                id=str(hash(f"design_pattern:god_object:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='high',
                impact=ImpactAssessment(
                    impact_score=8, effort_score=7,
                    impact_rationale="God objects are the single most damaging anti-pattern — they resist change and testing",
                    effort_rationale="Refactoring a god object requires careful decomposition over multiple PRs",
                    downstream_affected=[], dependencies_count=0
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Anti-pattern: God Object ({god_object_lines} lines, {func_count} functions)",
                description=f"'{rel_path.split('/')[-1]}' is a god object: {god_object_lines} lines with "
                            f"{func_count} functions in {class_count} class(es). This violates the Single "
                            f"Responsibility Principle and makes the module difficult to understand, test, and modify.",
                current_code="", suggested_code="",
                rationale="God objects create tight coupling to multiple concerns and should be decomposed into "
                          "focused modules with clear boundaries.",
                hypothesis=f"God object detected: {god_object_lines} lines, {func_count} functions, {class_count} classes",
                evidence=[f"Lines: {god_object_lines}", f"Functions: {func_count}", f"Classes: {class_count}"],
                pkb_refs=[], insight_type="understanding"
            )
            self.patterns_found.append({'pattern': 'god_object', 'file': rel_path})

        callback_pattern = re.findall(r'\.on\(\s*["\']', content)
        if len(callback_pattern) > 5:
            yield Suggestion(
                id=str(hash(f"design_pattern:observer:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='low',
                impact=ImpactAssessment(
                    impact_score=3, effort_score=2,
                    impact_rationale="Observer/event pattern enables loose coupling between components",
                    effort_rationale="Already implemented",
                    downstream_affected=[], dependencies_count=len(callback_pattern)
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Observer/Event pattern: {rel_path.split('/')[-1]} ({len(callback_pattern)} event handlers)",
                description=f"Observer/Event pattern detected in '{rel_path.split('/')[-1]}' with "
                            f"{len(callback_pattern)} event handlers. This pattern enables loose coupling "
                            f"between event sources and consumers.",
                current_code="", suggested_code="",
                rationale="Documenting event-driven patterns helps understand component interaction.",
                hypothesis="Observer pattern detected via event handler registration",
                evidence=[f"{len(callback_pattern)} event handlers"],
                pkb_refs=[], insight_type="understanding"
            )
            self.patterns_found.append({'pattern': 'observer', 'file': rel_path})

    async def _detect_js_patterns(self, content: str, lines: list[str], rel_path: str) -> AsyncGenerator[Suggestion, None]:
        """Detect JS/React design patterns and anti-patterns."""

        context_count = len(re.findall(r'useContext\(', content))
        if context_count > 3:
            yield Suggestion(
                id=str(hash(f"design_pattern:context_overuse:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='medium',
                impact=ImpactAssessment(
                    impact_score=5, effort_score=4,
                    impact_rationale="Excessive React contexts can make state flow hard to trace",
                    effort_rationale="Consider state management libraries for complex shared state",
                    downstream_affected=[], dependencies_count=context_count
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Multiple React Contexts: {context_count} contexts",
                description=f"File '{rel_path.split('/')[-1]}' uses {context_count} React contexts. "
                            f"While contexts are useful for avoiding prop drilling, having many contexts "
                            f"in one component can indicate state management should be consolidated.",
                current_code="", suggested_code="",
                rationale="Over-using React Context can cause unnecessary re-renders and make state flow opaque.",
                hypothesis=f"Multiple React contexts ({context_count}) detected",
                evidence=[f"{context_count} useContext calls"],
                pkb_refs=[], insight_type="understanding"
            )

        prop_drilling_depth = 0
        for line in lines:
            props_match = re.search(r'\{[^}]{100,}\}', line)
            if props_match:
                prop_drilling_depth += 1
        if prop_drilling_depth > 5:
            yield Suggestion(
                id=str(hash(f"design_pattern:prop_drilling:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='medium',
                impact=ImpactAssessment(
                    impact_score=5, effort_score=5,
                    impact_rationale="Prop drilling makes component interfaces fragile and refactoring painful",
                    effort_rationale="Introduce context or state management to reduce prop threading",
                    downstream_affected=[], dependencies_count=0
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"Potential prop drilling ({prop_drilling_depth} large prop objects)",
                description=f"File '{rel_path.split('/')[-1]}' has {prop_drilling_depth} large prop objects, "
                            f"suggesting possible prop drilling. Consider using React Context or a state "
                            f"management solution to avoid passing many props through intermediate components.",
                current_code="", suggested_code="",
                rationale="Prop drilling is a common React anti-pattern that makes refactoring difficult.",
                hypothesis=f"Prop drilling detected: {prop_drilling_depth} large prop objects",
                evidence=[f"{prop_drilling_depth} oversized prop objects"],
                pkb_refs=[], insight_type="understanding"
            )

        redux_pattern = re.findall(r'(?:createSlice|createStore|configureStore|useSelector|useDispatch)', content)
        if redux_pattern:
            yield Suggestion(
                id=str(hash(f"design_pattern:redux:{rel_path}"))[:16],
                timestamp=datetime.utcnow().isoformat(),
                category='design_pattern',
                priority='low',
                impact=ImpactAssessment(
                    impact_score=3, effort_score=2,
                    impact_rationale="Redux/store pattern centralizes state management",
                    effort_rationale="Already implemented",
                    downstream_affected=[], dependencies_count=len(redux_pattern)
                ),
                file_path=rel_path,
                line_start=1, line_end=1,
                title=f"State management pattern: {rel_path.split('/')[-1]}",
                description=f"Redux/Redux Toolkit pattern detected in '{rel_path.split('/')[-1]}' "
                            f"({len(redux_pattern)} state management calls). This centralizes state "
                            f"but adds complexity.",
                current_code="", suggested_code="",
                rationale="Documenting state management patterns helps understand data flow.",
                hypothesis="Redux/Toolkit state management pattern detected",
                evidence=[f"{len(redux_pattern)} state management API calls"],
                pkb_refs=[], insight_type="understanding"
            )
            self.patterns_found.append({'pattern': 'redux', 'file': rel_path})

    async def _trace_data_flows(self, files: list[Path]) -> AsyncGenerator[Suggestion, None]:
        """Phase 4: Trace data flows through entry points → processing → output."""
        await self.resource_monitor.wait_if_needed()

        entry_points = []
        for file_path in files:
            if not file_path.suffix == '.py':
                continue
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            rel_path = str(file_path.relative_to(self.root_path))
            route_matches = list(re.finditer(
                r'@(?:app|router)\.(get|post|put|delete|patch|websocket)\s*\(\s*["\']([^"\']+)["\']', content
            ))
            for match in route_matches:
                line_num = content[:match.start()].count('\n') + 1
                entry_points.append({
                    'method': match.group(1).upper(),
                    'path': match.group(2),
                    'file': rel_path,
                    'line': line_num
                })

        if not entry_points:
            return

        entry_file_count = len(set(ep['file'] for ep in entry_points))
        yield Suggestion(
            id=str(hash("data_flow:entry_points_overview"))[:16],
            timestamp=datetime.utcnow().isoformat(),
            category='data_flow',
            priority='medium',
            impact=ImpactAssessment(
                impact_score=7, effort_score=3,
                impact_rationale="Understanding API entry points is essential for security and performance auditing",
                effort_rationale="Entry points are already clearly defined via route decorators",
                downstream_affected=[ep['path'] for ep in entry_points[:10]],
                dependencies_count=len(entry_points)
            ),
            file_path=list(set(ep['file'] for ep in entry_points))[0] if entry_file_count else "",
            line_start=1, line_end=1,
            title=f"API surface: {len(entry_points)} endpoints across {entry_file_count} files",
            description=f"The application exposes {len(entry_points)} API endpoints across {entry_file_count} file(s). "
                        f"This is the primary data entry surface. Key endpoints: "
                        f"{', '.join([f'{ep['method']} {ep['path']}' for ep in entry_points[:8]])}"
                        f"{'...' if len(entry_points) > 8 else ''}. "
                        f"Understanding these entry points is essential for security audits and performance optimization.",
            current_code="", suggested_code="",
            rationale="Mapping the API surface is the first step in understanding data flow and attack surface.",
            hypothesis="Data flow analysis starting from API entry points",
            evidence=[f"{ep['method']} {ep['path']} → {ep['file']}" for ep in entry_points[:5]],
            pkb_refs=[], insight_type="understanding"
        )

        for ep in entry_points:
            self.data_flows.append({
                'entry': ep['path'],
                'method': ep['method'],
                'file': ep['file'],
                'line': ep['line']
            })

        for file_path in files:
            if file_path.suffix not in ('.js', '.jsx', '.ts', '.tsx'):
                continue
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            rel_path = str(file_path.relative_to(self.root_path))

            api_calls = re.findall(
                r'(?:axios|fetch)\s*\.\s*(?:get|post|put|delete|patch|head)\s*\(\s*["\']([^"\']+)["\']|'
                r'(?:axios|fetch)\s*\(\s*{\s*[^}]*url\s*:\s*["\']([^"\']+)["\']|'
                r'api\s*/\s*["\']([^"\']+)["\']',
                content
            )
            for match in api_calls:
                url = match[0] or match[1] or match[2]
                if url:
                    self.data_flows.append({
                        'entry': url,
                        'method': 'CLIENT',
                        'file': rel_path,
                        'line': 0
                    })

    async def _analyze_cross_cutting(self, files: list[Path]) -> AsyncGenerator[Suggestion, None]:
        """Phase 5: Identify cross-cutting concerns (auth, logging, error handling, config)."""
        await self.resource_monitor.wait_if_needed()

        auth_files = []
        logging_files = []
        error_handling_files = []
        config_files = []

        for file_path in files:
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            rel_path = str(file_path.relative_to(self.root_path))

            if file_path.suffix == '.py':
                if any(kw in content.lower() for kw in ['auth', 'login', 'password', 'token', 'session', 'jwt']):
                    auth_files.append(rel_path)
                if any(kw in content.lower() for kw in ['logging', 'logger', 'log_level']):
                    logging_files.append(rel_path)
                if any(kw in content.lower() for kw in ['except', 'exception', 'error_handler', 'catch']):
                    error_handling_files.append(rel_path)
                if any(kw in content.lower() for kw in ['config', 'settings', 'environ', 'dotenv']):
                    config_files.append(rel_path)
            elif file_path.suffix in ('.js', '.jsx', '.ts', '.tsx'):
                if any(kw in content.lower() for kw in ['auth', 'login', 'password', 'token', 'session']):
                    auth_files.append(rel_path)
                if any(kw in content.lower() for kw in ['console.log', 'console.error', 'logger']):
                    logging_files.append(rel_path)
                if any(kw in content.lower() for kw in ['try', 'catch', 'error', 'throw']):
                    error_handling_files.append(rel_path)
                if any(kw in content.lower() for kw in ['config', 'settings', 'env', 'process.env']):
                    config_files.append(rel_path)

        for label, concerns_files, concern_name in [
            ('Authentication', auth_files, 'auth'),
            ('Logging', logging_files, 'logging'),
            ('Error handling', error_handling_files, 'error_handling'),
            ('Configuration', config_files, 'config'),
        ]:
            if concerns_files:
                yield Suggestion(
                    id=str(hash(f"cross_cutting:{concern_name}"))[:16],
                    timestamp=datetime.utcnow().isoformat(),
                    category='cross_cutting',
                    priority='medium' if len(concerns_files) > 3 else 'low',
                    impact=ImpactAssessment(
                        impact_score=6 if len(concerns_files) > 5 else 4,
                        effort_score=3,
                        impact_rationale=f"{label} is scattered across {len(concerns_files)} files",
                        effort_rationale="Documenting cross-cutting concerns aids understanding",
                        downstream_affected=concerns_files[:5],
                        dependencies_count=len(concerns_files)
                    ),
                    file_path=concerns_files[0] if concerns_files else "",
                    line_start=1, line_end=1,
                    title=f"{label}: {len(concerns_files)} files involved",
                    description=f"{label} logic is spread across {len(concerns_files)} files: "
                                f"{', '.join([f.split('/')[-1] for f in concerns_files[:5]])}"
                                f"{'...' if len(concerns_files) > 5 else ''}. "
                                f"Cross-cutting concerns should be well-understood and, ideally, centralized.",
                    current_code="",
                    suggested_code=f"# Consider centralizing {label.lower()} logic for consistency and maintainability",
                    rationale=f"Understanding where {label.lower()} is implemented across the codebase helps "
                              f"prevent duplication and ensures consistent handling.",
                    hypothesis=f"{label} is a cross-cutting concern spanning {len(concerns_files)} files",
                    evidence=[f"File: {f}" for f in concerns_files[:5]],
                    pkb_refs=[], insight_type="understanding"
                )
                self.pkb.add(
                    observation=f"{label} concern spans {len(concerns_files)} files",
                    file_path=concerns_files[0] if concerns_files else "",
                    line=1,
                    category='cross_cutting',
                    tags=[concern_name, 'cross-cutting']
                )

    async def _analyze_module_responsibilities(self, files: list[Path]) -> AsyncGenerator[Suggestion, None]:
        """Phase 6: Analyze what each module does and flag modules with too many responsibilities."""
        await self.resource_monitor.wait_if_needed()

        for file_path in files:
            await self.resource_monitor.wait_if_needed()
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            lines = content.split('\n')
            rel_path = str(file_path.relative_to(self.root_path))

            if file_path.suffix == '.py':
                classes = re.findall(r'^class\s+(\w+)', content, re.MULTILINE)
                functions = re.findall(r'^(?:async\s+)?def\s+(\w+)', content, re.MULTILINE)
                imports_raw = re.findall(r'^(?:from|import)\s+([\w.]+)', content, re.MULTILINE)
                routes = re.findall(r'@\w+\.(?:get|post|put|delete|patch|websocket)\s*\(\s*["\']([^"\']+)["\']', content)
            elif file_path.suffix in ('.js', '.jsx', '.ts', '.tsx'):
                classes = re.findall(r'class\s+(\w+)', content)
                functions = re.findall(r'(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\(|async))', content)
                functions = [f[0] or f[1] for f in functions]
                imports_raw = re.findall(r'import\s+.*?from\s+["\']([^"\']+)["\']', content)
                routes = re.findall(r'(?:path|route)\s*:\s*["\']([^"\']+)["\']', content)
            else:
                continue

            responsibilities = []
            if routes:
                responsibilities.append('API routing')
            if any('auth' in r.lower() for r in imports_raw):
                responsibilities.append('authentication/auth')
            if any('db' in r.lower() or 'sql' in r.lower() or 'database' in r.lower() for r in imports_raw):
                responsibilities.append('database')
            if any('log' in r.lower() for r in imports_raw):
                responsibilities.append('logging')
            if any('config' in r.lower() or 'settings' in r.lower() for r in imports_raw):
                responsibilities.append('configuration')
            if any('test' in r.lower() for r in imports_raw):
                responsibilities.append('testing')

            self.module_responsibilities[rel_path] = {
                'classes': len(classes),
                'functions': len(functions),
                'imports': len(imports_raw),
                'routes': len(routes),
                'responsibilities': responsibilities,
                'lines': len(lines)
            }

            if len(responsibilities) > 4:
                yield Suggestion(
                    id=str(hash(f"architecture:multi_responsibility:{rel_path}"))[:16],
                    timestamp=datetime.utcnow().isoformat(),
                    category='architecture',
                    priority='medium',
                    impact=ImpactAssessment(
                        impact_score=6, effort_score=6,
                        impact_rationale=f"Module has {len(responsibilities)} distinct responsibilities, violating SRP",
                        effort_rationale="Decomposing requires identifying clear boundaries between responsibilities",
                        downstream_affected=[], dependencies_count=len(imports_raw)
                    ),
                    file_path=rel_path,
                    line_start=1, line_end=1,
                    title=f"Multi-responsibility module: {rel_path.split('/')[-1]} ({len(responsibilities)} concerns)",
                    description=f"Module '{rel_path.split('/')[-1]}' has {len(responsibilities)} distinct responsibilities: "
                                f"{', '.join(responsibilities)}. This violates the Single Responsibility Principle "
                                f"and makes the module harder to understand, test, and modify independently.",
                    current_code="",
                    suggested_code=f"# Consider splitting {rel_path.split('/')[-1]} into: "
                                  f"{', '.join([f'{r}_module' for r in responsibilities[:3]])}",
                    rationale="Modules with too many responsibilities become god objects and are a maintainability risk.",
                    hypothesis=f"SRP violation: {len(responsibilities)} responsibilities detected",
                    evidence=[f"Responsibility: {r}" for r in responsibilities],
                    pkb_refs=[], insight_type="understanding"
                )


async def analyze_codebase(
    root_path: str,
    include_tests: bool = False,
    pkb_path: str | None = None,
    include_understanding: bool = True
) -> AsyncGenerator[Suggestion, None]:
    """Convenience function to analyze the entire codebase."""
    analyzer = CodeAnalyzer(root_path, include_tests, pkb_path)
    async for suggestion in analyzer.analyze(include_understanding=include_understanding):
        yield suggestion