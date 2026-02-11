# app/services/quiz_service.py
from __future__ import annotations

import json
from typing import List, Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.openai_client import generate_structured_text
from app.models import Flashcard
from app.schemas import (
    QuizCreate,
    QuizOut,
    QuizQuestionOut,
    QuizDetailOut,
    QuizQuestionAnswerIn,
)
from app.repositories.user_repository import get_user_by_id
from app.repositories.quiz_repository import (
    get_quiz_by_id,
    list_quizzes_for_user,
    create_quiz_with_questions,
    list_questions_for_quiz,
    get_question_by_id,
    save_question_answer,
    recompute_quiz_score,
)


class MCQOption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: Literal["A", "B", "C", "D"]
    text: str = Field(..., min_length=1)


class MCQQuestionPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    flashcard_id: int
    question: str = Field(..., min_length=1)
    options: List[MCQOption]
    correct_label: Literal["A", "B", "C", "D"]


class MCQQuizPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="MCQ Quiz")
    questions: List[MCQQuestionPlan]


def _build_mcq_prompt(flashcards: list[dict]) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You generate multiple-choice quizzes from flashcards.\n"
                "Return strict JSON matching the schema.\n"
                "Generate exactly one question per flashcard.\n"
                "Each question must have exactly four options labeled A, B, C, D.\n"
                "Exactly one option is correct.\n"
                "The correct option text must be exactly the flashcard answer text.\n"
                "Keep the flashcard_id unchanged in each question.\n"
            ),
        },
        {
            "role": "user",
            "content": f"Flashcards JSON:\n{json.dumps(flashcards, ensure_ascii=True)}",
        },
    ]


def _validate_mcq_plan(plan: MCQQuizPlan, requested_ids: list[int]) -> None:
    expected_ids = set(requested_ids)
    if len(plan.questions) != len(requested_ids):
        raise HTTPException(502, "MCQ generation failed: question count mismatch")

    seen_ids: set[int] = set()
    for q in plan.questions:
        if q.flashcard_id not in expected_ids:
            raise HTTPException(502, "MCQ generation failed: unknown flashcard_id")
        if q.flashcard_id in seen_ids:
            raise HTTPException(502, "MCQ generation failed: duplicate flashcard_id")
        seen_ids.add(q.flashcard_id)

        if len(q.options) != 4:
            raise HTTPException(502, "MCQ generation failed: each question needs 4 options")

        labels = [opt.label for opt in q.options]
        if set(labels) != {"A", "B", "C", "D"}:
            raise HTTPException(502, "MCQ generation failed: options must be labeled A-D")
        if len(set(labels)) != 4:
            raise HTTPException(502, "MCQ generation failed: duplicate option labels")

        option_texts = [opt.text.strip() for opt in q.options]
        if any(not text for text in option_texts):
            raise HTTPException(502, "MCQ generation failed: empty option text")
        if len(set(text.lower() for text in option_texts)) != 4:
            raise HTTPException(502, "MCQ generation failed: duplicate option text")

        if q.correct_label not in labels:
            raise HTTPException(502, "MCQ generation failed: invalid correct label")

    if seen_ids != expected_ids:
        raise HTTPException(502, "MCQ generation failed: missing flashcard questions")


def _to_mcq_options_payload(q: MCQQuestionPlan) -> dict:
    return {
        "options": [{"label": opt.label, "text": opt.text.strip()} for opt in q.options],
        "correct_label": q.correct_label,
    }


async def ensure_user_exists(db: AsyncSession, user_id: int):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


async def ensure_quiz_exists(db: AsyncSession, quiz_id: int):
    quiz = await get_quiz_by_id(db, quiz_id)
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    return quiz


async def ensure_question_exists(db: AsyncSession, question_id: int):
    q = await get_question_by_id(db, question_id)
    if not q:
        raise HTTPException(404, "Question not found")
    return q


async def create_quiz_for_user(
    db: AsyncSession,
    user_id: int,
    payload: QuizCreate,
) -> QuizOut:
    await ensure_user_exists(db, user_id)
    try:
        quiz = await create_quiz_with_questions(
            db,
            user_id=user_id,
            title=payload.title,
            flashcard_ids=payload.flashcard_ids,
            source_type="flashcards",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return QuizOut.model_validate(quiz)


async def create_auto_mcq_quiz_for_user(
    db: AsyncSession,
    user_id: int,
    payload: QuizCreate,
) -> QuizDetailOut:
    await ensure_user_exists(db, user_id)

    requested_ids = list(dict.fromkeys(payload.flashcard_ids))
    if not requested_ids:
        raise HTTPException(400, "flashcard_ids cannot be empty")

    res = await db.execute(
        select(Flashcard).where(
            Flashcard.user_id == user_id,
            Flashcard.id.in_(requested_ids),
        )
    )
    cards = list(res.scalars().all())
    if len(cards) != len(requested_ids):
        raise HTTPException(400, "Invalid flashcard IDs for this user")

    card_by_id = {card.id: card for card in cards}
    ordered_cards = [card_by_id[fid] for fid in requested_ids]
    flashcards_for_model = [
        {"id": card.id, "question": card.question, "answer": card.answer}
        for card in ordered_cards
    ]

    try:
        plan = await generate_structured_text(
            messages_for_model=_build_mcq_prompt(flashcards_for_model),
            response_model=MCQQuizPlan,
            model_name="gpt-4o-mini",
        )
    except Exception as exc:
        raise HTTPException(502, "Failed to generate MCQ quiz") from exc

    _validate_mcq_plan(plan, requested_ids)
    plan_by_flashcard_id = {q.flashcard_id: q for q in plan.questions}

    quiz = await create_quiz_with_questions(
        db,
        user_id=user_id,
        title=payload.title or (plan.title or "MCQ Quiz"),
        flashcard_ids=requested_ids,
        source_type="mcq_from_flashcards",
    )

    questions = await list_questions_for_quiz(db, quiz.id)
    for db_question in questions:
        card = card_by_id[db_question.flashcard_id]
        plan_question = plan_by_flashcard_id.get(db_question.flashcard_id)
        if plan_question is None:
            raise HTTPException(502, "MCQ generation failed: question mapping missing")

        # Keep the exact flashcard answer as source of truth.
        options_payload = _to_mcq_options_payload(plan_question)
        for opt in options_payload["options"]:
            if opt["label"] == plan_question.correct_label:
                opt["text"] = card.answer
                break

        option_texts = [opt["text"].strip().lower() for opt in options_payload["options"]]
        if len(set(option_texts)) != 4:
            raise HTTPException(502, "MCQ generation failed: non-unique options")

        db_question.question_text = card.question
        db_question.correct_answer = card.answer
        db_question.mcq_options = options_payload
        db.add(db_question)

    await db.commit()
    for db_question in questions:
        await db.refresh(db_question)
    await db.refresh(quiz)

    return QuizDetailOut(
        quiz=QuizOut.model_validate(quiz),
        questions=[QuizQuestionOut.model_validate(q) for q in questions],
    )


async def list_quizzes_for_user_service(
    db: AsyncSession,
    user_id: int,
) -> List[QuizOut]:
    await ensure_user_exists(db, user_id)
    quizzes = await list_quizzes_for_user(db, user_id)
    return [QuizOut.model_validate(q) for q in quizzes]


async def get_quiz_detail_service(
    db: AsyncSession,
    quiz_id: int,
) -> QuizDetailOut:
    quiz = await ensure_quiz_exists(db, quiz_id)
    questions = await list_questions_for_quiz(db, quiz_id)

    return QuizDetailOut(
        quiz=QuizOut.model_validate(quiz),
        questions=[QuizQuestionOut.model_validate(q) for q in questions],
    )


async def answer_quiz_question_service(
    db: AsyncSession,
    quiz_id: int,
    question_id: int,
    payload: QuizQuestionAnswerIn,
) -> QuizQuestionOut:
    quiz = await ensure_quiz_exists(db, quiz_id)
    question = await ensure_question_exists(db, question_id)

    if question.quiz_id != quiz.id:
        raise HTTPException(400, "Question does not belong to this quiz")

    question = await save_question_answer(db, question, payload.user_answer)
    await recompute_quiz_score(db, quiz)

    return QuizQuestionOut.model_validate(question)
