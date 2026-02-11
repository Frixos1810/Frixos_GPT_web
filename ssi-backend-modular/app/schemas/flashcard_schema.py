# app/schemas/flashcard_schema.py
from datetime import datetime
from typing import Optional, List
from typing import List
from pydantic import BaseModel, Field, conlist
from pydantic import validator

# ---------- DB-facing schemas (unchanged idea) ----------

class FlashcardCreate(BaseModel):
    question: str
    answer: str
    chat_session_id: Optional[int] = None
    source_message_id: Optional[int] = None


class FlashcardOut(BaseModel):
    id: int
    question: str
    answer: str
    chat_session_id: Optional[int] = None
    source_message_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- LLM-facing schemas (NEW) ----------
# This is what your teacher is asking for conceptually:
# 1) Entire assistant output in ONE field (full_response)
# 2) Flashcards in other fields (flashcards list)

class FlashcardCandidate(BaseModel):
    question: str = Field(..., description="Front side prompt/question.")
    answer: str = Field(..., description="Back side answer/explanation.")


class AssistantToFlashcardsLLMOutput(BaseModel):
    full_response: str = Field(
        ...,
        description="A single assistant message suitable for display. Contains explanation + summary.",
    )
    flashcards: List[FlashcardCandidate] = Field(
        ...,
        description="Up to 5 generated flashcards based on the assistant message.",
        max_length=5,
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Any caveats (e.g., missing context, too short content).",
    )

class FlashcardCandidate(BaseModel):
    question: str = Field(..., description="A short question suitable for a flashcard.")
    answer: str = Field(..., description="A concise, correct answer.")

class AssistantReplyWithFlashcards(BaseModel):
    assistant_message: str = Field(
        ...,
        description="The entire assistant response as ONE string. This is what will be shown to the user."
    )
    flashcards: List[FlashcardCandidate] = Field(
        ...,
        description="Up to 5 flashcards derived from the assistant_message."
    )

    @validator("flashcards")
    def _check_flashcards_len(cls, v):
        if len(v) > 5:
            raise ValueError("flashcards may contain at most 5 items")
        return v
