from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.repositories.user_repository import get_user_by_id


def normalize_user_role(value: object) -> str:
    role = str(value).strip().lower() if value is not None else ""
    return "admin" if role == "admin" else "user"


async def require_auth(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        user_id = int(str(x_user_id).strip())
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid X-User-Id header")

    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")

    # Non-negotiable fallback: anything missing/invalid becomes "user".
    user.user_role = normalize_user_role(getattr(user, "user_role", None))
    return user


async def require_admin(current_user: User = Depends(require_auth)) -> User:
    if normalize_user_role(getattr(current_user, "user_role", None)) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_path_user(
    user_id: int,
    current_user: User = Depends(require_auth),
) -> User:
    current_role = normalize_user_role(getattr(current_user, "user_role", None))
    if current_user.id != user_id and current_role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized for this user")
    return current_user
