import re
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from src.models.company import Company
from src.schemas.company import CompanyCreate, CompanyUpdate


def _clean_doc(value: str | None) -> str | None:
    """Remove qualquer caractere não-numérico de CNPJ/CPF."""
    if not value:
        return value
    return re.sub(r"\D", "", value) or value


async def _next_code(tenant_id: int, db: AsyncSession) -> int:
    """Gera o próximo código sequencial de empresa para o tenant."""
    result = await db.execute(
        select(func.max(Company.code)).where(Company.tenant_id == tenant_id)
    )
    max_code = result.scalar_one_or_none()
    return (max_code or 0) + 1


async def create_company(tenant_id: int, data: CompanyCreate, db: AsyncSession) -> Company:
    code = await _next_code(tenant_id, db)
    dump = data.model_dump()
    dump["cnpj"] = _clean_doc(dump.get("cnpj"))
    dump["cpf"] = _clean_doc(dump.get("cpf"))
    company = Company(tenant_id=tenant_id, code=code, **dump)
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


async def list_companies(tenant_id: int, include_inactive: bool, db: AsyncSession) -> list[Company]:
    q = select(Company).where(Company.tenant_id == tenant_id)
    if not include_inactive:
        q = q.where(Company.is_active.is_(True))
    result = await db.execute(q.order_by(Company.code))
    return list(result.scalars().all())


async def get_company(company_id: int, tenant_id: int, db: AsyncSession) -> Company:
    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.tenant_id == tenant_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada")
    return company


async def update_company(company_id: int, tenant_id: int, data: CompanyUpdate, db: AsyncSession) -> Company:
    company = await get_company(company_id, tenant_id, db)
    updates = data.model_dump(exclude_none=True)
    if "cnpj" in updates:
        updates["cnpj"] = _clean_doc(updates["cnpj"])
    if "cpf" in updates:
        updates["cpf"] = _clean_doc(updates["cpf"])
    for field, value in updates.items():
        setattr(company, field, value)
    await db.commit()
    await db.refresh(company)
    return company


async def deactivate_company(company_id: int, tenant_id: int, db: AsyncSession) -> Company:
    company = await get_company(company_id, tenant_id, db)
    company.is_active = False
    await db.commit()
    await db.refresh(company)
    return company
