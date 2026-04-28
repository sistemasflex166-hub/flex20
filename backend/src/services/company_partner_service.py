from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from src.models.company_partner import CompanyPartner
from src.schemas.company_partner import CompanyPartnerCreate, CompanyPartnerUpdate


async def list_partners(company_id: int, tenant_id: int, db: AsyncSession) -> list[CompanyPartner]:
    result = await db.execute(
        select(CompanyPartner)
        .where(CompanyPartner.company_id == company_id, CompanyPartner.tenant_id == tenant_id)
        .order_by(CompanyPartner.name)
    )
    return list(result.scalars().all())


async def create_partner(
    company_id: int, tenant_id: int, data: CompanyPartnerCreate, db: AsyncSession
) -> CompanyPartner:
    partner = CompanyPartner(company_id=company_id, tenant_id=tenant_id, **data.model_dump())
    db.add(partner)
    await db.commit()
    await db.refresh(partner)
    return partner


async def update_partner(
    partner_id: int, company_id: int, tenant_id: int, data: CompanyPartnerUpdate, db: AsyncSession
) -> CompanyPartner:
    result = await db.execute(
        select(CompanyPartner).where(
            CompanyPartner.id == partner_id,
            CompanyPartner.company_id == company_id,
            CompanyPartner.tenant_id == tenant_id,
        )
    )
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sócio não encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(partner, k, v)
    await db.commit()
    await db.refresh(partner)
    return partner


async def delete_partner(partner_id: int, company_id: int, tenant_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(CompanyPartner).where(
            CompanyPartner.id == partner_id,
            CompanyPartner.company_id == company_id,
            CompanyPartner.tenant_id == tenant_id,
        )
    )
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sócio não encontrado")
    await db.delete(partner)
    await db.commit()
