from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class HistoricoReceita(Base):
    __tablename__ = "historico_receita_simples"
    __table_args__ = (
        # simples_codigo diferencia atividades: "geral" (manual), "I", "II", "III", "IV", "V"
        UniqueConstraint("company_id", "competencia_ano", "competencia_mes", "simples_codigo", name="uq_receita_empresa_competencia_codigo"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    competencia_mes: Mapped[int] = mapped_column(Integer, nullable=False)   # 1-12
    competencia_ano: Mapped[int] = mapped_column(Integer, nullable=False)
    receita_bruta: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))

    # "geral" para lançamentos manuais; "I","II","III","IV","V" para automático por anexo
    simples_codigo: Mapped[str] = mapped_column(String(10), nullable=False, default="geral")

    # automatico | manual | importado
    origem: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
