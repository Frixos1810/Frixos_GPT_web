# app/api/chat_api.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas import (
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionOut,
    MessageCreate,
    MessageOut,
    SendMessageOut,
)
from app.services.chat_service import (
    create_chat_session_for_user,
    list_chats_for_user,
    rename_chat_session_for_user,
    delete_chat_session_for_user,
    list_messages_in_chat,
    send_message_and_get_reply,
)

router = APIRouter(prefix="/users/{user_id}", tags=["chat"])


@router.post(
    "/chat-sessions",
    response_model=ChatSessionOut,
    status_code=201,
)
async def create_chat_session(
    user_id: int,
    payload: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_chat_session_for_user(db, user_id, payload)


@router.get(
    "/chat-sessions",
    response_model=List[ChatSessionOut],
)
async def get_chat_sessions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await list_chats_for_user(db, user_id)


@router.patch(
    "/chat-sessions/{chat_id}",
    response_model=ChatSessionOut,
)
async def rename_chat_session(
    user_id: int,
    chat_id: int,
    payload: ChatSessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await rename_chat_session_for_user(db, user_id, chat_id, payload)


@router.post(
    "/chat-sessions/{chat_id}/rename",
    response_model=ChatSessionOut,
)
async def rename_chat_session_post(
    user_id: int,
    chat_id: int,
    payload: ChatSessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await rename_chat_session_for_user(db, user_id, chat_id, payload)


@router.delete(
    "/chat-sessions/{chat_id}",
    status_code=204,
)
async def delete_chat_session(
    user_id: int,
    chat_id: int,
    db: AsyncSession = Depends(get_db),
):
    await delete_chat_session_for_user(db, user_id, chat_id)
    return None


@router.post(
    "/chat-sessions/{chat_id}/delete",
    status_code=204,
)
async def delete_chat_session_post(
    user_id: int,
    chat_id: int,
    db: AsyncSession = Depends(get_db),
):
    await delete_chat_session_for_user(db, user_id, chat_id)
    return None


@router.get(
    "/chat-sessions/{chat_id}/messages",
    response_model=List[MessageOut],
)
async def get_messages(
    user_id: int,
    chat_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await list_messages_in_chat(db, user_id, chat_id)


@router.post(
    "/chat-sessions/{chat_id}/messages",
    response_model=SendMessageOut,
)

async def send_message(
    user_id: int,
    chat_id: int,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
):
    return await send_message_and_get_reply(db, user_id, chat_id, payload)
