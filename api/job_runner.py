"""
api/job_runner.py
-----------------
Runs the apply_workflow pipeline in a background thread and captures log
output into an in-memory per-job store so the SSE endpoint can stream it.
"""

import asyncio
import logging
import threading
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List


#  Job status 

class JobStatus(str, Enum):
    RUNNING = "running"
    DONE    = "done"
    ERROR   = "error"


@dataclass
class Job:
    id: str
    status: JobStatus = JobStatus.RUNNING
    logs: List[str]   = field(default_factory=list)
    error: str        = ""

    # Set when the background thread is finished so SSE can detect EOF
    finished: threading.Event = field(default_factory=threading.Event)


# Global in-memory store  {job_id: Job}
_jobs: Dict[str, Job] = {}
_lock = threading.Lock()


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def all_jobs() -> Dict[str, Job]:
    return dict(_jobs)


#  Custom log handler 

class _JobLogHandler(logging.Handler):
    """Appends formatted log records to the job's log list."""

    def __init__(self, job: Job):
        super().__init__()
        self._job = job
        fmt = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s"
        self.setFormatter(logging.Formatter(fmt, datefmt="%H:%M:%S"))

    def emit(self, record: logging.LogRecord):
        try:
            line = self.format(record)
            with _lock:
                self._job.logs.append(line)
        except Exception:
            pass


#  Job launcher 

def launch_pipeline(
    send: bool = False,
    compile_pdf: bool = False,
    limit: int = 0,
    company_filter: str = "",
) -> str:
    """
    Spawn the pipeline in a daemon thread.
    Returns the job_id immediately.
    """
    job_id = uuid.uuid4().hex
    job = Job(id=job_id)
    with _lock:
        _jobs[job_id] = job

    def _run():
        # Attach a handler to the root logger so every apply_workflow log
        # line is captured.
        handler = _JobLogHandler(job)
        root = logging.getLogger()
        root.addHandler(handler)

        try:
            from apply_workflow.core.pipeline import run_pipeline
            asyncio.run(
                run_pipeline(
                    send=send,
                    compile_pdf=compile_pdf,
                    limit=limit,
                    company_filter=company_filter,
                )
            )
            with _lock:
                job.status = JobStatus.DONE
                job.logs.append("✅ Pipeline finished successfully.")
        except Exception as exc:
            with _lock:
                job.status = JobStatus.ERROR
                job.error  = str(exc)
                job.logs.append(f"❌ Pipeline error: {exc}")
        finally:
            root.removeHandler(handler)
            job.finished.set()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return job_id
