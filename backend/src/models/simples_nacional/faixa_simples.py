from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class FaixaSimples(Base):
    __tablename__ = "faixas_simples"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    anexo_id: Mapped[int] = mapped_column(ForeignKey("public.anexos_simples.id"), nullable=False)
    numero_faixa: Mapped[int] = mapped_column(Integer, nullable=False)       # 1 a 6
    valor_minimo: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    valor_maximo: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)  # None na faixa 6
    aliquota_nominal: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)     # ex: 16.0000
    valor_deduzir: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    # Distribuição percentual por tributo (percentuais sobre a alíquota nominal)
    perc_irpj: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=0)
    perc_csll: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=0)
    perc_cofins: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=0)
    perc_pis: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=0)
    perc_cpp: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=0)     # 0 para Anexo IV
    perc_icms: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=0)    # 0 para serviços
    perc_iss: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=0)     # 0 para comércio/indústria

    vigencia_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    vigencia_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    anexo: Mapped["AnexoSimples"] = relationship("AnexoSimples", back_populates="faixas")
