# app/api/analytics_api.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas import (
    UserStatsOverview,
    UserStatsProgress,
    FlashcardStats,
    ExplanationOut,
)
from app.services.analytics_service import (
    get_user_overview_service,
    get_user_progress_service,
    get_flashcard_stats_service,
    explain_question_service,
)

router = APIRouter(prefix="/users/{user_id}/stats", tags=["analytics"])


@router.get("/overview", response_model=UserStatsOverview)
async def get_overview(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await get_user_overview_service(db, user_id)


@router.get("/progress", response_model=UserStatsProgress)
async def get_progress(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await get_user_progress_service(db, user_id)


@router.get("/flashcards", response_model=List[FlashcardStats])
async def get_flashcards_stats(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await get_flashcard_stats_service(db, user_id)


# Optional: explanation endpoint (not user-specific)
@router.get(
    "/questions/{question_id}/explanation",
    response_model=ExplanationOut,
)
async def explain_question(
    user_id: int,  # still in path for consistency but not used in lookup
    question_id: int,
    db: AsyncSession = Depends(get_db),
):
    # If you want, you could also check that this question belongs
    # to a quiz owned by `user_id` before explaining it.
    return await explain_question_service(db, question_id)
