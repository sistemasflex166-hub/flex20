"""Cálculo da folha de pagamentos.

Fluxo por funcionário:
  1. Salário base (provento)
  2. Variáveis do mês vinculadas (proventos e descontos)
  3. Base INSS  = salário + variáveis que incide_inss
  4. INSS progressivo (tabela vigente)
  5. Base IRRF  = salário + variáveis que incide_irrf − INSS − dedução dependentes
  6. IRRF progressivo (tabela vigente)
  7. FGTS = 8 % sobre base FGTS (salário + variáveis que incide_fgts)
  8. Líquido = proventos − descontos (INSS + IRRF + descontos variáveis)
"""
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.folha.folha_pagamento import FolhaPagamento, ItemFolha, LancamentoVariavel
from src.models.folha.funcionario import Funcionario, DependenteFuncionario
from src.models.folha.tabelas_tributarias import TabelaINSS, TabelaIRRF
from src.schemas.folha.folha_pagamento import FolhaPagamentoCreate


FGTS_ALIQUOTA = Decimal("0.08")
_ZERO = Decimal("0.00")


# ── Helpers tributários ──────────────────────────────────────────────────────

def _calcular_inss_progressivo(base: Decimal, faixas: list[dict]) -> Decimal:
    """Calcula INSS pela tabela progressiva (acumulado por faixa, igual ao método correto 2023+)."""
    total = _ZERO
    anterior = _ZERO
    for faixa in faixas:
        limite = Decimal(str(faixa["limite"])) if faixa.get("limite") is not None else None
        aliquota = Decimal(str(faixa["aliquota"])) / 100
        teto_faixa = limite if limite is not None else base
        tributavel = min(base, teto_faixa) - anterior
        if tributavel <= 0:
            break
        total += tributavel * aliquota
        anterior = teto_faixa
        if limite is None or base <= teto_faixa:
            break
    return total.quantize(Decimal("0.01"), ROUND_HALF_UP)


def _calcular_irrf(base: Decimal, faixas: list[dict]) -> Decimal:
    """Calcula IRRF pelo método de parcela a deduzir (tabela progressiva simples)."""
    for faixa in reversed(faixas):
        limite = Decimal(str(faixa["limite"])) if faixa.get("limite") is not None else None
        aliquota = Decimal(str(faixa["aliquota"])) / 100
        parcela = Decimal(str(faixa["parcela_deduzir"]))
        if limite is None or base > limite:
            irrf = base * aliquota - parcela
            return max(_ZERO, irrf.quantize(Decimal("0.01"), ROUND_HALF_UP))
    return _ZERO


# ── Folha principal ──────────────────────────────────────────────────────────

async def _next_seq_folha(company_id: int, db: AsyncSession) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.max(FolhaPagamento.codigo)).where(FolhaPagamento.company_id == company_id)
    )
    return (result.scalar() or 0) + 1


async def list_folhas(company_id: int, db: AsyncSession) -> list[FolhaPagamento]:
    result = await db.execute(
        select(FolhaPagamento)
        .where(FolhaPagamento.company_id == company_id)
        .order_by(FolhaPagamento.competencia_ano.desc(), FolhaPagamento.competencia_mes.desc())
    )
    return list(result.scalars().all())


async def get_folha(folha_id: int, company_id: int, db: AsyncSession) -> FolhaPagamento:
    result = await db.execute(
        select(FolhaPagamento).where(
            FolhaPagamento.id == folha_id,
            FolhaPagamento.company_id == company_id,
        )
    )
    return result.scalar_one()


async def create_folha(company_id: int, data: FolhaPagamentoCreate, db: AsyncSession) -> FolhaPagamento:
    # Impede duplicata de competência
    existing = await db.execute(
        select(FolhaPagamento).where(
            FolhaPagamento.company_id == company_id,
            FolhaPagamento.competencia_mes == data.competencia_mes,
            FolhaPagamento.competencia_ano == data.competencia_ano,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Já existe folha para {data.competencia_mes:02d}/{data.competencia_ano}")

    folha = FolhaPagamento(
        company_id=company_id,
        codigo=await _next_seq_folha(company_id, db),
        competencia_mes=data.competencia_mes,
        competencia_ano=data.competencia_ano,
        status="aberta",
    )
    db.add(folha)
    await db.commit()
    await db.refresh(folha)
    return folha


async def calcular_folha(folha_id: int, company_id: int, db: AsyncSession) -> FolhaPagamento:
    """Recalcula a folha do zero (idempotente — apaga itens anteriores e recalcula)."""
    folha = await get_folha(folha_id, company_id, db)
    if folha.status == "fechada":
        raise ValueError("Folha fechada não pode ser recalculada")

    # Busca tabelas tributárias vigentes para a competência
    comp_date = date(folha.competencia_ano, folha.competencia_mes, 1)
    tabela_inss = await _get_tabela_inss(comp_date, db)
    tabela_irrf = await _get_tabela_irrf(comp_date, db)

    # Busca funcionários ativos da empresa
    res_funcs = await db.execute(
        select(Funcionario)
        .where(Funcionario.company_id == company_id, Funcionario.ativo == True)
        .options(selectinload(Funcionario.dependentes))
        .order_by(Funcionario.codigo)
    )
    funcionarios = list(res_funcs.scalars().all())

    # Busca variáveis da competência (já vinculadas ou pendentes para essa competência)
    res_vars = await db.execute(
        select(LancamentoVariavel)
        .options(selectinload(LancamentoVariavel.evento))
        .where(
            LancamentoVariavel.company_id == company_id,
            LancamentoVariavel.competencia_mes == folha.competencia_mes,
            LancamentoVariavel.competencia_ano == folha.competencia_ano,
            LancamentoVariavel.excluido == False,
            LancamentoVariavel.excluido_definitivamente == False,
        )
    )
    variaveis_all = list(res_vars.scalars().all())

    # Remove itens anteriores (recálculo idempotente)
    res_old = await db.execute(
        select(ItemFolha).where(ItemFolha.folha_id == folha_id)
    )
    for item in res_old.scalars().all():
        await db.delete(item)

    # Totalizadores da folha
    tot_proventos = _ZERO
    tot_descontos = _ZERO
    tot_inss = _ZERO
    tot_irrf = _ZERO
    tot_fgts = _ZERO

    for func_obj in funcionarios:
        variaveis = [v for v in variaveis_all if v.funcionario_id == func_obj.id]
        itens = _calcular_funcionario(func_obj, variaveis, tabela_inss, tabela_irrf)
        for item in itens:
            item.folha_id = folha_id
            db.add(item)

        # Acumula totalizadores
        for item in itens:
            if item.tipo == "provento":
                tot_proventos += item.valor
            elif item.tipo == "desconto":
                tot_descontos += item.valor
            if item.tipo_linha == "inss":
                tot_inss += item.valor
            elif item.tipo_linha == "irrf":
                tot_irrf += item.valor
            elif item.tipo_linha == "fgts":
                tot_fgts += item.valor

        # Vincula variáveis à folha
        for v in variaveis:
            v.folha_id = folha_id

    folha.total_proventos = tot_proventos
    folha.total_descontos = tot_descontos
    folha.total_liquido = tot_proventos - tot_descontos
    folha.total_inss_empregado = tot_inss
    folha.total_irrf = tot_irrf
    folha.total_fgts = tot_fgts
    folha.status = "calculada"
    folha.data_calculo = datetime.now()

    await db.commit()
    await db.refresh(folha)
    return folha


def _calcular_funcionario(
    func_obj: Funcionario,
    variaveis: list[LancamentoVariavel],
    tabela_inss: TabelaINSS | None,
    tabela_irrf: TabelaIRRF | None,
) -> list[ItemFolha]:
    itens: list[ItemFolha] = []
    ordem = 0

    salario = func_obj.salario_base or _ZERO

    # 1. Salário base
    itens.append(ItemFolha(
        funcionario_id=func_obj.id,
        tipo_linha="salario_base",
        descricao="Salário Base",
        tipo="provento",
        referencia=None,
        valor=salario,
        ordem=ordem,
    ))
    ordem += 1

    # 2. Variáveis
    base_inss = salario
    base_irrf = salario
    base_fgts = salario

    for v in variaveis:
        ev = v.evento
        valor_var = (v.valor or _ZERO)
        if valor_var == _ZERO and v.quantidade:
            valor_var = v.quantidade  # fallback para quantidade sem valor unitário

        tipo_var = ev.tipo  # provento / desconto
        itens.append(ItemFolha(
            funcionario_id=func_obj.id,
            evento_id=ev.id,
            tipo_linha="variavel",
            descricao=ev.descricao,
            tipo=tipo_var,
            referencia=v.quantidade,
            valor=valor_var,
            ordem=ordem,
        ))
        ordem += 1

        if tipo_var == "provento":
            if ev.incide_inss:
                base_inss += valor_var
            if ev.incide_irrf:
                base_irrf += valor_var
            if ev.incide_fgts:
                base_fgts += valor_var
        else:
            # desconto variável reduz as bases
            if ev.incide_inss:
                base_inss -= valor_var
            if ev.incide_irrf:
                base_irrf -= valor_var
            if ev.incide_fgts:
                base_fgts -= valor_var

    base_inss = max(_ZERO, base_inss)
    base_irrf = max(_ZERO, base_irrf)
    base_fgts = max(_ZERO, base_fgts)

    # 3. INSS
    inss = _ZERO
    if tabela_inss:
        faixas = tabela_inss.faixas if isinstance(tabela_inss.faixas, list) else []
        inss_calc = _calcular_inss_progressivo(base_inss, faixas)
        teto = tabela_inss.teto_contribuicao or _ZERO
        inss = min(inss_calc, teto)
        itens.append(ItemFolha(
            funcionario_id=func_obj.id,
            tipo_linha="inss",
            descricao="INSS",
            tipo="desconto",
            referencia=base_inss,
            valor=inss,
            ordem=ordem,
        ))
        ordem += 1

    # 4. Dedução IRRF por dependentes
    qtd_dependentes = sum(1 for d in func_obj.dependentes if d.deduz_irrf)
    deducao_dependentes = _ZERO
    if tabela_irrf and qtd_dependentes:
        deducao_dependentes = (tabela_irrf.valor_dependente or _ZERO) * qtd_dependentes

    base_irrf_liq = max(_ZERO, base_irrf - inss - deducao_dependentes)

    # 5. IRRF
    irrf = _ZERO
    if tabela_irrf:
        faixas_irrf = tabela_irrf.faixas if isinstance(tabela_irrf.faixas, list) else []
        irrf = _calcular_irrf(base_irrf_liq, faixas_irrf)
        if irrf > _ZERO:
            itens.append(ItemFolha(
                funcionario_id=func_obj.id,
                tipo_linha="irrf",
                descricao="IRRF",
                tipo="desconto",
                referencia=base_irrf_liq,
                valor=irrf,
                ordem=ordem,
            ))
            ordem += 1

    # 6. FGTS (informativo — não desconta do líquido do empregado)
    fgts = (base_fgts * FGTS_ALIQUOTA).quantize(Decimal("0.01"), ROUND_HALF_UP)
    itens.append(ItemFolha(
        funcionario_id=func_obj.id,
        tipo_linha="fgts",
        descricao="FGTS (8%)",
        tipo="informativo",
        referencia=base_fgts,
        valor=fgts,
        ordem=ordem,
    ))

    return itens


async def _get_tabela_inss(comp_date: date, db: AsyncSession) -> TabelaINSS | None:
    result = await db.execute(
        select(TabelaINSS).where(
            TabelaINSS.competencia_inicio <= comp_date,
        ).order_by(TabelaINSS.competencia_inicio.desc())
    )
    tabelas = list(result.scalars().all())
    for t in tabelas:
        if t.competencia_fim is None or t.competencia_fim >= comp_date:
            return t
    return None


async def _get_tabela_irrf(comp_date: date, db: AsyncSession) -> TabelaIRRF | None:
    result = await db.execute(
        select(TabelaIRRF).where(
            TabelaIRRF.competencia_inicio <= comp_date,
        ).order_by(TabelaIRRF.competencia_inicio.desc())
    )
    tabelas = list(result.scalars().all())
    for t in tabelas:
        if t.competencia_fim is None or t.competencia_fim >= comp_date:
            return t
    return None


async def fechar_folha(folha_id: int, company_id: int, db: AsyncSession) -> FolhaPagamento:
    folha = await get_folha(folha_id, company_id, db)
    if folha.status != "calculada":
        raise ValueError("Somente folhas calculadas podem ser fechadas")
    folha.status = "fechada"
    folha.data_fechamento = datetime.now()
    await db.commit()
    await db.refresh(folha)
    return folha


async def reabrir_folha(folha_id: int, company_id: int, db: AsyncSession) -> FolhaPagamento:
    folha = await get_folha(folha_id, company_id, db)
    if folha.status != "fechada":
        raise ValueError("Somente folhas fechadas podem ser reabertas")
    folha.status = "calculada"
    folha.data_fechamento = None
    await db.commit()
    await db.refresh(folha)
    return folha


async def get_itens_folha(
    folha_id: int, company_id: int, db: AsyncSession
) -> list[ItemFolha]:
    # Verifica que a folha pertence à empresa
    await get_folha(folha_id, company_id, db)
    result = await db.execute(
        select(ItemFolha)
        .options(selectinload(ItemFolha.funcionario))
        .where(ItemFolha.folha_id == folha_id)
        .order_by(ItemFolha.funcionario_id, ItemFolha.ordem)
    )
    return list(result.scalars().all())
