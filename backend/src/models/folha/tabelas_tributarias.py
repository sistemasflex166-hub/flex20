from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Integer, Numeric, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class TabelaINSS(Base):
    """Tabela progressiva de INSS — versionada por competência."""
    __tablename__ = "folha_tabela_inss"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    competencia_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    competencia_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    # faixas: [{"limite": 1518.00, "aliquota": 7.5}, ...]  último item sem limite = teto
    faixas: Mapped[dict] = mapped_column(JSON, nullable=False)
    teto_contribuicao: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class TabelaIRRF(Base):
    """Tabela progressiva de IRRF — versionada por competência."""
    __tablename__ = "folha_tabela_irrf"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    competencia_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    competencia_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    # faixas: [{"limite": 2259.20, "aliquota": 0, "parcela_deduzir": 0}, ...]
    faixas: Mapped[dict] = mapped_column(JSON, nullable=False)
    valor_dependente: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    desconto_simplificado: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
