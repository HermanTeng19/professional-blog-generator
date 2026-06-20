# Professional Blog Generator — Project Status & Handoff Document

**Date:** 2026-06-19
**Location:** `/Users/hermanteng/Documents/Projects/2026/6_Jun/professional-blog-generator/`

## 1. Architecture Overview

- **Type:** Full-Stack Web Application (Next.js 16 + FastAPI)
- **Frontend:** Next.js 16.2.9 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, shadcn/ui v4 (@base-ui/react)
- **Backend:** Python 3.9.6, FastAPI, Pydantic v2, SSE streaming, in-memory job queue
- **AI Pipeline:** 4-step async engine (Topic Discovery → Deep Research → Article Generation → Save with SEO metadata)
- **LLM Providers:** 6 supported — DeepSeek V4 Pro (default), OpenRouter, SiliconFlow, Claude, OpenAI, Kimi K2
- **Search Providers:** 2 supported — Tavily (active), Brave (configured)
- **Privacy Model:** BYOK (Bring Your Own Key) — API keys stored client-side in `localStorage`, transmitted per-request, never persisted server-side
- **Output:** Markdown files with YAML frontmatter + SEO metadata (JSON-LD, title tag, meta description), auto-numbered into theme-sorted directories

## 2. Folder Structure

```text
/Users/hermanteng/Documents/Projects/2026/6_Jun/professional-blog-generator/
├── docker-compose.yml              # Redis 7 alpine
├── .gitignore
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-06-19-professional-blog-generator-design.md
│       └── plans/
│           └── 2026-06-19-professional-blog-generator-plan.md
├── backend/
│   ├── .env                        # API keys & config (gitignored)
│   ├── .env.example
│   ├── pyproject.toml
│   ├── config.py                   # Pydantic-settings from .env
│   ├── main.py                     # FastAPI app — 10 endpoints + SSE + CORS
│   ├── llm/                        # 6 LLM provider implementations
│   │   ├── base.py                 # LLMProvider ABC
│   │   ├── factory.py              # get_llm_provider(name?, llm_config?)
│   │   ├── claude_provider.py      # Anthropic SDK (claude-sonnet-4-6)
│   │   ├── deepseek_provider.py    # OpenAI-compatible (deepseek-v4-pro)
│   │   ├── openai_provider.py      # OpenAI-compatible (gpt-4o)
│   │   ├── kimi_provider.py        # OpenAI-compatible (kimi-k2)
│   │   ├── openrouter_provider.py  # OpenAI-compatible (300+ models)
│   │   └── siliconflow_provider.py # OpenAI-compatible (DeepSeek-V3 etc.)
│   ├── search/                     # 2 search providers
│   │   ├── base.py                 # SearchProvider ABC + SearchResult
│   │   ├── factory.py              # get_search_provider()
│   │   ├── brave_provider.py       # Brave Search API
│   │   └── tavily_provider.py      # Tavily Search API
│   ├── pipeline/                   # 4-step generation engine
│   │   ├── engine.py               # run_pipeline() orchestrator
│   │   └── steps.py                # discover_topics, deep_research, generate_article
│   ├── prompts/                    # Theme configs + system prompt templates
│   │   ├── manager.py              # load_theme_config, load_system_prompt, render_prompt
│   │   ├── themes/                 # 5 YAML theme configs
│   │   │   ├── theme-01-career.yaml
│   │   │   ├── theme-02-tech.yaml
│   │   │   ├── theme-03-ai.yaml
│   │   │   ├── theme-04-rewrite.yaml
│   │   │   └── theme-05-video.yaml
│   │   └── system/                 # 5 Jinja2 Markdown prompt templates
│   │       ├── theme-01-system.md
│   │       ├── theme-02-system.md
│   │       ├── theme-03-system.md
│   │       ├── theme-04-system.md
│   │       └── theme-05-system.md
│   ├── jobs/                       # In-memory job queue (no Redis in dev)
│   │   ├── queue.py                # store_job, get_job, update_job
│   │   └── worker.py               # generate_article_job (asyncio.create_task)
│   ├── output/                     # Article I/O
│   │   └── file_manager.py         # save_article, list_articles, read_article, update_article
│   └── models/
│       └── schemas.py              # 12 Pydantic models (LLMConfig, GenerateRequest, JobStatus, etc.)
└── frontend/
    ├── package.json                # Next.js 16.2.9, React 19, shadcn/ui v4
    ├── next.config.ts
    ├── postcss.config.mjs
    ├── app/
    │   ├── layout.tsx              # Root layout (fonts, Toaster)
    │   ├── page.tsx                # 4-step wizard state machine
    │   └── globals.css             # Tailwind v4 tokens + prose styles
    ├── components/
    │   ├── ui/                     # 10 shadcn/ui components (@base-ui/react)
    │   │   ├── button.tsx, card.tsx, checkbox.tsx, dialog.tsx, input.tsx
    │   │   ├── label.tsx, progress.tsx, select.tsx, sonner.tsx, textarea.tsx
    │   └── wizard/                 # 6 wizard step components
    │       ├── ThemeSelector.tsx    # Step 1: Theme picker + BYOK gear button
    │       ├── TopicDiscovery.tsx   # Step 2a: Topic checkboxes (themes 1-3)
    │       ├── UrlInput.tsx         # Step 2b: URL input (themes 4-5)
    │       ├── LLMSettings.tsx      # BYOK dialog: provider, API key, model
    │       ├── GenerationProgress.tsx # Step 3: SSE-driven progress bar
    │       └── ArticlePreview.tsx   # Step 4: Markdown preview + editor
    └── lib/
        ├── types.ts                # TypeScript interfaces + provider defaults
        ├── api-client.ts           # 8 typed fetch wrappers
        ├── sse-client.ts           # EventSource subscriber
        ├── llm-config-store.ts     # localStorage BYOK helpers
        └── utils.ts                # cn() helper
```

## 3. 5 Content Themes

| ID | Name | Input Mode | Word Count | Persona | Output Dir |
|----|------|-----------|------------|---------|------------|
| theme-01 | Career & Job Search | Topic Discovery | 1,500–2,000 | Senior FAANG Recruiter (12+ yrs) | Career_Articles |
| theme-02 | Professional Tech | Topic Discovery | 2,000–2,500 | Senior Data/IT Architect, Banking (15+ yrs) | Linkedin_Articles |
| theme-03 | AI Application Tech | Topic Discovery | 1,500–2,500 | AI/ML Production Practitioner | Blog_Articles |
| theme-04 | Revise External Articles | URL Input | 1,500–2,500 | Tech Commentator (contrarian analysis) | Revised_Articles |
| theme-05 | Tech Video Summaries | URL Input | 1,500–2,500 | Knowledge Curator (Obsidian-ready) | YouTube_Articles |

## 4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/themes` | List all 5 themes with metadata |
| `POST` | `/api/themes/{id}/discover` | Discover 5 trending topics (themes 1-3) |
| `POST` | `/api/themes/{id}/research` | Deep research on a single topic |
| `POST` | `/api/themes/{id}/generate` | Start article generation → returns `job_id` |
| `GET` | `/api/jobs/{id}` | Poll job status (progress %, current step) |
| `GET` | `/api/jobs/{id}/stream` | SSE stream — real-time progress events |
| `GET` | `/api/articles` | List all generated articles (`?theme_id=` filter) |
| `GET` | `/api/articles/{filename}` | Get full article with SEO metadata |
| `PUT` | `/api/articles/{filename}` | Update article content in place |
| `GET` | `/api/health` | Health check |

## 5. Completed Features

- [x] **6 LLM Providers:** Unified abstraction with factory pattern. All support BYOK constructor overrides (`api_key`, `base_url`, `model`). Claude uses Anthropic SDK; other 5 use OpenAI-compatible API.
- [x] **2 Search Providers:** Tavily (active) + Brave (configured). Abstract base with `search()` and `fetch_url()`.
- [x] **4-Step Pipeline Engine:** Topic Discovery → Deep Research → Article Generation → Save with SEO. Async with progress callbacks.
- [x] **SSE Real-Time Streaming:** `/api/jobs/{id}/stream` pushes progress events to the frontend wizard and the browser.
- [x] **BYOK Architecture:** Frontend gear-button dialog for provider/key/model selection. Persisted in `localStorage`, sent per-request, never server-side. Green dot indicator when active.
- [x] **Full Frontend Wizard:** 4-step UI — Theme Selector → Topic Discovery / URL Input → Generation Progress (SSE) → Article Preview (Markdown renderer + editor).
- [x] **SEO Metadata:** Every article includes JSON-LD Article schema, `<title>` tag, and `<meta description>`, extracted from LLM output and saved in YAML frontmatter.
- [x] **URL-Based Themes:** Themes 4-5 fetch source content via search provider, inject into prompt, skip topic discovery. Fixed empty-topics loop bug.
- [x] **Article Editor:** In-browser markdown editing with save-back to disk via `PUT /api/articles/{filename}`.
- [x] **In-Memory Job Queue:** Dict-based job tracking with `asyncio.create_task`. No Redis dependency for local dev (Redis available via `docker-compose.yml`).
- [x] **Prompt Management:** 5 YAML theme configs + 5 Jinja2 Markdown system prompt templates with `{{ placeholders }}`.
- [x] **32 Generated Articles:** Career_Articles directory populated with AI-generated content (SEO-optimized, frontmatter-complete).
- [x] **Python 3.9.6 Compatibility:** All code uses `Optional[X]` syntax, no `X | None`.
- [x] **11 Git Commits:** Structured commit history from spec → scaffolding → providers → pipeline → frontend → BYOK.

## 6. Current Configuration

| Setting | Value |
|---------|-------|
| Default LLM | DeepSeek V4 Pro (`deepseek-v4-pro`) |
| Default Search | Tavily |
| LLM Keys Configured | DeepSeek, OpenRouter, SiliconFlow |
| Search Keys Configured | Tavily |
| Output Path | `~/Documents/Projects/2026/6_Jun/Blog-writing/` |
| Backend Port | `8000` |
| Frontend Port | `3000` |

## 7. Known Issues

- **DeepSeek JSON Parsing (Intermittent):** DeepSeek V4 Pro occasionally returns malformed JSON in topic discovery, causing `json.JSONDecodeError`. Retry usually succeeds. OpenRouter/SiliconFlow don't have this issue.
- **Non-Streaming LLM Latency:** Article generation (1,500–2,000 words) takes ~55 seconds in non-streaming mode. Streaming is implemented but not used in the current pipeline — enabling it would improve perceived responsiveness.
- **Python 3.9.6 Type Constraint:** Codebase uses `Optional[str]` instead of `str | None` syntax. If upgrading to Python 3.10+, the code would benefit from modern union syntax.
- **Frontend Hydration Warning (Fixed):** Nested `<button>` in `DialogTrigger` → `Button` resolved by removing `asChild` and styling `DialogTrigger` directly.
- **Default Theme `model_preference`:** All 5 themes YAMLs have `model_preference: "deepseek"`. If `.env` `LLM_PROVIDER` is changed, theme preference overrides it in `generate_article()` unless BYOK is active.

## 8. Remaining Tasks

- [ ] **Streaming Mode in Pipeline:** Enable `stream_callback` in `generate_article()` to stream chunks to SSE, reducing perceived latency from ~55s to real-time.
- [ ] **Frontend BYOK for Search Provider:** Currently only LLM is BYOK-configurable. Search provider (Tavily/Brave) still uses server `.env` keys only.
- [ ] **Article Delete Endpoint:** No API endpoint to delete generated articles. Add `DELETE /api/articles/{filename}`.
- [ ] **Batch Generation Queue:** Sequential only — generates one article at a time. Could parallelize or use a proper job queue (Redis/arq).
- [ ] **PDF Export:** No print/PDF export styling in frontend ArticlePreview.
- [ ] **Authentication:** No auth layer — anyone with network access to the server can use the API and access the frontend.
- [ ] **Production Deployment:** No production build configuration for either backend (gunicorn/uvicorn workers) or frontend (Vercel/static export).
- [ ] **Git Remote:** No remote configured — code exists only locally.
- [ ] **DeepSeek JSON Robustness:** Add JSON repair/retry logic in `discover_topics()` to handle intermittent malformed JSON responses from DeepSeek.

## 9. How to Run

```bash
# Backend
cd backend
cp .env.example .env   # Fill in API keys
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run dev             # Opens http://localhost:3000
```

## 10. Testing the Full Pipeline

```bash
# 1. List themes
curl http://localhost:8000/api/themes

# 2. Discover topics (default DeepSeek)
curl -X POST http://localhost:8000/api/themes/theme-01/discover \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-01"}'

# 3. Discover topics (BYOK — custom provider)
curl -X POST http://localhost:8000/api/themes/theme-01/discover \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-01","llm_config":{"provider":"openrouter","api_key":"sk-or-v1-...","model":"openai/gpt-4o"}}'

# 4. Generate article (topic-based)
curl -X POST http://localhost:8000/api/themes/theme-01/generate \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-01","topics":["AI Skills in 2026"]}'

# 5. Poll job
curl http://localhost:8000/api/jobs/{job_id}

# 6. Generate article (URL-based)
curl -X POST http://localhost:8000/api/themes/theme-04/generate \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-04","topics":[],"source_url":"https://example.com/article"}'
```

## 11. Git History

```
62992f3 feat: add OpenRouter and SiliconFlow LLM providers
03113a8 feat: complete frontend wizard with SSE + markdown preview
dbe5629 feat: Docker Compose + Next.js scaffold with shadcn/ui
82d3f8a feat: system prompts + job queue + FastAPI app (backend complete)
09882f1 feat: output file manager + pipeline steps + engine
bf2b6e3 feat: 4 LLM provider implementations
b98d57b feat: prompt manager, LLM abstraction, search abstraction
0e11bc8 feat: 5 theme YAML config files
a575da9 feat: Pydantic schemas for all API types
ebccd2b feat: backend scaffolding, config, and dependencies
8552875 Initial: design spec and implementation plan
```
