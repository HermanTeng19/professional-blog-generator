/** ── Theme ── */
export interface ThemeConfig {
  id: string;
  name: string;
  target_platforms: string[];
  output_dir: string;
  word_count_min: number;
  word_count_max: number;
  persona: string;
  tone: string;
  forbidden_phrases: string[];
  topic_discovery_enabled: boolean;
  topic_discovery_queries: string[];
  topic_discovery_result_count: number;
  seo_enabled: boolean;
  seo_include_jsonld: boolean;
  seo_max_title_chars: number;
  seo_max_meta_chars: number;
  model_preference: string;
}

/** ── Topic Discovery ── */
export interface Topic {
  title: string;
  description: string;
  pain_point: string;
  traffic_potential: "low" | "medium" | "high";
  source_urls: string[];
}

/** ── Research ── */
export interface SourceItem {
  url: string;
  title: string;
  key_facts: string[];
  quotes: string[];
}

export interface ResearchAngle {
  query: string;
  sources: SourceItem[];
}

export interface ResearchDossier {
  angles: ResearchAngle[];
  statistics: { value: string; source_url: string }[];
  expert_viewpoints: { expert: string; opinion: string; source_url: string }[];
  raw_text: string;
}

/** ── BYOK ── */
export interface LLMConfig {
  provider: string;
  api_key: string;
  base_url?: string;
  model?: string;
}

export const LLM_PROVIDER_DEFAULTS: Record<string, { label: string; baseUrl: string; model: string }> = {
  deepseek:    { label: "DeepSeek V4 Pro",       baseUrl: "https://api.deepseek.com",        model: "deepseek-v4-pro" },
  openrouter:  { label: "OpenRouter",             baseUrl: "https://openrouter.ai/api/v1",     model: "anthropic/claude-sonnet-4-6" },
  siliconflow: { label: "SiliconFlow",            baseUrl: "https://api.siliconflow.cn/v1",    model: "deepseek-ai/DeepSeek-V3" },
  claude:      { label: "Claude (Anthropic)",     baseUrl: "",                                 model: "claude-sonnet-4-6" },
  openai:      { label: "OpenAI GPT-4o",          baseUrl: "",                                 model: "gpt-4o" },
  kimi:        { label: "Kimi K2 (Moonshot)",     baseUrl: "https://api.moonshot.cn/v1",       model: "kimi-k2" },
};

/** ── Generation ── */
export interface GenerateRequest {
  theme_id: string;
  topics: string[];
  source_url?: string;
  llm_config?: LLMConfig;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress_pct: number;
  current_step?: string;
  message?: string;
  result?: ArticleResult;
  error?: string;
  created_at: string;
}

export interface ArticleResult {
  filename: string;
  file_path: string;
  title: string;
  word_count: number;
  theme_id: string;
  generated_at: string;
}

/** ── Articles ── */
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
  title_tag?: string;
  meta_description?: string;
  json_ld?: string;
  theme_id: string;
  word_count: number;
  generated_at: string;
}

export interface ArticleUpdate {
  content: string;
}

/** ── Wizard ── */
export type WizardStep =
  | "select-theme"
  | "select-topics"
  | "generating"
  | "preview";
