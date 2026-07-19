"""
api/app.py
----------
FastAPI application. Serves the single-page frontend and exposes all REST +
SSE endpoints. No changes to the core apply_workflow package are required.
"""

import asyncio
import json
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import PlainTextResponse
from apply_workflow.config import settings
from apply_workflow.utils.excel import append_application
from api.job_runner import JobStatus, get_job, launch_pipeline
from api.config_routes import router as config_router
from apply_workflow.utils.excel import delete_application
from apply_workflow.schemas import ApplicationInput
from pydantic import BaseModel

# Ensure the src layout is importable when running from the project root
ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR  = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))



app = FastAPI(title="apply_workflow UI", version="1.0.0")
app.include_router(config_router)

FRONTEND_DIR = ROOT_DIR / "frontend"
DIST_DIR     = FRONTEND_DIR / "dist"

# Serve built Vite assets (JS/CSS chunks)
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")


#  Serve the SPA 

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def serve_index():
    index = DIST_DIR / "index.html"
    if not index.exists():
        return HTMLResponse(
            "<h2 style='font-family:sans-serif;padding:40px'>Run <code>cd frontend && npm run build</code> first, "
            "then restart the server.<br><br>Or run <code>cd frontend && npm run dev</code> on port 5173 for hot-reload dev mode.</h2>"
        )
    return HTMLResponse(index.read_text(encoding="utf-8"))



#  Jobs (applications.xlsx rows) 

@app.get("/api/jobs")
async def list_jobs():
    """Return all rows from applications.xlsx as JSON."""
    try:
        from apply_workflow.config import settings
        from apply_workflow.utils.excel import read_applications_with_rows

        rows = read_applications_with_rows(str(settings.excel_path))
        return rows
    except Exception as exc:
        raise HTTPException(500, str(exc))




@app.post("/api/jobs")
async def add_job(payload: ApplicationInput):
    """Append a new application row to applications.xlsx."""
    try:


        append_application(
            str(settings.excel_path),
            payload.model_dump()
        )

        return {"ok": True}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.put("/api/jobs/{excel_row}")
async def update_job(excel_row: int, payload: ApplicationInput):
    """Update an existing application row identified by its Excel row number."""
    try:
        from apply_workflow.config import settings
        from apply_workflow.utils.excel import update_application

        update_application(
            str(settings.excel_path),
            excel_row,
            payload.model_dump()
        )
        return {"ok": True}
    except (ValueError, IndexError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.delete("/api/jobs/{excel_row}")
async def delete_job(excel_row: int):
    """Delete an application row identified by its Excel row number."""
    try:


        delete_application(str(settings.excel_path), excel_row)
        return {"ok": True}
    except (ValueError, IndexError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    
#  Run pipeline 

class RunRequest(BaseModel):
    send:           bool = False
    compile_pdf:    bool = False
    limit:          int  = 0
    company_filter: str  = ""


@app.post("/api/run")
async def run_pipeline_endpoint(req: RunRequest):
    """Start the pipeline in the background. Returns a job_id immediately."""
    job_id = launch_pipeline(
        send=req.send,
        compile_pdf=req.compile_pdf,
        limit=req.limit,
        company_filter=req.company_filter,
    )
    return {"job_id": job_id, "status": JobStatus.RUNNING}


#  Job status 

@app.get("/api/status/{job_id}")
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {"job_id": job_id, "status": job.status, "error": job.error}


#  SSE log stream 

@app.get("/api/run/{job_id}/stream")
async def stream_logs(job_id: str, offset: int = Query(0)):
    """
    Server-Sent Events: streams log lines to the browser.

    The client can pass ?offset=N to resume from a specific line index.
    Sends a final `event: done` when the job finishes.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    async def event_generator():
        cursor = offset
        while True:
            with job.finished._cond:  # noqa: SLF001 — internal threading detail
                pass  # just a reference to ensure it's alive

            # Send any new log lines
            logs_snapshot = job.logs
            while cursor < len(logs_snapshot):
                line = logs_snapshot[cursor].replace("\n", " ")
                yield f"data: {json.dumps(line)}\n\n"
                cursor += 1

            if job.finished.is_set() and cursor >= len(job.logs):
                # Send terminal event
                yield f"event: done\ndata: {json.dumps(job.status)}\n\n"
                break

            await asyncio.sleep(0.25)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


#  Output file browser 

@app.get("/api/outputs")
async def list_outputs():
    """
    Return a nested tree of output/ directory contents.
    Each node: {name, path, type: 'file'|'dir', children?: [...]}
    """
    output_root = ROOT_DIR / settings.OUTPUT_DIR
    if not output_root.exists():
        return []

    def _build(p: Path, rel_base: Path) -> dict:
        rel = p.relative_to(rel_base)
        if p.is_dir():
            return {
                "name":     p.name,
                "path":     str(rel),
                "type":     "dir",
                "children": sorted(
                    [_build(c, rel_base) for c in p.iterdir()],
                    key=lambda n: (n["type"] == "file", n["name"]),
                ),
            }
        return {
            "name": p.name,
            "path": str(rel),
            "type": "file",
            "size": p.stat().st_size,
        }

    children = sorted(
        [_build(c, output_root) for c in output_root.iterdir()],
        key=lambda n: (n["type"] == "file", n["name"]),
    )
    return children


@app.get("/api/outputs/{file_path:path}")
async def download_output(file_path: str):
    """Serve a file from the output/ directory."""

    target = (ROOT_DIR / settings.OUTPUT_DIR / file_path).resolve()
    output_root = (ROOT_DIR / settings.OUTPUT_DIR).resolve()

    # Security: prevent path traversal
    if not str(target).startswith(str(output_root)):
        raise HTTPException(403, "Access denied")
    if not target.exists() or target.is_dir():
        raise HTTPException(404, "File not found")

    # PDFs must be served inline so the browser renders them in an <iframe>.
    # Everything else forces a download.
    import mimetypes
    media_type, _ = mimetypes.guess_type(str(target))
    if target.suffix.lower() == ".pdf":
        return FileResponse(
            str(target),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=\"{target.name}\""},
        )
    return FileResponse(
        str(target),
        filename=target.name,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.delete("/api/outputs/{target_path:path}")
async def delete_output(target_path: str):
    """Delete a file or directory within the output/ tree.
    Useful for removing a company subtree from the Output Files browser.
    """
    output_root = (ROOT_DIR / settings.OUTPUT_DIR).resolve()
    target = (output_root / target_path).resolve()

    # Security: prevent path traversal and accidental root deletion
    if not str(target).startswith(str(output_root)):
        raise HTTPException(403, "Access denied")
    if target == output_root:
        raise HTTPException(400, "Cannot delete output root")
    if not target.exists():
        raise HTTPException(404, "Not found")

    try:
        if target.is_dir():
            import shutil
            shutil.rmtree(target)
        else:
            target.unlink()
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))



#  Profile 

@app.get("/api/profile")
async def get_profile():
    
    return settings.load_profile()


#  Text preview (email .txt files) 

@app.get("/api/preview/{file_path:path}", response_class=PlainTextResponse)
async def preview_file(file_path: str):
    """Return raw text content of a file in output/ (for email previews)."""

    target = (ROOT_DIR / settings.OUTPUT_DIR / file_path).resolve()
    output_root = (ROOT_DIR / settings.OUTPUT_DIR).resolve()

    if not str(target).startswith(str(output_root)):
        raise HTTPException(403, "Access denied")
    if not target.exists() or target.is_dir():
        raise HTTPException(404, "File not found")
    if target.stat().st_size > 2 * 1024 * 1024:  # 2 MB guard
        raise HTTPException(413, "File too large to preview")

    return target.read_text(encoding="utf-8", errors="replace")
