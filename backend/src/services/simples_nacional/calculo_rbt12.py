from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.simples_nacional.historico_receita import HistoricoReceita


def _meses_anteriores(mes: int, ano: int) -> list[tuple[int, int]]:
    """Retorna lista de (mes, ano) dos 12 meses anteriores ao mês de apuração."""
    meses = []
    m, a = mes, ano
    for _ in range(12):
        m -= 1
        if m == 0:
            m = 12
            a -= 1
        meses.append((m, a))
    return meses


async def calcular_rbt12(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    db: AsyncSession,
) -> tuple[Decimal, list[dict]]:
    """
    Soma a receita bruta dos 12 meses anteriores ao mês de apuração.
    Não inclui o mês atual.

    Retorna: (rbt12, detalhamento)
      detalhamento = lista de dicts com mes, ano, receita e flag de mês ausente
    """
    meses = _meses_anteriores(competencia_mes, competencia_ano)

    result = await db.execute(
        select(HistoricoReceita).where(
            HistoricoReceita.company_id == company_id,
            HistoricoReceita.competencia_ano.in_([a for _, a in meses]),
        )
    )
    # Agrega todos os simples_codigo do mesmo mês (múltiplas atividades)
    from collections import defaultdict
    totais_mes: dict[tuple[int, int], Decimal] = defaultdict(Decimal)
    for h in result.scalars().all():
        totais_mes[(h.competencia_mes, h.competencia_ano)] += h.receita_bruta

    detalhamento = []
    total = Decimal("0.00")
    for m, a in meses:
        valor = totais_mes.get((m, a), Decimal("0.00"))
        total += valor
        detalhamento.append({
            "mes": m,
            "ano": a,
            "receita": valor,
            "ausente": (m, a) not in totais_mes,
        })

    # Ordena cronologicamente para exibição
    detalhamento.sort(key=lambda x: (x["ano"], x["mes"]))
    return total, detalhamento
