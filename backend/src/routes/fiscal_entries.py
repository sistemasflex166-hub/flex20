from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.user import User, UserRole
from src.schemas.fiscal_entry import FiscalEntryCreate, FiscalEntryUpdate, FiscalEntryResponse, BulkDeleteRequest, BulkDeleteResponse, ClearTrashRequest
from src.services import fiscal_entry_service

router = APIRouter()


def _resolve_tenant(current_user: User, tenant_id: int | None) -> int:
    if current_user.role == UserRole.PLATFORM_ADMIN:
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id obrigatório para admin da plataforma")
        return tenant_id
    return current_user.tenant_id  # type: ignore[return-value]


@router.post("/", response_model=FiscalEntryResponse, status_code=201)
async def create_fiscal_entry(
    body: FiscalEntryCreate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_entry_service.create_fiscal_entry(_resolve_tenant(current_user, tenant_id), body, db)


@router.get("/", response_model=list[FiscalEntryResponse])
async def list_fiscal_entries(
    company_id: int | None = Query(None),
    entry_type: str | None = Query(None),
    include_inactive: bool = Query(False),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_entry_service.list_fiscal_entries(
        _resolve_tenant(current_user, tenant_id), company_id, entry_type, include_inactive, db
    )


@router.get("/{entry_id}", response_model=FiscalEntryResponse)
async def get_fiscal_entry(
    entry_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_entry_service.get_fiscal_entry(entry_id, _resolve_tenant(current_user, tenant_id), db)


@router.patch("/{entry_id}", response_model=FiscalEntryResponse)
async def update_fiscal_entry(
    entry_id: int,
    body: FiscalEntryUpdate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_entry_service.update_fiscal_entry(entry_id, _resolve_tenant(current_user, tenant_id), body, db)


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_soft_delete_fiscal_entries(
    body: BulkDeleteRequest,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    deleted = await fiscal_entry_service.bulk_soft_delete_fiscal_entries(
        body.ids, _resolve_tenant(current_user, tenant_id), db
    )
    return {"deleted": deleted}


@router.post("/bulk-hard-delete", response_model=BulkDeleteResponse)
async def bulk_hard_delete_fiscal_entries(
    body: BulkDeleteRequest,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    deleted = await fiscal_entry_service.bulk_hard_delete_fiscal_entries(
        body.ids, _resolve_tenant(current_user, tenant_id), db
    )
    return {"deleted": deleted}


@router.post("/clear-trash", response_model=BulkDeleteResponse)
async def clear_trash_fiscal_entries(
    body: ClearTrashRequest,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    deleted = await fiscal_entry_service.clear_trash_fiscal_entries(
        body.company_id, _resolve_tenant(current_user, tenant_id), db
    )
    return {"deleted": deleted}


@router.patch("/{entry_id}/delete", response_model=FiscalEntryResponse)
async def soft_delete_fiscal_entry(
    entry_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_entry_service.soft_delete_fiscal_entry(entry_id, _resolve_tenant(current_user, tenant_id), db)


@router.patch("/{entry_id}/restore", response_model=FiscalEntryResponse)
async def restore_fiscal_entry(
    entry_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_entry_service.restore_fiscal_entry(entry_id, _resolve_tenant(current_user, tenant_id), db)


@router.delete("/{entry_id}", status_code=204)
async def hard_delete_fiscal_entry(
    entry_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    await fiscal_entry_service.hard_delete_fiscal_entry(entry_id, _resolve_tenant(current_user, tenant_id), db)
