# app/repositories/chat_repository.py
from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ChatSession, Message


# -------- chat sessions --------

async def get_chat_session_by_id(
    db: AsyncSession,
    chat_id: int,
) -> Optional[ChatSession]:
    res = await db.execute(select(ChatSession).where(ChatSession.id == chat_id))
    return res.scalar_one_or_none()


async def list_user_chat_sessions(
    db: AsyncSession,
    user_id: int,
) -> List[ChatSession]:
    res = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
    )
    return list(res.scalars().all())


async def create_chat_session(
    db: AsyncSession,
    *,
    user_id: int,
    title: str | None,
    model_name: str,
) -> ChatSession:
    chat = ChatSession(
        user_id=user_id,
        title=title,
        model_name=model_name,
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


async def update_chat_session_title(
    db: AsyncSession,
    chat: ChatSession,
    *,
    title: str,
) -> ChatSession:
    chat.title = title
    await db.commit()
    await db.refresh(chat)
    return chat


async def delete_chat_session(
    db: AsyncSession,
    chat: ChatSession,
) -> None:
    await db.delete(chat)
    await db.commit()


# -------- messages --------

async def list_chat_messages(
    db: AsyncSession,
    chat_id: int,
) -> list[Message]:
    res = await db.execute(
        select(Message)
        .where(Message.chat_session_id == chat_id)
        .order_by(Message.created_at.asc())
    )
    return list(res.scalars().all())


async def create_message(
    db: AsyncSession,
    *,
    chat_id: int,
    sender_role: str,
    content: str,
    model_name: str | None = None,
    evidence_source: str | None = None,
) -> Message:
    msg = Message(
        chat_session_id=chat_id,
        sender_role=sender_role,
        content=content,
        model_name=model_name,
        evidence_source=evidence_source,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_message_by_id(
    db: AsyncSession,
    message_id: int,
) -> Optional[Message]:
    res = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    return res.scalar_one_or_none()
