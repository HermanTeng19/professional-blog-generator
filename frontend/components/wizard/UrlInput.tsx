"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LinkIcon,
  AlertCircleIcon,
} from "lucide-react";

import type { ThemeConfig } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface UrlInputProps {
  theme: ThemeConfig;
  onBack: () => void;
  onGenerate: (url: string) => void;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function UrlInput({ theme, onBack, onGenerate }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);

  const valid = isValidUrl(url);
  const showError = touched && url.length > 0 && !valid;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Enter Source URL</CardTitle>
        <CardDescription>
          Paste the URL of an article or video to base your blog post on.{" "}
          <strong>{theme.name}</strong> reads the source and rewrites it in the
          configured tone and persona.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="source-url">
            <LinkIcon className="size-3.5 inline mr-1" />
            Source URL
          </Label>
          <Input
            id="source-url"
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (!touched) setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            className={showError ? "border-destructive" : ""}
          />
          {showError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircleIcon className="size-3" />
              Please enter a valid HTTP or HTTPS URL.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <Button
            className="flex-1"
            disabled={!valid}
            onClick={() => onGenerate(url)}
          >
            Generate Article
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
