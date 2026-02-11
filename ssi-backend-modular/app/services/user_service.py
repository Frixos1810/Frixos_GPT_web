# app/services/user_service.py
from __future__ import annotations

from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import UserCreate, UserOut, UserLogin
from app.repositories.user_repository import (
    get_user_by_email,
    get_user_by_id,
    create_user,
)
from app.core.security import hash_password, verify_password


async def get_user_or_404(db: AsyncSession, user_id: int):
    from app.repositories.user_repository import get_user_by_id

    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def register_user(db: AsyncSession, payload: UserCreate) -> UserOut:
    # password confirmation
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # unique email
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    pw_hash = hash_password(payload.password)
    user = await create_user(
        db,
        email=payload.email,
        name=payload.name,
        password_hash=pw_hash,
    )
    return UserOut.model_validate(user)


async def authenticate_user(
    db: AsyncSession,
    payload: UserLogin,
) -> UserOut:
    user = await get_user_by_email(db, payload.email)
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return UserOut.model_validate(user)
