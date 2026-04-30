from datetime import date
from decimal import Decimal
from dataclasses import dataclass, field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.contabilidade.plano_contas import PlanoContas
from src.models.contabilidade.lancamento import LancamentoContabil
from src.models.contabilidade.saldo_inicial import SaldoInicial


@dataclass
class LinhaBalancete:
    conta_id: int
    classificacao: str
    descricao: str
    nivel: int
    tipo: str          # sintetica / analitica
    natureza: str      # D / C
    saldo_anterior: Decimal = Decimal("0")
    debitos: Decimal = Decimal("0")
    creditos: Decimal = Decimal("0")
    saldo_atual: Decimal = Decimal("0")


def _saldo_final(natureza: str, saldo_anterior: Decimal, debitos: Decimal, creditos: Decimal) -> Decimal:
    if natureza == "D":
        return saldo_anterior + debitos - creditos
    else:
        return saldo_anterior + creditos - debitos


async def gerar_balancete(
    company_id: int,
    data_ini: date,
    data_fim: date,
    db: AsyncSession,
    nivel_maximo: int | None = None,
    apenas_com_movimento: bool = False,
) -> list[LinhaBalancete]:

    # 1. Buscar todas as contas ativas
    result = await db.execute(
        select(PlanoContas)
        .where(PlanoContas.company_id == company_id, PlanoContas.ativo == True)
        .order_by(PlanoContas.classificacao)
    )
    contas = list(result.scalars().all())
    contas_map = {c.id: c for c in contas}

    # 2. Saldos iniciais por conta (todos anteriores ao fim do período)
    result = await db.execute(
        select(SaldoInicial).where(
            SaldoInicial.company_id == company_id,
            SaldoInicial.data < data_ini,
        )
    )
    saldos_ini_rows = result.scalars().all()

    saldo_inicial_por_conta: dict[int, Decimal] = {}
    for s in saldos_ini_rows:
        conta = contas_map.get(s.conta_id)
        if not conta:
            continue
        contrib = s.valor if s.natureza == conta.natureza else -s.valor
        saldo_inicial_por_conta[s.conta_id] = saldo_inicial_por_conta.get(s.conta_id, Decimal("0")) + contrib

    # 3. Lançamentos anteriores ao período (para saldo anterior)
    result = await db.execute(
        select(LancamentoContabil).where(
            LancamentoContabil.company_id == company_id,
            LancamentoContabil.excluido == False,
            LancamentoContabil.data < data_ini,
        )
    )
    lanc_anteriores = result.scalars().all()

    mov_anterior_deb: dict[int, Decimal] = {}
    mov_anterior_cred: dict[int, Decimal] = {}
    for l in lanc_anteriores:
        if l.conta_debito_id:
            mov_anterior_deb[l.conta_debito_id] = mov_anterior_deb.get(l.conta_debito_id, Decimal("0")) + l.valor
        if l.conta_credito_id:
            mov_anterior_cred[l.conta_credito_id] = mov_anterior_cred.get(l.conta_credito_id, Decimal("0")) + l.valor

    # 4. Lançamentos do período
    result = await db.execute(
        select(LancamentoContabil).where(
            LancamentoContabil.company_id == company_id,
            LancamentoContabil.excluido == False,
            LancamentoContabil.data >= data_ini,
            LancamentoContabil.data <= data_fim,
        )
    )
    lanc_periodo = result.scalars().all()

    periodo_deb: dict[int, Decimal] = {}
    periodo_cred: dict[int, Decimal] = {}
    for l in lanc_periodo:
        if l.conta_debito_id:
            periodo_deb[l.conta_debito_id] = periodo_deb.get(l.conta_debito_id, Decimal("0")) + l.valor
        if l.conta_credito_id:
            periodo_cred[l.conta_credito_id] = periodo_cred.get(l.conta_credito_id, Decimal("0")) + l.valor

    # 5. Montar linhas para contas analíticas
    linhas: dict[int, LinhaBalancete] = {}
    for conta in contas:
        if conta.tipo != "analitica":
            continue

        # saldo anterior = saldo inicial + movimento anterior
        ant_deb = mov_anterior_deb.get(conta.id, Decimal("0"))
        ant_cred = mov_anterior_cred.get(conta.id, Decimal("0"))
        saldo_ini = saldo_inicial_por_conta.get(conta.id, Decimal("0"))
        mov_ant = ant_deb - ant_cred if conta.natureza == "D" else ant_cred - ant_deb
        saldo_anterior = saldo_ini + mov_ant

        deb = periodo_deb.get(conta.id, Decimal("0"))
        cred = periodo_cred.get(conta.id, Decimal("0"))
        saldo_atual = _saldo_final(conta.natureza, saldo_anterior, deb, cred)

        linhas[conta.id] = LinhaBalancete(
            conta_id=conta.id,
            classificacao=conta.classificacao,
            descricao=conta.descricao,
            nivel=conta.nivel,
            tipo=conta.tipo,
            natureza=conta.natureza,
            saldo_anterior=saldo_anterior,
            debitos=deb,
            creditos=cred,
            saldo_atual=saldo_atual,
        )

    # 6. Propagar totais para contas sintéticas (bottom-up pela classificação)
    sinteticas: dict[int, LinhaBalancete] = {}
    for conta in contas:
        if conta.tipo != "sintetica":
            continue
        sinteticas[conta.id] = LinhaBalancete(
            conta_id=conta.id,
            classificacao=conta.classificacao,
            descricao=conta.descricao,
            nivel=conta.nivel,
            tipo=conta.tipo,
            natureza=conta.natureza,
        )

    # mapa classificacao → id para inferir pai sem depender do parent_id do banco
    classif_para_id = {c.classificacao: c.id for c in contas}

    # detecta separador a partir das classificações existentes
    separador = "."
    for c in contas:
        if "." in c.classificacao:
            separador = "."
            break
        if "-" in c.classificacao:
            separador = "-"
            break

    def _parent_classif(classif: str) -> str | None:
        partes = classif.split(separador)
        if len(partes) <= 1:
            return None
        return separador.join(partes[:-1])

    # propaga de filhos para pais percorrendo do nível mais profundo para o mais raso
    todas = {**linhas, **sinteticas}
    contas_ord = sorted(contas, key=lambda c: c.nivel, reverse=True)
    for conta in contas_ord:
        if conta.id not in todas:
            continue
        pai_classif = _parent_classif(conta.classificacao)
        if not pai_classif:
            continue
        pai_id = classif_para_id.get(pai_classif)
        if pai_id and pai_id in todas:
            pai = todas[pai_id]
            filho = todas[conta.id]
            pai.saldo_anterior += filho.saldo_anterior
            pai.debitos += filho.debitos
            pai.creditos += filho.creditos

    # recalcular saldo_atual das sintéticas
    for linha in sinteticas.values():
        linha.saldo_atual = _saldo_final(linha.natureza, linha.saldo_anterior, linha.debitos, linha.creditos)

    todas = {**linhas, **sinteticas}

    def _sort_key(l: LinhaBalancete):
        return [int(p) for p in l.classificacao.replace("-", ".").split(".")]

    # 7. Filtrar e ordenar
    resultado = sorted(todas.values(), key=_sort_key)

    if nivel_maximo:
        resultado = [l for l in resultado if l.nivel <= nivel_maximo]

    if apenas_com_movimento:
        resultado = [
            l for l in resultado
            if l.debitos != 0 or l.creditos != 0 or l.saldo_anterior != 0
        ]

    return resultado
