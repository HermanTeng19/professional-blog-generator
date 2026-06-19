"""In-memory job store for status tracking (simpler than Redis for local dev)."""
from typing import Optional


# In-memory job store — dict-based, shared across asyncio tasks in the same process
_job_store: dict[str, dict] = {}


def store_job(job_id: str, status_data: dict) -> None:
    """Store or overwrite a job's full status in memory."""
    _job_store[job_id] = status_data


def get_job(job_id: str) -> Optional[dict]:
    """Retrieve a job's status from memory. Returns None if not found."""
    return _job_store.get(job_id)


def update_job(job_id: str, updates: dict) -> None:
    """Merge partial updates into an existing job's status dict."""
    if job_id in _job_store:
        _job_store[job_id].update(updates)
