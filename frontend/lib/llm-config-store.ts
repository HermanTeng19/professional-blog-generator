import type { LLMConfig } from "./types";

const STORAGE_KEY = "byok_llm_config";

export function loadLLMConfig(): LLMConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.provider || !parsed.api_key) return null;
    return parsed as LLMConfig;
  } catch {
    return null;
  }
}

export function saveLLMConfig(config: LLMConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage full or unavailable — silently accept
  }
}

export function clearLLMConfig(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
