# app/api/user_api.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas import UserCreate, UserOut, UserLogin
from app.services.user_service import register_user, authenticate_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    return await register_user(db, payload)


@router.post("/login", response_model=UserOut)
async def login_user(
    payload: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    return await authenticate_user(db, payload)
