"use client";

import { useEffect, useState } from "react";
import {
  Loader2Icon,
  TrendingUpIcon,
  TrendingDownIcon,
  ZapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "lucide-react";

import { discoverTopics } from "@/lib/api-client";
import type { Topic, ThemeConfig } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
}

export default function TopicDiscovery({
  theme,
  onBack,
  onGenerate,
}: TopicDiscoveryProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    discoverTopics(theme.id)
      .then((data) => setTopics(data.topics))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [theme.id]);

  const toggleTopic = (title: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Discovering Topics</CardTitle>
          <CardDescription>
            Scanning trending topics for <strong>{theme.name}</strong>...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-muted"
            />
          ))}
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
              discoverTopics(theme.id)
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
