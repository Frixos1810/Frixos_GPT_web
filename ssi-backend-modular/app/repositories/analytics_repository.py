# app/repositories/analytics_repository.py
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Flashcard, Quiz, QuizQuestion


async def get_user_overview_raw(
    db: AsyncSession,
    user_id: int,
) -> dict:
    # total flashcards
    res = await db.execute(
        select(func.count(Flashcard.id)).where(Flashcard.user_id == user_id)
    )
    total_flashcards = res.scalar_one() or 0

    # total quizzes
    res = await db.execute(
        select(func.count(Quiz.id)).where(Quiz.user_id == user_id)
    )
    total_quizzes = res.scalar_one() or 0

    # avg quiz score
    res = await db.execute(
        select(func.avg(Quiz.score_percent)).where(Quiz.user_id == user_id)
    )
    avg_quiz_score = res.scalar_one()
    avg_quiz_score = float(avg_quiz_score) if avg_quiz_score is not None else None

    # last quiz score
    res = await db.execute(
        select(Quiz.score_percent)
        .where(Quiz.user_id == user_id)
        .order_by(Quiz.created_at.desc())
        .limit(1)
    )
    last = res.scalar_one_or_none()
    last_quiz_score = float(last) if last is not None else None

    # last 10 answered questions accuracy
    res = await db.execute(
        select(QuizQuestion.is_correct)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .where(
            Quiz.user_id == user_id,
            QuizQuestion.is_correct.is_not(None),
        )
        .order_by(QuizQuestion.created_at.desc())
        .limit(10)
    )
    recent_flags = [row[0] for row in res.all()]
    if recent_flags:
        accuracy_last_10 = (
            sum(1 for v in recent_flags if v) / len(recent_flags) * 100.0
        )
    else:
        accuracy_last_10 = None

    return {
        "total_flashcards": int(total_flashcards),
        "total_quizzes": int(total_quizzes),
        "avg_quiz_score": avg_quiz_score,
        "last_quiz_score": last_quiz_score,
        "accuracy_last_10_questions": accuracy_last_10,
    }


async def get_user_quizzes_raw(
    db: AsyncSession,
    user_id: int,
) -> List[Quiz]:
    res = await db.execute(
        select(Quiz)
        .where(Quiz.user_id == user_id)
        .order_by(Quiz.created_at.asc())
    )
    return list(res.scalars().all())


async def get_flashcard_stats_raw(
    db: AsyncSession,
    user_id: int,
) -> List[Tuple]:
    """
    Returns tuples:
    (flashcard_id, question, answer, total_attempts, correct_attempts, last_attempt_at)
    """
    res = await db.execute(
        select(
            Flashcard.id,
            Flashcard.question,
            Flashcard.answer,
            func.count(QuizQuestion.id),
            func.sum(
                case(
                    (QuizQuestion.is_correct.is_(True), 1),
                    else_=0,
                )
            ),
            func.max(QuizQuestion.created_at),
        )
        .join(QuizQuestion, QuizQuestion.flashcard_id == Flashcard.id)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .where(Flashcard.user_id == user_id)
        .group_by(Flashcard.id, Flashcard.question, Flashcard.answer)
    )
    return res.all()
