# Professional Blog Generator

AI-powered blog article generation with a 4-step pipeline — Topic Discovery → Deep Research → Article Generation → SEO-optimized Output. Bring your own LLM keys, pick a theme, and publish.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.9.6-blue)](https://www.python.org/)

## Features

- **6 LLM Providers** — DeepSeek V4 Pro (default), OpenRouter (300+ models), SiliconFlow, Claude (Anthropic SDK), OpenAI GPT-4o, Kimi K2
- **BYOK (Bring Your Own Key)** — API keys stored in your browser only, never on the server. Gear-button dialog with provider/model/key selection, persisted in `localStorage`
- **4-Step Async Pipeline** — Topic Discovery → Deep Research → Article Generation → Save with SEO metadata (JSON-LD, title tag, meta description)
- **SSE Real-Time Streaming** — Live progress updates pushed to the wizard UI during generation
- **5 Content Themes** — Career & Job Search, Professional Tech, AI Applications, Article Rewrites, YouTube Summaries
- **2 Search Providers** — Tavily (active) + Brave (configured) for deep web research
- **Smart Wizard UI** — Step-by-step flow with animated progress indicators, theme selector with metadata preview, and topic checkboxes
- **In-Browser Editor** — Preview and edit generated Markdown articles, save back to disk
- **SEO-Ready Output** — Every article includes JSON-LD schema, `<title>` tag, and `<meta description>`, auto-numbered into theme-sorted directories

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)              │
│  ThemeSelector → TopicDiscovery → Progress → Preview  │
│                    ↑ SSE streaming                    │
└────────────────────┬─────────────────────────────────┘
                     │ POST /api/themes/{id}/generate
┌────────────────────▼─────────────────────────────────┐
│                  Backend (FastAPI)                    │
│  main.py → pipeline/engine.py → pipeline/steps.py    │
│              ├── discover_topics()                    │
│              ├── deep_research()                      │
│              └── generate_article()                   │
│         llm/*.py + search/*.py + prompts/             │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.9+ with `venv`
- Node.js 18+
- API keys for at least one LLM provider and one search provider

### 1. Clone & Configure Backend

```bash
git clone https://github.com/HermanTeng19/professional-blog-generator.git
cd professional-blog-generator/backend

# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env — fill in at least one LLM key + one search key
```

**Minimal `.env`:**
```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-key-here
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=tvly-your-key-here
OUTPUT_BASE_PATH=/path/to/your/output/dir
```

### 2. Start Backend

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend runs at **http://localhost:8000** — check `/api/health` to verify.

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**.

### 4. Generate Your First Article

1. Open http://localhost:3000
2. Choose a theme (e.g. "theme-02: Professional Technology Articles")
3. Wait for topic discovery to suggest trending topics
4. Select topics and click **Generate Articles**
5. Watch the real-time progress bar
6. Preview, edit, and save your article

## BYOK — Bring Your Own Key

Click the gear icon (⚙️) on the theme selector to configure your own LLM provider:

| Provider | Default Model | Base URL |
|----------|--------------|----------|
| DeepSeek V4 Pro | `deepseek-v4-pro` | `https://api.deepseek.com` |
| OpenRouter | `anthropic/claude-sonnet-4-6` | `https://openrouter.ai/api/v1` |
| SiliconFlow | `deepseek-ai/DeepSeek-V3` | `https://api.siliconflow.cn/v1` |
| Claude (Anthropic) | `claude-sonnet-4-6` | *(Anthropic SDK)* |
| OpenAI GPT-4o | `gpt-4o` | *(OpenAI SDK)* |
| Kimi K2 (Moonshot) | `kimi-k2` | `https://api.moonshot.cn/v1` |

Keys are stored in your browser's `localStorage` and sent per-request — never persisted on the server.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/themes` | List all 5 content themes |
| `POST` | `/api/themes/{id}/discover` | Discover trending topics (LLM-powered) |
| `POST` | `/api/themes/{id}/research` | Deep research on a topic |
| `POST` | `/api/themes/{id}/generate` | Start article generation → returns `job_id` |
| `GET` | `/api/jobs/{id}` | Poll job status (progress %, current step) |
| `GET` | `/api/jobs/{id}/stream` | SSE stream — real-time progress events |
| `GET` | `/api/articles` | List all generated articles |
| `GET` | `/api/articles/{filename}` | Get full article with SEO metadata |
| `PUT` | `/api/articles/{filename}` | Update article content |
| `GET` | `/api/health` | Health check |

## Content Themes

| ID | Theme | Word Count | Persona |
|----|-------|-----------|---------|
| `theme-01` | Career & Job Search | 1,500–2,000 | Senior FAANG Recruiter (12+ yrs) |
| `theme-02` | Professional Technology | 2,000–2,500 | Senior Data/IT Architect, Banking (15+ yrs) |
| `theme-03` | AI Application Technology | 1,500–2,500 | AI/ML Production Practitioner |
| `theme-04` | Revise External Articles | 1,500–2,500 | Tech Commentator (contrarian analysis) |
| `theme-05` | Tech Video Summaries | 1,500–2,500 | Knowledge Curator (Obsidian-ready) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 16.2.9 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui v4 (@base-ui/react) |
| Backend Framework | FastAPI + Uvicorn |
| Validation | Pydantic v2 |
| LLM SDKs | OpenAI Python SDK + Anthropic Python SDK |
| Prompt Templates | Jinja2 Markdown |
| Search APIs | Tavily, Brave |
| Output Format | Markdown + YAML frontmatter + JSON-LD |

## Project Structure

```
professional-blog-generator/
├── backend/
│   ├── main.py              # FastAPI app — 10 endpoints + SSE
│   ├── config.py             # Pydantic-settings from .env
│   ├── llm/                  # 6 LLM provider implementations
│   ├── search/               # 2 search provider implementations
│   ├── pipeline/             # 4-step generation engine
│   ├── prompts/              # 5 theme YAMLs + 5 Jinja2 templates
│   ├── jobs/                 # In-memory job queue
│   ├── output/               # Article file I/O
│   └── models/               # Pydantic schemas
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   └── wizard/           # ThemeSelector, TopicDiscovery, etc.
│   └── lib/                  # API client, SSE client, types, BYOK store
├── docs/                     # Design specs & implementation plans
├── docker-compose.yml        # Redis 7 alpine
└── README.md
```

## Testing the API

```bash
# List themes
curl http://localhost:8000/api/themes

# Discover topics with default LLM
curl -X POST http://localhost:8000/api/themes/theme-01/discover \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-01"}'

# Discover topics with BYOK
curl -X POST http://localhost:8000/api/themes/theme-01/discover \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-01","llm_config":{"provider":"openrouter","api_key":"sk-or-v1-...","model":"openai/gpt-4o"}}'

# Generate article
curl -X POST http://localhost:8000/api/themes/theme-01/generate \
  -H "Content-Type: application/json" \
  -d '{"theme_id":"theme-01","topics":["AI Skills in 2026"]}'

# Poll job
curl http://localhost:8000/api/jobs/{job_id}

# SSE stream
curl -N http://localhost:8000/api/jobs/{job_id}/stream
```

## License

MIT — use it, fork it, ship it.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
