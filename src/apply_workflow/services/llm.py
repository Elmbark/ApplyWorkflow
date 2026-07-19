import asyncio
import json
import logging
import re
from typing import Tuple

from groq import Groq
from openai import OpenAI

from apply_workflow.config import settings
from apply_workflow.schemas import ApplicationInput, GeneratedApplication

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        if self.provider == "groq":
            self.client = Groq(api_key=settings.GROQ_API_KEY)
            self.model = settings.GROQ_MODEL
        elif self.provider == "openai":
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
        else:
            raise ValueError(f"Unsupported LLM_PROVIDER: {self.provider}")
        logger.info("LLM → %s (%s)", self.provider, self.model)

    def _read_prompt(self, name: str) -> str:
        prompt_path = settings.resolve("templates/prompts") / name
        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt template file not found: {prompt_path}")
        return prompt_path.read_text(encoding="utf-8")

    async def _call(self, system_prompt: str, user_message: str, json_mode: bool = False) -> str:
        kwargs = dict(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await asyncio.to_thread(lambda: self.client.chat.completions.create(**kwargs))
        usage = response.usage
        logger.info("Tokens — in:%d out:%d", usage.prompt_tokens, usage.completion_tokens)
        return response.choices[0].message.content

    async def add_keywords_to_cv(self, template: str, keywords: str, profile_data: dict) -> str:
        """Return the CV with keywords added to the skills section — nothing else changes."""
        system_tpl = self._read_prompt("cv_keywords.txt")
        system_prompt = system_tpl.format(your_name=profile_data.get("name", ""))

        user_tpl = self._read_prompt("cv_user_message.txt")
        user_msg = user_tpl.format(template=template, keywords=keywords or "(none given)")

        logger.info("Adding keywords to CV: %s", keywords)
        return await self._call(system_prompt, user_msg)

    async def draft_email(self, company: str, post: str, description: str, keywords: str, profile_data: dict) -> Tuple[str, str]:
        """Return (subject, html_body)."""
        system_tpl = self._read_prompt("email_keywords.txt")
        system_prompt = system_tpl.format(
            your_name=profile_data.get("name", ""),
            your_email=profile_data.get("email", ""),
        )

        user_tpl = self._read_prompt("email_user_message.txt")
        user_msg = user_tpl.format(
            company=company,
            post=post,
            description=description or "(none provided)",
            keywords=keywords or "(none)",
        )

        raw = await self._call(system_prompt, user_msg, json_mode=True)
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        fields = json.loads(clean)

        # Load and render email HTML
        html_tpl_path = settings.resolve("templates/email_body.html")
        if not html_tpl_path.exists():
            raise FileNotFoundError(f"Email body template not found at {html_tpl_path}")
        html_tpl = html_tpl_path.read_text(encoding="utf-8")

        contact_lines = "<br>\n".join(
            f for f in [
                profile_data.get("email"),
                profile_data.get("phone"),
                profile_data.get("linkedin"),
                profile_data.get("github"),
            ] if f and f.strip()
        )

        html = html_tpl.format(
            name=profile_data.get("name", ""),
            company=company,
            post=post,
            contact_lines=contact_lines,
            opening_line=fields["opening_line"],
            closing_line=fields["closing_line"],
        )
        return fields["subject"], html

    async def enhance_template(self, template: str) -> str:
        """Use the LLM to improve the Typst template's clarity and impact.
        Placeholders like {{ name }} must be preserved.
        """
        system_prompt = self._read_prompt("cv_enhance.txt")
        user_msg = template
        return await self._call(system_prompt, user_msg)
    
    async def process(self, app_input: ApplicationInput, template: str, profile_data: dict) -> GeneratedApplication:
        cv_content = await self.add_keywords_to_cv(template, app_input.keywords or "", profile_data)
        subject, body = await self.draft_email(
            app_input.company, app_input.post, app_input.description or "", app_input.keywords or "", profile_data
        )
        return GeneratedApplication(
            company=app_input.company,
            email=app_input.to_email,
            cv_content=cv_content,
            email_subject=subject,
            email_body=body,
        )
