"""Pipeline orchestrator — strings the 4 steps together with progress reporting."""
from __future__ import annotations

import asyncio
import re
from typing import Callable, Awaitable, Optional

from prompts.manager import load_theme_config
from pipeline.steps import discover_topics, deep_research, generate_article
from output.file_manager import save_article as save_to_disk
from models.schemas import LLMConfig, ResearchDossier
from utils.youtube import extract_video_id, fetch_youtube_transcript


async def run_pipeline(
    theme_id: str,
    topics: list[str],
    source_url: Optional[str] = None,
    progress_callback: Optional[Callable[[str, str, int], Awaitable[None]]] = None,
    llm_config: Optional[LLMConfig] = None,
) -> list[dict]:
    """Execute the full 4-step pipeline for each topic.

    Args:
        theme_id: e.g., "theme-01"
        topics: List of topic titles to generate articles for
        source_url: For themes 4-5, the source article/video URL
        progress_callback: Async (step, message, pct) for SSE streaming

    Returns:
        List of dicts with result info for each generated article.
    """
    theme_config = load_theme_config(theme_id)
    results = []

    async def report(step: str, message: str, pct: int):
        if progress_callback:
            await progress_callback(step, message, pct)

    # Normalize: for URL-based themes with empty topics, generate one article from the URL
    work_items = topics if topics else [source_url or "Untitled"]
    total = len(work_items)
    for idx, topic in enumerate(work_items):
        base_pct = int((idx / total) * 100)
        await report("search", f"Researching: {topic[:80]}...", base_pct + 5)

        # Branch: themes 4-5 skip topic discovery, use source URL directly
        if source_url:
            # Detect YouTube URLs — extract transcript instead of raw HTML
            video_id = extract_video_id(source_url)
            if video_id:
                await report("research", f"Extracting YouTube transcript for video {video_id}...", base_pct + 5)
                try:
                    raw_content = await fetch_youtube_transcript(source_url)
                except Exception as e:
                    raw_content = f"Failed to fetch YouTube transcript: {e}\n\nURL: {source_url}"
                await report("research", f"Transcript extracted: {len(raw_content)} chars", base_pct + 20)
            else:
                from search.factory import get_search_provider
                search = get_search_provider()
                try:
                    raw_content = await search.fetch_url(source_url)
                except Exception:
                    raw_content = f"Could not fetch {source_url}"
                await report("research", f"Source content fetched: {len(raw_content)} chars", base_pct + 20)

            dossier = ResearchDossier(
                angles=[],
                statistics=[],
                expert_viewpoints=[],
                raw_text=raw_content[:15000],
            )
        else:
            # Standard flow: deep research on the topic
            dossier = await deep_research(topic, theme_config, llm_config=llm_config)
            await report("research", f"Research complete: {len(dossier.angles)} angles, {len(dossier.statistics)} stats", base_pct + 25)

        # Step 3: Generate
        await report("generate", f"Writing article for: {topic[:80]}...", base_pct + 30)

        async def stream_cb(chunk: str):
            """Bridge: call progress callback per chunk. We batch updates to avoid flooding."""
            pass  # Per-chunk streaming is handled at the worker level

        full_text, title_tag, meta_desc, json_ld = await generate_article(
            dossier=dossier,
            theme_config=theme_config,
            stream_callback=None,  # Full response, non-streaming in pipeline
            llm_config=llm_config,
        )

        await report("generate", "Article draft complete", base_pct + 70)

        # Step 4: Save
        await report("save", "Saving article to disk...", base_pct + 80)

        # Extract H1 as title
        h1_match = re.search(r"^#\s+(.+)$", full_text, re.MULTILINE)
        article_title = h1_match.group(1) if h1_match else topic

        result = save_to_disk(
            content=full_text,
            title=article_title,
            theme_id=theme_id,
            output_dir_name=theme_config.output_dir,
            title_tag=title_tag,
            meta_description=meta_desc,
            json_ld=json_ld,
        )

        await report("complete", f"Saved: {result.filename}", base_pct + 95)

        results.append({
            "filename": result.filename,
            "file_path": result.file_path,
            "title": result.title,
            "word_count": result.word_count,
        })

    await report("done", f"All {len(results)} articles generated", 100)
    return results
