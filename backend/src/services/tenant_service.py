import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from src.core.database import create_tenant_schema
from src.models.tenant import Tenant
from src.schemas.tenant import TenantCreate


def _slug_to_schema(slug: str) -> str:
    safe = re.sub(r"[^a-z0-9_]", "_", slug.lower())
    return f"tenant_{safe}"


async def create_tenant(data: TenantCreate, db: AsyncSession) -> Tenant:
    existing = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug já utilizado")

    schema_name = _slug_to_schema(data.slug)
    tenant = Tenant(name=data.name, slug=data.slug, schema_name=schema_name)
    db.add(tenant)
    await db.flush()

    await create_tenant_schema(schema_name, db)
    await db.commit()
    await db.refresh(tenant)
    return tenant


async def list_tenants(db: AsyncSession) -> list[Tenant]:
    result = await db.execute(select(Tenant).order_by(Tenant.name))
    return list(result.scalars().all())


async def deactivate_tenant(tenant_id: int, db: AsyncSession) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escritório não encontrado")
    tenant.is_active = False
    await db.commit()
    await db.refresh(tenant)
    return tenant
