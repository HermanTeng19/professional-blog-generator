"use client";

import { useEffect, useState } from "react";
import {
  Settings2Icon,
  EyeIcon,
  EyeOffIcon,
  Trash2Icon,
  SaveIcon,
} from "lucide-react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import type { LLMConfig } from "@/lib/types";
import { LLM_PROVIDER_DEFAULTS } from "@/lib/types";

interface LLMSettingsProps {
  config: LLMConfig | null;
  onChange: (config: LLMConfig) => void;
  onClear: () => void;
}

export default function LLMSettings({
  config,
  onChange,
  onClear,
}: LLMSettingsProps) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState(config?.provider ?? "deepseek");
  const [apiKey, setApiKey] = useState(config?.api_key ?? "");
  const [baseUrl, setBaseUrl] = useState(
    config?.base_url ?? LLM_PROVIDER_DEFAULTS.deepseek.baseUrl
  );
  const [model, setModel] = useState(
    config?.model ?? LLM_PROVIDER_DEFAULTS.deepseek.model
  );
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState("");

  // Reset form when dialog opens or config changes externally
  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setApiKey(config.api_key);
      setBaseUrl(config.base_url ?? LLM_PROVIDER_DEFAULTS[config.provider]?.baseUrl ?? "");
      setModel(config.model ?? LLM_PROVIDER_DEFAULTS[config.provider]?.model ?? "");
    }
  }, [config, open]);

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const defaults = LLM_PROVIDER_DEFAULTS[value];
    if (defaults) {
      setBaseUrl(defaults.baseUrl);
      setModel(defaults.model);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      setKeyError("API key is required");
      return;
    }
    setKeyError("");
    onChange({
      provider,
      api_key: apiKey.trim(),
      base_url: baseUrl.trim() || undefined,
      model: model.trim() || undefined,
    });
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
    // Reset to defaults
    const first = Object.keys(LLM_PROVIDER_DEFAULTS)[0];
    setProvider(first);
    setApiKey("");
    setBaseUrl(LLM_PROVIDER_DEFAULTS[first].baseUrl);
    setModel(LLM_PROVIDER_DEFAULTS[first].model);
    setShowKey(false);
    setKeyError("");
    setOpen(false);
  };

  const hasConfig = config !== null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        aria-label="Configure LLM"
      >
        <Settings2Icon className="size-4" />
        {hasConfig && (
          <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
        <span className="hidden sm:inline">LLM</span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure LLM Provider</DialogTitle>
          <DialogDescription>
            Bring your own API key to use any supported LLM provider.
            Keys are stored in your browser only and never saved on the server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Provider Select */}
          <div className="space-y-1.5">
            <Label htmlFor="llm-provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="llm-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LLM_PROVIDER_DEFAULTS).map(([key, def]) => (
                  <SelectItem key={key} value={key}>
                    {def.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label htmlFor="llm-api-key">API Key</Label>
            <div className="relative">
              <Input
                id="llm-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (keyError) setKeyError("");
                }}
                placeholder="sk-..."
                className={keyError ? "border-destructive pr-10" : "pr-10"}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            </div>
            {keyError && (
              <p className="text-xs text-destructive">{keyError}</p>
            )}
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <Label htmlFor="llm-base-url">Base URL</Label>
            <Input
              id="llm-base-url"
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Default"
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Auto-filled per provider. Leave blank for default.
            </p>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label htmlFor="llm-model">Model</Label>
            <Input
              id="llm-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model name"
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Auto-filled per provider. Editable for custom models.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!hasConfig}
          >
            <Trash2Icon className="size-4" />
            Clear
          </Button>
          <Button onClick={handleSave}>
            <SaveIcon className="size-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
