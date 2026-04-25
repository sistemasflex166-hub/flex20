from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Integer, Numeric, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class Cargo(Base):
    __tablename__ = "folha_cargos"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo: Mapped[int] = mapped_column(Integer, nullable=False)
    descricao: Mapped[str] = mapped_column(String(100), nullable=False)
    cbo: Mapped[str | None] = mapped_column(String(10), nullable=True)
    salario_normativo: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
