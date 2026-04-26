from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class ApuracaoSimples(Base):
    __tablename__ = "apuracoes_simples"
    __table_args__ = (
        UniqueConstraint("company_id", "competencia_ano", "competencia_mes", name="uq_apuracao_empresa_competencia"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    competencia_mes: Mapped[int] = mapped_column(Integer, nullable=False)
    competencia_ano: Mapped[int] = mapped_column(Integer, nullable=False)

    # Dados do cálculo
    rbt12: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    receita_mes: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    anexo_aplicado: Mapped[str] = mapped_column(String(5), nullable=False)
    faixa_aplicada: Mapped[int] = mapped_column(Integer, nullable=False)
    fator_r: Mapped[Decimal | None] = mapped_column(Numeric(7, 4), nullable=True)

    # Resultado
    aliquota_nominal: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)
    valor_deduzir: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    aliquota_efetiva: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)
    valor_das: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    # Distribuição por tributo (valores em R$)
    valor_irpj: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    valor_csll: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    valor_cofins: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    valor_pis: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    valor_cpp: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    valor_icms: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    valor_iss: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))

    # Status: calculado | confirmado | pgdas_gerado | pago
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="calculado")
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False)  # dia 20 do mês seguinte
    pgdas_gerado: Mapped[bool] = mapped_column(Boolean, default=False)
    data_pgdas: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Bloqueio após PGDAS gerado
    bloqueado: Mapped[bool] = mapped_column(Boolean, default=False)

    usuario_id: Mapped[int] = mapped_column(ForeignKey("public.users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
