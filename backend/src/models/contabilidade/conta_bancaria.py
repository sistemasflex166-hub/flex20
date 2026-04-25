from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Numeric, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class ContaBancaria(Base):
    __tablename__ = "contas_bancarias"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    banco: Mapped[str] = mapped_column(String(100), nullable=False)
    agencia: Mapped[str] = mapped_column(String(20), nullable=False)
    conta: Mapped[str] = mapped_column(String(20), nullable=False)
    digito: Mapped[str | None] = mapped_column(String(5), nullable=True)
    tipo_conta: Mapped[str] = mapped_column(String(10), nullable=False)
    descricao: Mapped[str] = mapped_column(String(200), nullable=False)
    saldo_inicial: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    data_saldo_inicial: Mapped[date] = mapped_column(Date, nullable=False)
    conta_contabil_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = ({"schema": "public"},)

    conta_contabil: Mapped["PlanoContas | None"] = relationship("PlanoContas")
    historicos: Mapped[list["HistoricoBancario"]] = relationship("HistoricoBancario", back_populates="conta_bancaria")


class HistoricoBancario(Base):
    __tablename__ = "historicos_bancarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    conta_bancaria_id: Mapped[int] = mapped_column(ForeignKey("public.contas_bancarias.id"), nullable=False)
    texto_historico: Mapped[str] = mapped_column(String(200), nullable=False)
    conta_debito_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)
    conta_credito_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)
    historico_padrao_id: Mapped[int | None] = mapped_column(ForeignKey("public.historicos_padrao.id"), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = ({"schema": "public"},)

    conta_bancaria: Mapped["ContaBancaria"] = relationship("ContaBancaria", back_populates="historicos")
