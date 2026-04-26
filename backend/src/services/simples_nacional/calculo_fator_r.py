from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.ext.asyncio import AsyncSession


async def calcular_fator_r(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    rbt12: Decimal,
    db: AsyncSession,
) -> Decimal | None:
    """
    Fator R = Folha de Pagamento dos últimos 12 meses ÷ RBT12

    Integração futura com o módulo Folha de Pagamentos.
    Enquanto o módulo Folha não estiver completo, retorna None
    e o sistema mantém o anexo principal configurado.
    """
    # TODO: integrar com módulo Folha quando disponível
    # folha_12 = await folha_service.total_folha_12_meses(company_id, competencia_mes, competencia_ano, db)
    # if rbt12 == 0:
    #     return Decimal("0.00")
    # return (folha_12 / rbt12).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    return None


def definir_anexo_por_fator_r(fator_r: Decimal) -> str:
    """
    Fator R >= 0,28 → Anexo III (alíquota menor)
    Fator R <  0,28 → Anexo V  (alíquota maior)
    """
    if fator_r >= Decimal("0.28"):
        return "III"
    return "V"
