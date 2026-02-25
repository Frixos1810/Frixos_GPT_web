# app/main.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base

# Routers
from app.api.user_api import router as user_router
from app.api.chat_api import router as chat_router
from app.api.flashcard_api import router as flashcard_router
from app.api.quiz_api import router as quiz_router
from app.api.analytics_api import router as analytics_router
from app.api.admin_api import router as admin_router


app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Create tables on startup (like auto-migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "SSI Backend Running",
        "structured_outputs": True,
    }


# -------- Include Routers --------
app.include_router(user_router)
app.include_router(chat_router)
app.include_router(flashcard_router)
app.include_router(quiz_router)
app.include_router(analytics_router)
app.include_router(admin_router)
