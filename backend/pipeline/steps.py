"""Individual pipeline step implementations."""
from __future__ import annotations

import json
import re
from typing import Optional

from llm.factory import get_llm_provider
from search.factory import get_search_provider
from prompts.manager import load_system_prompt, render_prompt
from models.schemas import Topic, ResearchDossier, ResearchAngle, SourceItem


def _safe_parse_json(text: str, expect_array: bool = True) -> Optional[list | dict]:
    """Robust JSON extraction from LLM responses.

    Handles common LLM output issues:
    - Markdown code fences (```json ... ```)
    - Trailing commas before ] or }
    - Greedy regex capturing too much
    - Extra text before/after the JSON structure

    Returns parsed JSON (list or dict), or None if all attempts fail.
    """
    if not text or not text.strip():
        return None

    cleaned = text.strip()

    # 1. Strip markdown code fences
    fence_match = re.match(r"```(?:json)?\s*\n(.*?)```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    # 2. Try direct parse first (LLM followed instructions perfectly)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 3. Extract JSON structure via regex (use non-greedy for array)
    pattern = r"\[.*?\]" if expect_array else r"\{.*?\}"
    match = re.search(pattern, cleaned, re.DOTALL)
    if not match:
        # Fallback: try the other shape
        alt_pattern = r"\{.*?\}" if expect_array else r"\[.*?\]"
        match = re.search(alt_pattern, cleaned, re.DOTALL)
    if match:
        extracted = match.group(0)
    else:
        # Last resort: try the whole text
        extracted = cleaned

    # 4. Try parsing the extracted segment
    try:
        return json.loads(extracted)
    except json.JSONDecodeError:
        pass

    # 5. Apply fixes for common LLM JSON mistakes
    fixed = re.sub(r",\s*([}\]])", r"\1", extracted)  # Remove trailing commas
    fixed = re.sub(r"[“”]", '"', fixed)      # Smart quotes → straight quotes
    fixed = re.sub(r"[‘’]", "'", fixed)      # Smart single quotes
    fixed = re.sub(r"[–—]", "-", fixed)      # En/em dashes → hyphen

    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # 6. Try to fix truncated JSON by closing open brackets
    # Count brackets and close them
    open_braces = fixed.count("{") - fixed.count("}")
    open_brackets = fixed.count("[") - fixed.count("]")
    suffix = ("}" * open_braces) + ("]" * open_brackets)
    if suffix:
        try:
            return json.loads(fixed + suffix)
        except json.JSONDecodeError:
            pass

    return None


async def discover_topics(theme_config, llm_config=None) -> list[Topic]:
    """Step 1: Search for trending topics and enrich with LLM analysis."""
    search = get_search_provider()
    llm = get_llm_provider(llm_config=llm_config)

    all_results = []
    seen_urls = set()
    for query in theme_config.topic_discovery_queries:
        results = await search.search(query, max_results=10)
        for r in results:
            if r.url not in seen_urls:
                seen_urls.add(r.url)
                all_results.append(r)

    # Deduplicate and take top candidates
    all_results = all_results[:15]

    # Use LLM to extract and rank topics
    items_text = "\n".join(
        f"- {r.title}: {r.snippet}" for r in all_results
    )
    analysis_prompt = f"""Analyze these search results about "{theme_config.name}".

Extract exactly 5 distinct trending topics. For each topic provide:
1. A compelling title
2. A 2-sentence description
3. The target audience's pain point
4. Traffic potential: "low", "medium", or "high"

Search results:
{items_text}

Return valid JSON array of objects with keys: title, description, pain_point, traffic_potential, source_urls (array of relevant URLs from above).
Output ONLY the JSON array, no other text."""

    response = await llm.generate(
        system_prompt="You are a content strategist. Output only valid JSON. No markdown fences.",
        user_prompt=analysis_prompt,
        temperature=0.3,
    )

    # Parse JSON from response — robust against malformed LLM output
    topics_data = _safe_parse_json(response, expect_array=True)
    if topics_data is None:
        # Fallback: build basic topics from search result titles
        topics_data = []
        for r in all_results[:theme_config.topic_discovery_result_count]:
            topics_data.append({
                "title": r.title,
                "description": r.snippet,
                "pain_point": "Unknown",
                "traffic_potential": "medium",
                "source_urls": [r.url],
            })

    topics = []
    for t in topics_data[:theme_config.topic_discovery_result_count]:
        topics.append(Topic(
            title=t.get("title", ""),
            description=t.get("description", ""),
            pain_point=t.get("pain_point", ""),
            traffic_potential=t.get("traffic_potential", "medium"),
            source_urls=t.get("source_urls", []),
        ))
    return topics


async def deep_research(topic_title: str, theme_config, llm_config=None) -> ResearchDossier:
    """Step 2: Deep-dive research on a single topic."""
    llm = get_llm_provider(llm_config=llm_config)
    search = get_search_provider()

    # Decompose topic into research angles
    angle_prompt = f"""Decompose this topic into 4 distinct research angles:
Topic: "{topic_title}"
Theme: {theme_config.name}

For each angle, write a specific search query that would find authoritative sources.
Return valid JSON array of strings (the search queries). Output ONLY JSON array."""

    response = await llm.generate(
        system_prompt="You are a research librarian. Output only valid JSON array.",
        user_prompt=angle_prompt,
        temperature=0.3,
    )
    queries = _safe_parse_json(response, expect_array=True)
    if queries is None:
        # Fallback: use topic title as a single search query
        queries = [topic_title]

    # Search each angle
    angles = []
    for query in queries[:4]:
        results = await search.search(query, max_results=3)
        sources = []
        for r in results:
            sources.append(SourceItem(
                url=r.url,
                title=r.title,
                key_facts=[r.snippet],
            ))
        angles.append(ResearchAngle(query=query, sources=sources))

    # Fetch top article content for richer context
    all_sources = []
    for angle in angles:
        for src in angle.sources:
            all_sources.append(src)

    raw_text_parts = []
    for src in all_sources[:4]:  # Fetch top 4 to avoid excessive latency
        try:
            html = await search.fetch_url(src.url)
            # Simple text extraction: take first 3000 chars
            text = html[:3000]
            raw_text_parts.append(f"Source: {src.title}\n{text}\n")
        except Exception:
            raw_text_parts.append(f"Source: {src.title}\n{src.key_facts[0] if src.key_facts else ''}\n")

    # Extract key facts and statistics via LLM
    extract_prompt = f"""Extract from these sources about "{topic_title}":
1. Up to 5 key statistics or data points (with source URL for each)
2. Up to 3 notable expert opinions or quotes (with expert name and source URL)

Sources:
{"".join(raw_text_parts)[:8000]}

Return valid JSON: {{"statistics": [{{"value": "...", "source_url": "..."}}], "expert_viewpoints": [{{"expert": "...", "opinion": "...", "source_url": "..."}}]}}
Output ONLY JSON, no other text."""

    response = await llm.generate(
        system_prompt="You extract structured data from articles. Output only valid JSON.",
        user_prompt=extract_prompt,
        temperature=0.2,
    )
    extracted = _safe_parse_json(response, expect_array=False)
    if extracted is None:
        extracted = {"statistics": [], "expert_viewpoints": []}

    return ResearchDossier(
        angles=angles,
        statistics=extracted.get("statistics", []),
        expert_viewpoints=extracted.get("expert_viewpoints", []),
        raw_text="\n".join(raw_text_parts),
    )


async def generate_article(
    dossier: ResearchDossier,
    theme_config,
    stream_callback=None,
    llm_config=None,
) -> tuple[str, str, str, str]:
    """Step 3: Generate the article using the LLM with research dossier injected."""
    if llm_config:
        llm = get_llm_provider(llm_config=llm_config)
    else:
        try:
            llm = get_llm_provider(theme_config.model_preference)
        except Exception:
            llm = get_llm_provider()  # fall back to settings default

    # Build research context string
    research_context = _format_dossier(dossier)

    # Load and render system prompt
    system_template = load_system_prompt(theme_config.id)
    system_prompt = render_prompt(system_template, {
        "persona": theme_config.persona,
        "target_platforms": ", ".join(theme_config.target_platforms),
        "word_count_min": theme_config.word_count_min,
        "word_count_max": theme_config.word_count_max,
        "tone": theme_config.tone,
        "forbidden_phrases": ", ".join(f'"{p}"' for p in theme_config.forbidden_phrases),
        "research_dossier": research_context,
        "seo_max_title": theme_config.seo_max_title_chars,
        "seo_max_meta": theme_config.seo_max_meta_chars,
    })

    user_prompt = f"""Write a professional blog article based on the research dossier above.
Target word count: {theme_config.word_count_min}-{theme_config.word_count_max} words.
Follow the structure and rules in the system prompt exactly."""

    full_text = await llm.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=min(theme_config.word_count_max * 3, 16000),
        temperature=0.75,
        stream_callback=stream_callback,
    )

    # Parse SEO metadata from the output
    title_tag = _extract_meta(full_text, r"<title>(.*?)</title>")
    meta_desc = _extract_meta(full_text, r'<meta\s+description[^>]*content="([^"]*)"')
    json_ld = _extract_jsonld(full_text)

    return full_text, title_tag or "", meta_desc or "", json_ld or ""


def _format_dossier(dossier: ResearchDossier) -> str:
    """Format research dossier as structured text for prompt injection."""
    lines = ["## Research Summary\n"]
    if dossier.statistics:
        lines.append("### Key Statistics")
        for stat in dossier.statistics:
            lines.append(f"- {stat['value']} (Source: {stat['source_url']})")
    if dossier.expert_viewpoints:
        lines.append("\n### Expert Viewpoints")
        for vp in dossier.expert_viewpoints:
            lines.append(f"- **{vp['expert']}**: {vp['opinion']} (Source: {vp['source_url']})")
    if dossier.angles:
        lines.append("\n### Research Angles Covered")
        for angle in dossier.angles:
            lines.append(f"- **{angle.query}**: {len(angle.sources)} sources found")
    lines.append(f"\n### Raw Research Notes\n{dossier.raw_text[:4000]}")
    return "\n".join(lines)


def _extract_meta(text: str, pattern: str) -> Optional[str]:
    """Extract first match of a regex pattern from text."""
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else None


def _extract_jsonld(text: str) -> Optional[str]:
    """Extract first JSON-LD script block from text."""
    match = re.search(
        r'<script\s+type="application/ld\+json"[^>]*>(.*?)</script>',
        text, re.IGNORECASE | re.DOTALL,
    )
    return match.group(1).strip() if match else None
