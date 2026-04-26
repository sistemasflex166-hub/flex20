from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class CfopSimples(Base):
    __tablename__ = "cfop_simples"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    cfop: Mapped[str] = mapped_column(String(10), nullable=False)           # ex: "5102"
    codigo_simples: Mapped[str] = mapped_column(String(20), nullable=False) # código de receita do Simples
    anexo: Mapped[str] = mapped_column(String(5), nullable=False)           # I / II / III / IV / V
    descricao: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
