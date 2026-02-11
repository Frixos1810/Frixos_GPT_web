# app/repositories/quiz_repository.py
from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Quiz, QuizQuestion, Flashcard


async def get_quiz_by_id(
    db: AsyncSession,
    quiz_id: int,
) -> Optional[Quiz]:
    res = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id)
    )
    return res.scalar_one_or_none()


async def list_quizzes_for_user(
    db: AsyncSession,
    user_id: int,
) -> List[Quiz]:
    res = await db.execute(
        select(Quiz)
        .where(Quiz.user_id == user_id)
        .order_by(Quiz.created_at.desc())
    )
    return list(res.scalars().all())


async def create_quiz_with_questions(
    db: AsyncSession,
    *,
    user_id: int,
    title: str | None,
    flashcard_ids: List[int],
    source_type: str | None = None,
    source_chat_session_id: int | None = None,
) -> Quiz:
    # fetch all flashcards (and validate belong to user)
    res = await db.execute(
        select(Flashcard).where(
            Flashcard.id.in_(flashcard_ids),
            Flashcard.user_id == user_id,
        )
    )
    flashcards = list(res.scalars().all())
    requested_ids = list(dict.fromkeys(flashcard_ids))
    if len(flashcards) != len(requested_ids):
        # some flashcards missing or belong to another user
        raise ValueError("Invalid flashcard IDs for this user")

    flashcards_by_id = {card.id: card for card in flashcards}
    ordered_flashcards = [flashcards_by_id[fid] for fid in requested_ids]
    total_questions = len(ordered_flashcards)

    quiz = Quiz(
        user_id=user_id,
        title=title,
        total_questions=total_questions,
        correct_answers=0,
        score_percent=0.0,
        duration_seconds=None,
        source_type=source_type,
        source_chat_session_id=source_chat_session_id,
    )

    db.add(quiz)
    await db.flush()  # so quiz.id is available

    questions: list[QuizQuestion] = []
    for idx, card in enumerate(ordered_flashcards, start=1):
        q = QuizQuestion(
            quiz_id=quiz.id,
            flashcard_id=card.id,
            question_text=card.question,
            correct_answer=card.answer,
            order_index=idx,
            user_answer=None,
            is_correct=None,
            mcq_options=None,
        )
        db.add(q)
        questions.append(q)

    await db.commit()
    await db.refresh(quiz)
    return quiz


async def list_questions_for_quiz(
    db: AsyncSession,
    quiz_id: int,
) -> List[QuizQuestion]:
    res = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_id == quiz_id)
        .order_by(QuizQuestion.order_index)
    )
    return list(res.scalars().all())


async def get_question_by_id(
    db: AsyncSession,
    question_id: int,
) -> Optional[QuizQuestion]:
    res = await db.execute(
        select(QuizQuestion).where(QuizQuestion.id == question_id)
    )
    return res.scalar_one_or_none()


async def save_question_answer(
    db: AsyncSession,
    question: QuizQuestion,
    user_answer: str,
) -> QuizQuestion:
    question.user_answer = user_answer
    question.is_correct = (user_answer.strip() == question.correct_answer.strip())
    await db.commit()
    await db.refresh(question)
    return question


async def recompute_quiz_score(
    db: AsyncSession,
    quiz: Quiz,
) -> Quiz:
    res = await db.execute(
        select(
            func.count(QuizQuestion.id),
            func.sum(
                case(
                    (QuizQuestion.is_correct.is_(True), 1),
                    else_=0,
                )
            ),
        ).where(QuizQuestion.quiz_id == quiz.id)
    )
    total, correct = res.one()
    total = total or 0
    correct = correct or 0

    quiz.total_questions = total
    quiz.correct_answers = correct
    quiz.score_percent = float(correct) / total * 100 if total > 0 else 0.0

    await db.commit()
    await db.refresh(quiz)
    return quiz
