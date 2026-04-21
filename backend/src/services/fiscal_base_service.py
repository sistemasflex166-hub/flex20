from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from src.models.fiscal_base import Product, ServiceItem, CFOP, OperationNature
from src.schemas.fiscal_base import (
    ProductCreate, ProductUpdate,
    ServiceItemCreate, ServiceItemUpdate,
    CFOPCreate, CFOPUpdate,
    OperationNatureCreate, OperationNatureUpdate,
)


# --- Products ---

async def create_product(company_id: int, tenant_id: int, data: ProductCreate, db: AsyncSession) -> Product:
    product = Product(company_id=company_id, tenant_id=tenant_id, **data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def list_products(company_id: int, tenant_id: int, db: AsyncSession) -> list[Product]:
    result = await db.execute(
        select(Product)
        .where(Product.company_id == company_id, Product.tenant_id == tenant_id, Product.is_active.is_(True))
        .order_by(Product.code)
    )
    return list(result.scalars().all())


async def update_product(product_id: int, company_id: int, tenant_id: int, data: ProductUpdate, db: AsyncSession) -> Product:
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.company_id == company_id, Product.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def deactivate_product(product_id: int, company_id: int, tenant_id: int, db: AsyncSession) -> Product:
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.company_id == company_id, Product.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    obj.is_active = False
    await db.commit()
    await db.refresh(obj)
    return obj


# --- Service Items ---

async def create_service_item(company_id: int, tenant_id: int, data: ServiceItemCreate, db: AsyncSession) -> ServiceItem:
    item = ServiceItem(company_id=company_id, tenant_id=tenant_id, **data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def list_service_items(company_id: int, tenant_id: int, db: AsyncSession) -> list[ServiceItem]:
    result = await db.execute(
        select(ServiceItem)
        .where(ServiceItem.company_id == company_id, ServiceItem.tenant_id == tenant_id, ServiceItem.is_active.is_(True))
        .order_by(ServiceItem.code)
    )
    return list(result.scalars().all())


async def update_service_item(item_id: int, company_id: int, tenant_id: int, data: ServiceItemUpdate, db: AsyncSession) -> ServiceItem:
    result = await db.execute(
        select(ServiceItem).where(ServiceItem.id == item_id, ServiceItem.company_id == company_id, ServiceItem.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def deactivate_service_item(item_id: int, company_id: int, tenant_id: int, db: AsyncSession) -> ServiceItem:
    result = await db.execute(
        select(ServiceItem).where(ServiceItem.id == item_id, ServiceItem.company_id == company_id, ServiceItem.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")
    obj.is_active = False
    await db.commit()
    await db.refresh(obj)
    return obj


# --- CFOPs ---

async def create_cfop(tenant_id: int, data: CFOPCreate, db: AsyncSession) -> CFOP:
    cfop = CFOP(tenant_id=tenant_id, **data.model_dump())
    db.add(cfop)
    await db.commit()
    await db.refresh(cfop)
    return cfop


async def list_cfops(tenant_id: int, db: AsyncSession) -> list[CFOP]:
    result = await db.execute(
        select(CFOP)
        .where(CFOP.tenant_id == tenant_id, CFOP.is_active.is_(True))
        .order_by(CFOP.code)
    )
    return list(result.scalars().all())


async def update_cfop(cfop_id: int, tenant_id: int, data: CFOPUpdate, db: AsyncSession) -> CFOP:
    result = await db.execute(select(CFOP).where(CFOP.id == cfop_id, CFOP.tenant_id == tenant_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CFOP não encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def deactivate_cfop(cfop_id: int, tenant_id: int, db: AsyncSession) -> CFOP:
    result = await db.execute(
        select(CFOP).where(CFOP.id == cfop_id, CFOP.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CFOP não encontrado")
    obj.is_active = False
    await db.commit()
    await db.refresh(obj)
    return obj


# --- Operation Natures ---

async def create_operation_nature(company_id: int, tenant_id: int, data: OperationNatureCreate, db: AsyncSession) -> OperationNature:
    obj = OperationNature(company_id=company_id, tenant_id=tenant_id, **data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def list_operation_natures(company_id: int, tenant_id: int, db: AsyncSession) -> list[OperationNature]:
    result = await db.execute(
        select(OperationNature)
        .where(OperationNature.company_id == company_id, OperationNature.tenant_id == tenant_id, OperationNature.is_active.is_(True))
        .order_by(OperationNature.code)
    )
    return list(result.scalars().all())


async def update_operation_nature(obj_id: int, company_id: int, tenant_id: int, data: OperationNatureUpdate, db: AsyncSession) -> OperationNature:
    result = await db.execute(
        select(OperationNature).where(OperationNature.id == obj_id, OperationNature.company_id == company_id, OperationNature.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Natureza de operação não encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def deactivate_operation_nature(obj_id: int, company_id: int, tenant_id: int, db: AsyncSession) -> OperationNature:
    result = await db.execute(
        select(OperationNature).where(OperationNature.id == obj_id, OperationNature.company_id == company_id, OperationNature.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Natureza de operação não encontrada")
    obj.is_active = False
    await db.commit()
    await db.refresh(obj)
    return obj
