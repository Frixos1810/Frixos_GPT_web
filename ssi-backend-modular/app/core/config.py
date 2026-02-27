# app/core/config.py
from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    PROJECT_NAME: str = "SSI Learning Backend (Structured Outputs Enabled)"
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    OPENAI_VECTOR_STORE_ID: str | None = os.getenv("OPENAI_VECTOR_STORE_ID")
    DATABASE_URL: str | None = os.getenv("DATABASE_URL")
    STRICT_VERIFIED_ONLY: bool = _env_bool("STRICT_VERIFIED_ONLY", default=False)

    def ensure(self) -> "Settings":
        if not self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL not set")
        if not self.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set")
        return self


settings = Settings().ensure()
