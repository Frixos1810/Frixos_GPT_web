# app/schemas/analytics_schema.py
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class UserStatsOverview(BaseModel):
    total_flashcards: int
    total_quizzes: int
    avg_quiz_score: Optional[float] = None
    last_quiz_score: Optional[float] = None
    accuracy_last_10_questions: Optional[float] = None  # 0–100


class QuizResultItem(BaseModel):
    quiz_id: int
    title: Optional[str]
    score_percent: float
    created_at: datetime


class UserStatsProgress(BaseModel):
    quizzes: List[QuizResultItem]


class FlashcardStats(BaseModel):
    flashcard_id: int
    question: str
    answer: str
    total_attempts: int
    correct_attempts: int
    last_attempt_at: Optional[datetime] = None
    accuracy: Optional[float] = None  # 0–100


class ExplanationOut(BaseModel):
    question_id: int
    explanation: str
