"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, CheckCircle2Icon, XCircleIcon, FileTextIcon } from "lucide-react";

import { subscribeToJob } from "@/lib/sse-client";
import type { ArticleResult, JobStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface GenerationProgressProps {
  jobId: string;
  onComplete: (results: ArticleResult[]) => void;
  onError: (error: string) => void;
}

export default function GenerationProgress({
  jobId,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [results, setResults] = useState<ArticleResult[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cleanup = subscribeToJob(jobId, {
      onProgress: (s) => setStatus(s),
      onComplete: (s) => {
        setStatus(s);
        // Extract results from the job; the backend stores it as an array
        const rawResult = (s as unknown as Record<string, unknown>).result;
        if (Array.isArray(rawResult)) {
          const articles = rawResult as ArticleResult[];
          setResults(articles);
          onComplete(articles);
        } else if (rawResult && typeof rawResult === "object") {
          // Single result object
          setResults([rawResult as ArticleResult]);
          onComplete([rawResult as ArticleResult]);
        } else {
          // No results — treat as completed
          onComplete([]);
        }
      },
      onError: (err) => onError(err),
    });

    cleanupRef.current = cleanup;
    return () => cleanup();
  }, [jobId, onComplete, onError]);

  const pct = status?.progress_pct ?? 0;
  const step = status?.current_step ?? "Connecting...";
  const message = status?.message ?? "Waiting for job to start...";
  const isFailed = status?.status === "failed";
  const isComplete = status?.status === "completed";

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isFailed ? (
            <XCircleIcon className="size-5 text-destructive" />
          ) : isComplete ? (
            <CheckCircle2Icon className="size-5 text-green-600" />
          ) : (
            <Loader2Icon className="size-5 animate-spin text-primary" />
          )}
          {isFailed
            ? "Generation Failed"
            : isComplete
            ? "Generation Complete"
            : "Generating Articles"}
        </CardTitle>
        <CardDescription>Job: {jobId}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress value={isFailed ? 0 : pct} />
          {status && (
            <p className="text-xs text-right text-muted-foreground tabular-nums">
              {isFailed ? "—" : `${pct}%`}
            </p>
          )}
        </div>

        {/* Step label */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {step}
          </p>
          <p className="mt-0.5 text-sm">{message}</p>
        </div>

        {/* Error message */}
        {isFailed && status?.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{status.error}</p>
          </div>
        )}

        {/* Generated file list on complete */}
        {isComplete && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {results.length} article{results.length !== 1 ? "s" : ""} generated:
            </p>
            <ul className="space-y-1">
              {results.map((r) => (
                <li
                  key={r.filename}
                  className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                >
                  <FileTextIcon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
                    {r.word_count} words
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
