# app/schemas/__init__.py

from .user_schema import (
    UserBase,
    UserCreate,
    UserLogin,
    UserOut,
)
from .chat_schema import (
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionOut,
    MessageCreate,
    MessageOut,
    SendMessageOut,
)
from .flashcard_schema import (
    FlashcardCreate,
    FlashcardOut,
    AssistantReplyWithFlashcards,
    FlashcardCandidate,
)
from .quiz_schema import (
    QuizCreate,
    QuizOut,
    QuizQuestionOut,
    QuizDetailOut,
    QuizQuestionAnswerIn,
)
from .analytics_schema import (
    UserStatsOverview,
    QuizResultItem,
    UserStatsProgress,
    FlashcardStats,
    ExplanationOut,
)

__all__ = [
    # user
    "UserBase",
    "UserCreate",
    "UserLogin",
    "UserOut",
    # chat
    "ChatSessionCreate",
    "ChatSessionUpdate",
    "ChatSessionOut",
    "MessageCreate",
    "MessageOut",
    "SendMessageOut",
    # flashcards
    "FlashcardCreate",
    "FlashcardOut",
    # quiz
    "QuizCreate",
    "QuizOut",
    "QuizQuestionOut",
    "QuizDetailOut",
    "QuizQuestionAnswerIn",
    # analytics
    "UserStatsOverview",
    "QuizResultItem",
    "UserStatsProgress",
    "FlashcardStats",
    "ExplanationOut",
]
