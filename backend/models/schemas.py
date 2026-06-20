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


# ── LLM Config (BYOK) ──
class LLMConfig(BaseModel):
    provider: str  # "deepseek" | "openrouter" | "siliconflow" | "claude" | "openai" | "kimi"
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None


# ── Generation ──
class GenerateRequest(BaseModel):
    theme_id: str
    topics: list[str] = []          # Themes 1-3: selected topic titles
    source_url: Optional[str] = None   # Themes 4-5: article/video URL
    llm_config: Optional[LLMConfig] = None  # BYOK: per-request provider override


class JobStatus(BaseModel):
    job_id: str
    status: str  # "queued" | "running" | "completed" | "failed"
    progress_pct: int = 0
    current_step: Optional[str] = None
    message: Optional[str] = None
    result: Optional["ArticleResult"] = None
    error: Optional[str] = None
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
    title_tag: Optional[str] = None
    meta_description: Optional[str] = None
    json_ld: Optional[str] = None
    theme_id: str
    word_count: int
    generated_at: datetime


class ArticleUpdate(BaseModel):
    content: str
