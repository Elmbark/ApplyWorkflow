import base64
import logging
from dataclasses import dataclass
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

import asyncio
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from apply_workflow.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailSendResult:
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class GmailService:
    SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

    def __init__(self):
        self.service = None
        self.authenticate()

    def authenticate(self):
        creds_path = settings.credentials_path
        token_path = settings.token_path

        creds = None
        if token_path.exists():
            creds = Credentials.from_authorized_user_file(str(token_path), self.SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not creds_path.exists():
                    raise FileNotFoundError(
                        f"Gmail credentials not found at: {creds_path}\n"
                        "Download it from Google Cloud Console → APIs & Services → Credentials."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), self.SCOPES)
                creds = flow.run_local_server(port=0)
            token_path.write_text(creds.to_json())

        self.service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        logger.info("Gmail authenticated.")

    async def send_email(self, to_email: str, subject: str, body: str,
                          attachment_path: Optional[Path] = None) -> EmailSendResult:
        try:
            msg = MIMEMultipart("mixed")
            msg["to"] = to_email
            msg["subject"] = subject
            msg.attach(MIMEText(body, "html"))

            if attachment_path and Path(attachment_path).exists():
                with open(attachment_path, "rb") as f:
                    part = MIMEApplication(f.read(), _subtype="pdf")
                part.add_header("Content-Disposition", "attachment", filename=Path(attachment_path).name)
                msg.attach(part)
                logger.info("Attached PDF → %s", attachment_path)

            raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
            result = await asyncio.to_thread(
                lambda: self.service.users().messages().send(userId="me", body={"raw": raw}).execute(num_retries=2)
            )
            logger.info("Sent ✓ → %s", to_email)
            return EmailSendResult(success=True, message_id=result.get("id"))
        except Exception as e:
            logger.error("Send failed → %s: %s", to_email, e, exc_info=True)
            return EmailSendResult(success=False, error=str(e))
