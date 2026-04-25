from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class Funcionario(Base):
    __tablename__ = "folha_funcionarios"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo: Mapped[int] = mapped_column(Integer, nullable=False)

    # Identificação
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    cpf: Mapped[str] = mapped_column(String(14), nullable=False)
    pis_pasep: Mapped[str | None] = mapped_column(String(14), nullable=True)
    data_nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    sexo: Mapped[str | None] = mapped_column(String(1), nullable=True)          # M / F
    estado_civil: Mapped[str | None] = mapped_column(String(20), nullable=True)
    grau_instrucao: Mapped[str | None] = mapped_column(String(10), nullable=True)  # tabela E-Social

    # Endereço
    logradouro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(10), nullable=True)
    complemento: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(60), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(60), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(9), nullable=True)

    # Dados contratuais
    data_admissao: Mapped[date] = mapped_column(Date, nullable=False)
    tipo_contrato: Mapped[str] = mapped_column(String(20), nullable=False, default="clt")
    # clt / estagio / aprendiz / autonomo
    regime_trabalho: Mapped[str] = mapped_column(String(20), nullable=False, default="clt")
    # clt / pro_labore
    matricula: Mapped[str | None] = mapped_column(String(20), nullable=True)

    cargo_id: Mapped[int | None] = mapped_column(ForeignKey("public.folha_cargos.id"), nullable=True)
    departamento_id: Mapped[int | None] = mapped_column(ForeignKey("public.folha_departamentos.id"), nullable=True)
    sindicato_id: Mapped[int | None] = mapped_column(ForeignKey("public.folha_sindicatos.id"), nullable=True)
    salario_base: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    # Dados bancários
    banco: Mapped[str | None] = mapped_column(String(10), nullable=True)
    agencia: Mapped[str | None] = mapped_column(String(10), nullable=True)
    conta_bancaria: Mapped[str | None] = mapped_column(String(20), nullable=True)
    tipo_conta: Mapped[str | None] = mapped_column(String(10), nullable=True)  # corrente / poupanca

    # Controle
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    data_inativacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    motivo_inativacao: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    dependentes: Mapped[list["DependenteFuncionario"]] = relationship(
        "DependenteFuncionario",
        primaryjoin="DependenteFuncionario.funcionario_id == Funcionario.id",
        back_populates="funcionario",
        cascade="all, delete-orphan",
    )


class DependenteFuncionario(Base):
    __tablename__ = "folha_dependentes"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    funcionario_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.folha_funcionarios.id"), nullable=False)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    data_nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    parentesco: Mapped[str | None] = mapped_column(String(30), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    deduz_irrf: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    funcionario: Mapped["Funcionario"] = relationship("Funcionario", back_populates="dependentes")
