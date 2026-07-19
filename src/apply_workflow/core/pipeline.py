import asyncio
import logging
from pathlib import Path

from apply_workflow.config import settings
from apply_workflow.utils.excel import read_applications
from apply_workflow.utils.typst import load_template, save_cv, compile_to_pdf
from apply_workflow.schemas import GeneratedApplication
from apply_workflow.services.llm import LLMService

logger = logging.getLogger(__name__)


def save_email(app: GeneratedApplication, output_dir: str) -> Path:
    """Write the email to a .txt file for review before (optionally) sending."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    safe = "".join(c if c.isalnum() else "_" for c in app.company)
    path = out / f"{safe}_email.txt"
    path.write_text(
        f"TO: {app.email or '(no email)'}\n"
        f"SUBJECT: {app.email_subject}\n"
        f"{'─' * 60}\n"
        f"{app.email_body}",
        encoding="utf-8",
    )
    logger.info("Email preview saved → %s", path)
    return path


async def run_pipeline(
    send: bool = False,
    compile_pdf: bool = False,
    limit: int = 0,
    company_filter: str = "",
) -> None:

    if send:
        compile_pdf = True

    # Load profile.json
    profile_data = settings.load_profile()
    if not profile_data:
        logger.error("profile.json is missing, empty, or invalid. Please check your configuration.")
        return

    # ── 1. Read Excel ────────────────────────────────────────────────────────
    logger.info("Reading Excel: %s", settings.EXCEL_FILE)
    rows = read_applications(str(settings.excel_path))

    if company_filter:
        rows = [r for r in rows if company_filter.lower() in r.company.lower()]
        logger.info("Filtered to %d rows matching '%s'", len(rows), company_filter)

    if limit:
        rows = rows[:limit]
        logger.info("Limited to first %d rows.", limit)

    if not rows:
        logger.warning("No rows to process. Exiting.")
        return

    # ── 2. Load CV template ──────────────────────────────────────────────────
    logger.info("Loading CV template: %s", settings.cv_template_path)
    template = load_template(str(settings.cv_template_path))

    # ── 3. Init LLM (always needed) ──────────────────────────────────────────
    llm = LLMService()

    # ── 4. Init Gmail ONLY when --send is requested ───────────────────────────
    gmail = None
    if send:
        try:
            from apply_workflow.services.gmail import GmailService
            gmail = GmailService()
            logger.info("Gmail service ready.")
        except FileNotFoundError as e:
            logger.error(
                "Gmail credentials not found: %s\n"
                "Place credentials.json in the app/ directory or update "
                "GMAIL_CREDENTIALS_FILE in your .env.\n"
                "Continuing in dry-run mode (no emails will be sent).",
                e,
            )
            send = False   # degrade gracefully to dry-run

    # ── 5. Process each row ──────────────────────────────────────────────────
    for i, row in enumerate(rows, 1):
        logger.info("── [%d/%d] %s / %s ──", i, len(rows), row.company, row.post)

        try:
            app: GeneratedApplication = await llm.process(row, template, profile_data)
        except Exception:
            logger.exception("Generation failed for %s — skipping.", row.company)
            continue

        # Inject personal details from profile_data into the tailored Typst template
        cv_content = app.cv_content
        for key, val in profile_data.items():
            cv_content = cv_content.replace(f"{{{{ {key} }}}}", val)
            cv_content = cv_content.replace(f"{{{{{key}}}}}", val)

        # Create application-specific subdirectory: output/[company]_[role]
        import re
        company_safe = re.sub(r"[^\w\-]", "_", row.company)
        role_safe = re.sub(r"[^\w\-]", "_", row.post)
        app_dir_name = f"{company_safe}_{role_safe}"
        app_dir_name = re.sub(r"_+", "_", app_dir_name).strip("_")
        app_output_dir = Path(settings.OUTPUT_DIR) / app_dir_name
        app_output_dir.mkdir(parents=True, exist_ok=True)

        # Save Typst CV
        myname = profile_data.get("name", "NidhalElmbarki").replace(" ", "_")
        typ_path = save_cv(cv_content, str(app_output_dir), f"{myname}_{role_safe}")
        pdf_path = None
        if compile_pdf:
            pdf_path = compile_to_pdf(typ_path)
            if not pdf_path.exists():
                logger.warning("PDF compile failed for %s — sending without attachment.", row.company)
                pdf_path = None

        # Save email preview (always)
        save_email(app, str(app_output_dir))

        if send and gmail:
            if row.to_email:
                result = await gmail.send_email(
                    row.to_email, app.email_subject, app.email_body,
                    attachment_path=pdf_path,
                )
                if result.success:
                    logger.info("Email sent ✓ → %s", row.to_email)
                else:
                    logger.error("Send failed → %s: %s", row.to_email, result.error)
            else:
                logger.warning("No email address for %s — skipped.", row.company)

        if i < len(rows):
            await asyncio.sleep(1.5)

    logger.info("Done. Outputs in: %s/", settings.OUTPUT_DIR)
