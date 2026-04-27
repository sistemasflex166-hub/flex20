"""
Etapa 4 — Receita automática via lançamentos fiscais.

Regras de classificação por item:
  - service_item_id preenchido → usa ServiceItem.simples_anexo (ex: "III")
  - product_id ou somente cfop_id → busca CfopSimples pelo CFOP do item (ex: Anexo "I")
  - Fallback: usa anexo_principal da ConfiguracaoSimples da empresa
  - Se ainda não houver classificação, usa "geral"

Cada combinação (empresa, ano, mes, simples_codigo) é uma linha em historico_receita_simples.
Lançamentos de ENTRADA (compras, serviços tomados) não somam receita.
"""
from decimal import Decimal
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.fiscal_entry import FiscalEntry, FiscalEntryItem
from src.models.fiscal_base import ServiceItem, CFOP
from src.models.simples_nacional.cfop_simples import CfopSimples
from src.models.simples_nacional.configuracao_simples import ConfiguracaoSimples
from src.models.simples_nacional.historico_receita import HistoricoReceita

# Tipos de lançamento que representam receita (saída / prestação)
ENTRY_TYPES_RECEITA = {"sale", "service_provided", "other"}


async def _get_service_item(service_item_id: int, db: AsyncSession) -> ServiceItem | None:
    result = await db.execute(select(ServiceItem).where(ServiceItem.id == service_item_id))
    return result.scalar_one_or_none()


async def _get_cfop_code(cfop_id: int, db: AsyncSession) -> str | None:
    result = await db.execute(select(CFOP).where(CFOP.id == cfop_id))
    cfop = result.scalar_one_or_none()
    return cfop.code if cfop else None


async def _get_cfop_simples_anexo(cfop_code: str, company_id: int, db: AsyncSession) -> str | None:
    result = await db.execute(
        select(CfopSimples).where(
            CfopSimples.company_id == company_id,
            CfopSimples.cfop == cfop_code,
        )
    )
    cs = result.scalar_one_or_none()
    return cs.anexo if cs else None


async def _get_anexo_principal(company_id: int, db: AsyncSession) -> str | None:
    result = await db.execute(
        select(ConfiguracaoSimples).where(ConfiguracaoSimples.company_id == company_id)
    )
    cfg = result.scalar_one_or_none()
    return cfg.anexo_principal if cfg else None


async def _classificar_item(
    item: FiscalEntryItem,
    company_id: int,
    db: AsyncSession,
    anexo_principal_cache: dict,
) -> str:
    """Retorna o simples_codigo (ex: 'I', 'III') ou 'geral' para o item."""

    # 1. Serviço com anexo configurado no cadastro
    if item.service_item_id:
        si = await _get_service_item(item.service_item_id, db)
        if si and si.simples_anexo:
            return si.simples_anexo

    # 2. CFOP do item → CfopSimples
    cfop_id = item.cfop_id
    if cfop_id:
        cfop_code = await _get_cfop_code(cfop_id, db)
        if cfop_code:
            anexo = await _get_cfop_simples_anexo(cfop_code, company_id, db)
            if anexo:
                return anexo

    # 3. Fallback: anexo_principal da empresa (cacheado para não re-buscar por item)
    if company_id not in anexo_principal_cache:
        anexo_principal_cache[company_id] = await _get_anexo_principal(company_id, db)
    if anexo_principal_cache[company_id]:
        return anexo_principal_cache[company_id]

    return "geral"


async def recalcular_receita_mes(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    db: AsyncSession,
) -> list[HistoricoReceita]:
    """
    Recalcula a receita automática de um mês/ano para a empresa.
    Soma os totais dos lançamentos fiscais ativos de saída, agrupando por simples_codigo.
    Sobrescreve apenas registros com origem='automatico' — não toca em lançamentos manuais.
    """
    from datetime import date

    data_inicio = date(competencia_ano, competencia_mes, 1)
    # último dia do mês
    if competencia_mes == 12:
        data_fim = date(competencia_ano + 1, 1, 1)
    else:
        data_fim = date(competencia_ano, competencia_mes + 1, 1)

    # Busca todos os lançamentos ativos de receita da competência
    result = await db.execute(
        select(FiscalEntry)
        .options(selectinload(FiscalEntry.items))
        .where(
            FiscalEntry.company_id == company_id,
            FiscalEntry.is_active == True,
            FiscalEntry.entry_type.in_(ENTRY_TYPES_RECEITA),
            FiscalEntry.competence_date >= data_inicio,
            FiscalEntry.competence_date < data_fim,
        )
    )
    entries = list(result.scalars().all())

    # Agrupa receita por simples_codigo
    totais: dict[str, Decimal] = defaultdict(Decimal)
    anexo_cache: dict[int, str | None] = {}

    for entry in entries:
        for item in entry.items:
            codigo = await _classificar_item(item, company_id, db, anexo_cache)
            totais[codigo] += Decimal(str(item.total))

    # Atualiza historico_receita_simples — apenas registros automáticos
    registros_atualizados: list[HistoricoReceita] = []

    # Busca registros automáticos existentes para esse mês
    existing_result = await db.execute(
        select(HistoricoReceita).where(
            HistoricoReceita.company_id == company_id,
            HistoricoReceita.competencia_mes == competencia_mes,
            HistoricoReceita.competencia_ano == competencia_ano,
            HistoricoReceita.origem == "automatico",
        )
    )
    existing = {r.simples_codigo: r for r in existing_result.scalars().all()}

    # Zera códigos que sumiram (lançamentos deletados)
    for codigo, rec in existing.items():
        if codigo not in totais:
            rec.receita_bruta = Decimal("0.00")
            registros_atualizados.append(rec)

    # Upsert para cada código encontrado
    for codigo, total in totais.items():
        if codigo in existing:
            existing[codigo].receita_bruta = total
            registros_atualizados.append(existing[codigo])
        else:
            novo = HistoricoReceita(
                company_id=company_id,
                competencia_mes=competencia_mes,
                competencia_ano=competencia_ano,
                simples_codigo=codigo,
                receita_bruta=total,
                origem="automatico",
            )
            db.add(novo)
            registros_atualizados.append(novo)

    await db.commit()

    # Recarrega para retornar com ids
    final_result = await db.execute(
        select(HistoricoReceita).where(
            HistoricoReceita.company_id == company_id,
            HistoricoReceita.competencia_mes == competencia_mes,
            HistoricoReceita.competencia_ano == competencia_ano,
        )
    )
    return list(final_result.scalars().all())
