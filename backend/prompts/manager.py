"""Load theme YAML configs and system prompt Markdown templates."""
from pathlib import Path

import yaml
from jinja2 import Template

from models.schemas import ThemeConfig

PROMPTS_DIR = Path(__file__).parent


def load_theme_config(theme_id: str) -> ThemeConfig:
    """Load a theme YAML config by ID and return a validated ThemeConfig."""
    # Search all theme-*.yaml files for the matching id field
    for config_path in sorted(PROMPTS_DIR.glob("themes/theme-*.yaml")):
        with open(config_path) as f:
            candidate = yaml.safe_load(f)
        if candidate.get("id") == theme_id:
            raw = candidate
            break
    else:
        raise FileNotFoundError(
            f"Theme config not found for id: {theme_id}. "
            f"Checked {list(PROMPTS_DIR.glob('themes/theme-*.yaml'))}"
        )
    raw["word_count_min"] = raw.pop("word_count_min", raw.get("word_count_min", 1500))
    raw["word_count_max"] = raw.pop("word_count_max", raw.get("word_count_max", 2500))
    raw["topic_discovery_enabled"] = raw.pop("topic_discovery_enabled", True)
    raw["topic_discovery_queries"] = raw.pop("topic_discovery_queries", [])
    raw["topic_discovery_result_count"] = raw.pop("topic_discovery_result_count", 5)
    raw["seo_enabled"] = raw.pop("seo_enabled", True)
    raw["seo_include_jsonld"] = raw.pop("seo_include_jsonld", True)
    raw["seo_max_title_chars"] = raw.pop("seo_max_title_chars", 60)
    raw["seo_max_meta_chars"] = raw.pop("seo_max_meta_chars", 160)
    raw["model_preference"] = raw.pop("model_preference", "claude")
    return ThemeConfig(**raw)


def load_system_prompt(theme_id: str) -> str:
    """Load the raw system prompt Markdown template for a theme."""
    prompt_path = PROMPTS_DIR / "system" / f"{theme_id}-system.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"System prompt not found: {prompt_path}")

    with open(prompt_path) as f:
        return f.read()


def render_prompt(template_str: str, context: dict) -> str:
    """Render a Jinja2 template string with the given context variables."""
    template = Template(template_str)
    return template.render(**context)


def list_themes() -> list[dict]:
    """List all available themes with basic metadata (no full config)."""
    themes = []
    for config_path in sorted(PROMPTS_DIR.glob("themes/theme-*.yaml")):
        with open(config_path) as f:
            raw = yaml.safe_load(f)
        themes.append({
            "id": raw["id"],
            "name": raw["name"],
            "target_platforms": raw.get("target_platforms", []),
            "output_dir": raw.get("output_dir", ""),
            "topic_discovery_enabled": raw.get("topic_discovery_enabled", True),
        })
    return themes
