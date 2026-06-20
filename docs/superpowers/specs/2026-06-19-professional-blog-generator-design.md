# Professional Blog Generator — Design Spec

**Date**: 2026-06-19
**Status**: Design approved, pending implementation plan
**Project path**: `/Users/hermanteng/Documents/Projects/2026/6_Jun/professional-blog-generator/`

---

## 1. Purpose & Scope

An AI-powered blog generator with a web wizard UI that automates research → drafting → SEO-optimized publishing across 5 content themes. The generator targets three publication platforms (careerinsightlabs.com, LinkedIn, personal blog) and a personal Obsidian knowledge base.

### 5 Content Themes

| ID | Theme | Platform(s) | Word Count | Topic Selection |
|----|-------|------------|------------|-----------------|
| theme-01 | Career & Job Search | careerinsightlabs.com | 1500-2000 | Discover top 5 trending topics → user picks |
| theme-02 | Professional Tech (Finance/Banking + IT) | LinkedIn + personal blog | 2000-2500 | Discover top 5 trending topics → user picks |
| theme-03 | AI Application Technology | LinkedIn + personal blog | 1500-2500 | Discover top 5 trending topics → user picks |
| theme-04 | Revise External Articles | All 3 platforms | 1500-2500 | User pastes article URL |
| theme-05 | Summarize Tech Videos | Obsidian knowledge base | 1500-2500 | User pastes video URL |

### Output Directories

```
/Users/hermanteng/Documents/Projects/2026/6_Jun/Blog-writing/
├── Career_Articles/       # theme-01
├── Linkedin_Articles/     # theme-02
├── Blog_Articles/         # theme-03
├── Revised_Articles/      # theme-04
└── YouTube_Articles/      # theme-05
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js (App Router) | Modern React, SSR, streaming support |
| Backend | Python FastAPI | Superior AI orchestration, file I/O, async support |
| Job Queue | arq + Redis | Reliable async long-running article generation |
| LLM Providers | Claude API, OpenAI, DeepSeek V4 Pro, Kimi K2 | Multi-provider, configurable via env |
| Search Providers | Brave Search API, Tavily API | Multi-search, configurable via env |
| UI Components | shadcn/ui + Tailwind CSS | Clean, accessible, fast to build |
| Progress | Server-Sent Events (SSE) | Real-time pipeline progress in browser |

---

## 3. Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js Frontend                       │
│  Wizard: ThemeSelect → TopicSelect → Generate → Preview  │
│  SSE client receives real-time pipeline progress          │
└──────────────────────┬───────────────────────────────────┘
                       │ REST + SSE (localhost:8000)
┌──────────────────────┴───────────────────────────────────┐
│                  FastAPI Backend (:8000)                   │
│                                                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ API Router  │  │  Job Queue   │  │  Prompt Manager  │ │
│  │ (REST+SSE)  │  │  (arq+Redis) │  │  (YAML/MD files) │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                │                    │           │
│  ┌──────┴────────────────┴────────────────────┴─────────┐ │
│  │              Agent Pipeline (4 steps)                 │ │
│  │                                                       │ │
│  │  Step 1           Step 2          Step 3     Step 4   │ │
│  │  Topic        →   Deep        →   Article  →  Save   │ │
│  │  Discovery        Research        Generate     + SEO  │ │
│  │     │                │               │          │     │ │
│  │  Search API      Search API      LLM API    File I/O │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Providers:                                                │
│  Search: Brave | Tavily                                    │
│  LLM: Claude | OpenAI | DeepSeek V4 Pro | Kimi K2         │
└────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User selects theme + topics
        │
        ▼
POST /api/themes/{id}/generate  ──→  arq enqueues job  ──→  returns job_id
        │
        ▼
GET /api/jobs/{id}/stream   (SSE connection opens)
        │
        ▼
Worker runs 4-step pipeline, emits events:
  [search: 5%] → [research: 25%] → [generate: 55%] → [save: 95%] → [complete: 100%]
        │
        ▼
Frontend updates progress bars, then shows article preview
```

---

## 4. API Design

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/themes` | List all 5 theme configs |
| `POST` | `/api/themes/{id}/discover` | Search for 5 trending topics |
| `POST` | `/api/themes/{id}/research` | Deep research on a topic |
| `POST` | `/api/themes/{id}/generate` | Start article generation → returns `job_id` |
| `GET` | `/api/jobs/{id}/stream` | SSE — real-time pipeline progress |
| `GET` | `/api/jobs/{id}` | Job status & result |
| `GET` | `/api/articles` | History of all generated articles |
| `GET` | `/api/articles/{filename}` | Full article content |
| `PUT` | `/api/articles/{filename}` | Save edits to article |

### SSE Event Format

```
event: progress
data: {"step": "search", "message": "Discovering topics...", "pct": 5}

event: progress
data: {"step": "research", "message": "Fetching 3 sources...", "pct": 30}

event: progress
data: {"step": "generate", "message": "Writing H2: ATS Algorithm...", "pct": 60}

event: progress
data: {"step": "save", "message": "Saving to Career_Articles/...", "pct": 95}

event: complete
data: {"filename": "21-ATS-Semantic-Matching-2026.md", "path": "...", "word_count": 1850}
```

---

## 5. Frontend Wizard Flow

### Step 1: Theme Selection
Dropdown listing all 5 themes with descriptions.

### Step 2: Branch
- **Themes 1-3** → Show 5 discovered trending topics as checkboxes (multi-select allowed). Each shows title + pain point + traffic potential.
- **Themes 4-5** → URL input field with validation.

### Step 3: Generation
Per-topic progress bars driven by SSE. Each bar shows current step + percentage. Topics generate sequentially.

### Step 4: Preview
List generated articles with markdown preview, edit capability, and file save confirmation.

### Component Tree
```
/app
  page.tsx                      → Wizard state machine
  layout.tsx
/components
  /wizard
    ThemeSelector.tsx            → Dropdown with theme cards
    TopicDiscovery.tsx           → Skeleton → topic checkboxes
    UrlInput.tsx                 → URL field with validation
    GenerationProgress.tsx       → Per-topic SSE progress bars
    ArticlePreview.tsx           → Markdown renderer + editor
  /ui                            → shadcn/ui primitives
/lib
  api-client.ts                  → Fetch wrapper
  sse-client.ts                  → SSE EventSource parser
  types.ts                       → Shared TypeScript types
```

---

## 6. Backend Structure

```
backend/
├── main.py                       # FastAPI app, route registration
├── config.py                     # Env-based settings (pydantic-settings)
├── prompts/
│   ├── themes/
│   │   ├── theme-01-career.yaml
│   │   ├── theme-02-tech.yaml
│   │   ├── theme-03-ai.yaml
│   │   ├── theme-04-rewrite.yaml
│   │   └── theme-05-video.yaml
│   └── system/
│       ├── theme-01-system.md
│       ├── theme-02-system.md
│       ├── theme-03-system.md
│       ├── theme-04-system.md
│       └── theme-05-system.md
├── pipeline/
│   ├── engine.py                 # run_pipeline() orchestrator
│   └── steps.py                  # discover(), research(), generate(), save()
├── search/
│   ├── base.py                   # SearchProvider ABC
│   ├── brave_provider.py
│   ├── tavily_provider.py
│   └── factory.py
├── llm/
│   ├── base.py                   # LLMProvider ABC
│   ├── claude_provider.py
│   ├── openai_provider.py
│   ├── deepseek_provider.py
│   ├── kimi_provider.py
│   └── factory.py
├── output/
│   └── file_manager.py           # Save to categorized directories
├── jobs/
│   ├── queue.py                  # arq queue + Redis connection
│   └── worker.py                 # Article generation worker function
├── models/
│   └── schemas.py                # Pydantic models
└── requirements.txt
```

---

## 7. Prompt Management System

### Theme Config (YAML)
Each theme is defined declaratively. Adding a new theme = add one YAML + one system prompt MD. No code changes.

```yaml
id: "theme-01"
name: "Career & Job Search Articles"
target_platforms: ["careerinsightlabs.com"]
output_dir: "Career_Articles"
word_count: {min: 1500, max: 2000}
persona: "Senior Tech Recruiter at North American big tech"
tone: "sharp, professional, data-driven, slightly contrarian"
forbidden_phrases:
  - "in today's fast-paced world"
  - "delve into"
  - "in conclusion"
  - "crucial"
  - "tapestry"
  - "unlock your potential"
  - "game-changer"
topic_discovery:
  enabled: true
  search_queries:
    - "2026 tech job market trends"
    - "ATS resume optimization 2026"
    - "tech interview preparation strategies"
  result_count: 5
seo:
  enabled: true
  include_jsonld: true
  max_title_chars: 60
  max_meta_chars: 160
model_preference: "claude"     # default LLM for this theme (overrideable)
```

### System Prompt Template (Markdown)
Uses `{{placeholders}}` filled with research data before LLM call:

```markdown
# Role: {{persona}}

## Context
You write for {{target_audience}} publishing on {{target_platforms}}.
Target word count: {{word_count_min}}-{{word_count_max}} words.
Language: Professional English.

## Research Dossier
{{research_dossier}}

## Writing Rules
- Adopt the voice of: {{persona}}
- Tone: {{tone}}
- NEVER use these phrases: {{forbidden_phrases}}
- Use real data points, statistics, and quotes from the research dossier
- Write with a sharp, opinionated edge — not generic content
- Include a natural, non-salesy Call-to-Action at the end

## Article Structure
1. H1: SEO-optimized, compelling headline (include primary keyword)
2. H2: Hook — open with surprising data, stat, or contrarian take
3. H2-H3: Core analysis with data-backed insights (2-4 sections)
4. H2: Actionable takeaways or step-by-step guidance
5. H2: Conclusion with natural CTA

## Output Format
- Standard Markdown
- After the article body, output:
  1. `<title>` tag (max {{seo_max_title}} chars)
  2. `<meta description>` tag (max {{seo_max_meta}} chars)
  3. JSON-LD Article schema block
```

---

## 8. Pipeline Engine (4 Steps)

### Step 1 — Topic Discovery
- **Input**: `theme_id`
- **Action**: Load theme YAML → for each search query, call Search API → deduplicate results → rank by relevance via LLM → generate pain point + traffic analysis per topic
- **Output**: `[{title, description, pain_point, traffic_potential, source_urls}]` (5 items)

### Step 2 — Deep Research
- **Input**: selected topic + theme config
- **Action**: Decompose topic into 3-4 research angles (LLM) → search each angle (Search API) → fetch top articles → extract statistics, quotes, data points
- **Output**: `ResearchDossier {angles: [{query, sources: [{url, title, key_facts, quotes}]}], statistics, expert_viewpoints}`

### Step 3 — Article Generation
- **Input**: research dossier + system prompt template + theme config
- **Action**: Fill template placeholders → call LLM with system prompt (streaming) → parse markdown body + SEO metadata
- **Output**: `{markdown_body, title_tag, meta_description, json_ld}`
- **Note for themes 4-5**: Source article/video content replaces the topic discovery step; user provides URL → fetch content → use as primary research input

### Step 4 — Save & Finalize
- **Input**: generated article + theme config
- **Action**: Generate numbered filename → write `.md` to themed output directory → embed SEO metadata as YAML frontmatter
- **Output**: `{filename, file_path, word_count}`

### Progress Emission
Each step calls `stream_callback(step, message, pct)` which the worker forwards to the SSE endpoint. Progress is linear across the 4 steps: 0-25% (discover), 25-50% (research), 50-90% (generate), 90-100% (save).

---

## 9. Provider Abstractions

### LLM Provider Interface
```python
class LLMProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
        stream_callback: Callable[[str], None] | None = None
    ) -> str: ...
```

**Implementations**: `ClaudeProvider`, `OpenAIProvider`, `DeepSeekProvider`, `KimiProvider`
**Selection**: `LLM_PROVIDER` env var → `llm/factory.py`

### Search Provider Interface
```python
class SearchProvider(ABC):
    @abstractmethod
    async def search(
        self,
        query: str,
        max_results: int = 10,
        site_filter: str | None = None
    ) -> list[SearchResult]: ...

    @abstractmethod
    async def fetch_url(self, url: str) -> str: ...
```

**Implementations**: `BraveSearchProvider`, `TavilySearchProvider`
**Selection**: `SEARCH_PROVIDER` env var → `search/factory.py`

### Environment Configuration
```
LLM_PROVIDER=claude           # claude | openai | deepseek | kimi
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
KIMI_API_KEY=sk-...

SEARCH_PROVIDER=brave          # brave | tavily
BRAVE_API_KEY=BSA...
TAVILY_API_KEY=tvly-...

OUTPUT_BASE_PATH=/Users/hermanteng/Documents/Projects/2026/6_Jun/Blog-writing
REDIS_URL=redis://localhost:6379
```

---

## 10. Verification Plan

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Start backend: `uvicorn main:app` | FastAPI starts on :8000, `/api/themes` returns 5 themes |
| 2 | POST `/api/themes/theme-01/discover` | Returns 5 trending career topics with pain points |
| 3 | POST `/api/themes/theme-01/research` with a topic | Returns research dossier with sources |
| 4 | POST `/api/themes/theme-01/generate` with a topic | Returns job_id, SSE stream shows progress, article saved to disk |
| 5 | Switch `LLM_PROVIDER=deepseek`, rerun generate | Article generated via DeepSeek V4 Pro |
| 6 | Switch `SEARCH_PROVIDER=tavily`, rerun discover | Topics sourced from Tavily |
| 7 | `npm run dev` in frontend/ | Next.js starts, wizard renders |
| 8 | Step through full wizard flow | Theme → topics → progress → preview → file saved |
| 9 | Theme 4: paste article URL → generate | Revised article with original opinions saved |
| 10 | Theme 5: paste YouTube URL → generate | Video summary article saved |

---

## 11. Dependencies

### Frontend
- next, react, react-dom
- tailwindcss, @tailwindcss/typography
- shadcn/ui (button, card, checkbox, input, progress, select, dialog, sonner)
- react-markdown, remark-gfm (for article preview)
- eventsource-parser (SSE client)

### Backend
- fastapi, uvicorn[standard]
- arq, redis
- httpx (async HTTP for search/fetch)
- openai (OpenAI SDK)
- anthropic (Anthropic SDK)
- pydantic, pydantic-settings
- pyyaml
- python-frontmatter (markdown frontmatter)
- jinja2 (prompt template rendering)

### Infrastructure
- Redis (for arq job queue)
- Docker Compose (optional, for local dev with Redis)

---

## 12. Out of Scope

- User authentication / multi-tenancy (personal tool)
- CMS integration or direct publishing to platforms
- Analytics dashboard
- Article scheduling / cron
- Image generation or DALL-E integration
- Non-English output
