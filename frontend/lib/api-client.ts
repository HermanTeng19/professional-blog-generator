import type {
  ThemeConfig,
  Topic,
  GenerateRequest,
  JobStatus,
  ArticleListItem,
  ArticleDetail,
  LLMConfig,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} on ${path}: ${body}`);
  }
  return res.json();
}

interface ThemesResponse {
  themes: ThemeConfig[];
}

interface TopicsResponse {
  topics: Topic[];
}

interface GenerateResponse {
  job_id: string;
  status: string;
}

interface ArticlesResponse {
  articles: ArticleListItem[];
}

/** Fetch all available themes. */
export async function fetchThemes(): Promise<ThemeConfig[]> {
  const data = await request<ThemesResponse>("/api/themes");
  return data.themes;
}

/** Run topic discovery for a theme. */
export async function discoverTopics(
  themeId: string,
  llmConfig?: LLMConfig
): Promise<{ topics: Topic[] }> {
  return request<TopicsResponse>(
    `/api/themes/${encodeURIComponent(themeId)}/discover`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme_id: themeId,
        llm_config: llmConfig ?? null,
      }),
    }
  );
}

/** Start a generation job. Returns the job_id. */
export async function startGeneration(
  genRequest: GenerateRequest
): Promise<string> {
  const data = await request<GenerateResponse>(
    `/api/themes/${encodeURIComponent(genRequest.theme_id)}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme_id: genRequest.theme_id,
        topics: genRequest.topics,
        source_url: genRequest.source_url ?? null,
        llm_config: genRequest.llm_config ?? null,
      }),
    }
  );
  return data.job_id;
}

/** Poll a job's status. */
export function getJobStatus(jobId: string): Promise<JobStatus> {
  return request<JobStatus>(`/api/jobs/${encodeURIComponent(jobId)}`);
}

/** List generated articles, optionally filtered by theme. */
export async function listArticles(
  themeId?: string
): Promise<ArticleListItem[]> {
  const params = themeId
    ? `?theme_id=${encodeURIComponent(themeId)}`
    : "";
  const data = await request<ArticlesResponse>(
    `/api/articles${params}`
  );
  return data.articles;
}

/** Fetch a single article by filename. */
export function getArticle(
  filename: string
): Promise<ArticleDetail> {
  return request<ArticleDetail>(
    `/api/articles/${encodeURIComponent(filename)}`
  );
}

/** Update an article's content. */
export function updateArticle(
  filename: string,
  content: string
): Promise<{ status: string; filename: string }> {
  return request<{ status: string; filename: string }>(
    `/api/articles/${encodeURIComponent(filename)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
}

/** Build the EventSource URL for streaming job progress. */
export function createSSEUrl(jobId: string): string {
  return `${BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/stream`;
}
