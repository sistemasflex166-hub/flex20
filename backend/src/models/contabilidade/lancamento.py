from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Integer, Numeric, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class LancamentoContabil(Base):
    __tablename__ = "lancamentos_contabeis"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    codigo: Mapped[int] = mapped_column(Integer, nullable=False)

    data: Mapped[date] = mapped_column(Date, nullable=False)
    conta_debito_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)
    conta_credito_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)
    historico_padrao_id: Mapped[int | None] = mapped_column(ForeignKey("public.historicos_padrao.id"), nullable=True)
    historico_complemento: Mapped[str | None] = mapped_column(String(500), nullable=True)
    valor: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    centro_custo_id: Mapped[int | None] = mapped_column(ForeignKey("public.centros_custo.id"), nullable=True)

    origem: Mapped[str] = mapped_column(String(10), default="manual", nullable=False)
    origem_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    origem_tipo: Mapped[str | None] = mapped_column(String(20), nullable=True)

    conciliado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    data_conciliacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    conta_bancaria_id: Mapped[int | None] = mapped_column(ForeignKey("public.contas_bancarias.id"), nullable=True)

    excluido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    data_exclusao: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    usuario_exclusao_id: Mapped[int | None] = mapped_column(ForeignKey("public.users.id"), nullable=True)
    excluido_definitivamente: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    usuario_criacao_id: Mapped[int] = mapped_column(ForeignKey("public.users.id"), nullable=False)
    usuario_edicao_id: Mapped[int | None] = mapped_column(ForeignKey("public.users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("company_id", "codigo", name="uq_lancamento_contabil_codigo"),
        {"schema": "public"},
    )

    conta_debito: Mapped["PlanoContas | None"] = relationship("PlanoContas", foreign_keys=[conta_debito_id])
    conta_credito: Mapped["PlanoContas | None"] = relationship("PlanoContas", foreign_keys=[conta_credito_id])
    historico_padrao: Mapped["HistoricoPadrao | None"] = relationship("HistoricoPadrao")
    centro_custo: Mapped["CentroCusto | None"] = relationship("CentroCusto")
