import logging
import re
import shutil
import subprocess
from pathlib import Path

from apply_workflow.config import settings

logger = logging.getLogger(__name__)


def load_template(template_path: str) -> str:
    path = Path(template_path)
    if not path.exists():
        raise FileNotFoundError(f"CV template not found: {template_path}")
    return path.read_text(encoding="utf-8")


def save_cv(content: str, output_dir: str, company: str) -> Path:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^\w\-]", "_", company)
    out_path = out / f"{safe_name}_cv.typ"
    out_path.write_text(content, encoding="utf-8")
    logger.info("CV saved → %s", out_path)
    return out_path


def compile_to_pdf(typ_path: Path) -> Path:
    pdf_path = typ_path.with_suffix(".pdf")
    binary_str = settings.TYPST_BINARY_PATH
    binary_path = Path(binary_str)

    # Check if binary is absolute/relative path or in system PATH
    binary_exists = False
    if binary_path.is_absolute() or len(binary_path.parts) > 1:
        binary_exists = binary_path.exists()
    else:
        binary_exists = shutil.which(binary_str) is not None

    if not binary_exists:
        logger.error(
            "Typst binary not found at: %s — update TYPST_BINARY_PATH in your config/.env",
            binary_str,
        )
        return pdf_path

    try:
        result = subprocess.run(
            [binary_str, "compile", str(typ_path), str(pdf_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            logger.error("Typst compile error:\n%s", result.stderr)
        else:
            logger.info("PDF compiled → %s", pdf_path)
    except subprocess.TimeoutExpired:
        logger.error("Typst compilation timed out for: %s", typ_path)
    except Exception as e:
        logger.error("Typst compilation failed: %s", e)

    return pdf_path
