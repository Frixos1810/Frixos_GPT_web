# app/repositories/flashcard_repository.py
from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Flashcard


async def get_flashcard_by_id(
    db: AsyncSession,
    flashcard_id: int,
) -> Optional[Flashcard]:
    res = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id)
    )
    return res.scalar_one_or_none()


async def list_user_flashcards(
    db: AsyncSession,
    user_id: int,
    only_active: bool | None = None,
    chat_session_id: int | None = None,
    source_message_id: int | None = None,
) -> List[Flashcard]:
    stmt = select(Flashcard).where(Flashcard.user_id == user_id)
    if only_active is True:
        stmt = stmt.where(Flashcard.is_active.is_(True))
    if chat_session_id is not None:
        stmt = stmt.where(Flashcard.chat_session_id == chat_session_id)
    if source_message_id is not None:
        stmt = stmt.where(Flashcard.source_message_id == source_message_id)
    res = await db.execute(stmt.order_by(Flashcard.created_at.desc()))
    return list(res.scalars().all())


async def create_flashcard(
    db: AsyncSession,
    *,
    user_id: int,
    question: str,
    answer: str,
    chat_session_id: int | None = None,
    source_message_id: int | None = None,
) -> Flashcard:
    card = Flashcard(
        user_id=user_id,
        chat_session_id=chat_session_id,
        source_message_id=source_message_id,
        question=question,
        answer=answer,
        is_active=True,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


async def update_flashcard_content(
    db: AsyncSession,
    flashcard: Flashcard,
    *,
    question: str | None = None,
    answer: str | None = None,
) -> Flashcard:
    if question is not None:
        flashcard.question = question
    if answer is not None:
        flashcard.answer = answer

    await db.commit()
    await db.refresh(flashcard)
    return flashcard


async def set_flashcard_active_state(
    db: AsyncSession,
    flashcard: Flashcard,
    is_active: bool,
) -> Flashcard:
    flashcard.is_active = is_active
    await db.commit()
    await db.refresh(flashcard)
    return flashcard


async def delete_flashcard(
    db: AsyncSession,
    flashcard: Flashcard,
) -> None:
    await db.delete(flashcard)
    await db.commit()
