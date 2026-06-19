"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileTextIcon,
  PencilIcon,
  EyeIcon,
  SaveIcon,
  Loader2Icon,
  RefreshCwIcon,
  ArrowLeftIcon,
  RotateCcwIcon,
} from "lucide-react";

import { getArticle, listArticles, updateArticle } from "@/lib/api-client";
import type {
  ArticleDetail,
  ArticleListItem,
  ArticleResult,
} from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Mode = "preview" | "edit";

interface ArticlePreviewProps {
  results: ArticleResult[];
  onNew: () => void;
}

export default function ArticlePreview({ results, onNew }: ArticlePreviewProps) {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [selectedFn, setSelectedFn] = useState<string>(results[0]?.filename ?? "");
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [editContent, setEditContent] = useState("");
  const [mode, setMode] = useState<Mode>("preview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load article list once
  useEffect(() => {
    listArticles()
      .then(setArticles)
      .catch(() => {
        // Fallback: use the passed-in results for file list
        setArticles(
          results.map((r) => ({
            filename: r.filename,
            theme_id: r.theme_id ?? "",
            title: r.title,
            word_count: r.word_count,
            generated_at: r.generated_at ?? "",
          }))
        );
      });
  }, [results]);

  // Load selected article
  const loadArticle = useCallback(async (filename: string) => {
    setLoading(true);
    setError(null);
    setSaveMsg(null);
    setMode("preview");
    try {
      const data = await getArticle(filename);
      setArticle(data);
      setEditContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFn) loadArticle(selectedFn);
  }, [selectedFn, loadArticle]);

  const handleSave = async () => {
    if (!article) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateArticle(article.filename, editContent);
      setArticle({ ...article, content: editContent });
      setSaveMsg("Saved successfully!");
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const fileList = articles.length > 0 ? articles : results.map((r) => ({
    filename: r.filename,
    theme_id: r.theme_id ?? "",
    title: r.title,
    word_count: r.word_count,
    generated_at: r.generated_at ?? "",
  }));

  return (
    <div className="w-full max-w-5xl space-y-4">
      {/* File tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Generated Articles</CardTitle>
          <CardDescription>
            {fileList.length} article{fileList.length !== 1 ? "s" : ""} — click
            to preview, then edit or save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {fileList.map((a) => (
              <Button
                key={a.filename}
                variant={selectedFn === a.filename ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFn(a.filename)}
              >
                <FileTextIcon className="size-3.5" />
                {a.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Article content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">
                {article
                  ? article.filename.replace(/\.(md|mdx|txt)$/, "").replace(/[-_]/g, " ")
                  : "Loading..."}
              </CardTitle>
              {article && (
                <CardDescription>
                  {article.word_count} words &middot;{" "}
                  {new Date(article.generated_at).toLocaleDateString()}
                </CardDescription>
              )}
            </div>

            {article && (
              <div className="flex gap-2">
                {mode === "preview" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMode("edit");
                      setEditContent(article.content);
                    }}
                  >
                    <PencilIcon className="size-3.5" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMode("preview")}
                    >
                      <EyeIcon className="size-3.5" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <SaveIcon className="size-3.5" />
                      )}
                      Save
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading article...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => selectedFn && loadArticle(selectedFn)}
              >
                <RefreshCwIcon className="size-3.5" />
                Retry
              </Button>
            </div>
          )}

          {saveMsg && (
            <div className="mb-3 rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {saveMsg}
            </div>
          )}

          {!loading && !error && article && mode === "preview" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {article.content}
              </ReactMarkdown>
            </div>
          )}

          {!loading && !error && article && mode === "edit" && (
            <Textarea
              className="min-h-[400px] font-mono text-sm"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
          )}

          {!loading && !error && !article && (
            <p className="py-16 text-center text-muted-foreground">
              Select a file above to preview it.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onNew}>
          <RotateCcwIcon className="size-4" />
          Start New Generation
        </Button>
      </div>
    </div>
  );
}
