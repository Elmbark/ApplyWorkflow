import json
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
    DATA_DIR: str = "."
    EXCEL_FILE: str = "applications.xlsx"
    PROFILE_FILE: str = "profile.json"
    CV_TEMPLATE_FILE: str = "templates/cv_template.typ"
    OUTPUT_DIR: str = "output"
    APP_CONFIG_FILE: str = "settings.json"

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
        return self.resolve(self.PROFILE_FILE)

    @property
    def app_config_path(self) -> Path:
        return self.resolve(self.APP_CONFIG_FILE)

    def load_saved_config(self) -> None:
        """Apply UI-managed settings after environment defaults are loaded."""
        if not self.app_config_path.is_file():
            return
        try:
            values = json.loads(self.app_config_path.read_text(encoding="utf-8"))
            for key, value in values.items():
                if key in EDITABLE_SETTINGS:
                    setattr(self, key, value)
        except (OSError, ValueError, TypeError):
            pass

    def save_config(self, values: dict) -> None:
        clean = {key: value for key, value in values.items() if key in EDITABLE_SETTINGS}
        self.app_config_path.parent.mkdir(parents=True, exist_ok=True)
        self.app_config_path.write_text(json.dumps(clean, indent=2), encoding="utf-8")
        for key, value in clean.items():
            setattr(self, key, value)

    def load_profile(self) -> dict[str, str]:
        import json
        p = self.profile_path
        if not p.exists():
            return {}
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}


EDITABLE_SETTINGS = {
    "LLM_PROVIDER", "GROQ_API_KEY", "OPENAI_API_KEY", "GROQ_MODEL",
    "OPENAI_MODEL", "LLM_TEMPERATURE",
}

settings = Settings()
settings.load_saved_config()
