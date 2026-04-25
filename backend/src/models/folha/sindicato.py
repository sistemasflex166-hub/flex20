from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Integer, Numeric, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class Sindicato(Base):
    __tablename__ = "folha_sindicatos"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo: Mapped[int] = mapped_column(Integer, nullable=False)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
    data_base: Mapped[date | None] = mapped_column(Date, nullable=True)
    percentual_contribuicao: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
