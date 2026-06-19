"""FastAPI application entry point — API routes, SSE, CORS."""
import json
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import settings
from prompts.manager import load_theme_config, list_themes
from pipeline.engine import run_pipeline
from pipeline.steps import discover_topics, deep_research
from jobs.queue import store_job, get_job, update_job
from output.file_manager import list_articles, read_article, update_article
from models.schemas import GenerateRequest, ArticleUpdate

app = FastAPI(title="Professional Blog Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Themes ──
@app.get("/api/themes")
async def get_themes():
    """List all available themes with metadata."""
    return {"themes": list_themes()}


# ── Topic Discovery ──
class DiscoverRequest(BaseModel):
    theme_id: str


@app.post("/api/themes/{theme_id}/discover")
async def discover_themes_endpoint(theme_id: str):
    """Discover 5 trending topics for a theme."""
    try:
        config = load_theme_config(theme_id)
        if not config.topic_discovery_enabled:
            raise HTTPException(
                400,
                f"Theme {theme_id} does not support topic discovery. Use URL input instead.",
            )
        topics = await discover_topics(config)
        return {"topics": [t.model_dump() for t in topics]}
    except FileNotFoundError:
        raise HTTPException(404, f"Theme not found: {theme_id}")


# ── Research ──
class ResearchRequest(BaseModel):
    topic: str


@app.post("/api/themes/{theme_id}/research")
async def research_topic(theme_id: str, body: ResearchRequest):
    """Deep research on a single topic."""
    try:
        config = load_theme_config(theme_id)
        dossier = await deep_research(body.topic, config)
        return {"dossier": dossier.model_dump()}
    except FileNotFoundError:
        raise HTTPException(404, f"Theme not found: {theme_id}")


# ── Generate (async via background task) ──
@app.post("/api/themes/{theme_id}/generate")
async def generate_articles(theme_id: str, body: GenerateRequest):
    """Start article generation. Returns a job_id for tracking."""
    try:
        load_theme_config(theme_id)
    except FileNotFoundError:
        raise HTTPException(404, f"Theme not found: {theme_id}")

    job_id = str(uuid.uuid4())[:8]

    store_job(job_id, {
        "job_id": job_id,
        "status": "queued",
        "progress_pct": 0,
        "current_step": "queued",
        "message": "Job queued, starting soon...",
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Run pipeline in background task (no Redis/arq needed for local dev)
    asyncio.create_task(_execute_pipeline(job_id, theme_id, body))

    return {"job_id": job_id, "status": "queued"}


async def _execute_pipeline(job_id: str, theme_id: str, body: GenerateRequest):
    """Background execution of the pipeline."""
    update_job(job_id, {"status": "running", "message": "Pipeline starting..."})
    try:
        async def progress_callback(step: str, message: str, pct: int):
            update_job(job_id, {
                "current_step": step,
                "message": message,
                "progress_pct": pct,
            })

        results = await run_pipeline(
            theme_id=theme_id,
            topics=body.topics,
            source_url=body.source_url,
            progress_callback=progress_callback,
        )
        update_job(job_id, {
            "status": "completed",
            "progress_pct": 100,
            "current_step": "done",
            "message": f"{len(results)} article(s) generated",
            "result": results,
        })
    except Exception as e:
        update_job(job_id, {
            "status": "failed",
            "error": str(e),
            "message": f"Generation failed: {str(e)[:200]}",
        })


# ── Job Status ──
@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Poll the current status of a generation job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job not found: {job_id}")
    return job


# ── SSE Stream ──
@app.get("/api/jobs/{job_id}/stream")
async def stream_job_progress(job_id: str):
    """SSE endpoint — streams pipeline progress events in real time."""
    async def event_generator():
        last_pct = -1
        while True:
            job = get_job(job_id)
            if not job:
                yield f"event: error\ndata: {json.dumps({'error': 'Job not found'})}\n\n"
                break

            pct = job.get("progress_pct", 0)
            if pct != last_pct:
                last_pct = pct
                yield f"event: progress\ndata: {json.dumps(job)}\n\n"

            if job["status"] in ("completed", "failed"):
                event_type = "complete" if job["status"] == "completed" else "error"
                yield f"event: {event_type}\ndata: {json.dumps(job)}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Articles ──
@app.get("/api/articles")
async def get_articles(theme_id: Optional[str] = Query(None)):
    """List all generated articles, optionally filtered by theme."""
    articles = list_articles(theme_id)
    return {"articles": [a.model_dump() for a in articles]}


@app.get("/api/articles/{filename:path}")
async def get_article(filename: str):
    """Get full article content by filename."""
    try:
        article = read_article(filename)
        return article.model_dump()
    except FileNotFoundError:
        raise HTTPException(404, f"Article not found: {filename}")


@app.put("/api/articles/{filename:path}")
async def put_article(filename: str, body: ArticleUpdate):
    """Update an article's content in place."""
    try:
        update_article(filename, body.content)
        return {"status": "updated", "filename": filename}
    except FileNotFoundError:
        raise HTTPException(404, f"Article not found: {filename}")


# ── Health ──
@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.app_host, port=settings.app_port, reload=True)
