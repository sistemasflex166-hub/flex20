from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.models.contabilidade.saldo_inicial import SaldoInicial
from src.models.contabilidade.plano_contas import PlanoContas
from src.schemas.contabilidade.saldo_inicial import (
    SaldoInicialCreate, SaldoInicialUpdate, SaldoInicialResponse, TotalizadorSaldos,
)

router = APIRouter()


@router.get("/", response_model=list[SaldoInicialResponse])
async def list_saldos(
    company_id: int,
    data: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(SaldoInicial).where(SaldoInicial.company_id == company_id)
    if data:
        q = q.where(SaldoInicial.data == data)
    q = q.order_by(SaldoInicial.data, SaldoInicial.id)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/totalizador", response_model=TotalizadorSaldos)
async def totalizador(
    company_id: int,
    data: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(SaldoInicial).where(SaldoInicial.company_id == company_id)
    if data:
        q = q.where(SaldoInicial.data == data)
    result = await db.execute(q)
    saldos = result.scalars().all()
    total_deb = sum(s.valor for s in saldos if s.natureza == 'D')
    total_cred = sum(s.valor for s in saldos if s.natureza == 'C')
    return TotalizadorSaldos(
        total_debito=total_deb,
        total_credito=total_cred,
        diferenca=total_deb - total_cred,
    )


@router.post("/", response_model=SaldoInicialResponse, status_code=201)
async def create_saldo(
    company_id: int,
    data: SaldoInicialCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # valida que a conta é analítica
    result = await db.execute(select(PlanoContas).where(PlanoContas.id == data.conta_id, PlanoContas.company_id == company_id))
    conta = result.scalar_one_or_none()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    if conta.tipo != "analitica":
        raise HTTPException(status_code=400, detail="Saldo inicial só pode ser lançado em contas analíticas.")

    obj = SaldoInicial(
        company_id=company_id,
        data=data.data,
        conta_id=data.conta_id,
        natureza=data.natureza,
        valor=data.valor,
        observacao=data.observacao,
        usuario_id=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{id}", response_model=SaldoInicialResponse)
async def update_saldo(
    id: int,
    company_id: int,
    data: SaldoInicialUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SaldoInicial).where(SaldoInicial.id == id, SaldoInicial.company_id == company_id))
    obj = result.scalar_one()
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
async def delete_saldo(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SaldoInicial).where(SaldoInicial.id == id, SaldoInicial.company_id == company_id))
    obj = result.scalar_one()
    await db.delete(obj)
    await db.commit()
