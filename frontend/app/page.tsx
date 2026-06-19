"use client";

import { useCallback, useState } from "react";
import { SparklesIcon } from "lucide-react";

import { startGeneration } from "@/lib/api-client";
import type { ArticleResult, ThemeConfig, WizardStep } from "@/lib/types";

import ThemeSelector from "@/components/wizard/ThemeSelector";
import TopicDiscovery from "@/components/wizard/TopicDiscovery";
import UrlInput from "@/components/wizard/UrlInput";
import GenerationProgress from "@/components/wizard/GenerationProgress";
import ArticlePreview from "@/components/wizard/ArticlePreview";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "select-theme", label: "Theme" },
  { key: "select-topics", label: "Topics" },
  { key: "generating", label: "Generate" },
  { key: "preview", label: "Preview" },
];

export default function Home() {
  const [step, setStep] = useState<WizardStep>("select-theme");
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string>("");
  const [results, setResults] = useState<ArticleResult[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  // Step 1 → Step 2
  const handleThemeSelected = useCallback((t: ThemeConfig) => {
    setTheme(t);
    setTopics([]);
    setSourceUrl(null);
    setJobId("");
    setResults([]);
    setGenError(null);
    setStep("select-topics");
  }, []);

  // Step 2 (TopicDiscovery) → Step 3
  const handleTopicsGenerate = useCallback(
    async (selectedTopics: string[]) => {
      if (!theme) return;
      setTopics(selectedTopics);
      setSourceUrl(null);
      setGenError(null);
      setStep("generating");

      try {
        const id = await startGeneration({
          theme_id: theme.id,
          topics: selectedTopics,
        });
        setJobId(id);
      } catch (err) {
        setGenError(err instanceof Error ? err.message : "Failed to start generation");
      }
    },
    [theme]
  );

  // Step 2 (UrlInput) → Step 3
  const handleUrlGenerate = useCallback(
    async (url: string) => {
      if (!theme) return;
      setSourceUrl(url);
      setTopics([]);
      setGenError(null);
      setStep("generating");

      try {
        const id = await startGeneration({
          theme_id: theme.id,
          topics: [],
          source_url: url,
        });
        setJobId(id);
      } catch (err) {
        setGenError(err instanceof Error ? err.message : "Failed to start generation");
      }
    },
    [theme]
  );

  // Step 2 → Step 1
  const handleBackToTheme = useCallback(() => {
    setStep("select-theme");
  }, []);

  // Step 3 → Step 4
  const handleGenerationComplete = useCallback((r: ArticleResult[]) => {
    setResults(r);
    setStep("preview");
  }, []);

  // Step 3 error
  const handleGenerationError = useCallback((err: string) => {
    setGenError(err);
  }, []);

  // Step 4 → reset to Step 1
  const handleNewGeneration = useCallback(() => {
    setStep("select-theme");
    setTheme(null);
    setTopics([]);
    setSourceUrl(null);
    setJobId("");
    setResults([]);
    setGenError(null);
  }, []);

  return (
    <div className="flex flex-col flex-1 w-full max-w-3xl px-4 py-8">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
          <SparklesIcon className="size-6 text-primary" />
          Professional Blog Generator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered blog articles — pick a theme, choose topics, and publish.
        </p>
      </header>

      {/* Step indicator */}
      <nav className="mb-8" aria-label="Progress">
        <ol className="flex items-center justify-center gap-2">
          {STEPS.map((s, idx) => {
            const isActive = idx === currentStepIdx;
            const isDone = idx < currentStepIdx;
            return (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center size-8 rounded-full text-xs font-semibold border transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isDone
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={`hidden sm:inline text-xs font-medium ${
                    isActive
                      ? "text-foreground"
                      : isDone
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <span
                    className={`hidden sm:block w-8 h-px ${
                      idx < currentStepIdx
                        ? "bg-primary"
                        : "bg-border"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Main content */}
      <main className="flex justify-center">
        {step === "select-theme" && (
          <ThemeSelector onNext={handleThemeSelected} />
        )}

        {step === "select-topics" && theme && (
          theme.topic_discovery_enabled ? (
            <TopicDiscovery
              theme={theme}
              onBack={handleBackToTheme}
              onGenerate={handleTopicsGenerate}
            />
          ) : (
            <UrlInput
              theme={theme}
              onBack={handleBackToTheme}
              onGenerate={handleUrlGenerate}
            />
          )
        )}

        {step === "generating" && (
          genError ? (
            <div className="w-full max-w-lg space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-semibold">Generation Error</p>
                <p className="mt-1">{genError}</p>
              </div>
              <div className="flex gap-3">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                  onClick={() => {
                    setGenError(null);
                    setStep("select-topics");
                  }}
                >
                  &larr; Back to Topics
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/80"
                  onClick={() => {
                    if (topics.length > 0) handleTopicsGenerate(topics);
                    else if (sourceUrl) handleUrlGenerate(sourceUrl);
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : jobId ? (
            <GenerationProgress
              jobId={jobId}
              onComplete={handleGenerationComplete}
              onError={handleGenerationError}
            />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Starting generation...
            </div>
          )
        )}

        {step === "preview" && (
          <ArticlePreview
            results={results}
            onNew={handleNewGeneration}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-12 text-center text-xs text-muted-foreground">
        Professional Blog Generator &mdash; Powered by AI
      </footer>
    </div>
  );
}
