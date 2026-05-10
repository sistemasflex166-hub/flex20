from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.folha.folha_pagamento import LancamentoVariavel, FolhaPagamento
from src.schemas.folha.lancamento_variavel import LancamentoVariavelCreate, LancamentoVariavelUpdate


async def _next_seq(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(LancamentoVariavel.codigo)).where(LancamentoVariavel.company_id == company_id)
    )
    return (result.scalar() or 0) + 1


def _q_base(company_id: int):
    return (
        select(LancamentoVariavel)
        .options(
            selectinload(LancamentoVariavel.funcionario),
            selectinload(LancamentoVariavel.evento),
        )
        .where(
            LancamentoVariavel.company_id == company_id,
            LancamentoVariavel.excluido == False,
            LancamentoVariavel.excluido_definitivamente == False,
        )
    )


async def list_lancamentos(
    company_id: int,
    db: AsyncSession,
    folha_id: int | None = None,
    funcionario_id: int | None = None,
    competencia_mes: int | None = None,
    competencia_ano: int | None = None,
) -> list[LancamentoVariavel]:
    q = _q_base(company_id)
    if folha_id:
        q = q.where(LancamentoVariavel.folha_id == folha_id)
    if funcionario_id:
        q = q.where(LancamentoVariavel.funcionario_id == funcionario_id)
    if competencia_mes:
        q = q.where(LancamentoVariavel.competencia_mes == competencia_mes)
    if competencia_ano:
        q = q.where(LancamentoVariavel.competencia_ano == competencia_ano)
    result = await db.execute(q.order_by(LancamentoVariavel.codigo))
    return list(result.scalars().all())


async def get_lancamento(id: int, company_id: int, db: AsyncSession) -> LancamentoVariavel:
    result = await db.execute(
        _q_base(company_id).where(LancamentoVariavel.id == id)
    )
    return result.scalar_one()


async def create_lancamento(
    company_id: int, data: LancamentoVariavelCreate, db: AsyncSession
) -> LancamentoVariavel:
    obj = LancamentoVariavel(
        company_id=company_id,
        codigo=await _next_seq(company_id, db),
        folha_id=data.folha_id,
        funcionario_id=data.funcionario_id,
        evento_id=data.evento_id,
        competencia_mes=data.competencia_mes,
        competencia_ano=data.competencia_ano,
        quantidade=data.quantidade,
        valor=data.valor,
        observacao=data.observacao,
    )
    db.add(obj)
    await db.commit()
    result = await db.execute(
        _q_base(company_id).where(LancamentoVariavel.id == obj.id)
    )
    return result.scalar_one()


async def update_lancamento(
    id: int, company_id: int, data: LancamentoVariavelUpdate, db: AsyncSession
) -> LancamentoVariavel:
    result = await db.execute(
        select(LancamentoVariavel).where(
            LancamentoVariavel.id == id,
            LancamentoVariavel.company_id == company_id,
            LancamentoVariavel.excluido == False,
        )
    )
    obj = result.scalar_one()
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    result2 = await db.execute(_q_base(company_id).where(LancamentoVariavel.id == id))
    return result2.scalar_one()


async def excluir_lancamento(id: int, company_id: int, db: AsyncSession) -> None:
    """Soft delete — move para lixeira."""
    result = await db.execute(
        select(LancamentoVariavel).where(
            LancamentoVariavel.id == id,
            LancamentoVariavel.company_id == company_id,
            LancamentoVariavel.excluido == False,
        )
    )
    obj = result.scalar_one()
    obj.excluido = True
    obj.data_exclusao = datetime.now()
    await db.commit()


async def list_lixeira(
    company_id: int,
    db: AsyncSession,
    competencia_mes: int | None = None,
    competencia_ano: int | None = None,
) -> list[LancamentoVariavel]:
    q = (
        select(LancamentoVariavel)
        .options(
            selectinload(LancamentoVariavel.funcionario),
            selectinload(LancamentoVariavel.evento),
        )
        .where(
            LancamentoVariavel.company_id == company_id,
            LancamentoVariavel.excluido == True,
            LancamentoVariavel.excluido_definitivamente == False,
        )
    )
    if competencia_mes:
        q = q.where(LancamentoVariavel.competencia_mes == competencia_mes)
    if competencia_ano:
        q = q.where(LancamentoVariavel.competencia_ano == competencia_ano)
    result = await db.execute(q.order_by(LancamentoVariavel.data_exclusao.desc()))
    return list(result.scalars().all())


async def restaurar_lancamento(id: int, company_id: int, db: AsyncSession) -> LancamentoVariavel:
    result = await db.execute(
        select(LancamentoVariavel).where(
            LancamentoVariavel.id == id,
            LancamentoVariavel.company_id == company_id,
            LancamentoVariavel.excluido == True,
            LancamentoVariavel.excluido_definitivamente == False,
        )
    )
    obj = result.scalar_one()
    obj.excluido = False
    obj.data_exclusao = None
    await db.commit()
    result2 = await db.execute(_q_base(company_id).where(LancamentoVariavel.id == id))
    return result2.scalar_one()


async def excluir_definitivamente(id: int, company_id: int, db: AsyncSession) -> None:
    """Hard delete — somente itens já na lixeira."""
    result = await db.execute(
        select(LancamentoVariavel).where(
            LancamentoVariavel.id == id,
            LancamentoVariavel.company_id == company_id,
            LancamentoVariavel.excluido == True,
            LancamentoVariavel.excluido_definitivamente == False,
        )
    )
    obj = result.scalar_one()
    obj.excluido_definitivamente = True
    await db.commit()
