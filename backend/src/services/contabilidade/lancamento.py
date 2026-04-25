from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.contabilidade.lancamento import LancamentoContabil
from src.models.contabilidade.centro_custo import CentroCusto
from src.models.contabilidade.historico_padrao import HistoricoPadrao
from src.schemas.contabilidade.lancamento import (
    CentroCustoCreate, HistoricoPadraoCreate, LancamentoCreate, LancamentoUpdate, TotalizadorDia
)


async def _next_codigo(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(LancamentoContabil.codigo)).where(LancamentoContabil.company_id == company_id)
    )
    max_val = result.scalar_one_or_none()
    return (max_val or 0) + 1


async def _next_cc_codigo(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(CentroCusto.codigo)).where(CentroCusto.company_id == company_id)
    )
    return (result.scalar_one_or_none() or 0) + 1


async def _next_hist_codigo(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(HistoricoPadrao.codigo)).where(HistoricoPadrao.company_id == company_id)
    )
    return (result.scalar_one_or_none() or 0) + 1


# Centro de custo

async def list_centros_custo(company_id: int, db: AsyncSession) -> list[CentroCusto]:
    result = await db.execute(
        select(CentroCusto).where(CentroCusto.company_id == company_id, CentroCusto.ativo == True).order_by(CentroCusto.codigo)
    )
    return list(result.scalars().all())


async def create_centro_custo(company_id: int, data: CentroCustoCreate, db: AsyncSession) -> CentroCusto:
    codigo = await _next_cc_codigo(company_id, db)
    obj = CentroCusto(company_id=company_id, codigo=codigo, descricao=data.descricao)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_centro_custo(id: int, company_id: int, data: CentroCustoCreate, db: AsyncSession) -> CentroCusto:
    result = await db.execute(select(CentroCusto).where(CentroCusto.id == id, CentroCusto.company_id == company_id))
    obj = result.scalar_one()
    obj.descricao = data.descricao
    await db.commit()
    await db.refresh(obj)
    return obj


async def deactivate_centro_custo(id: int, company_id: int, db: AsyncSession) -> CentroCusto:
    result = await db.execute(select(CentroCusto).where(CentroCusto.id == id, CentroCusto.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    return obj


# Histórico padrão

async def list_historicos(company_id: int, db: AsyncSession) -> list[HistoricoPadrao]:
    result = await db.execute(
        select(HistoricoPadrao).where(HistoricoPadrao.company_id == company_id, HistoricoPadrao.ativo == True).order_by(HistoricoPadrao.codigo)
    )
    return list(result.scalars().all())


async def create_historico(company_id: int, data: HistoricoPadraoCreate, db: AsyncSession) -> HistoricoPadrao:
    codigo = await _next_hist_codigo(company_id, db)
    obj = HistoricoPadrao(company_id=company_id, codigo=codigo, descricao=data.descricao)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_historico(id: int, company_id: int, data: HistoricoPadraoCreate, db: AsyncSession) -> HistoricoPadrao:
    result = await db.execute(select(HistoricoPadrao).where(HistoricoPadrao.id == id, HistoricoPadrao.company_id == company_id))
    obj = result.scalar_one()
    obj.descricao = data.descricao
    await db.commit()
    await db.refresh(obj)
    return obj


async def deactivate_historico(id: int, company_id: int, db: AsyncSession) -> HistoricoPadrao:
    result = await db.execute(select(HistoricoPadrao).where(HistoricoPadrao.id == id, HistoricoPadrao.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    return obj


# Lançamentos

async def list_lancamentos(
    company_id: int,
    db: AsyncSession,
    data_ini: date | None = None,
    data_fim: date | None = None,
    incluir_excluidos: bool = False,
) -> list[LancamentoContabil]:
    q = (
        select(LancamentoContabil)
        .options(
            selectinload(LancamentoContabil.conta_debito),
            selectinload(LancamentoContabil.conta_credito),
            selectinload(LancamentoContabil.historico_padrao),
        )
        .where(LancamentoContabil.company_id == company_id)
    )
    if not incluir_excluidos:
        q = q.where(LancamentoContabil.excluido == False)
    if data_ini:
        q = q.where(LancamentoContabil.data >= data_ini)
    if data_fim:
        q = q.where(LancamentoContabil.data <= data_fim)
    q = q.order_by(LancamentoContabil.data, LancamentoContabil.codigo)
    result = await db.execute(q)
    return list(result.scalars().all())


async def create_lancamento(
    company_id: int,
    user_id: int,
    data: LancamentoCreate,
    db: AsyncSession,
    origem: str = "manual",
    origem_id: int | None = None,
    origem_tipo: str | None = None,
) -> LancamentoContabil:
    codigo = await _next_codigo(company_id, db)
    obj = LancamentoContabil(
        company_id=company_id,
        codigo=codigo,
        data=data.data,
        conta_debito_id=data.conta_debito_id,
        conta_credito_id=data.conta_credito_id,
        historico_padrao_id=data.historico_padrao_id,
        historico_complemento=data.historico_complemento,
        valor=data.valor,
        centro_custo_id=data.centro_custo_id,
        origem=origem,
        origem_id=origem_id,
        origem_tipo=origem_tipo,
        usuario_criacao_id=user_id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_lancamento(id: int, company_id: int, user_id: int, data: LancamentoUpdate, db: AsyncSession) -> LancamentoContabil:
    result = await db.execute(
        select(LancamentoContabil).where(LancamentoContabil.id == id, LancamentoContabil.company_id == company_id)
    )
    obj = result.scalar_one()
    if obj.origem != "manual":
        raise ValueError("Lançamentos automáticos não podem ser editados diretamente.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.usuario_edicao_id = user_id
    await db.commit()
    await db.refresh(obj)
    return obj


async def soft_delete_lancamento(id: int, company_id: int, user_id: int, db: AsyncSession) -> LancamentoContabil:
    result = await db.execute(
        select(LancamentoContabil).where(LancamentoContabil.id == id, LancamentoContabil.company_id == company_id)
    )
    obj = result.scalar_one()
    obj.excluido = True
    obj.data_exclusao = datetime.utcnow()
    obj.usuario_exclusao_id = user_id
    await db.commit()
    return obj


async def hard_delete_lancamento(id: int, company_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(LancamentoContabil).where(
            LancamentoContabil.id == id,
            LancamentoContabil.company_id == company_id,
            LancamentoContabil.excluido == True,
        )
    )
    obj = result.scalar_one()
    await db.delete(obj)
    await db.commit()


async def estornar_lancamento(id: int, company_id: int, user_id: int, db: AsyncSession) -> LancamentoContabil:
    result = await db.execute(select(LancamentoContabil).where(LancamentoContabil.id == id, LancamentoContabil.company_id == company_id))
    orig = result.scalar_one()
    codigo = await _next_codigo(company_id, db)
    estorno = LancamentoContabil(
        company_id=company_id,
        codigo=codigo,
        data=orig.data,
        conta_debito_id=orig.conta_credito_id,
        conta_credito_id=orig.conta_debito_id,
        historico_padrao_id=orig.historico_padrao_id,
        historico_complemento=f"ESTORNO do lançamento {orig.codigo}",
        valor=orig.valor,
        centro_custo_id=orig.centro_custo_id,
        origem="estorno",
        origem_id=orig.id,
        origem_tipo="lancamento",
        usuario_criacao_id=user_id,
    )
    db.add(estorno)
    await db.commit()
    await db.refresh(estorno)
    return estorno


async def totalizador_dia(company_id: int, data: date, db: AsyncSession) -> TotalizadorDia:
    q = select(LancamentoContabil).where(
        LancamentoContabil.company_id == company_id,
        LancamentoContabil.data == data,
        LancamentoContabil.excluido == False,
    )
    result = await db.execute(q)
    lancamentos = result.scalars().all()
    total_deb = sum(l.valor for l in lancamentos if l.conta_debito_id)
    total_cred = sum(l.valor for l in lancamentos if l.conta_credito_id)
    return TotalizadorDia(
        data=data,
        total_debito=total_deb,
        total_credito=total_cred,
        diferenca=total_deb - total_cred,
    )
