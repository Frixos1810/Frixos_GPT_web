# app/schemas/chat_schema.py
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


# ============ CHAT SESSIONS ============

class ChatSessionCreate(BaseModel):
    title: Optional[str] = None
    model_name: Optional[str] = None


class ChatSessionUpdate(BaseModel):
    title: str


class ChatSessionOut(BaseModel):
    id: int
    title: Optional[str]
    model_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============ MESSAGES ============

class MessageCreate(BaseModel):
    content: str



class MessageOut(BaseModel):
    id: int
    chat_session_id: int
    sender_role: str
    content: str
    model_name: Optional[str] = None
    evidence_source: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SendMessageOut(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut

    
