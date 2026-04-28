from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.user import User
from src.schemas.company_partner import CompanyPartnerCreate, CompanyPartnerUpdate, CompanyPartnerResponse
from src.services import company_partner_service

router = APIRouter()


@router.get("/", response_model=list[CompanyPartnerResponse])
async def list_partners(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_partner_service.list_partners(company_id, current_user.tenant_id, db)


@router.post("/", response_model=CompanyPartnerResponse, status_code=201)
async def create_partner(
    body: CompanyPartnerCreate,
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_partner_service.create_partner(company_id, current_user.tenant_id, body, db)


@router.patch("/{partner_id}", response_model=CompanyPartnerResponse)
async def update_partner(
    partner_id: int,
    body: CompanyPartnerUpdate,
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_partner_service.update_partner(partner_id, company_id, current_user.tenant_id, body, db)


@router.delete("/{partner_id}", status_code=204)
async def delete_partner(
    partner_id: int,
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    await company_partner_service.delete_partner(partner_id, company_id, current_user.tenant_id, db)
