from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from src.models.partner import Partner
from src.schemas.partner import PartnerCreate, PartnerUpdate


async def _next_code(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(Partner.code)).where(Partner.company_id == company_id)
    )
    current = result.scalar()
    return (current or 0) + 1


async def create_partner(company_id: int, tenant_id: int, data: PartnerCreate, db: AsyncSession) -> Partner:
    code = await _next_code(company_id, db)
    partner = Partner(code=code, company_id=company_id, tenant_id=tenant_id, **data.model_dump())
    db.add(partner)
    await db.commit()
    await db.refresh(partner)
    return partner


async def list_partners(company_id: int, tenant_id: int, db: AsyncSession) -> list[Partner]:
    result = await db.execute(
        select(Partner)
        .where(Partner.company_id == company_id, Partner.tenant_id == tenant_id, Partner.is_active.is_(True))
        .order_by(Partner.name)
    )
    return list(result.scalars().all())


async def get_partner(partner_id: int, company_id: int, tenant_id: int, db: AsyncSession) -> Partner:
    result = await db.execute(
        select(Partner).where(
            Partner.id == partner_id,
            Partner.company_id == company_id,
            Partner.tenant_id == tenant_id,
        )
    )
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente/Fornecedor não encontrado")
    return partner


async def update_partner(partner_id: int, company_id: int, tenant_id: int, data: PartnerUpdate, db: AsyncSession) -> Partner:
    partner = await get_partner(partner_id, company_id, tenant_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(partner, field, value)
    await db.commit()
    await db.refresh(partner)
    return partner
