# app/repositories/user_repository.py
from __future__ import annotations

from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    res = await db.execute(select(User).where(User.id == user_id))
    return res.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    normalized = email.strip().lower()
    res = await db.execute(
        select(User).where(func.lower(User.email) == normalized)
    )
    return res.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    name: str | None,
    password_hash: str,
) -> User:
    user = User(email=email, name=name, password_hash=password_hash)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
