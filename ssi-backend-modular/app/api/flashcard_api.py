# app/api/flashcard_api.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas import FlashcardCreate, FlashcardOut
from app.services.flashcard_service import (
    create_flashcard_for_user,
    list_flashcards_for_user_service,
    update_flashcard_service,
    set_flashcard_active_service,
    delete_flashcard_service,
)

# THIS must exist at module level so main.py can import it
router = APIRouter(prefix="/users/{user_id}", tags=["flashcards"])


@router.post("/flashcards", response_model=FlashcardOut, status_code=201)
async def create_flashcard(
    user_id: int,
    payload: FlashcardCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_flashcard_for_user(db, user_id, payload)


@router.get("/flashcards", response_model=List[FlashcardOut])
async def list_flashcards(
    user_id: int,
    only_active: bool | None = Query(
        default=None,
        description="If true, only return active flashcards.",
    ),
    chat_session_id: int | None = Query(
        default=None,
        description="If set, only return flashcards from this chat session.",
    ),
    source_message_id: int | None = Query(
        default=None,
        description="If set, only return flashcards generated from this message.",
    ),
    db: AsyncSession = Depends(get_db),
):
    return await list_flashcards_for_user_service(
        db,
        user_id,
        only_active,
        chat_session_id=chat_session_id,
        source_message_id=source_message_id,
    )


@router.patch("/flashcards/{flashcard_id}", response_model=FlashcardOut)
async def update_flashcard(
    user_id: int,
    flashcard_id: int,
    question: str | None = None,
    answer: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await update_flashcard_service(
        db,
        user_id,
        flashcard_id,
        question=question,
        answer=answer,
    )


@router.patch("/flashcards/{flashcard_id}/active", response_model=FlashcardOut)
async def set_flashcard_active(
    user_id: int,
    flashcard_id: int,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
):
    return await set_flashcard_active_service(
        db,
        user_id,
        flashcard_id,
        is_active,
    )


@router.delete("/flashcards/{flashcard_id}", status_code=204)
async def delete_flashcard(
    user_id: int,
    flashcard_id: int,
    db: AsyncSession = Depends(get_db),
):
    await delete_flashcard_service(db, user_id, flashcard_id)
    return None
