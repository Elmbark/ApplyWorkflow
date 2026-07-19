from pathlib import Path

import pytest

from apply_workflow.utils.typst import load_template, save_cv, compile_to_pdf
from apply_workflow.config import settings


def test_load_template_and_save_cv(tmp_path):
    # Create a dummy template and load it
    tpl = tmp_path / "cv_template.typ"
    tpl.write_text("Hello {{ name }}", encoding="utf-8")
    assert load_template(str(tpl)) == "Hello {{ name }}"

    # Save CV content to a safe filename
    out = save_cv("content", str(tmp_path), "Acme Inc./R&D")
    assert out.exists()
    # Non-alnum replaced with underscores
    assert out.name.endswith("Acme_Inc__R_D_cv.typ")
    assert out.read_text(encoding="utf-8") == "content"


def test_compile_to_pdf_handles_missing_binary(tmp_path, monkeypatch):
    typ = tmp_path / "x.typ"
    typ.write_text("= CV", encoding="utf-8")

    # Point to a definitely-missing binary
    monkeypatch.setattr(settings, "TYPST_BINARY_PATH", "__no_such_typst__")

    pdf = compile_to_pdf(typ)
    # Returns the target path even when compile fails
    assert pdf.suffix == ".pdf"
    # But file should not have been created
    assert not pdf.exists()
