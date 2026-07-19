from pydantic import BaseModel
from typing import Optional


class ApplicationInput(BaseModel):
    company: str
    post: str
    description: Optional[str] = ""
    keywords: Optional[str] = ""
    to_email: Optional[str] = None


class GeneratedApplication(BaseModel):
    company: str
    email: Optional[str]
    cv_content: str      # CV Typst source, keywords added, nothing else changed
    email_subject: str
    email_body: str      # HTML email body
