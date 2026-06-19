"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, ChevronRightIcon, PaletteIcon } from "lucide-react";

import { fetchThemes } from "@/lib/api-client";
import type { ThemeConfig } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ThemeSelectorProps {
  onNext: (theme: ThemeConfig) => void;
}

export default function ThemeSelector({ onNext }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchThemes()
      .then((data) => {
        setThemes(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedTheme = themes.find((t) => t.id === selectedId);

  if (loading) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading themes...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-lg border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Failed to load themes</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (themes.length === 0) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="py-16 text-center text-muted-foreground">
          No themes available. Add theme YAML files to the backend.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Choose a Theme</CardTitle>
        <CardDescription>
          Select a content theme to generate blog articles for.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTheme && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <PaletteIcon className="size-4 text-primary" />
              <span className="font-semibold">{selectedTheme.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>Persona:</span>
              <span className="text-foreground">{selectedTheme.persona}</span>
              <span>Tone:</span>
              <span className="text-foreground">{selectedTheme.tone}</span>
              <span>Words:</span>
              <span className="text-foreground">
                {selectedTheme.word_count_min}&ndash;{selectedTheme.word_count_max}
              </span>
              <span>Platforms:</span>
              <span className="text-foreground">
                {selectedTheme.target_platforms.join(", ")}
              </span>
              <span>Input:</span>
              <span className="text-foreground">
                {selectedTheme.topic_discovery_enabled
                  ? "Topic Discovery"
                  : "URL Input"}
              </span>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!selectedId}
          onClick={() => selectedTheme && onNext(selectedTheme)}
        >
          Next
          <ChevronRightIcon className="ml-1 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
