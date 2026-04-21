from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.user import User, UserRole
from src.models.company import Company
from src.schemas.fiscal_base import (
    ProductCreate, ProductUpdate, ProductResponse,
    ServiceItemCreate, ServiceItemUpdate, ServiceItemResponse,
    CFOPCreate, CFOPUpdate, CFOPResponse,
    OperationNatureCreate, OperationNatureUpdate, OperationNatureResponse,
)
from src.services import fiscal_base_service

router = APIRouter()


def _resolve_tenant(current_user: User, tenant_id: int | None) -> int:
    if current_user.role == UserRole.PLATFORM_ADMIN:
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id obrigatório para admin da plataforma")
        return tenant_id
    return current_user.tenant_id  # type: ignore[return-value]


async def _resolve_tenant_from_company(current_user: User, company_id: int, tenant_id: int | None, db: AsyncSession) -> int:
    """Para rotas que recebem company_id: infere tenant_id a partir da empresa se não fornecido."""
    if current_user.role != UserRole.PLATFORM_ADMIN:
        return current_user.tenant_id  # type: ignore[return-value]
    if tenant_id:
        return tenant_id
    result = await db.execute(select(Company.tenant_id).where(Company.id == company_id))
    tid = result.scalar_one_or_none()
    if not tid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada")
    return tid


# --- Products ---

@router.post("/products/", response_model=ProductResponse, status_code=201)
async def create_product(
    body: ProductCreate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.create_product(company_id, tid, body, db)


@router.get("/products/", response_model=list[ProductResponse])
async def list_products(
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.list_products(company_id, tid, db)


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    body: ProductUpdate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.update_product(product_id, company_id, tid, body, db)


@router.patch("/products/{product_id}/deactivate", response_model=ProductResponse)
async def deactivate_product(
    product_id: int,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.deactivate_product(product_id, company_id, tid, db)


# --- Service Items ---

@router.post("/service-items/", response_model=ServiceItemResponse, status_code=201)
async def create_service_item(
    body: ServiceItemCreate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.create_service_item(company_id, tid, body, db)


@router.get("/service-items/", response_model=list[ServiceItemResponse])
async def list_service_items(
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.list_service_items(company_id, tid, db)


@router.patch("/service-items/{item_id}", response_model=ServiceItemResponse)
async def update_service_item(
    item_id: int,
    body: ServiceItemUpdate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.update_service_item(item_id, company_id, tid, body, db)


@router.patch("/service-items/{item_id}/deactivate", response_model=ServiceItemResponse)
async def deactivate_service_item(
    item_id: int,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.deactivate_service_item(item_id, company_id, tid, db)


# --- CFOPs ---

@router.post("/cfops/", response_model=CFOPResponse, status_code=201)
async def create_cfop(
    body: CFOPCreate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_base_service.create_cfop(_resolve_tenant(current_user, tenant_id), body, db)


@router.get("/cfops/", response_model=list[CFOPResponse])
async def list_cfops(
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_base_service.list_cfops(_resolve_tenant(current_user, tenant_id), db)


@router.patch("/cfops/{cfop_id}", response_model=CFOPResponse)
async def update_cfop(
    cfop_id: int,
    body: CFOPUpdate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_base_service.update_cfop(cfop_id, _resolve_tenant(current_user, tenant_id), body, db)


@router.patch("/cfops/{cfop_id}/deactivate", response_model=CFOPResponse)
async def deactivate_cfop(
    cfop_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await fiscal_base_service.deactivate_cfop(cfop_id, _resolve_tenant(current_user, tenant_id), db)


# --- Operation Natures ---

@router.post("/operation-natures/", response_model=OperationNatureResponse, status_code=201)
async def create_operation_nature(
    body: OperationNatureCreate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.create_operation_nature(company_id, tid, body, db)


@router.get("/operation-natures/", response_model=list[OperationNatureResponse])
async def list_operation_natures(
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.list_operation_natures(company_id, tid, db)


@router.patch("/operation-natures/{obj_id}", response_model=OperationNatureResponse)
async def update_operation_nature(
    obj_id: int,
    body: OperationNatureUpdate,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.update_operation_nature(obj_id, company_id, tid, body, db)


@router.patch("/operation-natures/{obj_id}/deactivate", response_model=OperationNatureResponse)
async def deactivate_operation_nature(
    obj_id: int,
    company_id: int = Query(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = await _resolve_tenant_from_company(current_user, company_id, tenant_id, db)
    return await fiscal_base_service.deactivate_operation_nature(obj_id, company_id, tid, db)
