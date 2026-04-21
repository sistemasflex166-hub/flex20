from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from src.models.account_plan import AccountPlan
from src.schemas.account_plan import AccountPlanCreate, AccountPlanUpdate


async def create_account(company_id: int, tenant_id: int, data: AccountPlanCreate, db: AsyncSession) -> AccountPlan:
    existing = await db.execute(
        select(AccountPlan).where(AccountPlan.company_id == company_id, AccountPlan.code == data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Código de conta já cadastrado")

    account = AccountPlan(company_id=company_id, tenant_id=tenant_id, **data.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


async def list_accounts(company_id: int, tenant_id: int, db: AsyncSession) -> list[AccountPlan]:
    result = await db.execute(
        select(AccountPlan)
        .where(AccountPlan.company_id == company_id, AccountPlan.tenant_id == tenant_id)
        .order_by(AccountPlan.code)
    )
    return list(result.scalars().all())


async def update_account(account_id: int, company_id: int, tenant_id: int, data: AccountPlanUpdate, db: AsyncSession) -> AccountPlan:
    result = await db.execute(
        select(AccountPlan).where(
            AccountPlan.id == account_id,
            AccountPlan.company_id == company_id,
            AccountPlan.tenant_id == tenant_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(account, field, value)
    await db.commit()
    await db.refresh(account)
    return account
