from datetime import date
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from src.models.simples_nacional.configuracao_simples import ConfiguracaoSimples
from src.models.simples_nacional.historico_receita import HistoricoReceita


ANEXOS_VALIDOS = {"I", "II", "III", "IV", "V"}


async def get_configuracao(company_id: int, db: AsyncSession) -> ConfiguracaoSimples | None:
    result = await db.execute(
        select(ConfiguracaoSimples).where(ConfiguracaoSimples.company_id == company_id)
    )
    return result.scalar_one_or_none()


async def salvar_configuracao(
    company_id: int,
    anexo_principal: str,
    usa_fator_r: bool,
    data_inicio_simples: date,
    db: AsyncSession,
) -> ConfiguracaoSimples:
    if anexo_principal not in ANEXOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Anexo inválido: {anexo_principal}. Use I, II, III, IV ou V.")

    result = await db.execute(
        select(ConfiguracaoSimples).where(ConfiguracaoSimples.company_id == company_id)
    )
    config = result.scalar_one_or_none()

    if config:
        config.anexo_principal = anexo_principal
        config.usa_fator_r = usa_fator_r
        config.data_inicio_simples = data_inicio_simples
    else:
        config = ConfiguracaoSimples(
            company_id=company_id,
            anexo_principal=anexo_principal,
            usa_fator_r=usa_fator_r,
            data_inicio_simples=data_inicio_simples,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return config


async def list_historico_receita(company_id: int, db: AsyncSession) -> list[HistoricoReceita]:
    result = await db.execute(
        select(HistoricoReceita)
        .where(HistoricoReceita.company_id == company_id)
        .order_by(HistoricoReceita.competencia_ano.desc(), HistoricoReceita.competencia_mes.desc())
    )
    return list(result.scalars().all())


async def salvar_receita_manual(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    receita_bruta: Decimal,
    db: AsyncSession,
) -> HistoricoReceita:
    result = await db.execute(
        select(HistoricoReceita).where(
            HistoricoReceita.company_id == company_id,
            HistoricoReceita.competencia_mes == competencia_mes,
            HistoricoReceita.competencia_ano == competencia_ano,
        )
    )
    rec = result.scalar_one_or_none()

    if rec:
        if rec.origem == "automatico":
            raise HTTPException(
                status_code=400,
                detail="Esta competência já possui receita registrada automaticamente pelo sistema fiscal e não pode ser sobrescrita manualmente.",
            )
        rec.receita_bruta = receita_bruta
        rec.origem = "manual"
    else:
        rec = HistoricoReceita(
            company_id=company_id,
            competencia_mes=competencia_mes,
            competencia_ano=competencia_ano,
            receita_bruta=receita_bruta,
            origem="manual",
        )
        db.add(rec)

    await db.commit()
    await db.refresh(rec)
    return rec


async def registrar_receita_automatica(
    company_id: int,
    competencia_mes: int,
    competencia_ano: int,
    receita_bruta: Decimal,
    db: AsyncSession,
) -> HistoricoReceita:
    """
    Chamado automaticamente pelo módulo fiscal ao fechar o mês.
    Sobrescreve receita manual se ainda não houver automática.
    """
    result = await db.execute(
        select(HistoricoReceita).where(
            HistoricoReceita.company_id == company_id,
            HistoricoReceita.competencia_mes == competencia_mes,
            HistoricoReceita.competencia_ano == competencia_ano,
        )
    )
    rec = result.scalar_one_or_none()

    if rec:
        rec.receita_bruta = receita_bruta
        rec.origem = "automatico"
    else:
        rec = HistoricoReceita(
            company_id=company_id,
            competencia_mes=competencia_mes,
            competencia_ano=competencia_ano,
            receita_bruta=receita_bruta,
            origem="automatico",
        )
        db.add(rec)

    await db.commit()
    await db.refresh(rec)
    return rec
