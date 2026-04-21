from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_platform_admin
from src.models.user import User
from src.schemas.tenant import TenantCreate, TenantResponse
from src.services import tenant_service

router = APIRouter()


@router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(
    body: TenantCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    return await tenant_service.create_tenant(body, db)


@router.get("/", response_model=list[TenantResponse])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    return await tenant_service.list_tenants(db)


@router.patch("/{tenant_id}/deactivate", response_model=TenantResponse)
async def deactivate_tenant(
    tenant_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    return await tenant_service.deactivate_tenant(tenant_id, db)
