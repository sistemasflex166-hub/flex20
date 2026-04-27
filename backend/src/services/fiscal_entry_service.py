from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from src.models.fiscal_entry import FiscalEntry, FiscalEntryItem
from src.schemas.fiscal_entry import FiscalEntryCreate, FiscalEntryUpdate
from src.services.simples_nacional.receita_fiscal import recalcular_receita_mes


async def _next_code(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(FiscalEntry.code)).where(FiscalEntry.company_id == company_id)
    )
    current = result.scalar()
    return (current or 0) + 1


async def _trigger_receita(entry: FiscalEntry, db: AsyncSession) -> None:
    """Dispara recálculo de receita automática do Simples após mudança em lançamento fiscal."""
    from src.services.simples_nacional.receita_fiscal import ENTRY_TYPES_RECEITA
    if entry.entry_type in ENTRY_TYPES_RECEITA and entry.competence_date:
        try:
            await recalcular_receita_mes(
                company_id=entry.company_id,
                competencia_mes=entry.competence_date.month,
                competencia_ano=entry.competence_date.year,
                db=db,
            )
        except Exception:
            pass  # receita automática nunca bloqueia operação fiscal


async def _get_entry_with_items(entry_id: int, db: AsyncSession) -> FiscalEntry:
    result = await db.execute(
        select(FiscalEntry).options(selectinload(FiscalEntry.items)).where(FiscalEntry.id == entry_id)
    )
    return result.scalar_one()


async def create_fiscal_entry(tenant_id: int, body: FiscalEntryCreate, db: AsyncSession) -> FiscalEntry:
    code = await _next_code(body.company_id, db)
    entry = FiscalEntry(
        code=code,
        tenant_id=tenant_id,
        **{k: v for k, v in body.model_dump(exclude={"items"}).items()},
    )
    db.add(entry)
    await db.flush()

    for item_data in body.items:
        item = FiscalEntryItem(
            entry_id=entry.id,
            company_id=entry.company_id,
            tenant_id=tenant_id,
            **item_data.model_dump(),
        )
        db.add(item)

    await db.commit()
    result_entry = await _get_entry_with_items(entry.id, db)
    await _trigger_receita(result_entry, db)
    return result_entry


async def list_fiscal_entries(
    tenant_id: int,
    company_id: int | None,
    entry_type: str | None,
    include_inactive: bool,
    db: AsyncSession,
) -> list[FiscalEntry]:
    q = select(FiscalEntry).options(selectinload(FiscalEntry.items)).where(FiscalEntry.tenant_id == tenant_id)
    if company_id:
        q = q.where(FiscalEntry.company_id == company_id)
    if entry_type:
        q = q.where(FiscalEntry.entry_type == entry_type)
    if not include_inactive:
        q = q.where(FiscalEntry.is_active == True)
    q = q.order_by(FiscalEntry.company_id, FiscalEntry.code.desc())
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_fiscal_entry(entry_id: int, tenant_id: int, db: AsyncSession) -> FiscalEntry:
    result = await db.execute(
        select(FiscalEntry).options(selectinload(FiscalEntry.items))
        .where(FiscalEntry.id == entry_id, FiscalEntry.tenant_id == tenant_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lançamento não encontrado")
    return entry


async def update_fiscal_entry(entry_id: int, tenant_id: int, body: FiscalEntryUpdate, db: AsyncSession) -> FiscalEntry:
    entry = await get_fiscal_entry(entry_id, tenant_id, db)
    data = body.model_dump(exclude_none=True, exclude={"items"})
    for k, v in data.items():
        setattr(entry, k, v)

    if body.items is not None:
        await db.execute(
            select(FiscalEntryItem).where(FiscalEntryItem.entry_id == entry_id)
        )
        for item in list(entry.items):
            await db.delete(item)
        await db.flush()
        for item_data in body.items:
            item = FiscalEntryItem(
                entry_id=entry.id,
                company_id=entry.company_id,
                tenant_id=tenant_id,
                **item_data.model_dump(),
            )
            db.add(item)

    await db.commit()
    result_entry = await _get_entry_with_items(entry.id, db)
    await _trigger_receita(result_entry, db)
    return result_entry


async def soft_delete_fiscal_entry(entry_id: int, tenant_id: int, db: AsyncSession) -> FiscalEntry:
    entry = await get_fiscal_entry(entry_id, tenant_id, db)
    entry.is_active = False
    entry.deleted_at = datetime.utcnow()
    await db.commit()
    result_entry = await _get_entry_with_items(entry_id, db)
    await _trigger_receita(result_entry, db)
    return result_entry


async def restore_fiscal_entry(entry_id: int, tenant_id: int, db: AsyncSession) -> FiscalEntry:
    result = await db.execute(
        select(FiscalEntry).options(selectinload(FiscalEntry.items))
        .where(FiscalEntry.id == entry_id, FiscalEntry.tenant_id == tenant_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lançamento não encontrado")
    entry.is_active = True
    entry.deleted_at = None
    await db.commit()
    result_entry = await _get_entry_with_items(entry_id, db)
    await _trigger_receita(result_entry, db)
    return result_entry


async def hard_delete_fiscal_entry(entry_id: int, tenant_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(FiscalEntry).where(
            FiscalEntry.id == entry_id,
            FiscalEntry.tenant_id == tenant_id,
            FiscalEntry.is_active == False,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lançamento não encontrado na lixeira",
        )
    await db.delete(entry)
    await db.commit()
