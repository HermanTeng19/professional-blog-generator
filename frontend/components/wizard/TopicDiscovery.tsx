"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2Icon,
  TrendingUpIcon,
  TrendingDownIcon,
  ZapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  SparklesIcon,
  SearchIcon,
  BarChart3Icon,
  BrainIcon,
  TargetIcon,
} from "lucide-react";

import { discoverTopics } from "@/lib/api-client";
import type { Topic, ThemeConfig, LLMConfig } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

function TrafficIcon({ level }: { level: string }) {
  switch (level) {
    case "high":
      return <TrendingUpIcon className="size-4 text-green-600" />;
    case "medium":
      return <ZapIcon className="size-4 text-amber-500" />;
    default:
      return <TrendingDownIcon className="size-4 text-muted-foreground" />;
  }
}

interface TopicDiscoveryProps {
  theme: ThemeConfig;
  onBack: () => void;
  onGenerate: (topics: string[]) => void;
  llmConfig: LLMConfig | null;
}

const STATUS_STEPS = [
  { icon: SearchIcon, text: "Scanning trending topics and discussions..." },
  { icon: BarChart3Icon, text: "Analyzing search volume and traffic potential..." },
  { icon: BrainIcon, text: "Generating topic suggestions with AI..." },
  { icon: TargetIcon, text: "Evaluating relevance and ranking results..." },
  { icon: SparklesIcon, text: "Finalizing recommendations..." },
];

export default function TopicDiscovery({
  theme,
  onBack,
  onGenerate,
  llmConfig,
}: TopicDiscoveryProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const loadingStartRef = useRef(Date.now());

  // Fetch topics on mount
  useEffect(() => {
    discoverTopics(theme.id, llmConfig ?? undefined)
      .then((data) => setTopics(data.topics))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [theme.id]);

  // Cycle status messages every 2.2s while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const toggleTopic = (title: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // Loading — animated progress bar
  if (loading) {
    const CurrentIcon = STATUS_STEPS[statusIndex].icon;
    const elapsed = Math.floor((Date.now() - loadingStartRef.current) / 1000);

    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2Icon className="size-5 animate-spin text-primary" />
            Discovering Topics
          </CardTitle>
          <CardDescription>
            Analyzing trending topics for{" "}
            <strong>{theme.name}</strong>
            {elapsed > 5 && (
              <span className="text-muted-foreground">
                {" "}&mdash; still working, good topics take time&hellip;
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Indeterminate progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-0 animate-indeterminate-bar">
              <div className="h-full w-2/5 rounded-full bg-primary" />
            </div>
          </div>

          {/* Cycling status step */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
            <CurrentIcon className="size-5 shrink-0 text-primary" />
            <span className="text-sm font-medium">
              {STATUS_STEPS[statusIndex].text}
            </span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {STATUS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-full transition-all duration-500 ${
                  i === statusIndex
                    ? "bg-primary scale-125"
                    : i < statusIndex
                    ? "bg-primary/30"
                    : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error
  if (error) {
    return (
      <Card className="w-full max-w-lg border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Discovery Failed</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              setError(null);
              setStatusIndex(0);
              loadingStartRef.current = Date.now();
              discoverTopics(theme.id, llmConfig ?? undefined)
                .then((data) => setTopics(data.topics))
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty
  if (topics.length === 0) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>No Topics Found</CardTitle>
          <CardDescription>
            No trending topics were discovered for this theme. Try again or go back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Select Topics</CardTitle>
        <CardDescription>
          Choose topics to generate articles for.{" "}
          <span className="text-muted-foreground">
            ({selected.size} selected)
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {topics.map((topic) => {
          const isSelected = selected.has(topic.title);
          return (
            <label
              key={topic.title}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                isSelected ? "border-primary bg-primary/5" : ""
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleTopic(topic.title)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <TrafficIcon level={topic.traffic_potential} />
                  <span className="font-medium text-sm">{topic.title}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {topic.description}
                </p>
              </div>
            </label>
          );
        })}

        {selected.size === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircleIcon className="size-4" />
            Select at least one topic to continue.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <Button
            className="flex-1"
            disabled={selected.size === 0}
            onClick={() => onGenerate(Array.from(selected))}
          >
            Generate Articles
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
