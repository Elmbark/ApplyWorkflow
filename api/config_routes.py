# apply_workflow/api/config_routes.py
"""Minimal config endpoints: read/write profile.json and the email template."""

import json
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


from apply_workflow.config import settings, ROOT_DIR
from apply_workflow.utils.typst import compile_to_pdf

router = APIRouter(prefix="/api/config", tags=["config"])


class ProfileUpdate(BaseModel):
    data: dict[str, str]


class TemplateUpdate(BaseModel):
    content: str


class AppSettingsUpdate(BaseModel):
    llm_provider: str
    groq_api_key: str = ""
    openai_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    openai_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.3


class CredentialsUpdate(BaseModel):
    data: dict


class CvPreviewRequest(BaseModel):
    company: str | None = "Acme Inc"
    post: str | None = "Software Engineer"
    keywords: str | None = "Python, FastAPI, Docker"
    description: str | None = "Build APIs and automate workflows."
    profile: dict[str, str] | None = None


class CvTemplatePathUpdate(BaseModel):
    path: str  # relative to templates/ or an absolute path


@router.get("/profile")
def get_profile():
    return settings.load_profile()


@router.put("/profile")
def save_profile(payload: ProfileUpdate):
    settings.profile_path.parent.mkdir(parents=True, exist_ok=True)
    settings.profile_path.write_text(
        json.dumps(payload.data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return {"ok": True}


@router.get("/app-settings")
def get_app_settings():
    return {
        "llm_provider": settings.LLM_PROVIDER,
        "groq_model": settings.GROQ_MODEL,
        "openai_model": settings.OPENAI_MODEL,
        "llm_temperature": settings.LLM_TEMPERATURE,
        "groq_api_key_set": bool(settings.GROQ_API_KEY),
        "openai_api_key_set": bool(settings.OPENAI_API_KEY),
        "credentials_set": settings.credentials_path.is_file(),
    }


@router.put("/app-settings")
def save_app_settings(payload: AppSettingsUpdate):
    provider = payload.llm_provider.lower().strip()
    if provider not in {"groq", "openai"}:
        raise HTTPException(400, "Provider must be groq or openai")
    current = {}
    if settings.app_config_path.is_file():
        try:
            current = json.loads(settings.app_config_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    values = {
        **current,
        "LLM_PROVIDER": provider,
        "GROQ_MODEL": payload.groq_model.strip(),
        "OPENAI_MODEL": payload.openai_model.strip(),
        "LLM_TEMPERATURE": payload.llm_temperature,
    }
    # An empty secret means "keep the existing secret", not erase it.
    if payload.groq_api_key:
        values["GROQ_API_KEY"] = payload.groq_api_key.strip()
    if payload.openai_api_key:
        values["OPENAI_API_KEY"] = payload.openai_api_key.strip()
    settings.save_config(values)
    return {"ok": True}


@router.put("/gmail-credentials")
def save_gmail_credentials(payload: CredentialsUpdate):
    if payload.data.get("installed") is None and payload.data.get("web") is None:
        raise HTTPException(400, "Expected a Google OAuth client JSON file")
    settings.credentials_path.parent.mkdir(parents=True, exist_ok=True)
    settings.credentials_path.write_text(
        json.dumps(payload.data, indent=2), encoding="utf-8"
    )
    return {"ok": True}


@router.get("/email-template")
def get_email_template():
    path = settings.resolve("templates/email_body.html")
    if not path.exists():
        raise HTTPException(404, "Email template not found")
    return {"content": path.read_text(encoding="utf-8")}


@router.put("/email-template")
def save_email_template(payload: TemplateUpdate):
    path = settings.resolve("templates/email_body.html")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload.content, encoding="utf-8")
    return {"ok": True}


@router.get("/cv-template")
def get_cv_template():
    path = settings.cv_template_path
    if not path.exists():
        raise HTTPException(404, "CV template not found")
    return {"content": path.read_text(encoding="utf-8")}


@router.put("/cv-template")
def save_cv_template(payload: TemplateUpdate):
    path = settings.cv_template_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload.content, encoding="utf-8")
    return {"ok": True}


@router.post("/cv-template/enhance")
def enhance_cv_template(payload: TemplateUpdate):
    """Return an improved version of the provided CV Typst content using the configured LLM."""
    from apply_workflow.services.llm import LLMService
    try:
      llm = LLMService()
      import asyncio
      improved = asyncio.run(llm.enhance_template(payload.content))
      return {"content": improved}
    except Exception as exc:
      raise HTTPException(500, str(exc))


@router.get("/cv-templates")
def list_cv_templates():
    """List available .typ templates under templates/ (relative paths)."""
    tpl_dir = ROOT_DIR / "templates"
    if not tpl_dir.exists():
        return {"items": []}
    items = []
    for p in sorted(tpl_dir.rglob("*.typ")):
        rel = p.relative_to(tpl_dir)
        items.append({
            "name": str(rel),
            "path": str(Path("templates") / rel),  # path relative to project root
        })
    return {"items": items, "current": str(settings.cv_template_path.relative_to(ROOT_DIR)) if settings.cv_template_path.exists() else settings.CV_TEMPLATE_FILE}


def _write_env_var(var: str, value: str):
    env_path = ROOT_DIR / ".env"
    lines: list[str] = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()
    key = f"{var}="
    out: list[str] = []
    found = False
    for line in lines:
        if line.strip().startswith(key):
            out.append(f"{var}={value}")
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f"{var}={value}")
    env_path.write_text("\n".join(out) + "\n", encoding="utf-8")


@router.put("/cv-template-path")
def set_cv_template_path(payload: CvTemplatePathUpdate):
    """Update CV_TEMPLATE_FILE in .env. Accepts a path under templates/ or absolute."""
    raw = payload.path.strip()
    if not raw:
        raise HTTPException(400, "path is required")

    # Normalize: if user sends just a filename under templates/, prefix it
    p = Path(raw)
    if not p.is_absolute():
        # allow either "cv.typ" (inside templates/) or "templates/foo.typ"
        if not str(p).startswith("templates/"):
            p = Path("templates") / p
        full = (ROOT_DIR / p).resolve()
    else:
        full = p.resolve()

    if not full.exists():
        raise HTTPException(404, "Template file not found")
    if full.suffix.lower() != ".typ":
        raise HTTPException(400, "Template must be a .typ file")

    # Write into .env as a path relative to project root when possible
    try:
        rel = full.relative_to(ROOT_DIR)
        env_value = str(rel)
    except Exception:
        env_value = str(full)

    _write_env_var("CV_TEMPLATE_FILE", env_value)
    # Live update current settings so preview and editor use it immediately
    try:
        settings.CV_TEMPLATE_FILE = env_value  # type: ignore[attr-defined]
    except Exception:
        pass
    return {"ok": True, "cv_template_file": env_value}


@router.post("/cv-template/preview")
def preview_cv_template(payload: CvPreviewRequest):
    """Render the current CV template with provided sample data and compile a preview PDF.
    The PDF is saved under OUTPUT_DIR/_preview/preview.pdf and can be fetched via /api/outputs.
    """
    tpl_path = settings.cv_template_path
    if not tpl_path.exists():
        raise HTTPException(404, "CV template not found")

    # Load template text
    src = tpl_path.read_text(encoding="utf-8")

    # Build data used to fill placeholders
    prof = payload.profile or settings.load_profile()
    data = {
        **prof,
        "company": payload.company or "",
        "post": payload.post or "",
        "keywords": payload.keywords or "",
        "description": payload.description or "",
    }

    # Simple placeholder replacement for preview only (does not persist)
    def repl(match):
        key = match.group(1)
        return str(data.get(key, f"{{{{{key}}}}}"))

    content = PLACEHOLDER_RE.sub(repl, src)

    # Save to output/_preview/preview.typ and compile
    out_dir = ROOT_DIR / settings.OUTPUT_DIR / "_preview"
    out_dir.mkdir(parents=True, exist_ok=True)
    typ_path = out_dir / "preview.typ"
    typ_path.write_text(content, encoding="utf-8")
    pdf_path = compile_to_pdf(typ_path)

    rel = pdf_path.relative_to(ROOT_DIR / settings.OUTPUT_DIR)
    return {"path": str(rel)}


PLACEHOLDER_RE = re.compile(r"\{\{?\s*(\w+)\s*\}?\}")

@router.get("/required-fields")
def get_required_fields():
    """Scan the CV + email templates for {{ field }} placeholders."""
    fields: set[str] = set()

    cv_path = settings.cv_template_path
    if cv_path.exists():
        fields |= set(PLACEHOLDER_RE.findall(cv_path.read_text(encoding="utf-8")))

    email_path = settings.resolve("templates/email_body.html")
    if email_path.exists():
        fields |= set(PLACEHOLDER_RE.findall(email_path.read_text(encoding="utf-8")))

    # These are filled by the pipeline itself, not by profile.json — exclude them
    fields -= {"company", "post", "keywords", "description", "opening_line", "closing_line","contact_lines"}

    return {"fields": sorted(fields)}