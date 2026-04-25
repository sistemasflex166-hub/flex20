from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class SaldoInicial(Base):
    __tablename__ = "saldos_iniciais"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    conta_id: Mapped[int] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=False)
    natureza: Mapped[str] = mapped_column(String(1), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("public.users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = ({"schema": "public"},)
