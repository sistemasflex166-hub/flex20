from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.user import User, UserRole
from src.models.company import Company
from src.schemas.partner import PartnerCreate, PartnerUpdate, PartnerResponse
from src.services import partner_service

router = APIRouter()


async def _resolve_tenant_from_company(current_user: User, company_id: int, tenant_id: int | None, db: AsyncSession) -> int:
    if current_user.role != UserRole.PLATFORM_ADMIN:
        return current_user.tenant_id  # type: ignore[return-value]
    if tenant_id:
        return tenant_id
    result = await db.execute(select(Company.tenant_id).where(Company.id == company_id))
    tid = result.scalar_one_or_none()
    if not tid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada")
    return tid


@router.post("/", response_model=PartnerResponse, status_code=201)
async def create_partner(
    body: PartnerCreate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await partner_service.create_partner(company_id, tid, body, db)


@router.get("/", response_model=list[PartnerResponse])
async def list_partners(
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await partner_service.list_partners(company_id, tid, db)


@router.patch("/{partner_id}", response_model=PartnerResponse)
async def update_partner(
    partner_id: int,
    body: PartnerUpdate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await partner_service.update_partner(partner_id, company_id, tid, body, db)
