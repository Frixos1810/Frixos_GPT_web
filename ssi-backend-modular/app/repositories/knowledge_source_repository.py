from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeSource, KnowledgeSourceAudit


async def list_knowledge_sources(db: AsyncSession) -> list[KnowledgeSource]:
    res = await db.execute(
        select(KnowledgeSource).order_by(KnowledgeSource.updated_at.desc(), KnowledgeSource.id.desc())
    )
    return list(res.scalars().all())


async def get_knowledge_source_by_id(
    db: AsyncSession,
    source_id: int,
) -> Optional[KnowledgeSource]:
    res = await db.execute(select(KnowledgeSource).where(KnowledgeSource.id == source_id))
    return res.scalar_one_or_none()


async def create_knowledge_source(
    db: AsyncSession,
    *,
    title: str,
    source_type: str,
    source_ref: str,
    enabled: bool = True,
    verified: bool = False,
) -> KnowledgeSource:
    now = datetime.utcnow()
    source = KnowledgeSource(
        title=title.strip(),
        source_type=source_type.strip(),
        source_ref=source_ref.strip(),
        enabled=enabled,
        verified=verified,
        created_at=now,
        updated_at=now,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


async def update_knowledge_source(
    db: AsyncSession,
    source: KnowledgeSource,
    *,
    title: str | None = None,
    source_type: str | None = None,
    source_ref: str | None = None,
    enabled: bool | None = None,
    verified: bool | None = None,
) -> KnowledgeSource:
    if title is not None:
        source.title = title.strip()
    if source_type is not None:
        source.source_type = source_type.strip()
    if source_ref is not None:
        source.source_ref = source_ref.strip()
    if enabled is not None:
        source.enabled = enabled
    if verified is not None:
        source.verified = verified
    source.updated_at = datetime.utcnow()
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


async def delete_knowledge_source(
    db: AsyncSession,
    source: KnowledgeSource,
) -> None:
    await db.delete(source)
    await db.commit()


async def create_knowledge_source_audit(
    db: AsyncSession,
    *,
    admin_user_id: int,
    action: str,
    source_id: int | None,
) -> KnowledgeSourceAudit:
    row = KnowledgeSourceAudit(
        admin_user_id=admin_user_id,
        action=action.strip(),
        source_id=source_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_knowledge_source_counts(db: AsyncSession) -> dict[str, int]:
    total = await db.scalar(select(func.count(KnowledgeSource.id)))
    enabled = await db.scalar(
        select(func.count(KnowledgeSource.id)).where(KnowledgeSource.enabled.is_(True))
    )
    verified = await db.scalar(
        select(func.count(KnowledgeSource.id)).where(KnowledgeSource.verified.is_(True))
    )
    return {
        "total": int(total or 0),
        "enabled": int(enabled or 0),
        "verified": int(verified or 0),
    }
