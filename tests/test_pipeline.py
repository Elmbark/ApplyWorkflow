from pathlib import Path

from apply_workflow.core.pipeline import save_email
from apply_workflow.schemas import GeneratedApplication


def test_save_email_writes_expected_content(tmp_path):
    app = GeneratedApplication(
        company="Acme & Co.",
        email="hr@acme.com",
        cv_content="n/a",
        email_subject="Subject here",
        email_body="<p>Body</p>",
    )
    path = save_email(app, str(tmp_path))

    # Filename should be sanitised
    assert path.name == "Acme___Co__email.txt"

    text = path.read_text(encoding="utf-8")
    assert "TO: hr@acme.com" in text
    assert "SUBJECT: Subject here" in text
    assert "Body" in text
