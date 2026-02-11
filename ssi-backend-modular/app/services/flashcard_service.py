# app/services/flashcard_service.py
from __future__ import annotations

from typing import List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.openai_client import generate_structured_output
from app.schemas import FlashcardCreate, FlashcardOut
from app.repositories.user_repository import get_user_by_id
from app.repositories.flashcard_repository import (
    get_flashcard_by_id,
    list_user_flashcards,
    create_flashcard,
    update_flashcard_content,
    set_flashcard_active_state,
    delete_flashcard,
)
from app.repositories.chat_repository import get_message_by_id, get_chat_session_by_id


async def ensure_user_exists(db: AsyncSession, user_id: int):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


async def ensure_flashcard_exists(db: AsyncSession, flashcard_id: int):
    card = await get_flashcard_by_id(db, flashcard_id)
    if not card:
        raise HTTPException(404, "Flashcard not found")
    return card


# ============================================================
# CRUD (unchanged)
# ============================================================

async def create_flashcard_for_user(
    db: AsyncSession,
    user_id: int,
    payload: FlashcardCreate,
) -> FlashcardOut:
    await ensure_user_exists(db, user_id)

    card = await create_flashcard(
        db,
        user_id=user_id,
        question=payload.question,
        answer=payload.answer,
        chat_session_id=payload.chat_session_id,
        source_message_id=payload.source_message_id,
    )
    return FlashcardOut.model_validate(card)


async def list_flashcards_for_user_service(
    db: AsyncSession,
    user_id: int,
    only_active: bool | None = None,
    chat_session_id: int | None = None,
    source_message_id: int | None = None,
) -> List[FlashcardOut]:
    await ensure_user_exists(db, user_id)
    cards = await list_user_flashcards(
        db,
        user_id,
        only_active,
        chat_session_id=chat_session_id,
        source_message_id=source_message_id,
    )
    return [FlashcardOut.model_validate(c) for c in cards]


async def update_flashcard_service(
    db: AsyncSession,
    user_id: int,
    flashcard_id: int,
    *,
    question: str | None = None,
    answer: str | None = None,
) -> FlashcardOut:
    await ensure_user_exists(db, user_id)
    card = await ensure_flashcard_exists(db, flashcard_id)
    if card.user_id != user_id:
        raise HTTPException(403, "Not allowed to modify this flashcard")

    card = await update_flashcard_content(db, card, question=question, answer=answer)
    return FlashcardOut.model_validate(card)


async def set_flashcard_active_service(
    db: AsyncSession,
    user_id: int,
    flashcard_id: int,
    is_active: bool,
) -> FlashcardOut:
    await ensure_user_exists(db, user_id)
    card = await ensure_flashcard_exists(db, flashcard_id)
    if card.user_id != user_id:
        raise HTTPException(403, "Not allowed to modify this flashcard")

    card = await set_flashcard_active_state(db, card, is_active)
    return FlashcardOut.model_validate(card)


async def delete_flashcard_service(
    db: AsyncSession,
    user_id: int,
    flashcard_id: int,
) -> None:
    await ensure_user_exists(db, user_id)
    card = await ensure_flashcard_exists(db, flashcard_id)
    if card.user_id != user_id:
        raise HTTPException(403, "Not allowed to delete this flashcard")

    await delete_flashcard(db, card)


# ============================================================
# NEW: auto-generate from ASSISTANT message (Structured Outputs)
# ============================================================

_ASSISTANT_TO_FLASHCARDS_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "full_response": {
            "type": "string",
            "description": "A single assistant message suitable for display (explain briefly what was answered and what flashcards were made).",
        },
        "flashcards": {
            "type": "array",
            "maxItems": 5,
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "answer": {"type": "string"},
                },
                "required": ["question", "answer"],
                "additionalProperties": False,
            },
        },
        "warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["full_response", "flashcards", "warnings"],
    "additionalProperties": False,
}


async def auto_generate_flashcards_from_assistant_message(
    db: AsyncSession,
    *,
    user_id: int,
    assistant_message_id: int,
    model_name: str = "gpt-4o-mini",
) -> List[FlashcardOut]:
    """
    Generates up to 5 flashcards from an assistant message and saves them.
    Each flashcard is linked to:
      - chat_session_id (from message)
      - source_message_id = assistant_message_id
    """
    await ensure_user_exists(db, user_id)

    msg = await get_message_by_id(db, assistant_message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.sender_role != "assistant":
        raise HTTPException(400, "Flashcards must be generated from an assistant message")

    chat = await get_chat_session_by_id(db, msg.chat_session_id)
    if not chat:
        raise HTTPException(404, "Chat session not found")
    if chat.user_id != user_id:
        raise HTTPException(403, "Not allowed")

    system_prompt = (
        "You are an expert nursing/SSI tutor.\n"
        "Task: generate up to 5 study flashcards from the ASSISTANT message.\n"
        "Return STRICT JSON that matches the provided schema.\n"
        "Rules:\n"
        "- flashcards: 1 to 5 items max.\n"
        "- Keep each question short and testable.\n"
        "- Answers should be concise but correct.\n"
        "- full_response must be a single string that summarizes what you did.\n"
        "- warnings is an array of strings (can be empty).\n"
        "- Output ONLY JSON (no markdown, no commentary)."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": msg.content},
    ]

    data = await generate_structured_output(
        model_name=model_name,
        messages_for_model=messages,
        schema_name="assistant_to_flashcards",
        json_schema=_ASSISTANT_TO_FLASHCARDS_SCHEMA,
        temperature=0.2,
    )

    # Save flashcards
    created_cards: List[FlashcardOut] = []
    for fc in data["flashcards"]:
        card = await create_flashcard(
            db,
            user_id=user_id,
            question=fc["question"],
            answer=fc["answer"],
            chat_session_id=msg.chat_session_id,
            source_message_id=msg.id,
        )
        created_cards.append(FlashcardOut.model_validate(card))

    return created_cards
