from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class MascaraPlanoContas(Base):
    __tablename__ = "mascara_plano_contas"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False, unique=True)
    mascara: Mapped[str] = mapped_column(String(50), nullable=False)
    separador: Mapped[str] = mapped_column(String(1), default=".", nullable=False)
    quantidade_niveis: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = ({"schema": "public"},)


class PlanoContas(Base):
    __tablename__ = "plano_contas"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)

    classificacao: Mapped[str] = mapped_column(String(50), nullable=False)
    descricao: Mapped[str] = mapped_column(String(200), nullable=False)
    nivel: Mapped[int] = mapped_column(Integer, nullable=False)

    natureza: Mapped[str] = mapped_column(String(1), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)

    codigo_reduzido: Mapped[str | None] = mapped_column(String(20), nullable=True)
    titulo_dre: Mapped[str | None] = mapped_column(String(200), nullable=True)
    grupo_dre: Mapped[str | None] = mapped_column(String(50), nullable=True)
    codigo_ecf: Mapped[str | None] = mapped_column(String(30), nullable=True)

    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("company_id", "classificacao", name="uq_plano_contas_classificacao"),
        UniqueConstraint("company_id", "codigo_reduzido", name="uq_plano_contas_cod_reduzido"),
        {"schema": "public"},
    )

    parent: Mapped["PlanoContas | None"] = relationship("PlanoContas", remote_side="PlanoContas.id", foreign_keys=[parent_id])
    children: Mapped[list["PlanoContas"]] = relationship("PlanoContas", foreign_keys=[parent_id], back_populates="parent", overlaps="parent")
