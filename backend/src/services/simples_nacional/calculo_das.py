from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from src.models.simples_nacional.configuracao_simples import ConfiguracaoSimples
from src.models.simples_nacional.apuracao_simples import ApuracaoSimples
from src.models.simples_nacional.historico_receita import HistoricoReceita
from collections import defaultdict

from .calculo_rbt12 import calcular_rbt12
from .calculo_aliquota import buscar_faixa, calcular_aliquota_efetiva
from .calculo_fator_r import calcular_fator_r, definir_anexo_por_fator_r
from .distribuicao_tributos import distribuir_por_tributo


LIMITE_SIMPLES = Decimal("4800000.00")


async def get_receita_automatica_mes(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    db: AsyncSession,
) -> dict:
    """
    Retorna a receita automática do mês atual, detalhada por simples_codigo.
    Usado pelo frontend para pré-preencher o campo receita_mes.
    """
    result = await db.execute(
        select(HistoricoReceita).where(
            HistoricoReceita.company_id == company_id,
            HistoricoReceita.competencia_mes == competencia_mes,
            HistoricoReceita.competencia_ano == competencia_ano,
        )
    )
    registros = list(result.scalars().all())
    total = sum(r.receita_bruta for r in registros)
    detalhamento = [
        {"simples_codigo": r.simples_codigo, "receita_bruta": r.receita_bruta, "origem": r.origem}
        for r in registros
    ]
    return {
        "competencia_mes": competencia_mes,
        "competencia_ano": competencia_ano,
        "receita_total": Decimal(str(total)),
        "detalhamento": detalhamento,
        "tem_automatico": any(r.origem == "automatico" for r in registros),
    }


async def _buscar_configuracao(company_id: int, db: AsyncSession) -> ConfiguracaoSimples:
    result = await db.execute(
        select(ConfiguracaoSimples).where(
            ConfiguracaoSimples.company_id == company_id,
            ConfiguracaoSimples.ativo == True,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="Empresa não possui configuração do Simples Nacional cadastrada.")
    return config


def _data_vencimento(competencia_mes: int, competencia_ano: int) -> date:
    """DAS vence sempre no dia 20 do mês seguinte."""
    mes = competencia_mes + 1
    ano = competencia_ano
    if mes > 12:
        mes = 1
        ano += 1
    return date(ano, mes, 20)


async def preview_calculo(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    receita_mes: Decimal,
    db: AsyncSession,
) -> dict:
    """
    Retorna prévia do cálculo completo SEM persistir.
    Usado para exibir na interface antes da confirmação do usuário.
    """
    config = await _buscar_configuracao(company_id, db)
    competencia = date(competencia_ano, competencia_mes, 1)

    rbt12, detalhamento_rbt12 = await calcular_rbt12(company_id, competencia_mes, competencia_ano, db)

    if rbt12 > LIMITE_SIMPLES:
        raise HTTPException(
            status_code=400,
            detail=f"RBT12 de R$ {rbt12:,.2f} ultrapassa o limite do Simples Nacional (R$ {LIMITE_SIMPLES:,.2f}). Verifique o enquadramento da empresa.",
        )

    # Fator R — define se usa Anexo III ou V
    fator_r = None
    anexo_aplicado = config.anexo_principal
    if config.usa_fator_r:
        fator_r = await calcular_fator_r(company_id, competencia_mes, competencia_ano, rbt12, db)
        if fator_r is not None:
            anexo_aplicado = definir_anexo_por_fator_r(fator_r)

    faixa = await buscar_faixa(rbt12, anexo_aplicado, competencia, db)
    aliquota_efetiva = calcular_aliquota_efetiva(rbt12, faixa)
    valor_das = (receita_mes * aliquota_efetiva / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    distribuicao = distribuir_por_tributo(valor_das, faixa)

    meses_ausentes = [d for d in detalhamento_rbt12 if d["ausente"]]

    return {
        "company_id": company_id,
        "competencia_mes": competencia_mes,
        "competencia_ano": competencia_ano,
        "rbt12": rbt12,
        "detalhamento_rbt12": detalhamento_rbt12,
        "meses_ausentes": len(meses_ausentes),
        "receita_mes": receita_mes,
        "anexo_aplicado": anexo_aplicado,
        "faixa_aplicada": faixa.numero_faixa,
        "fator_r": fator_r,
        "aliquota_nominal": faixa.aliquota_nominal,
        "valor_deduzir": faixa.valor_deduzir,
        "aliquota_efetiva": aliquota_efetiva,
        "valor_das": valor_das,
        "distribuicao": distribuicao,
        "data_vencimento": _data_vencimento(competencia_mes, competencia_ano),
        "inclui_cpp": faixa.perc_cpp > 0,
    }


async def calcular_das(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    receita_mes: Decimal,
    usuario_id: int,
    db: AsyncSession,
) -> ApuracaoSimples:
    """
    Orquestrador completo — calcula e persiste a apuração do DAS.
    Lança exceção se já existir apuração confirmada ou com PGDAS gerado.
    """
    # Verificar se já existe apuração bloqueada para esta competência
    result = await db.execute(
        select(ApuracaoSimples).where(
            ApuracaoSimples.company_id == company_id,
            ApuracaoSimples.competencia_mes == competencia_mes,
            ApuracaoSimples.competencia_ano == competencia_ano,
        )
    )
    existente = result.scalar_one_or_none()
    if existente and existente.bloqueado:
        raise HTTPException(
            status_code=400,
            detail="Esta competência já possui apuração com PGDAS gerado e não pode ser recalculada.",
        )

    preview = await preview_calculo(company_id, competencia_mes, competencia_ano, receita_mes, db)
    dist = preview["distribuicao"]

    if existente:
        # Atualiza apuração existente (recálculo antes do PGDAS)
        existente.rbt12 = preview["rbt12"]
        existente.receita_mes = receita_mes
        existente.anexo_aplicado = preview["anexo_aplicado"]
        existente.faixa_aplicada = preview["faixa_aplicada"]
        existente.fator_r = preview["fator_r"]
        existente.aliquota_nominal = preview["aliquota_nominal"]
        existente.valor_deduzir = preview["valor_deduzir"]
        existente.aliquota_efetiva = preview["aliquota_efetiva"]
        existente.valor_das = preview["valor_das"]
        existente.valor_irpj = dist["irpj"]
        existente.valor_csll = dist["csll"]
        existente.valor_cofins = dist["cofins"]
        existente.valor_pis = dist["pis"]
        existente.valor_cpp = dist["cpp"]
        existente.valor_icms = dist["icms"]
        existente.valor_iss = dist["iss"]
        existente.status = "calculado"
        existente.data_vencimento = preview["data_vencimento"]
        existente.usuario_id = usuario_id
        await db.commit()
        await db.refresh(existente)
        return existente

    apuracao = ApuracaoSimples(
        company_id=company_id,
        competencia_mes=competencia_mes,
        competencia_ano=competencia_ano,
        rbt12=preview["rbt12"],
        receita_mes=receita_mes,
        anexo_aplicado=preview["anexo_aplicado"],
        faixa_aplicada=preview["faixa_aplicada"],
        fator_r=preview["fator_r"],
        aliquota_nominal=preview["aliquota_nominal"],
        valor_deduzir=preview["valor_deduzir"],
        aliquota_efetiva=preview["aliquota_efetiva"],
        valor_das=preview["valor_das"],
        valor_irpj=dist["irpj"],
        valor_csll=dist["csll"],
        valor_cofins=dist["cofins"],
        valor_pis=dist["pis"],
        valor_cpp=dist["cpp"],
        valor_icms=dist["icms"],
        valor_iss=dist["iss"],
        status="calculado",
        data_vencimento=preview["data_vencimento"],
        usuario_id=usuario_id,
    )
    db.add(apuracao)
    await db.commit()
    await db.refresh(apuracao)
    return apuracao


async def confirmar_apuracao(apuracao_id: int, company_id: int, db: AsyncSession) -> ApuracaoSimples:
    result = await db.execute(
        select(ApuracaoSimples).where(
            ApuracaoSimples.id == apuracao_id,
            ApuracaoSimples.company_id == company_id,
        )
    )
    apuracao = result.scalar_one_or_none()
    if not apuracao:
        raise HTTPException(status_code=404, detail="Apuração não encontrada.")
    if apuracao.bloqueado:
        raise HTTPException(status_code=400, detail="Apuração bloqueada — PGDAS já gerado.")
    apuracao.status = "confirmado"
    await db.commit()
    await db.refresh(apuracao)
    return apuracao


async def list_apuracoes(company_id: int, db: AsyncSession) -> list[ApuracaoSimples]:
    result = await db.execute(
        select(ApuracaoSimples)
        .where(ApuracaoSimples.company_id == company_id)
        .order_by(ApuracaoSimples.competencia_ano.desc(), ApuracaoSimples.competencia_mes.desc())
    )
    return list(result.scalars().all())
