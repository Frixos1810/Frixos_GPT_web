# app/schemas/user_schema.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    confirm_password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: int
    user_role: str = "user"
    created_at: datetime

    @field_validator("user_role", mode="before")
    @classmethod
    def normalize_user_role(cls, value: object) -> str:
        role = str(value).strip().lower() if value is not None else ""
        return "admin" if role == "admin" else "user"

    class Config:
        from_attributes = True
