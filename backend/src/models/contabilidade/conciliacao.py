from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class ConciliacaoBancaria(Base):
    __tablename__ = "conciliacoes_bancarias"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    conta_bancaria_id: Mapped[int] = mapped_column(ForeignKey("public.contas_bancarias.id"), nullable=False)
    data_importacao: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    arquivo_nome: Mapped[str] = mapped_column(String(200), nullable=False)

    data_movimento: Mapped[date] = mapped_column(Date, nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    descricao_ofx: Mapped[str] = mapped_column(String(500), nullable=False)
    id_transacao_ofx: Mapped[str] = mapped_column(String(100), nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="pendente", nullable=False)
    lancamento_id: Mapped[int | None] = mapped_column(ForeignKey("public.lancamentos_contabeis.id"), nullable=True)
    data_conciliacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    usuario_conciliacao_id: Mapped[int | None] = mapped_column(ForeignKey("public.users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = ({"schema": "public"},)

    conta_bancaria: Mapped["ContaBancaria"] = relationship("ContaBancaria")
    lancamento: Mapped["LancamentoContabil | None"] = relationship("LancamentoContabil")
