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
    registros = {
        (h.competencia_mes, h.competencia_ano): h
        for h in result.scalars().all()
    }

    detalhamento = []
    total = Decimal("0.00")
    for m, a in meses:
        rec = registros.get((m, a))
        valor = rec.receita_bruta if rec else Decimal("0.00")
        total += valor
        detalhamento.append({
            "mes": m,
            "ano": a,
            "receita": valor,
            "ausente": rec is None,
        })

    # Ordena cronologicamente para exibição
    detalhamento.sort(key=lambda x: (x["ano"], x["mes"]))
    return total, detalhamento
