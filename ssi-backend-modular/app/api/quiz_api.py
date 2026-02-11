# app/api/quiz_api.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas import (
    QuizCreate,
    QuizOut,
    QuizDetailOut,
    QuizQuestionOut,
    QuizQuestionAnswerIn,
)
from app.services.quiz_service import (
    create_quiz_for_user,
    create_auto_mcq_quiz_for_user,
    list_quizzes_for_user_service,
    get_quiz_detail_service,
    answer_quiz_question_service,
)

router = APIRouter(tags=["quizzes"])


@router.post(
    "/users/{user_id}/quizzes",
    response_model=QuizOut,
    status_code=201,
)
async def create_quiz(
    user_id: int,
    payload: QuizCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_quiz_for_user(db, user_id, payload)


@router.post(
    "/users/{user_id}/quizzes/auto-mcq",
    response_model=QuizDetailOut,
    status_code=201,
)
async def create_auto_mcq_quiz(
    user_id: int,
    payload: QuizCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_auto_mcq_quiz_for_user(db, user_id, payload)


@router.get(
    "/users/{user_id}/quizzes",
    response_model=List[QuizOut],
)
async def list_quizzes(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await list_quizzes_for_user_service(db, user_id)


@router.get(
    "/quizzes/{quiz_id}",
    response_model=QuizDetailOut,
)
async def get_quiz_detail(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await get_quiz_detail_service(db, quiz_id)


@router.post(
    "/quizzes/{quiz_id}/questions/{question_id}/answer",
    response_model=QuizQuestionOut,
)
async def answer_question(
    quiz_id: int,
    question_id: int,
    payload: QuizQuestionAnswerIn,
    db: AsyncSession = Depends(get_db),
):
    return await answer_quiz_question_service(
        db,
        quiz_id,
        question_id,
        payload,
    )
