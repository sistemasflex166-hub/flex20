from datetime import datetime, date
from sqlalchemy import String, Boolean, DateTime, Date, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class AnexoSimples(Base):
    __tablename__ = "anexos_simples"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(5), nullable=False)       # I, II, III, IV, V
    descricao: Mapped[str] = mapped_column(String(200), nullable=False)
    inclui_cpp: Mapped[bool] = mapped_column(Boolean, default=True)      # False apenas para Anexo IV
    vigencia_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    vigencia_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    faixas: Mapped[list["FaixaSimples"]] = relationship("FaixaSimples", back_populates="anexo", lazy="selectin")
