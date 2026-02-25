from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class KnowledgeSourceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    source_type: str = Field(..., min_length=1, max_length=50)
    source_ref: str = Field(..., min_length=1, max_length=2000)
    enabled: bool = True
    verified: bool = False


class KnowledgeSourceUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    source_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    source_ref: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    enabled: Optional[bool] = None
    verified: Optional[bool] = None

    @model_validator(mode="after")
    def validate_non_empty_patch(self) -> "KnowledgeSourceUpdate":
        if all(
            getattr(self, field_name) is None
            for field_name in ("title", "source_type", "source_ref", "enabled", "verified")
        ):
            raise ValueError("At least one field must be provided")
        return self


class KnowledgeSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    source_type: str
    source_ref: str
    enabled: bool
    verified: bool
    created_at: datetime
    updated_at: datetime


class KnowledgeSourceReindexOut(BaseModel):
    ok: bool
    message: str
    total_sources: int
    enabled_sources: int
    verified_sources: int
    strict_verified_only: bool
    applied_immediately: bool = True
