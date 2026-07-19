from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # ── Secrets (from .env) ────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # ── LLM provider: "groq" | "openai" ────────────────────────────────
    LLM_PROVIDER: str = "groq"
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    OPENAI_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.3

    # ── Gmail OAuth ───────────────────────────────────────────────────────
    # These can be bare filenames ("credentials.json") or absolute paths.
    # If bare, they are resolved relative to the root directory.
    GMAIL_CREDENTIALS_FILE: str = "credentials.json"
    GMAIL_TOKEN_FILE: str = "token.json"

    # ── Typst Binary Path ──────────────────────────────────────────────────
    TYPST_BINARY_PATH: str = "typst"

    # ── File paths ────────────────────────────────────────────────────────
    EXCEL_FILE: str = "applications.xlsx"
    CV_TEMPLATE_FILE: str = "templates/cv_template.typ"
    OUTPUT_DIR: str = "output"



    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        extra="ignore",
    )

    def resolve(self, filename: str) -> Path:
        p = Path(filename)
        return p if p.is_absolute() else ROOT_DIR / p

    @property
    def credentials_path(self) -> Path:
        return self.resolve(self.GMAIL_CREDENTIALS_FILE)

    @property
    def token_path(self) -> Path:
        return self.resolve(self.GMAIL_TOKEN_FILE)

    @property
    def excel_path(self) -> Path:
        return self.resolve(self.EXCEL_FILE)

    @property
    def cv_template_path(self) -> Path:
        p = self.resolve(self.CV_TEMPLATE_FILE)
        if not p.exists() and not Path(self.CV_TEMPLATE_FILE).is_absolute():
            fallback = ROOT_DIR / "templates" / self.CV_TEMPLATE_FILE
            if fallback.exists():
                return fallback
        return p

    @property
    def profile_path(self) -> Path:
        return ROOT_DIR / "profile.json"

    def load_profile(self) -> dict[str, str]:
        import json
        p = self.profile_path
        if not p.exists():
            return {}
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}


settings = Settings()
