"""Worker function for article generation jobs — runs pipeline in-process.

No external queue (arq/Redis) — the FastAPI server calls this directly via
asyncio.create_task so everything stays in one process for local dev.
"""
from datetime import datetime, timezone
from typing import Optional

from pipeline.engine import run_pipeline
from jobs.queue import store_job, get_job, update_job


async def generate_article_job(
    job_id: str,
    theme_id: str,
    topics: list[str],
    source_url: Optional[str] = None,
) -> list[dict]:
    """Execute the 4-step pipeline and update the in-memory job store.

    Progress is written to the shared dict so the SSE endpoint can poll it.
    Call this via ``asyncio.create_task`` — it manages its own lifecycle.
    """
    store_job(job_id, {
        "job_id": job_id,
        "status": "running",
        "progress_pct": 0,
        "current_step": "starting",
        "message": "Pipeline starting...",
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    try:
        async def progress_callback(step: str, message: str, pct: int):
            update_job(job_id, {
                "current_step": step,
                "message": message,
                "progress_pct": pct,
            })

        results = await run_pipeline(
            theme_id=theme_id,
            topics=topics,
            source_url=source_url,
            progress_callback=progress_callback,
        )

        update_job(job_id, {
            "status": "completed",
            "progress_pct": 100,
            "current_step": "done",
            "message": f"{len(results)} article(s) generated",
            "result": results,
        })

        return results

    except Exception as e:
        update_job(job_id, {
            "status": "failed",
            "error": str(e),
            "message": f"Generation failed: {e}",
        })
        raise
