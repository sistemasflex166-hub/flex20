from decimal import Decimal, ROUND_HALF_UP

from src.models.simples_nacional.faixa_simples import FaixaSimples


def distribuir_por_tributo(valor_das: Decimal, faixa: FaixaSimples) -> dict[str, Decimal]:
    """
    Distribui o valor do DAS entre os tributos conforme percentuais da faixa.
    Ajusta a última parcela para garantir que a soma seja exatamente igual ao valor_das.
    """
    def calc(perc: Decimal) -> Decimal:
        return (valor_das * perc / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    irpj   = calc(faixa.perc_irpj)
    csll   = calc(faixa.perc_csll)
    cofins = calc(faixa.perc_cofins)
    pis    = calc(faixa.perc_pis)
    cpp    = calc(faixa.perc_cpp)
    icms   = calc(faixa.perc_icms)

    # ISS recebe o saldo restante para garantir que a soma seja exata
    iss = valor_das - irpj - csll - cofins - pis - cpp - icms

    return {
        "irpj":   irpj,
        "csll":   csll,
        "cofins": cofins,
        "pis":    pis,
        "cpp":    cpp,
        "icms":   icms,
        "iss":    iss,
    }
