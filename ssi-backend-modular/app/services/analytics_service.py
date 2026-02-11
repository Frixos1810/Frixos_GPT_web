# app/services/analytics_service.py
from __future__ import annotations

from typing import List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import (
    UserStatsOverview,
    QuizResultItem,
    UserStatsProgress,
    FlashcardStats,
    ExplanationOut,
)
from app.repositories.user_repository import get_user_by_id
from app.repositories.analytics_repository import (
    get_user_overview_raw,
    get_user_quizzes_raw,
    get_flashcard_stats_raw,
)
from app.repositories.quiz_repository import get_question_by_id
from app.core.openai_client import generate_chat_reply


async def ensure_user_exists(db: AsyncSession, user_id: int):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


async def get_user_overview_service(
    db: AsyncSession,
    user_id: int,
) -> UserStatsOverview:
    await ensure_user_exists(db, user_id)
    raw = await get_user_overview_raw(db, user_id)
    return UserStatsOverview(**raw)


async def get_user_progress_service(
    db: AsyncSession,
    user_id: int,
) -> UserStatsProgress:
    await ensure_user_exists(db, user_id)
    quizzes = await get_user_quizzes_raw(db, user_id)

    items: List[QuizResultItem] = [
        QuizResultItem(
            quiz_id=q.id,
            title=q.title,
            score_percent=float(q.score_percent),
            created_at=q.created_at,
        )
        for q in quizzes
    ]
    return UserStatsProgress(quizzes=items)


async def get_flashcard_stats_service(
    db: AsyncSession,
    user_id: int,
) -> List[FlashcardStats]:
    await ensure_user_exists(db, user_id)
    rows = await get_flashcard_stats_raw(db, user_id)

    stats: List[FlashcardStats] = []
    for (
        flashcard_id,
        question,
        answer,
        total_attempts,
        correct_attempts,
        last_attempt_at,
    ) in rows:
        total_attempts = int(total_attempts or 0)
        correct_attempts = int(correct_attempts or 0)
        accuracy = (
            (correct_attempts / total_attempts) * 100.0
            if total_attempts > 0
            else None
        )
        stats.append(
            FlashcardStats(
                flashcard_id=flashcard_id,
                question=question,
                answer=answer,
                total_attempts=total_attempts,
                correct_attempts=correct_attempts,
                last_attempt_at=last_attempt_at,
                accuracy=accuracy,
            )
        )
    return stats


async def explain_question_service(
    db: AsyncSession,
    question_id: int,
) -> ExplanationOut:
    question = await get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(404, "Question not found")

    prompt = (
        "You are a helpful tutor. Explain this quiz question and answer.\n\n"
        f"Question: {question.question_text}\n"
        f"Correct answer: {question.correct_answer}\n"
    )
    if question.user_answer is not None:
        prompt += f"User's answer: {question.user_answer}\n"

    prompt += (
        "\nExplain why the correct answer is correct, and if the user's answer "
        "is different, explain the mistake in a friendly way."
    )

    explanation = await generate_chat_reply(
        model_name="gpt-4o-mini",
        messages_for_model=[
            {"role": "system", "content": "You are a friendly teacher."},
            {"role": "user", "content": prompt},
        ],
    )

    return ExplanationOut(
        question_id=question.id,
        explanation=explanation,
    )
