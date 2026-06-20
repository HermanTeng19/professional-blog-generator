"""YouTube video transcript extraction.

Uses youtube-transcript-api for reliable caption extraction,
with fallback to video metadata (title + description) when captions are unavailable.
"""

from __future__ import annotations

import json
import re
from typing import Optional

import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)


def extract_video_id(url: str) -> Optional[str]:
    """Extract the 11-char YouTube video ID from various URL formats."""
    patterns = [
        r"(?:v=|/v/|/embed/|youtu\.be/|/shorts/|/live/)([a-zA-Z0-9_-]{11})",
        r"(?:watch\?v=)([a-zA-Z0-9_-]{11})",
        r"^([a-zA-Z0-9_-]{11})$",  # bare video id
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _extract_json_assignment(html: str, var_name: str) -> Optional[dict]:
    """Extract a JSON object assigned to a JavaScript variable via brace matching."""
    idx = html.find(var_name)
    if idx == -1:
        return None

    brace_idx = html.find("{", idx)
    if brace_idx == -1:
        return None

    depth = 0
    in_string = False
    escape_next = False
    for i in range(brace_idx, len(html)):
        ch = html[i]

        if escape_next:
            escape_next = False
            continue

        if ch == "\\":
            escape_next = True
            continue

        if ch == '"' and not escape_next:
            in_string = not in_string
            continue

        if in_string:
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                json_str = html[brace_idx : i + 1]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    return None

    return None


async def _fetch_video_metadata(url: str) -> dict:
    """Fetch video title, author, and description from the YouTube page."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "en-US,en;q=0.9",
            },
            follow_redirects=True,
        )
        resp.raise_for_status()
        html = resp.text

    # Try ytInitialPlayerResponse first (most reliable)
    player_data = _extract_json_assignment(html, "ytInitialPlayerResponse")
    video_details = player_data.get("videoDetails", {}) if player_data else {}
    title = video_details.get("title", "Unknown Title")
    author = video_details.get("author", "Unknown Author")

    description = video_details.get("shortDescription", "")

    # Enrich description from ytInitialData if available
    initial_data = _extract_json_assignment(html, "ytInitialData")
    if initial_data:
        try:
            desc_runs = (
                initial_data.get("contents", {})
                .get("twoColumnWatchNextResults", {})
                .get("results", {})
                .get("results", {})
                .get("contents", [{}])[1]
                .get("videoSecondaryInfoRenderer", {})
                .get("description", {})
                .get("runs", [])
            )
            description = "".join(r.get("text", "") for r in desc_runs)
        except (IndexError, KeyError, TypeError):
            pass

    return {
        "title": title,
        "author": author,
        "description": description or "",
    }


def _format_transcript(transcript) -> str:
    """Format a FetchedTranscript into readable text.

    Each segment is a FetchedTranscriptSnippet with .text, .start, .duration attrs.
    """
    lines = []
    for seg in transcript:
        minutes = int(seg.start // 60)
        seconds = int(seg.start % 60)
        timestamp = f"[{minutes:02d}:{seconds:02d}]"
        lines.append(f"{timestamp} {seg.text}")
    return "\n".join(lines)


async def fetch_youtube_transcript(url: str) -> str:
    """Fetch YouTube video metadata and full transcript.

    Uses youtube-transcript-api to reliably extract captions.
    Falls back to video metadata only if captions are unavailable.

    Args:
        url: YouTube watch URL (any format — short, embed, watch, etc.)

    Returns:
        Formatted string with video title, author, description, and transcript.
    """
    video_id = extract_video_id(url)
    if not video_id:
        return (
            f"⚠️  Could not extract a YouTube video ID from: {url}\n\n"
            f"The URL must be a valid YouTube video link "
            f"(e.g. https://www.youtube.com/watch?v=XXXXXXXXXXX)."
        )

    # Fetch metadata (always available)
    try:
        metadata = await _fetch_video_metadata(url)
    except Exception as e:
        metadata = {"title": "Unknown", "author": "Unknown", "description": ""}

    title = metadata["title"]
    author = metadata["author"]
    description = metadata["description"]

    # Build header
    header = (
        f"## Video Information\n\n"
        f"- **Title**: {title}\n"
        f"- **Author/Creator**: {author}\n"
        f"- **URL**: {url}\n"
        f"- **Video ID**: {video_id}\n\n"
        f"## Video Description\n\n{description}\n\n"
    )

    # Try to fetch transcript
    transcript_text = ""
    transcript_language = "unknown"
    transcript_type = "none"

    try:
        api = YouTubeTranscriptApi()
        # Try English manual captions first, then auto-generated
        transcript = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        transcript_text = _format_transcript(transcript)
        # Determine language and type
        try:
            tl = api.list(video_id)
            for t in tl:
                if t.language_code.startswith("en") and not t.is_generated:
                    transcript_language = t.language_code
                    transcript_type = "manual"
                    break
            if transcript_type == "none":
                for t in tl:
                    if t.language_code.startswith("en") and t.is_generated:
                        transcript_language = t.language_code
                        transcript_type = "auto-generated"
                        break
        except Exception:
            transcript_type = "auto-detected"
            transcript_language = "en"
    except TranscriptsDisabled:
        pass  # No captions available
    except NoTranscriptFound:
        # Try other languages
        try:
            api = YouTubeTranscriptApi()
            transcript = api.fetch(video_id, languages=["zh", "zh-Hans", "zh-CN", "ja", "ko", "fr", "de", "es"])
            transcript_text = _format_transcript(transcript)
            transcript_type = "auto-detected"
            transcript_language = "non-English"
        except Exception:
            pass
    except VideoUnavailable:
        return (
            f"{header}"
            f"---\n\n"
            f"⚠️  **Video is unavailable.** It may be private, age-restricted, or removed.\n"
        )
    except Exception:
        pass

    if not transcript_text:
        # No transcript available — return metadata only + timestamp chapters
        chapters = ""
        if description:
            # Extract chapters/timestamps from description
            ts_lines = re.findall(r"(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?=\n|$)", description)
            if ts_lines:
                chapters = "\n## Video Chapters (from description)\n\n"
                for ts, ch_title in ts_lines:
                    chapters += f"- **{ts}** — {ch_title.strip()}\n"

        return (
            f"{header}"
            f"---\n\n"
            f"## Transcript\n\n"
            f"⚠️  **No captions/transcript available for this video.**\n\n"
            f"This video does not have captions enabled. "
            f"The following article will be based on the video title, description, "
            f"and chapter markers (if available) rather than a full transcript.\n"
            f"{chapters}"
        )

    return (
        f"{header}"
        f"- **Transcript Language**: {transcript_language}\n"
        f"- **Transcript Type**: {transcript_type}\n\n"
        f"---\n\n"
        f"## Full Transcript\n\n"
        f"{transcript_text}"
    )
