# app/schemas/quiz_schema.py
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel


class QuizCreate(BaseModel):
    title: Optional[str] = None
    flashcard_ids: List[int]


class QuizOut(BaseModel):
    id: int
    user_id: int
    title: Optional[str]
    total_questions: int
    correct_answers: int
    score_percent: float
    created_at: datetime

    class Config:
        from_attributes = True


class QuizQuestionOut(BaseModel):
    id: int
    quiz_id: int
    flashcard_id: int
    question_text: str
    correct_answer: str
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    order_index: int
    mcq_options: Optional[dict] = None  # for MCQ choices

    class Config:
        from_attributes = True


class QuizDetailOut(BaseModel):
    quiz: QuizOut
    questions: List[QuizQuestionOut]


class QuizQuestionAnswerIn(BaseModel):
    user_answer: str
