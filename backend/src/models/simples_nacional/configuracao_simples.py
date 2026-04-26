from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class ConfiguracaoSimples(Base):
    __tablename__ = "configuracoes_simples"
    __table_args__ = (
        UniqueConstraint("company_id"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)

    anexo_principal: Mapped[str] = mapped_column(String(5), nullable=False)   # I / II / III / IV / V
    usa_fator_r: Mapped[bool] = mapped_column(Boolean, default=False)          # True para atividades III x V
    data_inicio_simples: Mapped[date] = mapped_column(Date, nullable=False)
    limite_anual: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("4800000.00"))

    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
