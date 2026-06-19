"""Save, list, read, and update generated articles on disk."""
import re
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import frontmatter

from config import settings
from models.schemas import ArticleResult, ArticleListItem, ArticleDetail


def _slugify(title: str) -> str:
    """Convert a title to a filesystem-safe slug."""
    slug = re.sub(r"[^\w\s-]", "", title)
    slug = re.sub(r"[\s_]+", "-", slug)
    return slug.strip("-")[:80]


def _get_next_number(output_dir: Path) -> int:
    """Get the next sequential number for a filename in the directory."""
    output_dir.mkdir(parents=True, exist_ok=True)
    existing = list(output_dir.glob("*.md"))
    numbers = []
    for f in existing:
        match = re.match(r"(\d+)", f.name)
        if match:
            numbers.append(int(match.group(1)))
    return max(numbers) + 1 if numbers else 1


def save_article(
    content: str,
    title: str,
    theme_id: str,
    output_dir_name: str,
    title_tag: Optional[str] = None,
    meta_description: Optional[str] = None,
    json_ld: Optional[str] = None,
) -> ArticleResult:
    """Save a generated article to disk with SEO frontmatter."""
    base = Path(settings.output_base_path)
    output_dir = base / output_dir_name
    output_dir.mkdir(parents=True, exist_ok=True)

    num = _get_next_number(output_dir)
    slug = _slugify(title)
    filename = f"{num:02d}-{slug}.md"
    file_path = output_dir / filename

    word_count = len(content.split())

    # Build frontmatter
    post = frontmatter.Post(
        content,
        title=title,
        theme_id=theme_id,
        word_count=word_count,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
    if title_tag:
        post["title_tag"] = title_tag
    if meta_description:
        post["meta_description"] = meta_description
    if json_ld:
        post["json_ld"] = json_ld

    file_path.write_text(frontmatter.dumps(post), encoding="utf-8")

    return ArticleResult(
        filename=filename,
        file_path=str(file_path),
        title=title,
        word_count=word_count,
        theme_id=theme_id,
        generated_at=datetime.now(timezone.utc),
    )


def list_articles(theme_id: Optional[str] = None) -> list[ArticleListItem]:
    """List all generated articles, optionally filtered by theme_id."""
    base = Path(settings.output_base_path)
    articles = []

    if theme_id:
        # Look up output_dir from theme
        from prompts.manager import load_theme_config
        config = load_theme_config(theme_id)
        dirs = [config.output_dir]
    else:
        dirs = [d.name for d in base.iterdir() if d.is_dir()]

    for dir_name in dirs:
        dir_path = base / dir_name
        if not dir_path.exists():
            continue
        for md_file in sorted(dir_path.glob("*.md"), reverse=True):
            try:
                post = frontmatter.load(str(md_file))
                articles.append(ArticleListItem(
                    filename=md_file.name,
                    theme_id=post.get("theme_id", dir_name),
                    title=post.get("title", md_file.stem),
                    word_count=post.get("word_count", 0),
                    generated_at=post.get("generated_at", datetime.now(timezone.utc)),
                ))
            except Exception:
                continue

    return sorted(articles, key=lambda a: a.generated_at, reverse=True)


def read_article(filename: str) -> ArticleDetail:
    """Read a full article by filename, searching all output directories."""
    base = Path(settings.output_base_path)
    for dir_path in base.iterdir():
        if not dir_path.is_dir():
            continue
        file_path = dir_path / filename
        if file_path.exists():
            post = frontmatter.load(str(file_path))
            return ArticleDetail(
                filename=filename,
                content=post.content,
                title_tag=post.get("title_tag"),
                meta_description=post.get("meta_description"),
                json_ld=post.get("json_ld"),
                theme_id=post.get("theme_id", dir_path.name),
                word_count=post.get("word_count", 0),
                generated_at=post.get(
                    "generated_at",
                    datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc),
                ),
            )
    raise FileNotFoundError(f"Article not found: {filename}")


def update_article(filename: str, content: str) -> None:
    """Update an existing article's content in place."""
    base = Path(settings.output_base_path)
    for dir_path in base.iterdir():
        if not dir_path.is_dir():
            continue
        file_path = dir_path / filename
        if file_path.exists():
            post = frontmatter.load(str(file_path))
            post.content = content
            post["word_count"] = len(content.split())
            file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
            return
    raise FileNotFoundError(f"Article not found: {filename}")
