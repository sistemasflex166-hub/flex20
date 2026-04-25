from datetime import date
from decimal import Decimal
from dataclasses import dataclass
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.contabilidade.plano_contas import PlanoContas
from src.models.contabilidade.lancamento import LancamentoContabil
from src.models.contabilidade.historico_padrao import HistoricoPadrao
from src.models.contabilidade.saldo_inicial import SaldoInicial


@dataclass
class LinhaRazao:
    lancamento_id: int | None   # None = linha de saldo anterior
    data: date
    codigo: int | None
    historico: str
    origem: str
    debito: Decimal
    credito: Decimal
    saldo: Decimal


async def gerar_razao(
    company_id: int,
    conta_id: int,
    data_ini: date,
    data_fim: date,
    db: AsyncSession,
) -> tuple[PlanoContas, list[LinhaRazao]]:

    # Buscar a conta
    result = await db.execute(
        select(PlanoContas).where(PlanoContas.id == conta_id, PlanoContas.company_id == company_id)
    )
    conta = result.scalar_one()

    # Saldo anterior: saldos iniciais + lançamentos antes do período
    result = await db.execute(
        select(SaldoInicial).where(
            SaldoInicial.company_id == company_id,
            SaldoInicial.conta_id == conta_id,
            SaldoInicial.data < data_ini,
        )
    )
    saldos_ini = result.scalars().all()
    saldo_inicial = Decimal("0")
    for s in saldos_ini:
        contrib = s.valor if s.natureza == conta.natureza else -s.valor
        saldo_inicial += contrib

    # Lançamentos anteriores ao período
    result = await db.execute(
        select(LancamentoContabil).where(
            LancamentoContabil.company_id == company_id,
            LancamentoContabil.excluido == False,
            LancamentoContabil.data < data_ini,
            (LancamentoContabil.conta_debito_id == conta_id) |
            (LancamentoContabil.conta_credito_id == conta_id),
        ).order_by(LancamentoContabil.data, LancamentoContabil.codigo)
    )
    lanc_anteriores = result.scalars().all()

    saldo_anterior = saldo_inicial
    for l in lanc_anteriores:
        if conta.natureza == "D":
            if l.conta_debito_id == conta_id:
                saldo_anterior += l.valor
            else:
                saldo_anterior -= l.valor
        else:
            if l.conta_credito_id == conta_id:
                saldo_anterior += l.valor
            else:
                saldo_anterior -= l.valor

    # Lançamentos do período
    result = await db.execute(
        select(LancamentoContabil)
        .options(selectinload(LancamentoContabil.historico_padrao))
        .where(
            LancamentoContabil.company_id == company_id,
            LancamentoContabil.excluido == False,
            LancamentoContabil.data >= data_ini,
            LancamentoContabil.data <= data_fim,
            (LancamentoContabil.conta_debito_id == conta_id) |
            (LancamentoContabil.conta_credito_id == conta_id),
        ).order_by(LancamentoContabil.data, LancamentoContabil.codigo)
    )
    lancamentos = result.scalars().all()

    linhas: list[LinhaRazao] = []

    # Linha de saldo anterior
    linhas.append(LinhaRazao(
        lancamento_id=None,
        data=data_ini,
        codigo=None,
        historico="Saldo Anterior",
        origem="",
        debito=Decimal("0"),
        credito=Decimal("0"),
        saldo=saldo_anterior,
    ))

    saldo_corrente = saldo_anterior
    for l in lancamentos:
        eh_debito = l.conta_debito_id == conta_id
        deb = l.valor if eh_debito else Decimal("0")
        cred = l.valor if not eh_debito else Decimal("0")

        if conta.natureza == "D":
            saldo_corrente += deb - cred
        else:
            saldo_corrente += cred - deb

        hist_texto = ""
        if l.historico_padrao:
            hist_texto = l.historico_padrao.descricao
        if l.historico_complemento:
            hist_texto = f"{hist_texto} {l.historico_complemento}".strip() if hist_texto else l.historico_complemento

        linhas.append(LinhaRazao(
            lancamento_id=l.id,
            data=l.data,
            codigo=l.codigo,
            historico=hist_texto or "—",
            origem=l.origem,
            debito=deb,
            credito=cred,
            saldo=saldo_corrente,
        ))

    return conta, linhas
