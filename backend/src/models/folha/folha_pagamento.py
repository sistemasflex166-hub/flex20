from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class FolhaPagamento(Base):
    __tablename__ = "folha_pagamentos"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo: Mapped[int] = mapped_column(Integer, nullable=False)
    competencia_mes: Mapped[int] = mapped_column(Integer, nullable=False)   # 1-12
    competencia_ano: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(15), default="aberta", nullable=False)
    # aberta / calculada / fechada

    total_proventos: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_descontos: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_liquido: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_inss_empregado: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_irrf: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_fgts: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_inss_patronal: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_rat_fap: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_terceiros: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0, nullable=False)

    data_calculo: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    data_fechamento: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    lancamentos: Mapped[list["LancamentoVariavel"]] = relationship("LancamentoVariavel", back_populates="folha")
    itens: Mapped[list["ItemFolha"]] = relationship("ItemFolha", back_populates="folha", cascade="all, delete-orphan")


class ItemFolha(Base):
    """Resultado do cálculo por funcionário — uma linha por evento (salário, INSS, IRRF, FGTS, variáveis)."""
    __tablename__ = "folha_itens"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    folha_id: Mapped[int] = mapped_column(ForeignKey("public.folha_pagamentos.id"), nullable=False)
    funcionario_id: Mapped[int] = mapped_column(ForeignKey("public.folha_funcionarios.id"), nullable=False)
    evento_id: Mapped[int | None] = mapped_column(ForeignKey("public.folha_eventos.id"), nullable=True)
    # Nulo para linhas automáticas: INSS, IRRF, FGTS

    tipo_linha: Mapped[str] = mapped_column(String(20), nullable=False)
    # salario_base / variavel / inss / irrf / fgts / liquido

    descricao: Mapped[str] = mapped_column(String(150), nullable=False)
    tipo: Mapped[str] = mapped_column(String(15), nullable=False)   # provento / desconto / informativo
    referencia: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    valor: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    folha: Mapped["FolhaPagamento"] = relationship("FolhaPagamento", back_populates="itens")
    funcionario: Mapped["Funcionario"] = relationship("Funcionario")
    evento: Mapped["Evento | None"] = relationship("Evento")


class LancamentoVariavel(Base):
    __tablename__ = "folha_lancamentos_variaveis"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo: Mapped[int] = mapped_column(Integer, nullable=False)
    folha_id: Mapped[int | None] = mapped_column(ForeignKey("public.folha_pagamentos.id"), nullable=True)
    funcionario_id: Mapped[int] = mapped_column(ForeignKey("public.folha_funcionarios.id"), nullable=False)
    evento_id: Mapped[int] = mapped_column(ForeignKey("public.folha_eventos.id"), nullable=False)
    competencia_mes: Mapped[int] = mapped_column(Integer, nullable=False)
    competencia_ano: Mapped[int] = mapped_column(Integer, nullable=False)
    quantidade: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    valor: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    observacao: Mapped[str | None] = mapped_column(String(300), nullable=True)

    excluido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    data_exclusao: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    excluido_definitivamente: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    folha: Mapped["FolhaPagamento"] = relationship("FolhaPagamento", back_populates="lancamentos")
    funcionario: Mapped["Funcionario"] = relationship("Funcionario")
    evento: Mapped["Evento"] = relationship("Evento")
