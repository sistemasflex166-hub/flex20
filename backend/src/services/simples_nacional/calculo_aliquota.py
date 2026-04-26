from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from src.models.simples_nacional.anexo_simples import AnexoSimples
from src.models.simples_nacional.faixa_simples import FaixaSimples


async def buscar_faixa(
    rbt12: Decimal,
    codigo_anexo: str,
    competencia: date,
    db: AsyncSession,
) -> FaixaSimples:
    """
    Identifica a faixa de faturamento pelo RBT12 e anexo.
    Usa a tabela vigente para a competência informada.
    """
    result = await db.execute(
        select(AnexoSimples).where(
            AnexoSimples.codigo == codigo_anexo,
            AnexoSimples.vigencia_inicio <= competencia,
            (AnexoSimples.vigencia_fim == None) | (AnexoSimples.vigencia_fim >= competencia),
        )
    )
    anexo = result.scalar_one_or_none()
    if not anexo:
        raise HTTPException(status_code=400, detail=f"Anexo {codigo_anexo} não encontrado para a competência {competencia}.")

    result = await db.execute(
        select(FaixaSimples).where(
            FaixaSimples.anexo_id == anexo.id,
            FaixaSimples.valor_minimo <= rbt12,
            (FaixaSimples.valor_maximo == None) | (FaixaSimples.valor_maximo >= rbt12),
            FaixaSimples.vigencia_inicio <= competencia,
            (FaixaSimples.vigencia_fim == None) | (FaixaSimples.vigencia_fim >= competencia),
        )
    )
    faixa = result.scalar_one_or_none()
    if not faixa:
        raise HTTPException(status_code=400, detail=f"Nenhuma faixa encontrada para RBT12 = R$ {rbt12} no Anexo {codigo_anexo}.")

    return faixa


def calcular_aliquota_efetiva(rbt12: Decimal, faixa: FaixaSimples) -> Decimal:
    """
    Fórmula: (RBT12 × alíquota_nominal − valor_deduzir) ÷ RBT12
    Retorna percentual com 2 casas decimais (ex: 12.20).
    """
    if rbt12 == 0:
        return Decimal("0.00")
    aliquota_nominal = faixa.aliquota_nominal / Decimal("100")
    numerador = (rbt12 * aliquota_nominal) - faixa.valor_deduzir
    efetiva = (numerador / rbt12) * Decimal("100")
    return efetiva.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
