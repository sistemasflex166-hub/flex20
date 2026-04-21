from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.user import User, UserRole
from src.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from src.services import company_service

router = APIRouter()


def _resolve_tenant(current_user: User, tenant_id: int | None) -> int:
    if current_user.role == UserRole.PLATFORM_ADMIN:
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id obrigatório para admin da plataforma")
        return tenant_id
    return current_user.tenant_id  # type: ignore[return-value]


@router.post("/", response_model=CompanyResponse, status_code=201)
async def create_company(
    body: CompanyCreate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_service.create_company(_resolve_tenant(current_user, tenant_id), body, db)


@router.get("/", response_model=list[CompanyResponse])
async def list_companies(
    include_inactive: bool = Query(False),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_service.list_companies(_resolve_tenant(current_user, tenant_id), include_inactive, db)


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_service.get_company(company_id, _resolve_tenant(current_user, tenant_id), db)


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    body: CompanyUpdate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_service.update_company(company_id, _resolve_tenant(current_user, tenant_id), body, db)


@router.patch("/{company_id}/deactivate", response_model=CompanyResponse)
async def deactivate_company(
    company_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await company_service.deactivate_company(company_id, _resolve_tenant(current_user, tenant_id), db)
