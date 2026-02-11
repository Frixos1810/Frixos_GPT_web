# app/core/config.py
from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "SSI Learning Backend (Structured Outputs Enabled)"
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    OPENAI_VECTOR_STORE_ID: str | None = os.getenv("OPENAI_VECTOR_STORE_ID")
    DATABASE_URL: str | None = os.getenv("DATABASE_URL")

    def ensure(self) -> "Settings":
        if not self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL not set")
        if not self.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set")
        return self


settings = Settings().ensure()
