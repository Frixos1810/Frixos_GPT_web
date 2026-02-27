from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import User
from app.schemas import (
    KnowledgeSourceCreate,
    KnowledgeSourceOut,
    KnowledgeSourceReindexOut,
    KnowledgeSourceUpdate,
)
from app.services.knowledge_source_service import (
    create_knowledge_source_service,
    delete_knowledge_source_service,
    get_vector_store_runtime_config,
    list_vector_store_knowledge_sources_service,
    reindex_knowledge_sources_service,
    update_knowledge_source_service,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/knowledge-sources/runtime")
async def admin_knowledge_sources_runtime(
    current_admin: User = Depends(require_admin),
):
    return get_vector_store_runtime_config()


@router.get("/knowledge-sources", response_model=List[KnowledgeSourceOut])
async def admin_list_knowledge_sources(
    sync: bool = Query(default=True, description="Sync from vector store before listing."),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await list_vector_store_knowledge_sources_service(
        db,
        sync_with_vector_store=sync,
    )


@router.post(
    "/knowledge-sources",
    response_model=KnowledgeSourceOut,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_knowledge_source(
    payload: KnowledgeSourceCreate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await create_knowledge_source_service(
        db,
        admin_user_id=current_admin.id,
        payload=payload,
    )


@router.post(
    "/knowledge-sources/reindex",
    response_model=KnowledgeSourceReindexOut,
)
async def admin_reindex_knowledge_sources(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await reindex_knowledge_sources_service(
        db,
        admin_user_id=current_admin.id,
    )


@router.patch("/knowledge-sources/{source_id}", response_model=KnowledgeSourceOut)
async def admin_update_knowledge_source(
    source_id: int,
    payload: KnowledgeSourceUpdate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await update_knowledge_source_service(
        db,
        admin_user_id=current_admin.id,
        source_id=source_id,
        payload=payload,
    )


@router.delete("/knowledge-sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_knowledge_source(
    source_id: int,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await delete_knowledge_source_service(
        db,
        admin_user_id=current_admin.id,
        source_id=source_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
