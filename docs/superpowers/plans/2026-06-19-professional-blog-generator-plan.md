# Professional Blog Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack AI blog generator with a Next.js wizard UI and Python FastAPI backend that orchestrates web search → deep research → LLM article generation → SEO-tagged file output across 5 content themes.

**Architecture:** Next.js frontend communicates with FastAPI via REST + SSE. FastAPI enqueues article generation jobs to arq/Redis workers. Workers execute a 4-step pipeline (Topic Discovery → Deep Research → Article Generate → Save & SEO) using configurable LLM and Search providers. Theme configs and system prompts live as YAML/MD files.

**Tech Stack:** Next.js 15 (App Router), FastAPI, arq + Redis, shadcn/ui + Tailwind CSS, 4 LLM providers (Claude/OpenAI/DeepSeek V4 Pro/Kimi K2), 2 Search providers (Brave/Tavily)

## Global Constraints

- Python 3.11+ required for backend
- Node.js 20+ required for frontend
- Redis 7+ required for job queue
- All output in professional English
- Article output to `/Users/hermanteng/Documents/Projects/2026/6_Jun/Blog-writing/`
- 5 themed output directories: Career_Articles, Linkedin_Articles, Blog_Articles, Revised_Articles, YouTube_Articles
- Forbidden AI phrases per theme config: "in today's fast-paced world", "delve into", "in conclusion", "crucial", "tapestry", "unlock your potential", "game-changer"
- Word counts per theme: theme-01 (1500-2000), theme-02 (2000-2500), theme-03 (1500-2500), theme-04 (1500-2500), theme-05 (1500-2500)
- SEO metadata included with every article: `<title>` (max 60 chars), `<meta description>` (max 160 chars), JSON-LD Article schema

---

## File Structure Map

```
professional-blog-generator/
├── backend/
│   ├── main.py                    # FastAPI app entry, CORS, SSE, route registration
│   ├── config.py                  # pydantic-settings, env loading
│   ├── requirements.txt           # Python dependencies
│   ├── prompts/
│   │   ├── themes/                # 5 YAML theme configs
│   │   │   ├── theme-01-career.yaml
│   │   │   ├── theme-02-tech.yaml
│   │   │   ├── theme-03-ai.yaml
│   │   │   ├── theme-04-rewrite.yaml
│   │   │   └── theme-05-video.yaml
│   │   └── system/                # 5 Markdown system prompt templates
│   │       ├── theme-01-system.md
│   │       ├── theme-02-system.md
│   │       ├── theme-03-system.md
│   │       ├── theme-04-system.md
│   │       └── theme-05-system.md
│   ├── pipeline/
│   │   ├── engine.py              # run_pipeline() orchestrator, progress emission
│   │   └── steps.py               # discover(), research(), generate(), save()
│   ├── search/
│   │   ├── base.py                # SearchProvider ABC, SearchResult dataclass
│   │   ├── brave_provider.py      # Brave Search API implementation
│   │   ├── tavily_provider.py     # Tavily API implementation
│   │   └── factory.py             # get_search_provider()
│   ├── llm/
│   │   ├── base.py                # LLMProvider ABC
│   │   ├── claude_provider.py     # Anthropic Claude implementation
│   │   ├── openai_provider.py     # OpenAI GPT implementation
│   │   ├── deepseek_provider.py   # DeepSeek V4 Pro implementation
│   │   ├── kimi_provider.py       # Kimi K2 implementation
│   │   └── factory.py             # get_llm_provider()
│   ├── output/
│   │   └── file_manager.py        # save_article(), list_articles(), read_article()
│   ├── jobs/
│   │   ├── queue.py               # arq queue initialization
│   │   └── worker.py              # generate_article_job() worker function
│   └── models/
│       └── schemas.py             # Pydantic models for all API types
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Wizard state machine (main page)
│   │   ├── layout.tsx             # Root layout with metadata
│   │   └── globals.css            # Tailwind imports
│   ├── components/
│   │   ├── wizard/
│   │   │   ├── ThemeSelector.tsx
│   │   │   ├── TopicDiscovery.tsx
│   │   │   ├── UrlInput.tsx
│   │   │   ├── GenerationProgress.tsx
│   │   │   └── ArticlePreview.tsx
│   │   └── ui/                    # shadcn/ui generated components
│   ├── lib/
│   │   ├── api-client.ts          # Fetch wrappers for all endpoints
│   │   ├── sse-client.ts          # SSE EventSource parser with callbacks
│   │   └── types.ts               # TypeScript interfaces matching backend schemas
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.ts
├── docker-compose.yml             # Redis + backend services
└── .env.example                   # Environment variable template
```

---

## Task 1: Backend Project Scaffolding & Configuration

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/config.py`
- Create: `backend/.env.example`

**Interfaces:**
- Produces: `Settings` class (pydantic-settings) with all env vars — consumed by all backend tasks

- [ ] **Step 1: Create requirements.txt**

```txt
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.10.0
pydantic-settings==2.7.0
arq==0.26.0
redis==5.2.0
httpx==0.28.0
anthropic==0.42.0
openai==1.58.0
pyyaml==6.0.2
python-frontmatter==1.1.0
jinja2==3.1.4
sse-starlette==2.2.1
```

- [ ] **Step 2: Install dependencies**

```bash
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

Expected: all packages install without errors.

- [ ] **Step 3: Create config.py**

```python
"""Application configuration via environment variables."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM
    llm_provider: str = "claude"  # claude | openai | deepseek | kimi
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    kimi_api_key: str = ""
    kimi_base_url: str = "https://api.moonshot.cn/v1"

    # Search
    search_provider: str = "brave"  # brave | tavily
    brave_api_key: str = ""
    tavily_api_key: str = ""

    # Output
    output_base_path: str = str(
        Path.home() / "Documents/Projects/2026/6_Jun/Blog-writing"
    )

    # Redis
    redis_url: str = "redis://localhost:6379"

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_origin: str = "http://localhost:3000"


settings = Settings()
```

- [ ] **Step 4: Create .env.example**

```
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
KIMI_API_KEY=sk-...

SEARCH_PROVIDER=brave
BRAVE_API_KEY=BSA...
TAVILY_API_KEY=tvly-...

OUTPUT_BASE_PATH=/Users/hermanteng/Documents/Projects/2026/6_Jun/Blog-writing
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 5: Verify config loads**

```bash
cd backend && python -c "from config import settings; print(settings.llm_provider)"
```

Expected: prints `claude`.

---

## Task 2: Pydantic Schemas

**Files:**
- Create: `backend/models/__init__.py`
- Create: `backend/models/schemas.py`

**Interfaces:**
- Produces: `ThemeConfig`, `Topic`, `ResearchDossier`, `ResearchAngle`, `SourceItem`, `GenerateRequest`, `JobStatus`, `ArticleResult`, `ArticleListItem`, `ArticleDetail` — consumed by pipeline steps, API routes, worker

- [ ] **Step 1: Create models/__init__.py**

```python
"""Data models for the blog generator."""
```

- [ ] **Step 2: Create models/schemas.py**

```python
"""Pydantic schemas for API requests, responses, and internal models."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Theme ──
class ThemeConfig(BaseModel):
    id: str
    name: str
    target_platforms: list[str]
    output_dir: str
    word_count_min: int
    word_count_max: int
    persona: str
    tone: str
    forbidden_phrases: list[str] = []
    topic_discovery_enabled: bool = True
    topic_discovery_queries: list[str] = []
    topic_discovery_result_count: int = 5
    seo_enabled: bool = True
    seo_include_jsonld: bool = True
    seo_max_title_chars: int = 60
    seo_max_meta_chars: int = 160
    model_preference: str = "claude"


# ── Topic Discovery ──
class Topic(BaseModel):
    title: str
    description: str
    pain_point: str
    traffic_potential: str  # "low" | "medium" | "high"
    source_urls: list[str] = []


# ── Research ──
class SourceItem(BaseModel):
    url: str
    title: str
    key_facts: list[str] = []
    quotes: list[str] = []


class ResearchAngle(BaseModel):
    query: str
    sources: list[SourceItem] = []


class ResearchDossier(BaseModel):
    angles: list[ResearchAngle] = []
    statistics: list[dict] = []  # [{"value": "...", "source_url": "..."}]
    expert_viewpoints: list[dict] = []  # [{"expert": "...", "opinion": "...", "source_url": "..."}]
    raw_text: str = ""  # For themes 4-5: source content dumped here


# ── Generation ──
class GenerateRequest(BaseModel):
    theme_id: str
    topics: list[str] = []          # Themes 1-3: selected topic titles
    source_url: str | None = None   # Themes 4-5: article/video URL


class JobStatus(BaseModel):
    job_id: str
    status: str  # "queued" | "running" | "completed" | "failed"
    progress_pct: int = 0
    current_step: str | None = None
    message: str | None = None
    result: Optional["ArticleResult"] = None
    error: str | None = None
    created_at: datetime = Field(default_factory=datetime.now)


class ArticleResult(BaseModel):
    filename: str
    file_path: str
    title: str
    word_count: int
    theme_id: str
    generated_at: datetime = Field(default_factory=datetime.now)


# ── Articles ──
class ArticleListItem(BaseModel):
    filename: str
    theme_id: str
    title: str
    word_count: int
    generated_at: datetime


class ArticleDetail(BaseModel):
    filename: str
    content: str
    title_tag: str | None = None
    meta_description: str | None = None
    json_ld: str | None = None
    theme_id: str
    word_count: int
    generated_at: datetime


class ArticleUpdate(BaseModel):
    content: str
```

- [ ] **Step 3: Verify schemas import**

```bash
cd backend && python -c "from models.schemas import ThemeConfig, Topic, GenerateRequest; print('OK')"
```

Expected: prints `OK`.

---

## Task 3: Theme Config Files (5 YAMLs)

**Files:**
- Create: `backend/prompts/themes/theme-01-career.yaml`
- Create: `backend/prompts/themes/theme-02-tech.yaml`
- Create: `backend/prompts/themes/theme-03-ai.yaml`
- Create: `backend/prompts/themes/theme-04-rewrite.yaml`
- Create: `backend/prompts/themes/theme-05-video.yaml`

**Interfaces:**
- Produces: 5 YAML files matching `ThemeConfig` schema — consumed by prompt manager, pipeline engine

- [ ] **Step 1: Create theme-01-career.yaml**

```yaml
id: "theme-01"
name: "Career & Job Search Articles"
target_platforms: ["careerinsightlabs.com"]
output_dir: "Career_Articles"
word_count_min: 1500
word_count_max: 2000
persona: "Senior Tech Recruiter at a North American FAANG company with 12+ years of experience screening thousands of resumes"
tone: "sharp, professional, data-driven, slightly contrarian to industry myths"
forbidden_phrases:
  - "in today's fast-paced world"
  - "delve into"
  - "in conclusion"
  - "crucial"
  - "tapestry"
  - "unlock your potential"
  - "game-changer"
topic_discovery_enabled: true
topic_discovery_queries:
  - "2026 tech job market trends hiring"
  - "ATS resume optimization best practices 2026"
  - "tech interview preparation strategies 2026"
  - "career advancement software engineering 2026"
  - "tech salary negotiation tips 2026"
topic_discovery_result_count: 5
seo_enabled: true
seo_include_jsonld: true
seo_max_title_chars: 60
seo_max_meta_chars: 160
model_preference: "claude"
```

- [ ] **Step 2: Create theme-02-tech.yaml**

```yaml
id: "theme-02"
name: "Professional Technology Articles"
target_platforms: ["LinkedIn", "personal professional blog"]
output_dir: "Linkedin_Articles"
word_count_min: 2000
word_count_max: 2500
persona: "Senior Data & IT Architect in the financial banking industry with 15+ years designing mission-critical systems"
tone: "authoritative, technically deep, pragmatic, grounded in real banking IT experience"
forbidden_phrases:
  - "in today's fast-paced world"
  - "delve into"
  - "in conclusion"
  - "crucial"
  - "tapestry"
  - "unlock your potential"
  - "game-changer"
  - "disruptive"
  - "revolutionary"
topic_discovery_enabled: true
topic_discovery_queries:
  - "financial services IT infrastructure modernization 2026"
  - "data engineering banking regulatory compliance"
  - "cloud migration financial sector best practices"
  - "cybersecurity banking IT 2026"
  - "fintech technology stack architecture"
topic_discovery_result_count: 5
seo_enabled: true
seo_include_jsonld: true
seo_max_title_chars: 60
seo_max_meta_chars: 160
model_preference: "claude"
```

- [ ] **Step 3: Create theme-03-ai.yaml**

```yaml
id: "theme-03"
name: "AI Application Technology Articles"
target_platforms: ["LinkedIn", "personal professional blog"]
output_dir: "Blog_Articles"
word_count_min: 1500
word_count_max: 2500
persona: "AI/ML practitioner and technology strategist who builds production AI systems, not just demos"
tone: "balanced, technically honest, cuts through AI hype, practical implementation focus"
forbidden_phrases:
  - "in today's fast-paced world"
  - "delve into"
  - "in conclusion"
  - "crucial"
  - "tapestry"
  - "unlock your potential"
  - "game-changer"
  - "AI revolution"
  - "transformative power of AI"
topic_discovery_enabled: true
topic_discovery_queries:
  - "AI agents production deployment 2026"
  - "LLM application development best practices"
  - "RAG architecture enterprise implementation"
  - "AI coding assistants productivity impact 2026"
  - "machine learning MLOps financial services"
topic_discovery_result_count: 5
seo_enabled: true
seo_include_jsonld: true
seo_max_title_chars: 60
seo_max_meta_chars: 160
model_preference: "claude"
```

- [ ] **Step 4: Create theme-04-rewrite.yaml**

```yaml
id: "theme-04"
name: "Revised External Articles"
target_platforms: ["careerinsightlabs.com", "LinkedIn", "personal professional blog"]
output_dir: "Revised_Articles"
word_count_min: 1500
word_count_max: 2500
persona: "Thoughtful technology commentator who adds depth, context, and contrarian perspectives to existing discourse"
tone: "analytical, opinionated, builds on source material with original insights, respectful but not deferential"
forbidden_phrases:
  - "in today's fast-paced world"
  - "delve into"
  - "in conclusion"
  - "crucial"
  - "tapestry"
  - "unlock your potential"
  - "game-changer"
topic_discovery_enabled: false
topic_discovery_queries: []
topic_discovery_result_count: 0
seo_enabled: true
seo_include_jsonld: true
seo_max_title_chars: 60
seo_max_meta_chars: 160
model_preference: "claude"
```

- [ ] **Step 5: Create theme-05-video.yaml**

```yaml
id: "theme-05"
name: "Tech Video Summaries"
target_platforms: ["Obsidian personal knowledge base"]
output_dir: "YouTube_Articles"
word_count_min: 1500
word_count_max: 2500
persona: "Technical knowledge curator who distills video content into structured, referenceable written form with added context and critique"
tone: "structured, comprehensive, faithful to source but adds technical depth, educational"
forbidden_phrases:
  - "in today's fast-paced world"
  - "delve into"
  - "in conclusion"
  - "crucial"
  - "tapestry"
topic_discovery_enabled: false
topic_discovery_queries: []
topic_discovery_result_count: 0
seo_enabled: false
seo_include_jsonld: false
seo_max_title_chars: 60
seo_max_meta_chars: 160
model_preference: "claude"
```

- [ ] **Step 6: Verify YAMLs parse**

```bash
cd backend && python -c "
import yaml
from pathlib import Path
for f in Path('prompts/themes').glob('*.yaml'):
    with open(f) as fh:
        data = yaml.safe_load(fh)
        assert 'id' in data, f'{f}: missing id'
        print(f'{f.name}: OK ({data[\"id\"]})')
"
```

Expected: 5 lines of `OK` with theme IDs.

---

## Task 4: Prompt Manager

**Files:**
- Create: `backend/prompts/__init__.py`
- Create: `backend/prompts/manager.py`

**Interfaces:**
- Consumes: `Settings` from Task 1, `ThemeConfig` from Task 2, YAML theme files from Task 3
- Produces: `load_theme_config(theme_id: str) -> ThemeConfig`, `load_system_prompt(theme_id: str) -> str`, `render_prompt(template: str, context: dict) -> str` — consumed by pipeline engine (Task 11)

- [ ] **Step 1: Create prompts/__init__.py**

```python
"""Prompt management — load and render theme configs and system prompts."""
```

- [ ] **Step 2: Create prompts/manager.py**

```python
"""Load theme YAML configs and system prompt Markdown templates."""
from pathlib import Path

import yaml
from jinja2 import Template

from models.schemas import ThemeConfig

PROMPTS_DIR = Path(__file__).parent


def load_theme_config(theme_id: str) -> ThemeConfig:
    """Load a theme YAML config by ID and return a validated ThemeConfig."""
    config_path = PROMPTS_DIR / "themes" / f"{theme_id}.yaml"
    if not config_path.exists():
        raise FileNotFoundError(f"Theme config not found: {config_path}")

    with open(config_path) as f:
        raw = yaml.safe_load(f)
    raw["word_count_min"] = raw.pop("word_count_min", raw.get("word_count_min", 1500))
    raw["word_count_max"] = raw.pop("word_count_max", raw.get("word_count_max", 2500))
    raw["topic_discovery_enabled"] = raw.pop("topic_discovery_enabled", True)
    raw["topic_discovery_queries"] = raw.pop("topic_discovery_queries", [])
    raw["topic_discovery_result_count"] = raw.pop("topic_discovery_result_count", 5)
    raw["seo_enabled"] = raw.pop("seo_enabled", True)
    raw["seo_include_jsonld"] = raw.pop("seo_include_jsonld", True)
    raw["seo_max_title_chars"] = raw.pop("seo_max_title_chars", 60)
    raw["seo_max_meta_chars"] = raw.pop("seo_max_meta_chars", 160)
    raw["model_preference"] = raw.pop("model_preference", "claude")
    return ThemeConfig(**raw)


def load_system_prompt(theme_id: str) -> str:
    """Load the raw system prompt Markdown template for a theme."""
    prompt_path = PROMPTS_DIR / "system" / f"{theme_id}-system.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"System prompt not found: {prompt_path}")

    with open(prompt_path) as f:
        return f.read()


def render_prompt(template_str: str, context: dict) -> str:
    """Render a Jinja2 template string with the given context variables."""
    template = Template(template_str)
    return template.render(**context)


def list_themes() -> list[dict]:
    """List all available themes with basic metadata (no full config)."""
    themes = []
    for config_path in sorted(PROMPTS_DIR.glob("themes/theme-*.yaml")):
        with open(config_path) as f:
            raw = yaml.safe_load(f)
        themes.append({
            "id": raw["id"],
            "name": raw["name"],
            "target_platforms": raw.get("target_platforms", []),
            "output_dir": raw.get("output_dir", ""),
            "topic_discovery_enabled": raw.get("topic_discovery_enabled", True),
        })
    return themes
```

- [ ] **Step 3: Verify prompt manager loads themes**

```bash
cd backend && python -c "
from prompts.manager import load_theme_config, list_themes
themes = list_themes()
print(f'Found {len(themes)} themes:')
for t in themes:
    print(f'  {t[\"id\"]}: {t[\"name\"]}')
config = load_theme_config('theme-01')
print(f'Theme-01 persona: {config.persona[:50]}...')
"
```

Expected: 5 themes listed, theme-01 persona printed.

---

## Task 5: LLM Provider Abstraction + Factory

**Files:**
- Create: `backend/llm/__init__.py`
- Create: `backend/llm/base.py`
- Create: `backend/llm/factory.py`

**Interfaces:**
- Consumes: `Settings` from Task 1
- Produces: `LLMProvider` ABC, `get_llm_provider(name: str | None = None) -> LLMProvider` — consumed by all provider implementations and pipeline steps

- [ ] **Step 1: Create llm/__init__.py**

```python
"""Multi-provider LLM abstraction layer."""
```

- [ ] **Step 2: Create llm/base.py**

```python
"""Abstract base class for LLM providers."""
from abc import ABC, abstractmethod
from typing import Callable, Awaitable


class LLMProvider(ABC):
    """Interface that all LLM providers must implement."""

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream_callback: Callable[[str], Awaitable[None]] | None = None,
    ) -> str:
        """Generate a completion. If stream_callback is provided, call it with each
        incremental text chunk. Returns the full response text."""
        ...
```

- [ ] **Step 3: Create llm/factory.py**

```python
"""LLM provider factory — resolves provider name to implementation."""
from config import settings
from llm.base import LLMProvider


def get_llm_provider(name: str | None = None) -> LLMProvider:
    """Return the configured LLM provider instance.

    Args:
        name: Provider name override. If None, uses settings.llm_provider.
              Valid: "claude", "openai", "deepseek", "kimi"
    """
    provider_name = (name or settings.llm_provider).lower()

    if provider_name == "claude":
        from llm.claude_provider import ClaudeProvider
        return ClaudeProvider()
    elif provider_name == "openai":
        from llm.openai_provider import OpenAIProvider
        return OpenAIProvider()
    elif provider_name == "deepseek":
        from llm.deepseek_provider import DeepSeekProvider
        return DeepSeekProvider()
    elif provider_name == "kimi":
        from llm.kimi_provider import KimiProvider
        return KimiProvider()
    else:
        raise ValueError(
            f"Unknown LLM provider: {provider_name}. "
            f"Valid options: claude, openai, deepseek, kimi"
        )
```

- [ ] **Step 4: Verify factory resolves (will fail on missing providers — expected)**

```bash
cd backend && python -c "
from llm.factory import get_llm_provider
try:
    p = get_llm_provider('claude')
    print(f'Provider type: {type(p).__name__}')
except ImportError as e:
    print(f'Expected (provider not built yet): {e}')
"
```

Expected: ImportError about missing ClaudeProvider (built in next task).

---

## Task 6: Claude + OpenAI + DeepSeek + Kimi Providers

**Files:**
- Create: `backend/llm/claude_provider.py`
- Create: `backend/llm/openai_provider.py`
- Create: `backend/llm/deepseek_provider.py`
- Create: `backend/llm/kimi_provider.py`

**Interfaces:**
- Consumes: `LLMProvider` ABC from Task 5, `Settings` from Task 1
- Produces: 4 concrete provider classes — consumed by factory

- [ ] **Step 1: Create llm/claude_provider.py**

```python
"""Anthropic Claude provider implementation."""
from typing import Callable, Awaitable

from anthropic import AsyncAnthropic

from config import settings
from llm.base import LLMProvider


class ClaudeProvider(LLMProvider):
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream_callback: Callable[[str], Awaitable[None]] | None = None,
    ) -> str:
        if stream_callback:
            full_text = ""
            async with self.client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                async for event in stream:
                    if event.type == "text":
                        full_text += event.text
                        await stream_callback(event.text)
            return full_text
        else:
            response = await self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return response.content[0].text
```

- [ ] **Step 2: Create llm/openai_provider.py**

```python
"""OpenAI GPT provider implementation."""
from typing import Callable, Awaitable

from openai import AsyncOpenAI

from config import settings
from llm.base import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream_callback: Callable[[str], Awaitable[None]] | None = None,
    ) -> str:
        if stream_callback:
            full_text = ""
            stream = await self.client.chat.completions.create(
                model="gpt-4o",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_text += text
                    await stream_callback(text)
            return full_text
        else:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content
```

- [ ] **Step 3: Create llm/deepseek_provider.py**

```python
"""DeepSeek V4 Pro provider implementation (OpenAI-compatible API)."""
from typing import Callable, Awaitable

from openai import AsyncOpenAI

from config import settings
from llm.base import LLMProvider


class DeepSeekProvider(LLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream_callback: Callable[[str], Awaitable[None]] | None = None,
    ) -> str:
        if stream_callback:
            full_text = ""
            stream = await self.client.chat.completions.create(
                model="deepseek-v4-pro",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_text += text
                    await stream_callback(text)
            return full_text
        else:
            response = await self.client.chat.completions.create(
                model="deepseek-v4-pro",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content
```

- [ ] **Step 4: Create llm/kimi_provider.py**

```python
"""Kimi K2 provider implementation (OpenAI-compatible API via Moonshot)."""
from typing import Callable, Awaitable

from openai import AsyncOpenAI

from config import settings
from llm.base import LLMProvider


class KimiProvider(LLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.kimi_api_key,
            base_url=settings.kimi_base_url,
        )

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream_callback: Callable[[str], Awaitable[None]] | None = None,
    ) -> str:
        if stream_callback:
            full_text = ""
            stream = await self.client.chat.completions.create(
                model="kimi-k2",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_text += text
                    await stream_callback(text)
            return full_text
        else:
            response = await self.client.chat.completions.create(
                model="kimi-k2",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content
```

- [ ] **Step 5: Verify factory resolves all providers**

```bash
cd backend && python -c "
from llm.factory import get_llm_provider
for name in ['claude', 'openai', 'deepseek', 'kimi']:
    p = get_llm_provider(name)
    print(f'{name}: {type(p).__name__}')
"
```

Expected: 4 provider class names printed. (Actual API calls will fail without keys — that's fine at this stage.)

---

## Task 7: Search Provider Abstraction + Factory + Implementations

**Files:**
- Create: `backend/search/__init__.py`
- Create: `backend/search/base.py`
- Create: `backend/search/factory.py`
- Create: `backend/search/brave_provider.py`
- Create: `backend/search/tavily_provider.py`

**Interfaces:**
- Consumes: `Settings` from Task 1
- Produces: `SearchProvider` ABC, `SearchResult` dataclass, `get_search_provider()` + 2 implementations — consumed by pipeline steps

- [ ] **Step 1: Create search/__init__.py**

```python
"""Multi-provider search abstraction layer."""
```

- [ ] **Step 2: Create search/base.py**

```python
"""Abstract base class for search providers."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    published_date: str | None = None
    source_domain: str | None = None


class SearchProvider(ABC):
    """Interface that all search providers must implement."""

    @abstractmethod
    async def search(
        self,
        query: str,
        max_results: int = 10,
        site_filter: str | None = None,
    ) -> list[SearchResult]:
        """Execute a web search and return structured results."""
        ...

    @abstractmethod
    async def fetch_url(self, url: str) -> str:
        """Fetch and return the text content of a URL."""
        ...
```

- [ ] **Step 3: Create search/brave_provider.py**

```python
"""Brave Search API provider."""
import httpx

from config import settings
from search.base import SearchProvider, SearchResult


class BraveSearchProvider(SearchProvider):
    BASE_URL = "https://api.search.brave.com/res/v1/web/search"

    def __init__(self):
        self.api_key = settings.brave_api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search(
        self,
        query: str,
        max_results: int = 10,
        site_filter: str | None = None,
    ) -> list[SearchResult]:
        full_query = f"{query} site:{site_filter}" if site_filter else query
        response = await self.client.get(
            self.BASE_URL,
            params={"q": full_query, "count": max_results},
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": self.api_key,
            },
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("web", {}).get("results", []):
            results.append(SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=item.get("description", ""),
                published_date=item.get("age"),
                source_domain=item.get("profile", {}).get("name"),
            ))
        return results[:max_results]

    async def fetch_url(self, url: str) -> str:
        response = await self.client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.text
```

- [ ] **Step 4: Create search/tavily_provider.py**

```python
"""Tavily Search API provider."""
import httpx

from config import settings
from search.base import SearchProvider, SearchResult


class TavilySearchProvider(SearchProvider):
    BASE_URL = "https://api.tavily.com/search"

    def __init__(self):
        self.api_key = settings.tavily_api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search(
        self,
        query: str,
        max_results: int = 10,
        site_filter: str | None = None,
    ) -> list[SearchResult]:
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
        }
        if site_filter:
            payload["include_domains"] = [site_filter]

        response = await self.client.post(self.BASE_URL, json=payload)
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("results", []):
            results.append(SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=item.get("content", ""),
                published_date=None,
                source_domain=None,
            ))
        return results[:max_results]

    async def fetch_url(self, url: str) -> str:
        response = await self.client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.text
```

- [ ] **Step 5: Create search/factory.py**

```python
"""Search provider factory — resolves provider name to implementation."""
from config import settings
from search.base import SearchProvider


def get_search_provider(name: str | None = None) -> SearchProvider:
    """Return the configured search provider instance.

    Args:
        name: Provider name override. If None, uses settings.search_provider.
              Valid: "brave", "tavily"
    """
    provider_name = (name or settings.search_provider).lower()

    if provider_name == "brave":
        from search.brave_provider import BraveSearchProvider
        return BraveSearchProvider()
    elif provider_name == "tavily":
        from search.tavily_provider import TavilySearchProvider
        return TavilySearchProvider()
    else:
        raise ValueError(
            f"Unknown search provider: {provider_name}. "
            f"Valid options: brave, tavily"
        )
```

- [ ] **Step 6: Verify search factory resolves**

```bash
cd backend && python -c "
from search.factory import get_search_provider
for name in ['brave', 'tavily']:
    p = get_search_provider(name)
    print(f'{name}: {type(p).__name__}')
"
```

Expected: 2 search provider class names printed.

---

## Task 8: Output File Manager

**Files:**
- Create: `backend/output/__init__.py`
- Create: `backend/output/file_manager.py`

**Interfaces:**
- Consumes: `Settings` from Task 1, `ArticleResult`, `ArticleListItem`, `ArticleDetail` from Task 2
- Produces: `save_article(...) -> ArticleResult`, `list_articles(theme_id: str | None) -> list[ArticleListItem]`, `read_article(filename: str) -> ArticleDetail`, `update_article(filename: str, content: str) -> None` — consumed by pipeline step 4 and API routes

- [ ] **Step 1: Create output/__init__.py**

```python
"""File-based article output management."""
```

- [ ] **Step 2: Create output/file_manager.py**

```python
"""Save, list, read, and update generated articles on disk."""
import re
import os
from datetime import datetime, timezone
from pathlib import Path

import frontmatter

from config import settings
from models.schemas import ArticleResult, ArticleListItem, ArticleDetail


def _slugify(title: str) -> str:
    """Convert a title to a filesystem-safe slug."""
    slug = re.sub(r"[^\w\s-]", "", title)
    slug = re.sub(r"[\s_]+", "-", slug)
    return slug.strip("-")[:80]


def _get_next_number(output_dir: Path) -> int:
    """Get the next sequential number for a filename in the directory."""
    output_dir.mkdir(parents=True, exist_ok=True)
    existing = list(output_dir.glob("*.md"))
    numbers = []
    for f in existing:
        match = re.match(r"(\d+)", f.name)
        if match:
            numbers.append(int(match.group(1)))
    return max(numbers) + 1 if numbers else 1


def save_article(
    content: str,
    title: str,
    theme_id: str,
    output_dir_name: str,
    title_tag: str | None = None,
    meta_description: str | None = None,
    json_ld: str | None = None,
) -> ArticleResult:
    """Save a generated article to disk with SEO frontmatter."""
    base = Path(settings.output_base_path)
    output_dir = base / output_dir_name
    output_dir.mkdir(parents=True, exist_ok=True)

    num = _get_next_number(output_dir)
    slug = _slugify(title)
    filename = f"{num:02d}-{slug}.md"
    file_path = output_dir / filename

    word_count = len(content.split())

    # Build frontmatter
    post = frontmatter.Post(
        content,
        title=title,
        theme_id=theme_id,
        word_count=word_count,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
    if title_tag:
        post["title_tag"] = title_tag
    if meta_description:
        post["meta_description"] = meta_description
    if json_ld:
        post["json_ld"] = json_ld

    file_path.write_text(frontmatter.dumps(post), encoding="utf-8")

    return ArticleResult(
        filename=filename,
        file_path=str(file_path),
        title=title,
        word_count=word_count,
        theme_id=theme_id,
        generated_at=datetime.now(timezone.utc),
    )


def list_articles(theme_id: str | None = None) -> list[ArticleListItem]:
    """List all generated articles, optionally filtered by theme_id."""
    base = Path(settings.output_base_path)
    articles = []

    if theme_id:
        # Look up output_dir from theme
        from prompts.manager import load_theme_config
        config = load_theme_config(theme_id)
        dirs = [config.output_dir]
    else:
        dirs = [d.name for d in base.iterdir() if d.is_dir()]

    for dir_name in dirs:
        dir_path = base / dir_name
        if not dir_path.exists():
            continue
        for md_file in sorted(dir_path.glob("*.md"), reverse=True):
            try:
                post = frontmatter.load(str(md_file))
                articles.append(ArticleListItem(
                    filename=md_file.name,
                    theme_id=post.get("theme_id", dir_name),
                    title=post.get("title", md_file.stem),
                    word_count=post.get("word_count", 0),
                    generated_at=post.get("generated_at", datetime.now(timezone.utc)),
                ))
            except Exception:
                continue

    return sorted(articles, key=lambda a: a.generated_at, reverse=True)


def read_article(filename: str) -> ArticleDetail:
    """Read a full article by filename, searching all output directories."""
    base = Path(settings.output_base_path)
    for dir_path in base.iterdir():
        if not dir_path.is_dir():
            continue
        file_path = dir_path / filename
        if file_path.exists():
            post = frontmatter.load(str(file_path))
            return ArticleDetail(
                filename=filename,
                content=post.content,
                title_tag=post.get("title_tag"),
                meta_description=post.get("meta_description"),
                json_ld=post.get("json_ld"),
                theme_id=post.get("theme_id", dir_path.name),
                word_count=post.get("word_count", 0),
                generated_at=post.get(
                    "generated_at",
                    datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc),
                ),
            )
    raise FileNotFoundError(f"Article not found: {filename}")


def update_article(filename: str, content: str) -> None:
    """Update an existing article's content in place."""
    base = Path(settings.output_base_path)
    for dir_path in base.iterdir():
        if not dir_path.is_dir():
            continue
        file_path = dir_path / filename
        if file_path.exists():
            post = frontmatter.load(str(file_path))
            post.content = content
            post["word_count"] = len(content.split())
            file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
            return
    raise FileNotFoundError(f"Article not found: {filename}")
```

- [ ] **Step 3: Verify file manager functions import**

```bash
cd backend && python -c "
from output.file_manager import save_article, list_articles, read_article, update_article, _slugify, _get_next_number
print(f'slug test: {_slugify(\"2026 ATS Algorithm: Semantic Understanding!\")}') 
print('All functions imported OK')
"
```

Expected: slug printed + "All functions imported OK".

---

## Task 9: Pipeline Steps

**Files:**
- Create: `backend/pipeline/__init__.py`
- Create: `backend/pipeline/steps.py`

**Interfaces:**
- Consumes: `ThemeConfig`, `Topic`, `ResearchDossier` from Task 2; `load_theme_config()`, `load_system_prompt()`, `render_prompt()` from Task 4; `get_llm_provider()` from Task 5; `get_search_provider()` from Task 7
- Produces: `discover_topics(theme_config) -> list[Topic]`, `deep_research(topic_title, theme_config) -> ResearchDossier`, `generate_article(dossier, theme_config, stream_cb) -> tuple[str, str, str, str]`, `save_article(content, title, theme_config) -> ArticleResult` — consumed by pipeline engine (Task 10)

- [ ] **Step 1: Create pipeline/__init__.py**

```python
"""4-step article generation pipeline."""
```

- [ ] **Step 2: Create pipeline/steps.py**

```python
"""Individual pipeline step implementations."""
import json
import re

from llm.factory import get_llm_provider
from search.factory import get_search_provider
from prompts.manager import load_system_prompt, render_prompt
from models.schemas import Topic, ResearchDossier, ResearchAngle, SourceItem


async def discover_topics(theme_config) -> list[Topic]:
    """Step 1: Search for trending topics and enrich with LLM analysis."""
    search = get_search_provider()
    llm = get_llm_provider()

    all_results = []
    seen_urls = set()
    for query in theme_config.topic_discovery_queries:
        results = await search.search(query, max_results=10)
        for r in results:
            if r.url not in seen_urls:
                seen_urls.add(r.url)
                all_results.append(r)

    # Deduplicate and take top candidates
    all_results = all_results[:15]

    # Use LLM to extract and rank topics
    items_text = "\n".join(
        f"- {r.title}: {r.snippet}" for r in all_results
    )
    analysis_prompt = f"""Analyze these search results about "{theme_config.name}". 

Extract exactly 5 distinct trending topics. For each topic provide:
1. A compelling title
2. A 2-sentence description
3. The target audience's pain point
4. Traffic potential: "low", "medium", or "high"

Search results:
{items_text}

Return valid JSON array of objects with keys: title, description, pain_point, traffic_potential, source_urls (array of relevant URLs from above).
Output ONLY the JSON array, no other text."""

    response = await llm.generate(
        system_prompt="You are a content strategist. Output only valid JSON. No markdown fences.",
        user_prompt=analysis_prompt,
        temperature=0.3,
    )

    # Parse JSON from response
    json_match = re.search(r"\[.*\]", response, re.DOTALL)
    if json_match:
        topics_data = json.loads(json_match.group(0))
    else:
        topics_data = json.loads(response)

    topics = []
    for t in topics_data[:theme_config.topic_discovery_result_count]:
        topics.append(Topic(
            title=t.get("title", ""),
            description=t.get("description", ""),
            pain_point=t.get("pain_point", ""),
            traffic_potential=t.get("traffic_potential", "medium"),
            source_urls=t.get("source_urls", []),
        ))
    return topics


async def deep_research(topic_title: str, theme_config) -> ResearchDossier:
    """Step 2: Deep-dive research on a single topic."""
    llm = get_llm_provider()
    search = get_search_provider()

    # Decompose topic into research angles
    angle_prompt = f"""Decompose this topic into 4 distinct research angles:
Topic: "{topic_title}"
Theme: {theme_config.name}

For each angle, write a specific search query that would find authoritative sources.
Return valid JSON array of strings (the search queries). Output ONLY JSON array."""

    response = await llm.generate(
        system_prompt="You are a research librarian. Output only valid JSON array.",
        user_prompt=angle_prompt,
        temperature=0.3,
    )
    json_match = re.search(r"\[.*\]", response, re.DOTALL)
    queries = json.loads(json_match.group(0)) if json_match else json.loads(response)

    # Search each angle
    angles = []
    all_stats = []
    all_viewpoints = []
    for query in queries[:4]:
        results = await search.search(query, max_results=3)
        sources = []
        for r in results:
            sources.append(SourceItem(
                url=r.url,
                title=r.title,
                key_facts=[r.snippet],
            ))
        angles.append(ResearchAngle(query=query, sources=sources))

    # Fetch top article content for richer context
    all_sources = []
    for angle in angles:
        for src in angle.sources:
            all_sources.append(src)

    raw_text_parts = []
    for src in all_sources[:4]:  # Fetch top 4 to avoid excessive latency
        try:
            html = await search.fetch_url(src.url)
            # Simple text extraction: take first 3000 chars
            text = html[:3000]
            raw_text_parts.append(f"Source: {src.title}\n{text}\n")
        except Exception:
            raw_text_parts.append(f"Source: {src.title}\n{src.key_facts[0] if src.key_facts else ''}\n")

    # Extract key facts and statistics via LLM
    extract_prompt = f"""Extract from these sources about "{topic_title}":
1. Up to 5 key statistics or data points (with source URL for each)
2. Up to 3 notable expert opinions or quotes (with expert name and source URL)

Sources:
{"".join(raw_text_parts)[:8000]}

Return valid JSON: {{"statistics": [{{"value": "...", "source_url": "..."}}], "expert_viewpoints": [{{"expert": "...", "opinion": "...", "source_url": "..."}}]}}
Output ONLY JSON, no other text."""

    response = await llm.generate(
        system_prompt="You extract structured data from articles. Output only valid JSON.",
        user_prompt=extract_prompt,
        temperature=0.2,
    )
    json_match = re.search(r"\{.*\}", response, re.DOTALL)
    extracted = json.loads(json_match.group(0)) if json_match else {"statistics": [], "expert_viewpoints": []}

    return ResearchDossier(
        angles=angles,
        statistics=extracted.get("statistics", []),
        expert_viewpoints=extracted.get("expert_viewpoints", []),
        raw_text="\n".join(raw_text_parts),
    )


async def generate_article(
    dossier: ResearchDossier,
    theme_config,
    stream_callback=None,
) -> tuple[str, str, str, str]:
    """Step 3: Generate the article using the LLM with research dossier injected."""
    llm = get_llm_provider(theme_config.model_preference)

    # Build research context string
    research_context = _format_dossier(dossier)

    # Load and render system prompt
    system_template = load_system_prompt(theme_config.id)
    system_prompt = render_prompt(system_template, {
        "persona": theme_config.persona,
        "target_platforms": ", ".join(theme_config.target_platforms),
        "word_count_min": theme_config.word_count_min,
        "word_count_max": theme_config.word_count_max,
        "tone": theme_config.tone,
        "forbidden_phrases": ", ".join(f'"{p}"' for p in theme_config.forbidden_phrases),
        "research_dossier": research_context,
        "seo_max_title": theme_config.seo_max_title_chars,
        "seo_max_meta": theme_config.seo_max_meta_chars,
    })

    user_prompt = f"""Write a professional blog article based on the research dossier above.
Target word count: {theme_config.word_count_min}-{theme_config.word_count_max} words.
Follow the structure and rules in the system prompt exactly."""

    full_text = await llm.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=min(theme_config.word_count_max * 3, 16000),
        temperature=0.75,
        stream_callback=stream_callback,
    )

    # Parse SEO metadata from the output
    title_tag = _extract_meta(full_text, r"<title>(.*?)</title>")
    meta_desc = _extract_meta(full_text, r'<meta\s+description[^>]*content="([^"]*)"')
    json_ld = _extract_jsonld(full_text)

    return full_text, title_tag or "", meta_desc or "", json_ld or ""


def _format_dossier(dossier: ResearchDossier) -> str:
    """Format research dossier as structured text for prompt injection."""
    lines = ["## Research Summary\n"]
    if dossier.statistics:
        lines.append("### Key Statistics")
        for stat in dossier.statistics:
            lines.append(f"- {stat['value']} (Source: {stat['source_url']})")
    if dossier.expert_viewpoints:
        lines.append("\n### Expert Viewpoints")
        for vp in dossier.expert_viewpoints:
            lines.append(f"- **{vp['expert']}**: {vp['opinion']} (Source: {vp['source_url']})")
    if dossier.angles:
        lines.append("\n### Research Angles Covered")
        for angle in dossier.angles:
            lines.append(f"- **{angle.query}**: {len(angle.sources)} sources found")
    lines.append(f"\n### Raw Research Notes\n{dossier.raw_text[:4000]}")
    return "\n".join(lines)


def _extract_meta(text: str, pattern: str) -> str | None:
    """Extract first match of a regex pattern from text."""
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else None


def _extract_jsonld(text: str) -> str | None:
    """Extract first JSON-LD script block from text."""
    match = re.search(
        r'<script\s+type="application/ld\+json"[^>]*>(.*?)</script>',
        text, re.IGNORECASE | re.DOTALL,
    )
    return match.group(1).strip() if match else None
```

**Note for themes 4-5:** The orchestrator (Task 10) handles the branching — for rewrite/video themes, it fetches the user-provided URL content and populates `dossier.raw_text` directly, skipping the topic discovery + angle-based research flow.

- [ ] **Step 3: Verify steps import**

```bash
cd backend && python -c "
from pipeline.steps import discover_topics, deep_research, generate_article, _format_dossier
print('All pipeline steps imported OK')
"
```

Expected: "All pipeline steps imported OK".

---

## Task 10: Pipeline Engine (Orchestrator)

**Files:**
- Create: `backend/pipeline/engine.py`

**Interfaces:**
- Consumes: `discover_topics()`, `deep_research()`, `generate_article()` from Task 9; `save_article()` from Task 8; `load_theme_config()` from Task 4
- Produces: `run_pipeline(theme_id, topics, source_url, progress_callback) -> list[ArticleResult]` — consumed by arq worker (Task 12)

- [ ] **Step 1: Create pipeline/engine.py**

```python
"""Pipeline orchestrator — strings the 4 steps together with progress reporting."""
import asyncio
from typing import Callable, Awaitable

from prompts.manager import load_theme_config
from pipeline.steps import discover_topics, deep_research, generate_article
from output.file_manager import save_article as save_to_disk
from models.schemas import ResearchDossier


async def run_pipeline(
    theme_id: str,
    topics: list[str],
    source_url: str | None = None,
    progress_callback: Callable[[str, str, int], Awaitable[None]] | None = None,
) -> list[dict]:
    """Execute the full 4-step pipeline for each topic.

    Args:
        theme_id: e.g., "theme-01"
        topics: List of topic titles to generate articles for
        source_url: For themes 4-5, the source article/video URL
        progress_callback: Async (step, message, pct) for SSE streaming

    Returns:
        List of dicts with result info for each generated article.
    """
    theme_config = load_theme_config(theme_id)
    results = []

    async def report(step: str, message: str, pct: int):
        if progress_callback:
            await progress_callback(step, message, pct)

    total = len(topics) if topics else 1
    for idx, topic in enumerate(topics):
        base_pct = int((idx / total) * 100)
        await report("search", f"Researching: {topic[:80]}...", base_pct + 5)

        # Branch: themes 4-5 skip topic discovery, use source URL directly
        if source_url:
            from search.factory import get_search_provider
            search = get_search_provider()
            try:
                raw_content = await search.fetch_url(source_url)
            except Exception:
                raw_content = f"Could not fetch {source_url}"

            dossier = ResearchDossier(
                angles=[],
                statistics=[],
                expert_viewpoints=[],
                raw_text=raw_content[:15000],
            )
            await report("research", f"Source content fetched: {len(raw_content)} chars", base_pct + 20)
        else:
            # Standard flow: deep research on the topic
            dossier = await deep_research(topic, theme_config)
            await report("research", f"Research complete: {len(dossier.angles)} angles, {len(dossier.statistics)} stats", base_pct + 25)

        # Step 3: Generate
        await report("generate", f"Writing article for: {topic[:80]}...", base_pct + 30)

        async def stream_cb(chunk: str):
            """Bridge: call progress callback per chunk. We batch updates to avoid flooding."""
            pass  # Per-chunk streaming is handled at the worker level

        full_text, title_tag, meta_desc, json_ld = await generate_article(
            dossier=dossier,
            theme_config=theme_config,
            stream_callback=None,  # Full response, non-streaming in pipeline
        )

        await report("generate", "Article draft complete", base_pct + 70)

        # Step 4: Save
        await report("save", "Saving article to disk...", base_pct + 80)

        # Extract H1 as title
        import re
        h1_match = re.search(r"^#\s+(.+)$", full_text, re.MULTILINE)
        article_title = h1_match.group(1) if h1_match else topic

        result = save_to_disk(
            content=full_text,
            title=article_title,
            theme_id=theme_id,
            output_dir_name=theme_config.output_dir,
            title_tag=title_tag,
            meta_description=meta_desc,
            json_ld=json_ld,
        )

        await report("complete", f"Saved: {result.filename}", base_pct + 95)

        results.append({
            "filename": result.filename,
            "file_path": result.file_path,
            "title": result.title,
            "word_count": result.word_count,
        })

    await report("done", f"All {len(results)} articles generated", 100)
    return results
```

- [ ] **Step 2: Verify engine imports**

```bash
cd backend && python -c "
from pipeline.engine import run_pipeline
print('Pipeline engine imported OK')
"
```

Expected: "Pipeline engine imported OK".

---

## Task 11: System Prompt Templates (5 Markdown files)

**Files:**
- Create: `backend/prompts/system/theme-01-system.md`
- Create: `backend/prompts/system/theme-02-system.md`
- Create: `backend/prompts/system/theme-03-system.md`
- Create: `backend/prompts/system/theme-04-system.md`
- Create: `backend/prompts/system/theme-05-system.md`

**Interfaces:**
- Consumes: Rendered by `render_prompt()` from Task 4 with theme config + research dossier
- Produces: Final system prompt string consumed by `generate_article()` in Task 9

- [ ] **Step 1: Create theme-01-system.md (Career & Job Search)**

```markdown
# Role: {{ persona }}

You are writing a professional SEO blog article for {{ target_platforms }}.

## Article Requirements
- **Word count**: {{ word_count_min }}-{{ word_count_max }} words
- **Language**: Professional English
- **Tone**: {{ tone }}

## Research Dossier
Use the following research as the factual foundation for the article. Reference statistics, data points, and expert opinions from this dossier. Do not fabricate data beyond what is provided here.

{{ research_dossier }}

## Writing Rules (MUST FOLLOW)
1. **Voice**: Adopt the voice of {{ persona }}. Write like an industry insider sharing hard-won knowledge.
2. **Banned phrases** — NEVER use: {{ forbidden_phrases }}
3. **Data-driven**: Anchor every claim in specific data, statistics, or examples from the research dossier
4. **Anti-fluff**: Every paragraph must deliver actionable value. Cut filler sentences
5. **Hook hard**: Open with a surprising statistic, contrarian take, or relatable pain point
6. **CTA**: End with one natural, non-salesy Call-to-Action relevant to the reader's career growth

## Article Structure
1. **H1**: SEO-optimized headline that includes the primary keyword and promises a clear benefit
2. **H2: The Reality Check** — Open with a surprising statistic, data point, or myth-busting statement that hooks the reader
3. **H2-H3: Deep Dive Analysis** — 2-4 sections analyzing the topic with data, examples, and expert perspectives from the research
4. **H2: Actionable Framework** — Provide a step-by-step approach, checklist, or framework readers can apply immediately
5. **H2: The Bigger Picture** — Connect the topic to broader career trends and what it means for the reader's trajectory
6. **H2: Conclusion + Next Steps** — Summarize key takeaways and include a natural CTA

## Output Format
- Write the full article in standard Markdown (H1, H2, H3, bold, bullet lists, blockquotes)
- After the article body, append the following SEO metadata blocks exactly:

```html
<title>Your SEO title here (max {{ seo_max_title }} chars)</title>
<meta name="description" content="Your meta description here (max {{ seo_max_meta }} chars)">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "description": "Article description",
  "author": {"@type": "Person", "name": "Author"},
  "datePublished": "2026-06-19"
}
</script>
```

Begin writing now.
```

- [ ] **Step 2: Create theme-02-system.md (Professional Tech Articles)**

```markdown
# Role: {{ persona }}

You are writing a professional technology article for {{ target_platforms }}.

## Article Requirements
- **Word count**: {{ word_count_min }}-{{ word_count_max }} words
- **Language**: Professional English
- **Tone**: {{ tone }}

## Research Dossier
Use the following research as the factual foundation. Ground every technical claim in data from this dossier.

{{ research_dossier }}

## Writing Rules (MUST FOLLOW)
1. **Voice**: Write as {{ persona }}. Draw from deep hands-on experience in financial banking IT
2. **Banned phrases** — NEVER use: {{ forbidden_phrases }}
3. **Technical depth**: Include specific technologies, architectures, and patterns. Name real tools (Snowflake, Kafka, Kubernetes, etc.) where relevant
4. **Industry context**: Frame everything within financial services — regulatory constraints, compliance (SOX, GDPR, PCI-DSS), risk management, audit trails
5. **War stories**: Where appropriate, include "from the trenches" insights — what actually works vs. what vendors claim
6. **CTA**: End with a discussion-provoking question or call for peer perspectives on LinkedIn

## Article Structure
1. **H1**: Technical headline that signals depth — include specific technologies or frameworks
2. **H2: The State of Play** — Current landscape in this area of financial/banking tech, with data
3. **H2-H3: Technical Deep Dive** — 3-4 sections of substantive technical analysis with architecture considerations, trade-offs, and implementation patterns
4. **H2: Case Study / Lessons Learned** — Concrete example or pattern distilled from real experience
5. **H2: Looking Ahead** — 2026-2027 trends and what practitioners should prepare for
6. **H2: Key Takeaways** — Bullet-point summary of actionable insights

## Output Format
- Standard Markdown
- Append SEO metadata (title tag, meta description, JSON-LD) after the article
```

- [ ] **Step 3: Create theme-03-system.md (AI Application Technology)**

```markdown
# Role: {{ persona }}

You are writing about applied AI technology for {{ target_platforms }}.

## Article Requirements
- **Word count**: {{ word_count_min }}-{{ word_count_max }} words
- **Language**: Professional English
- **Tone**: {{ tone }}

## Research Dossier
{{ research_dossier }}

## Writing Rules (MUST FOLLOW)
1. **Voice**: {{ persona }}. You build real AI systems in production — not demos, not blog posts about what might work. You know the difference between a cool prototype and a production system handling 100k requests/day
2. **Banned phrases** — NEVER use: {{ forbidden_phrases }}
3. **Honest trade-offs**: For every technique you discuss, mention limitations, failure modes, and when NOT to use it
4. **Code-aware**: Reference real libraries, frameworks (LangChain, LlamaIndex, vLLM, etc.) and patterns. Assume a technically literate audience
5. **Production lens**: Frame everything through MLOps, monitoring, cost, latency, and reliability — not just accuracy metrics
6. **CTA**: Invite practitioners to share their production experiences or counterpoints

## Article Structure
1. **H1**: Specific, technical headline — avoid generic "AI will change everything"
2. **H2: Why This Matters Now** — Specific trigger (new paper, release, trend) that makes this timely
3. **H2-H3: How It Actually Works** — Technical breakdown with architecture patterns
4. **H2: Production Reality Check** — What breaks, what costs look like, scaling challenges
5. **H2: Practical Implementation Guide** — Code-level patterns or decision framework
6. **H2: Bottom Line** — Who should adopt this, who should wait, and what to watch

## Output Format
- Standard Markdown with code blocks where appropriate
- Append SEO metadata after the article
```

- [ ] **Step 4: Create theme-04-system.md (Revise External Articles)**

```markdown
# Role: {{ persona }}

You are rewriting and expanding an external article with original analysis for {{ target_platforms }}.

## Article Requirements
- **Word count**: {{ word_count_min }}-{{ word_count_max }} words
- **Language**: Professional English
- **Tone**: {{ tone }}

## Source Article Content
Below is the content of the article you will revise. Read it carefully.

{{ research_dossier }}

## Writing Rules (MUST FOLLOW)
1. **Voice**: {{ persona }}. Engage with the source material critically — agree where it's right, push back where it's shallow, add depth where it's missing
2. **Banned phrases** — NEVER use: {{ forbidden_phrases }}
3. **Original contribution**: At least 40% of the article must be YOUR original analysis, critique, or extension — not just a reworded version
4. **Attribution**: Reference the original article early ("A recent piece by [Author] on [Platform] argues that..."), then build on it
5. **Value-add**: Add data the original missed, connect to adjacent topics, provide counterpoints, or offer a practitioner's reality check
6. **No plagiarism**: Never copy sentences verbatim. Synthesize and re-express ideas in your own professional voice

## Article Structure
1. **H1**: Original headline that incorporates your unique angle on the topic
2. **H2: The Original Argument** — Fair, accurate summary of what the source article claimed (1-2 paragraphs)
3. **H2: What They Got Right** — Acknowledge valid points with evidence
4. **H2: What's Missing / Where I Disagree** — Your original contribution — data, experience, or perspectives the source missed
5. **H2: The Deeper Context** — Connect this topic to broader industry trends
6. **H2: My Take** — Synthesis of your position with actionable recommendations

## Output Format
- Standard Markdown
- Append SEO metadata (title tag, meta description, JSON-LD)
```

- [ ] **Step 5: Create theme-05-system.md (Tech Video Summaries)**

```markdown
# Role: {{ persona }}

You are creating a structured, written knowledge base article from a technical video for personal reference in Obsidian.

## Article Requirements
- **Word count**: {{ word_count_min }}-{{ word_count_max }} words
- **Language**: Professional English
- **Tone**: {{ tone }}

## Video Content Transcript / Notes
{{ research_dossier }}

## Writing Rules (MUST FOLLOW)
1. **Voice**: {{ persona }}. You are distilling someone else's presentation into a referenceable, structured document. Be faithful to the source but organize it better than the original presenter
2. **Structure over flow**: This is a knowledge base entry, not a narrative essay. Prioritize scannability and reference value
3. **Add context**: Where the video glosses over a concept, add a brief explanation. Where a claim seems questionable, note it
4. **No AI fluff**: Be direct and factual. Banned phrases: {{ forbidden_phrases }}
5. **Linkable**: Use consistent headings so future you can link to specific sections from other notes

## Article Structure
1. **H1**: `# 📹 [Video Title / Topic]` — include the original creator and platform if known
2. **Metadata block** (after H1):
   - **Source**: [Link to video]
   - **Creator**: [Name / channel]
   - **Date Watched**: [Date]
   - **Tags**: #topic-tag1 #topic-tag2
3. **H2: Executive Summary** — 3-5 bullet points capturing the video's core message
4. **H2: Key Concepts** — For each major concept covered:
   - **H3: Concept Name**
   - Explanation, key quotes, timestamps ([MM:SS])
5. **H2: Technical Details** — Deep technical specifics, tools mentioned, architecture patterns shown
6. **H2: My Notes & Critiques** — Your reactions, connections to other knowledge, questions raised
7. **H2: Related Resources** — Links to papers, docs, or other videos mentioned

## Output Format
- Obsidian-compatible Markdown (use `[[wikilinks]]` for internal references where appropriate)
- Include YAML frontmatter with title, date, tags, source
```

- [ ] **Step 6: Verify all 5 system prompts load and render**

```bash
cd backend && python -c "
from prompts.manager import load_system_prompt, render_prompt
for theme_id in ['theme-01', 'theme-02', 'theme-03', 'theme-04', 'theme-05']:
    tmpl = load_system_prompt(theme_id)
    rendered = render_prompt(tmpl, {'persona': 'Test', 'target_platforms': 'Test', 'word_count_min': 100, 'word_count_max': 200, 'tone': 'Test', 'forbidden_phrases': 'test', 'research_dossier': 'Test dossier', 'seo_max_title': 60, 'seo_max_meta': 160})
    print(f'{theme_id}: {len(tmpl)} chars template → {len(rendered)} chars rendered')
"
```

Expected: 5 lines showing template and rendered char counts.

---

## Task 12: Job Queue + Worker

**Files:**
- Create: `backend/jobs/__init__.py`
- Create: `backend/jobs/queue.py`
- Create: `backend/jobs/worker.py`

**Interfaces:**
- Consumes: `Settings` from Task 1, `run_pipeline()` from Task 10, `JobStatus` from Task 2
- Produces: `enqueue_generation(request) -> str` (job_id), `get_job_status(job_id) -> JobStatus`, `generate_article_job(ctx, ...)` — consumed by API routes (Task 13)

- [ ] **Step 1: Create jobs/__init__.py**

```python
"""Job queue and worker for async article generation."""
```

- [ ] **Step 2: Create jobs/queue.py**

```python
"""arq job queue initialization and helpers."""
from arq import create_pool
from arq.connections import RedisSettings

from config import settings

# In-memory job store for status tracking (simpler than Redis for POC)
_job_store: dict[str, dict] = {}


def get_redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(settings.redis_url)


async def get_queue():
    """Create and return an arq pool connected to Redis."""
    return await create_pool(get_redis_settings())


def store_job(job_id: str, status_data: dict) -> None:
    """Store job status in memory."""
    _job_store[job_id] = status_data


def get_job(job_id: str) -> dict | None:
    """Retrieve job status from memory."""
    return _job_store.get(job_id)


def update_job(job_id: str, updates: dict) -> None:
    """Update job status fields."""
    if job_id in _job_store:
        _job_store[job_id].update(updates)
```

- [ ] **Step 3: Create jobs/worker.py**

```python
"""arq worker function for article generation jobs."""
import asyncio
from datetime import datetime, timezone

from pipeline.engine import run_pipeline
from jobs.queue import store_job, get_job, update_job


async def generate_article_job(ctx, theme_id: str, topics: list[str], source_url: str | None = None):
    """Worker function: execute the 4-step pipeline and update job status.

    This is the function enqueued by arq. It runs in a separate worker process.
    Progress is stored in the in-memory job store (polled by SSE endpoint).
    """
    job_id = ctx["job_id"]
    store_job(job_id, {
        "job_id": job_id,
        "status": "running",
        "progress_pct": 0,
        "current_step": "starting",
        "message": "Pipeline starting...",
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    try:
        async def progress_callback(step: str, message: str, pct: int):
            update_job(job_id, {
                "current_step": step,
                "message": message,
                "progress_pct": pct,
            })

        results = await run_pipeline(
            theme_id=theme_id,
            topics=topics,
            source_url=source_url,
            progress_callback=progress_callback,
        )

        update_job(job_id, {
            "status": "completed",
            "progress_pct": 100,
            "current_step": "done",
            "message": f"{len(results)} article(s) generated",
            "result": results,
        })

        return results

    except Exception as e:
        update_job(job_id, {
            "status": "failed",
            "error": str(e),
            "message": f"Generation failed: {e}",
        })
        raise
```

- [ ] **Step 4: Verify jobs module imports**

```bash
cd backend && python -c "
from jobs.queue import store_job, get_job, update_job
from jobs.worker import generate_article_job
store_job('test-1', {'status': 'queued'})
j = get_job('test-1')
print(f'Job store: {j}')
print('Jobs module OK')
"
```

Expected: Job store dict printed + "Jobs module OK".

---

## Task 13: FastAPI Routes + SSE + Main App Entry

**Files:**
- Create: `backend/main.py`

**Interfaces:**
- Consumes: All prior tasks (config, schemas, prompt manager, pipeline, jobs)
- Produces: Running FastAPI application on :8000 — consumed by Next.js frontend

- [ ] **Step 1: Create backend/main.py**

```python
"""FastAPI application entry point — API routes, SSE, CORS."""
import json
import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import settings
from prompts.manager import load_theme_config, list_themes
from pipeline.engine import run_pipeline as run_pipeline_sync
from jobs.queue import store_job, get_job, update_job
from output.file_manager import list_articles, read_article, update_article
from models.schemas import GenerateRequest, ArticleUpdate

app = FastAPI(title="Professional Blog Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Themes ──
@app.get("/api/themes")
async def get_themes():
    """List all available themes with metadata."""
    return {"themes": list_themes()}


# ── Topic Discovery ──
class DiscoverRequest(BaseModel):
    theme_id: str


@app.post("/api/themes/{theme_id}/discover")
async def discover_themes(theme_id: str):
    """Discover 5 trending topics for a theme."""
    try:
        from pipeline.steps import discover_topics
        config = load_theme_config(theme_id)
        if not config.topic_discovery_enabled:
            raise HTTPException(400, f"Theme {theme_id} does not support topic discovery. Use URL input instead.")
        topics = await discover_topics(config)
        return {"topics": [t.model_dump() for t in topics]}
    except FileNotFoundError:
        raise HTTPException(404, f"Theme not found: {theme_id}")


# ── Research ──
class ResearchRequest(BaseModel):
    topic: str


@app.post("/api/themes/{theme_id}/research")
async def research_topic(theme_id: str, body: ResearchRequest):
    """Deep research on a single topic."""
    try:
        from pipeline.steps import deep_research
        config = load_theme_config(theme_id)
        dossier = await deep_research(body.topic, config)
        return {"dossier": dossier.model_dump()}
    except FileNotFoundError:
        raise HTTPException(404, f"Theme not found: {theme_id}")


# ── Generate (async via background task) ──
@app.post("/api/themes/{theme_id}/generate")
async def generate_articles(theme_id: str, body: GenerateRequest):
    """Start article generation. Returns a job_id for tracking."""
    try:
        load_theme_config(theme_id)
    except FileNotFoundError:
        raise HTTPException(404, f"Theme not found: {theme_id}")

    job_id = str(uuid.uuid4())[:8]

    store_job(job_id, {
        "job_id": job_id,
        "status": "queued",
        "progress_pct": 0,
        "current_step": "queued",
        "message": "Job queued, starting soon...",
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Run pipeline in background task
    import asyncio as _asyncio
    _ = _asyncio.create_task(_execute_pipeline(job_id, theme_id, body))

    return {"job_id": job_id, "status": "queued"}


async def _execute_pipeline(job_id: str, theme_id: str, body: GenerateRequest):
    """Background execution of the pipeline."""
    update_job(job_id, {"status": "running", "message": "Pipeline starting..."})
    try:
        async def progress_callback(step: str, message: str, pct: int):
            update_job(job_id, {
                "current_step": step,
                "message": message,
                "progress_pct": pct,
            })

        results = await run_pipeline_sync(
            theme_id=theme_id,
            topics=body.topics,
            source_url=body.source_url,
            progress_callback=progress_callback,
        )
        update_job(job_id, {
            "status": "completed",
            "progress_pct": 100,
            "current_step": "done",
            "message": f"{len(results)} article(s) generated",
            "result": results,
        })
    except Exception as e:
        update_job(job_id, {
            "status": "failed",
            "error": str(e),
            "message": f"Generation failed: {str(e)[:200]}",
        })


# ── Job Status ──
@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Poll the current status of a generation job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job not found: {job_id}")
    return job


# ── SSE Stream ──
@app.get("/api/jobs/{job_id}/stream")
async def stream_job_progress(job_id: str):
    """SSE endpoint — streams pipeline progress events in real time."""
    async def event_generator():
        last_pct = -1
        while True:
            job = get_job(job_id)
            if not job:
                yield f"event: error\ndata: {json.dumps({'error': 'Job not found'})}\n\n"
                break

            pct = job.get("progress_pct", 0)
            if pct != last_pct:
                last_pct = pct
                yield f"event: progress\ndata: {json.dumps(job)}\n\n"

            if job["status"] in ("completed", "failed"):
                event_type = "complete" if job["status"] == "completed" else "error"
                yield f"event: {event_type}\ndata: {json.dumps(job)}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Articles ──
@app.get("/api/articles")
async def get_articles(theme_id: str | None = Query(None)):
    """List all generated articles, optionally filtered by theme."""
    articles = list_articles(theme_id)
    return {"articles": [a.model_dump() for a in articles]}


@app.get("/api/articles/{filename:path}")
async def get_article(filename: str):
    """Get full article content by filename."""
    try:
        article = read_article(filename)
        return article.model_dump()
    except FileNotFoundError:
        raise HTTPException(404, f"Article not found: {filename}")


@app.put("/api/articles/{filename:path}")
async def put_article(filename: str, body: ArticleUpdate):
    """Update an article's content in place."""
    try:
        update_article(filename, body.content)
        return {"status": "updated", "filename": filename}
    except FileNotFoundError:
        raise HTTPException(404, f"Article not found: {filename}")


# ── Health ──
@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.app_host, port=settings.app_port, reload=True)
```

- [ ] **Step 2: Verify FastAPI app starts**

```bash
cd backend && python -c "
from main import app
routes = [r.path for r in app.routes if hasattr(r, 'path')]
print(f'{len(routes)} routes registered')
for r in routes:
    print(f'  {r}')
"
```

Expected: ~9 routes listed.

---

## Task 14: Docker Compose (Redis + Services)

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: "3.9"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

volumes:
  redis_data:
```

**Note:** Backend and frontend are run locally during development (`uvicorn` + `npm run dev`). Docker Compose provides Redis only. For production, add backend and frontend services.

- [ ] **Step 2: Start Redis**

```bash
docker compose up -d && docker compose ps
```

Expected: Redis container running and healthy.

---

## Task 15: Next.js Frontend Scaffolding

**Files:**
- Create: `frontend/` via `npx create-next-app`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/hermanteng/Documents/Projects/2026/6_Jun/professional-blog-generator && npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack
```

Expected: Next.js project created.

- [ ] **Step 2: Install additional deps**

```bash
cd frontend && npm install react-markdown remark-gfm lucide-react && npm install -D @types/node
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
cd frontend && npx shadcn@latest init -d
npx shadcn@latest add button card checkbox input progress select dialog sonner
```

Expected: shadcn/ui components added to `components/ui/`.

- [ ] **Step 4: Verify dev server starts**

```bash
cd frontend && npm run dev &
sleep 3 && curl -s http://localhost:3000 | head -5
kill %1 2>/dev/null
```

Expected: HTML content returned from localhost:3000.

---

## Task 16: TypeScript Types + API Client

**Files:**
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/api-client.ts`

**Interfaces:**
- Consumes: Backend API shapes from Task 2
- Produces: TypeScript types and fetch wrapper — consumed by all frontend components

- [ ] **Step 1: Create lib/types.ts**

```typescript
// ── Theme ──
export interface Theme {
  id: string;
  name: string;
  target_platforms: string[];
  output_dir: string;
  topic_discovery_enabled: boolean;
}

// ── Topic Discovery ──
export interface Topic {
  title: string;
  description: string;
  pain_point: string;
  traffic_potential: "low" | "medium" | "high";
  source_urls: string[];
}

// ── Generation ──
export interface GenerateRequest {
  theme_id: string;
  topics: string[];
  source_url: string | null;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress_pct: number;
  current_step: string | null;
  message: string | null;
  result: ArticleResult[] | null;
  error: string | null;
}

export interface ArticleResult {
  filename: string;
  file_path: string;
  title: string;
  word_count: number;
}

// ── Articles ──
export interface ArticleListItem {
  filename: string;
  theme_id: string;
  title: string;
  word_count: number;
  generated_at: string;
}

export interface ArticleDetail {
  filename: string;
  content: string;
  title_tag: string | null;
  meta_description: string | null;
  json_ld: string | null;
  theme_id: string;
  word_count: number;
  generated_at: string;
}

// ── Wizard ──
export type WizardStep = "select-theme" | "select-topics" | "generating" | "preview";
```

- [ ] **Step 2: Create lib/api-client.ts**

```typescript
import type { Theme, Topic, GenerateRequest, JobStatus, ArticleListItem, ArticleDetail } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function fetchThemes(): Promise<Theme[]> {
  const data = await fetchJSON<{ themes: Theme[] }>(`${BASE_URL}/api/themes`);
  return data.themes;
}

export async function discoverTopics(themeId: string): Promise<Topic[]> {
  const data = await fetchJSON<{ topics: Topic[] }>(
    `${BASE_URL}/api/themes/${themeId}/discover`,
    { method: "POST" }
  );
  return data.topics;
}

export async function startGeneration(request: GenerateRequest): Promise<{ job_id: string }> {
  return fetchJSON(`${BASE_URL}/api/themes/${request.theme_id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return fetchJSON(`${BASE_URL}/api/jobs/${jobId}`);
}

export async function listArticles(themeId?: string): Promise<ArticleListItem[]> {
  const params = themeId ? `?theme_id=${themeId}` : "";
  const data = await fetchJSON<{ articles: ArticleListItem[] }>(
    `${BASE_URL}/api/articles${params}`
  );
  return data.articles;
}

export async function getArticle(filename: string): Promise<ArticleDetail> {
  return fetchJSON(`${BASE_URL}/api/articles/${encodeURIComponent(filename)}`);
}

export async function updateArticle(filename: string, content: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/api/articles/${encodeURIComponent(filename)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function createSSEUrl(jobId: string): string {
  return `${BASE_URL}/api/jobs/${jobId}/stream`;
}
```

- [ ] **Step 3: Verify types build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

---

## Task 17: SSE Client

**Files:**
- Create: `frontend/lib/sse-client.ts`

**Interfaces:**
- Produces: `subscribeToJob(jobId, callbacks) -> () => void` — consumed by GenerationProgress component

- [ ] **Step 1: Create lib/sse-client.ts**

```typescript
import type { JobStatus } from "./types";
import { createSSEUrl } from "./api-client";

interface SSECallbacks {
  onProgress: (status: JobStatus) => void;
  onComplete: (status: JobStatus) => void;
  onError: (error: string) => void;
}

export function subscribeToJob(
  jobId: string,
  callbacks: SSECallbacks
): () => void {
  const url = createSSEUrl(jobId);
  const eventSource = new EventSource(url);

  eventSource.addEventListener("progress", (event) => {
    try {
      const data = JSON.parse(event.data) as JobStatus;
      callbacks.onProgress(data);
    } catch {
      // ignore parse errors on partial events
    }
  });

  eventSource.addEventListener("complete", (event) => {
    try {
      const data = JSON.parse(event.data) as JobStatus;
      callbacks.onComplete(data);
    } catch {
      callbacks.onComplete(JSON.parse(event.data));
    }
    eventSource.close();
  });

  eventSource.addEventListener("error", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as JobStatus;
      callbacks.onError(data.error || "Unknown error");
    } catch {
      callbacks.onError("Connection error");
    }
    eventSource.close();
  });

  // Also handle native EventSource error (connection failures)
  eventSource.onerror = () => {
    callbacks.onError("Failed to connect to progress stream");
    eventSource.close();
  };

  return () => eventSource.close();
}
```

- [ ] **Step 2: Verify SSE client compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

---

## Task 18: UI Components (ThemeSelector, TopicDiscovery, UrlInput, GenerationProgress, ArticlePreview)

**Files:**
- Create: `frontend/components/wizard/ThemeSelector.tsx`
- Create: `frontend/components/wizard/TopicDiscovery.tsx`
- Create: `frontend/components/wizard/UrlInput.tsx`
- Create: `frontend/components/wizard/GenerationProgress.tsx`
- Create: `frontend/components/wizard/ArticlePreview.tsx`

**Interfaces:**
- Consumes: Types from Task 16, API client from Task 16, SSE client from Task 17
- Produces: 5 React components — consumed by page.tsx (Task 19)

- [ ] **Step 1: Create ThemeSelector.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchThemes, type Theme } from "@/lib/api-client";
import type { Theme as ThemeType } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface ThemeSelectorProps {
  onNext: (theme: ThemeType) => void;
}

export function ThemeSelector({ onNext }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<ThemeType[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThemes()
      .then(setThemes)
      .finally(() => setLoading(false));
  }, []);

  const selectedTheme = themes.find((t) => t.id === selected);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">What type of article?</h2>
        <p className="text-muted-foreground mt-1">Select a content theme to get started.</p>
      </div>

      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a theme..." />
        </SelectTrigger>
        <SelectContent>
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              {theme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTheme && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedTheme.name}</CardTitle>
            <CardDescription>
              Publishes to: {selectedTheme.target_platforms.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {selectedTheme.topic_discovery_enabled
                ? "We'll discover trending topics for you to choose from."
                : "Paste a URL and we'll generate an article based on it."}
            </p>
          </CardContent>
        </Card>
      )}

      <Button onClick={() => selectedTheme && onNext(selectedTheme)} disabled={!selected}>
        Next →
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create TopicDiscovery.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { discoverTopics, type Topic } from "@/lib/api-client";
import type { Theme } from "@/lib/types";
import { Loader2, TrendingUp, Zap, TrendingDown } from "lucide-react";

interface TopicDiscoveryProps {
  theme: Theme;
  onBack: () => void;
  onNext: (selectedTopics: string[]) => void;
}

const trafficIcons: Record<string, React.ReactNode> = {
  high: <TrendingUp className="h-4 w-4 text-green-500" />,
  medium: <Zap className="h-4 w-4 text-yellow-500" />,
  low: <TrendingDown className="h-4 w-4 text-muted-foreground" />,
};

export function TopicDiscovery({ theme, onBack, onNext }: TopicDiscoveryProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    discoverTopics(theme.id)
      .then(setTopics)
      .finally(() => setLoading(false));
  }, [theme.id]);

  const toggle = (title: string) => {
    const next = new Set(selected);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setSelected(next);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Discovering trending topics...</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pick Your Topics</h2>
        <p className="text-muted-foreground mt-1">
          Select the topics you want articles for. We&apos;ll generate one article per topic.
        </p>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <Card
            key={topic.title}
            className={`cursor-pointer transition-colors ${
              selected.has(topic.title) ? "border-primary ring-1 ring-primary" : ""
            }`}
            onClick={() => toggle(topic.title)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected.has(topic.title)}
                  onCheckedChange={() => toggle(topic.title)}
                />
                <div className="flex-1">
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                  <CardDescription className="mt-1">{topic.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  {trafficIcons[topic.traffic_potential]}
                  Traffic: {topic.traffic_potential}
                </span>
                <span className="text-muted-foreground">Pain point: {topic.pain_point}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={() => onNext(Array.from(selected))} disabled={selected.size === 0}>
          Generate {selected.size} article{selected.size !== 1 ? "s" : ""} →
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create UrlInput.tsx**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Theme } from "@/lib/types";

interface UrlInputProps {
  theme: Theme;
  onBack: () => void;
  onNext: (sourceUrl: string) => void;
}

export function UrlInput({ theme, onBack, onNext }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const isArticle = theme.id === "theme-04";
  const placeholder = isArticle
    ? "https://example.com/article-to-rewrite"
    : "https://youtube.com/watch?v=...";

  const validate = () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }
    try {
      new URL(url);
      setError("");
      onNext(url);
    } catch {
      setError("Please enter a valid URL (include https://)");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {isArticle ? "Paste Article URL" : "Paste Video URL"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isArticle
            ? "We'll read the article, add original analysis, and produce a revised version."
            : "We'll extract the transcript, structure it, and save as a knowledge base article."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="source-url">{isArticle ? "Article URL" : "Video URL"}</Label>
        <Input
          id="source-url"
          placeholder={placeholder}
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && validate()}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={validate}>Generate Article →</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create GenerationProgress.tsx**

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { subscribeToJob } from "@/lib/sse-client";
import type { JobStatus, ArticleResult } from "@/lib/types";
import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";

interface GenerationProgressProps {
  jobId: string;
  onComplete: (results: ArticleResult[]) => void;
  onError: (error: string) => void;
}

export function GenerationProgress({ jobId, onComplete, onError }: GenerationProgressProps) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cleanup = subscribeToJob(jobId, {
      onProgress: setStatus,
      onComplete: (final) => {
        setStatus(final);
        if (final.result) onComplete(final.result);
      },
      onError,
    });
    cleanupRef.current = cleanup;
    return cleanup;
  }, [jobId, onComplete, onError]);

  const stepLabel = (step: string | null) => {
    switch (step) {
      case "search": return "Discovering topics...";
      case "research": return "Researching sources...";
      case "generate": return "Writing article...";
      case "save": return "Saving to disk...";
      case "done": return "Complete!";
      default: return "Starting...";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Generating Articles</h2>
        <p className="text-muted-foreground mt-1">This may take a few minutes per article.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            {status?.status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : status?.status === "failed" ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            <span className="font-medium">{stepLabel(status?.current_step ?? null)}</span>
          </div>

          <Progress value={status?.progress_pct ?? 0} />

          <p className="text-sm text-muted-foreground">{status?.message}</p>
        </CardContent>
      </Card>

      {status?.result && status.result.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Generated:</h3>
          {status.result.map((r) => (
            <div key={r.filename} className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{r.filename}</span>
              <span className="text-muted-foreground">({r.word_count} words)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create ArticlePreview.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getArticle, updateArticle, type ArticleDetail } from "@/lib/api-client";
import type { ArticleResult } from "@/lib/types";
import { FileText, Edit3, Save, Eye } from "lucide-react";

interface ArticlePreviewProps {
  results: ArticleResult[];
  onNew: () => void;
}

export function ArticlePreview({ results, onNew }: ArticlePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      getArticle(selectedFile).then(setArticle);
      setEditing(false);
    }
  }, [selectedFile]);

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    await updateArticle(selectedFile, editContent);
    setArticle((prev) => prev ? { ...prev, content: editContent } : null);
    setSaving(false);
    setEditing(false);
  };

  const startEditing = () => {
    if (article) {
      setEditContent(article.content);
      setEditing(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Articles Generated</h2>
        <p className="text-muted-foreground mt-1">
          {results.length} article{results.length !== 1 ? "s" : ""} saved to disk.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {results.map((r) => (
          <Button
            key={r.filename}
            variant={selectedFile === r.filename ? "default" : "outline"}
            onClick={() => setSelectedFile(r.filename)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {r.filename}
          </Button>
        ))}
      </div>

      {article && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{article.filename}</CardTitle>
            <div className="flex gap-2">
              {!editing ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit3 className="h-4 w-4 mr-1" /> Edit
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
              {editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
              />
            ) : (
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {article.content}
                </ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onNew}>
        Generate More Articles →
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Verify all components compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

---

## Task 19: Wizard Page + Layout

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`

**Interfaces:**
- Consumes: All 5 wizard components from Task 18, types from Task 16, API client from Task 16
- Produces: Complete wizard flow page

- [ ] **Step 1: Rewrite app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Rewrite app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Professional Blog Generator",
  description: "AI-powered professional blog article generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
          <div className="mx-auto max-w-3xl px-4 py-12">
            {children}
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Rewrite app/page.tsx (Wizard State Machine)**

```tsx
"use client";

import { useState } from "react";
import { ThemeSelector } from "@/components/wizard/ThemeSelector";
import { TopicDiscovery } from "@/components/wizard/TopicDiscovery";
import { UrlInput } from "@/components/wizard/UrlInput";
import { GenerationProgress } from "@/components/wizard/GenerationProgress";
import { ArticlePreview } from "@/components/wizard/ArticlePreview";
import { startGeneration } from "@/lib/api-client";
import type { Theme, ArticleResult, WizardStep } from "@/lib/types";

export default function Home() {
  const [step, setStep] = useState<WizardStep>("select-theme");
  const [theme, setTheme] = useState<Theme | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<ArticleResult[]>([]);

  const handleThemeSelect = async (selected: Theme) => {
    setTheme(selected);
    if (selected.topic_discovery_enabled) {
      setStep("select-topics");
    } else {
      // Themes 4-5: go directly to URL input
      setStep("select-topics");
    }
  };

  const handleTopicsConfirm = async (selectedTopics: string[]) => {
    setTopics(selectedTopics);
    setStep("generating");
    try {
      const { job_id } = await startGeneration({
        theme_id: theme!.id,
        topics: selectedTopics,
        source_url: sourceUrl,
      });
      setJobId(job_id);
    } catch (err) {
      console.error("Failed to start generation:", err);
    }
  };

  const handleUrlConfirm = async (url: string) => {
    setSourceUrl(url);
    setTopics(["Source Material"]); // Single "topic" for the URL
    setStep("generating");
    try {
      const { job_id } = await startGeneration({
        theme_id: theme!.id,
        topics: ["Source Material"],
        source_url: url,
      });
      setJobId(job_id);
    } catch (err) {
      console.error("Failed to start generation:", err);
    }
  };

  const handleComplete = (articleResults: ArticleResult[]) => {
    setResults(articleResults);
    setStep("preview");
  };

  const handleNew = () => {
    setStep("select-theme");
    setTheme(null);
    setTopics([]);
    setSourceUrl(null);
    setJobId(null);
    setResults([]);
  };

  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Professional Blog Generator</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered research → draft → SEO in one flow
        </p>
      </header>

      {/* Step indicator */}
      <div className="mb-8 flex justify-center gap-2">
        {(["select-theme", "select-topics", "generating", "preview"] as WizardStep[]).map(
          (s, i) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                step === s
                  ? "bg-primary"
                  : ["select-theme", "select-topics", "generating", "preview"].indexOf(step) > i
                  ? "bg-primary/40"
                  : "bg-muted"
              }`}
            />
          )
        )}
      </div>

      {step === "select-theme" && <ThemeSelector onNext={handleThemeSelect} />}

      {step === "select-topics" && theme?.topic_discovery_enabled && (
        <TopicDiscovery
          theme={theme}
          onBack={() => setStep("select-theme")}
          onNext={handleTopicsConfirm}
        />
      )}

      {step === "select-topics" && theme && !theme.topic_discovery_enabled && (
        <UrlInput
          theme={theme}
          onBack={() => setStep("select-theme")}
          onNext={handleUrlConfirm}
        />
      )}

      {step === "generating" && jobId && (
        <GenerationProgress
          jobId={jobId}
          onComplete={handleComplete}
          onError={(err) => console.error(err)}
        />
      )}

      {step === "preview" && (
        <ArticlePreview results={results} onNew={handleNew} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify project builds**

```bash
cd frontend && npm run build
```

Expected: Successful Next.js build.

---

## Task 20: End-to-End Verification

- [ ] **Step 1: Ensure Redis is running**

```bash
docker compose ps
```

Expected: Redis container status is `running` / `healthy`.

- [ ] **Step 2: Start backend**

```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000 &
sleep 3 && curl -s http://localhost:8000/api/health | python -m json.tool
```

Expected: `{"status": "ok", ...}`

- [ ] **Step 3: Verify themes endpoint**

```bash
curl -s http://localhost:8000/api/themes | python -m json.tool | head -20
```

Expected: JSON with 5 themes listed.

- [ ] **Step 4: Start frontend**

```bash
cd frontend && npm run dev &
sleep 5 && curl -s http://localhost:3000 | grep -o '<title>.*</title>'
```

Expected: `<title>Professional Blog Generator</title>`

- [ ] **Step 5: Full flow test via curl (smoke test, won't generate without API keys)**

```bash
# Test discover (will fail without search API key, but endpoint works)
curl -s -X POST http://localhost:8000/api/themes/theme-01/discover | python -c "import sys,json; d=json.load(sys.stdin); print('topics' in d or 'detail' in d)"

# Test generate (will queue job even without keys)
curl -s -X POST http://localhost:8000/api/themes/theme-01/generate \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-01","topics":["Test Topic"],"source_url":null}' | python -m json.tool
```

Expected: First call returns topics or error detail, second returns `{"job_id": "...", "status": "queued"}`.

- [ ] **Step 6: Clean up running processes**

```bash
kill %1 %2 2>/dev/null; docker compose down
```

---

## Verification Checklist Summary

| # | Test | Command |
|---|------|---------|
| 1 | Backend starts | `curl localhost:8000/api/health` → 200 |
| 2 | Themes list | `GET /api/themes` → 5 themes |
| 3 | Theme config loads | `load_theme_config("theme-01")` → valid |
| 4 | System prompts render | All 5 render with placeholder context |
| 5 | LLM factory resolves | 4 providers instantiate |
| 6 | Search factory resolves | 2 providers instantiate |
| 7 | Output dirs exist | 5 dirs created on first save |
| 8 | Frontend builds | `npm run build` → success |
| 9 | Wizard renders | `npm run dev` → page loads at :3000 |
| 10 | SSE connection | EventSource opens to `/api/jobs/{id}/stream` |
