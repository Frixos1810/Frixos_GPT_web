from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.openai_client import (
    attach_files_to_vector_store,
    list_processed_account_files,
    list_vector_store_files,
)
from app.repositories.knowledge_source_repository import (
    create_knowledge_source,
    create_knowledge_source_audit,
    delete_knowledge_source,
    get_knowledge_source_by_id,
    get_knowledge_source_counts,
    list_knowledge_sources,
    update_knowledge_source,
)
from app.schemas import (
    KnowledgeSourceCreate,
    KnowledgeSourceOut,
    KnowledgeSourceReindexOut,
    KnowledgeSourceUpdate,
)

VECTOR_STORE_FILE_SOURCE_TYPE = "vector_store_file"


def _clean_required(value: str, field_name: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")
    return cleaned


def _normalize_source_ref(value: str) -> str:
    return (value or "").strip().lower()


async def list_knowledge_sources_service(db: AsyncSession) -> list[KnowledgeSourceOut]:
    rows = await list_knowledge_sources(db)
    return [KnowledgeSourceOut.model_validate(row) for row in rows]


async def _sync_knowledge_sources_from_vector_store(
    db: AsyncSession,
) -> dict[str, int]:
    vector_store_id = settings.OPENAI_VECTOR_STORE_ID
    if not vector_store_id:
        raise HTTPException(
            status_code=400,
            detail="OPENAI_VECTOR_STORE_ID is not configured",
        )

    vector_files = list_vector_store_files(vector_store_id=vector_store_id)
    attached_file_ids = {
        str(item.get("file_id") or "").strip()
        for item in vector_files
        if str(item.get("file_id") or "").strip()
    }

    # Auto-attach processed user_data files so newly uploaded dashboard files
    # become visible and controllable without manual API attachment.
    processed_user_data = list_processed_account_files(purpose="user_data")
    missing_user_data_ids = [
        str(item.get("file_id") or "").strip()
        for item in processed_user_data
        if str(item.get("file_id") or "").strip() and str(item.get("file_id") or "").strip() not in attached_file_ids
    ]
    auto_attached = 0
    if missing_user_data_ids:
        auto_attached = attach_files_to_vector_store(
            vector_store_id=vector_store_id,
            file_ids=missing_user_data_ids,
        )
        if auto_attached:
            vector_files = list_vector_store_files(vector_store_id=vector_store_id)
    current_rows = await list_knowledge_sources(db)

    existing_vector_rows = [
        row for row in current_rows if (row.source_type or "").strip().lower() == VECTOR_STORE_FILE_SOURCE_TYPE
    ]
    existing_by_ref = {str(row.source_ref).strip(): row for row in existing_vector_rows}
    current_file_ids = {
        str(item.get("file_id") or "").strip()
        for item in vector_files
        if str(item.get("file_id") or "").strip()
    }

    created = 0
    updated = 0
    removed = 0

    for item in vector_files:
        file_id = str(item.get("file_id") or "").strip()
        if not file_id:
            continue
        filename = str(item.get("filename") or file_id).strip() or file_id

        existing = existing_by_ref.get(file_id)
        if existing is None:
            await create_knowledge_source(
                db,
                title=filename,
                source_type=VECTOR_STORE_FILE_SOURCE_TYPE,
                source_ref=file_id,
                enabled=True,
                verified=False,
            )
            created += 1
            continue

        needs_update = (
            (existing.title or "") != filename
            or (existing.source_type or "").strip().lower() != VECTOR_STORE_FILE_SOURCE_TYPE
        )
        if needs_update:
            await update_knowledge_source(
                db,
                existing,
                title=filename,
                source_type=VECTOR_STORE_FILE_SOURCE_TYPE,
            )
            updated += 1

    for row in existing_vector_rows:
        row_ref = str(row.source_ref or "").strip()
        if row_ref and row_ref not in current_file_ids:
            await delete_knowledge_source(db, row)
            removed += 1

    return {
        "discovered": len(current_file_ids),
        "created": created,
        "updated": updated,
        "removed": removed,
        "auto_attached": auto_attached,
    }


async def list_vector_store_knowledge_sources_service(
    db: AsyncSession,
    *,
    sync_with_vector_store: bool = True,
) -> list[KnowledgeSourceOut]:
    if sync_with_vector_store:
        await _sync_knowledge_sources_from_vector_store(db)

    rows = await list_knowledge_sources(db)
    vector_rows = [
        row for row in rows if (row.source_type or "").strip().lower() == VECTOR_STORE_FILE_SOURCE_TYPE
    ]
    return [KnowledgeSourceOut.model_validate(row) for row in vector_rows]


def get_vector_store_runtime_config() -> dict[str, Any]:
    vector_store_id = settings.OPENAI_VECTOR_STORE_ID
    masked = None
    if vector_store_id:
        trimmed = str(vector_store_id).strip()
        if len(trimmed) <= 8:
            masked = trimmed
        else:
            masked = f"{trimmed[:6]}...{trimmed[-6:]}"
    return {
        "openai_vector_store_id": vector_store_id,
        "openai_vector_store_id_masked": masked,
        "strict_verified_only": bool(settings.STRICT_VERIFIED_ONLY),
    }


async def create_knowledge_source_service(
    db: AsyncSession,
    *,
    admin_user_id: int,
    payload: KnowledgeSourceCreate,
) -> KnowledgeSourceOut:
    source = await create_knowledge_source(
        db,
        title=_clean_required(payload.title, "title"),
        source_type=_clean_required(payload.source_type, "source_type"),
        source_ref=_clean_required(payload.source_ref, "source_ref"),
        enabled=bool(payload.enabled),
        verified=bool(payload.verified),
    )
    await create_knowledge_source_audit(
        db,
        admin_user_id=admin_user_id,
        action="add",
        source_id=source.id,
    )
    return KnowledgeSourceOut.model_validate(source)


async def update_knowledge_source_service(
    db: AsyncSession,
    *,
    admin_user_id: int,
    source_id: int,
    payload: KnowledgeSourceUpdate,
) -> KnowledgeSourceOut:
    source = await get_knowledge_source_by_id(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")

    old_enabled = bool(source.enabled)
    old_verified = bool(source.verified)
    old_title = source.title
    old_type = source.source_type
    old_ref = source.source_ref

    updated = await update_knowledge_source(
        db,
        source,
        title=_clean_required(payload.title, "title") if payload.title is not None else None,
        source_type=(
            _clean_required(payload.source_type, "source_type")
            if payload.source_type is not None
            else None
        ),
        source_ref=(
            _clean_required(payload.source_ref, "source_ref")
            if payload.source_ref is not None
            else None
        ),
        enabled=payload.enabled,
        verified=payload.verified,
    )

    audit_actions: list[str] = []
    if payload.enabled is not None and old_enabled != bool(updated.enabled):
        audit_actions.append("enable" if updated.enabled else "disable")
    if payload.verified is not None and old_verified != bool(updated.verified):
        audit_actions.append("verify" if updated.verified else "unverify")
    if (
        (payload.title is not None and old_title != updated.title)
        or (payload.source_type is not None and old_type != updated.source_type)
        or (payload.source_ref is not None and old_ref != updated.source_ref)
    ):
        audit_actions.append("update")
    if not audit_actions:
        audit_actions.append("update")

    for action in audit_actions:
        await create_knowledge_source_audit(
            db,
            admin_user_id=admin_user_id,
            action=action,
            source_id=updated.id,
        )

    return KnowledgeSourceOut.model_validate(updated)


async def delete_knowledge_source_service(
    db: AsyncSession,
    *,
    admin_user_id: int,
    source_id: int,
) -> None:
    source = await get_knowledge_source_by_id(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")

    # Record action before deletion.
    await create_knowledge_source_audit(
        db,
        admin_user_id=admin_user_id,
        action="remove",
        source_id=source.id,
    )
    await delete_knowledge_source(db, source)


async def reindex_knowledge_sources_service(
    db: AsyncSession,
    *,
    admin_user_id: int,
) -> KnowledgeSourceReindexOut:
    sync_stats = await _sync_knowledge_sources_from_vector_store(db)
    counts = await get_knowledge_source_counts(db)
    await create_knowledge_source_audit(
        db,
        admin_user_id=admin_user_id,
        action="reindex",
        source_id=None,
    )
    return KnowledgeSourceReindexOut(
        ok=True,
        message=(
            f"Synced vector store ({settings.OPENAI_VECTOR_STORE_ID}) files into knowledge source controls "
            f"(discovered={sync_stats['discovered']}, created={sync_stats['created']}, "
            f"updated={sync_stats['updated']}, removed={sync_stats['removed']}, "
            f"auto_attached={sync_stats['auto_attached']}). "
            "No local embedding pipeline exists in this repo; filter changes apply immediately."
        ),
        total_sources=counts["total"],
        enabled_sources=counts["enabled"],
        verified_sources=counts["verified"],
        strict_verified_only=bool(settings.STRICT_VERIFIED_ONLY),
        applied_immediately=True,
    )


async def get_knowledge_source_filter_policy(db: AsyncSession) -> dict[str, Any]:
    rows = await list_knowledge_sources(db)
    vector_store_rows = [
        row for row in rows if (row.source_type or "").strip().lower() == VECTOR_STORE_FILE_SOURCE_TYPE
    ]
    # If vector-store rows exist, ignore legacy/manual rows for vector-store retrieval control.
    rows_for_policy = vector_store_rows if vector_store_rows else rows

    enabled_refs: set[str] = set()
    verified_refs: set[str] = set()
    for row in rows_for_policy:
        normalized_ref = _normalize_source_ref(row.source_ref)
        if not normalized_ref:
            continue
        if row.enabled:
            enabled_refs.add(normalized_ref)
            if row.verified:
                verified_refs.add(normalized_ref)

    return {
        "has_registry_rows": bool(rows_for_policy),
        "enabled_refs": enabled_refs,
        "verified_refs": verified_refs,
        "strict_verified_only": bool(settings.STRICT_VERIFIED_ONLY),
        "source_scope": (
            "vector_store_file_only" if vector_store_rows else "all_knowledge_sources"
        ),
    }
