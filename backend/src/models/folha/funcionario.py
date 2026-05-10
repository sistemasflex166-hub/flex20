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
    nome_social: Mapped[str | None] = mapped_column(String(150), nullable=True)
    cpf: Mapped[str] = mapped_column(String(14), nullable=False)
    pis_pasep: Mapped[str | None] = mapped_column(String(14), nullable=True)
    data_nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    sexo: Mapped[str | None] = mapped_column(String(1), nullable=True)           # M / F
    estado_civil: Mapped[str | None] = mapped_column(String(2), nullable=True)
    # 1=Solteiro 2=Casado 3=Divorciado 4=Separado 5=Viúvo 6=União estável 9=Outros
    grau_instrucao: Mapped[str | None] = mapped_column(String(10), nullable=True)  # tabela E-Social
    raca_cor: Mapped[str | None] = mapped_column(String(1), nullable=True)
    # 1=Branca 2=Preta 3=Parda 4=Amarela 5=Indígena 6=Não informado
    nome_mae: Mapped[str | None] = mapped_column(String(150), nullable=True)
    nome_pai: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Naturalidade (E-Social S-2200 infoPessoa/nascimento)
    pais_nascimento: Mapped[str] = mapped_column(String(4), nullable=False, server_default="105")
    # código tabela países E-Social — 105 = Brasil
    pais_nacionalidade: Mapped[str] = mapped_column(String(4), nullable=False, server_default="105")
    municipio_nascimento_ibge: Mapped[str | None] = mapped_column(String(7), nullable=True)
    # obrigatório quando pais_nascimento = "105" (Brasil)

    # Documentos
    rg: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rg_orgao_emissor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rg_uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    rg_data_emissao: Mapped[date | None] = mapped_column(Date, nullable=True)
    ctps_numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ctps_serie: Mapped[str | None] = mapped_column(String(10), nullable=True)
    ctps_uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    ctps_data_emissao: Mapped[date | None] = mapped_column(Date, nullable=True)
    titulo_eleitor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cnh: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cnh_categoria: Mapped[str | None] = mapped_column(String(5), nullable=True)
    cnh_validade: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Deficiência (E-Social S-2200 / S-2206)
    possui_deficiencia: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deficiencia_fisica: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deficiencia_visual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deficiencia_auditiva: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deficiencia_mental: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deficiencia_intelectual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deficiencia_reabilitado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deficiencia_observacao: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Endereço
    logradouro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(10), nullable=True)
    complemento: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(60), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(60), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(9), nullable=True)
    codigo_municipio_ibge: Mapped[str | None] = mapped_column(String(7), nullable=True)

    # Dados contratuais
    data_admissao: Mapped[date] = mapped_column(Date, nullable=False)
    tipo_admissao: Mapped[str] = mapped_column(String(2), nullable=False, server_default="1")
    # tpAdmissao: 1=Admissão 2=Transf. mesmo grupo 3=Transf. consorciada 4=Transf. sucessão 5=Transf. emp. doméstico 6=Transf. servidor
    indicativo_admissao: Mapped[str | None] = mapped_column(String(2), nullable=True)
    # indAdmissao: 1=Demitido pelo mesmo empregador nos últimos 18 meses
    tipo_contrato: Mapped[str] = mapped_column(String(20), nullable=False, default="clt")
    # clt / estagio / aprendiz / autonomo
    tipo_regime_trabalho: Mapped[str] = mapped_column(String(2), nullable=False, server_default="1")
    # tpRegTrab: 1=CLT 2=Estatutário e outras legislações
    matricula: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Categoria e regime previdenciário (E-Social S-2200 vinculo)
    codigo_categoria: Mapped[str] = mapped_column(String(3), nullable=False, server_default="101")
    # codCateg: 101=Emp. geral 102=Emp. rural 103=Aprendiz 104=Emp. doméstico 105=Prazo det. Lei 9.601
    # 106=Intermitente 301=Servidor efetivo 401=Contrib. ind. autônomo 721=Estagiário sup. 722=Estagiário médio
    regime_previdenciario: Mapped[str] = mapped_column(String(2), default="1", nullable=False)
    # tpRegPrev: 1=RGPS 2=RPPS 3=Regime próprio militares
    natureza_atividade: Mapped[str] = mapped_column(String(2), nullable=False, server_default="1")
    # natAtividade: 1=Trabalho urbano 2=Trabalho rural

    # Jornada contratual (E-Social S-2200 horContratual)
    tipo_jornada: Mapped[str] = mapped_column(String(2), default="1", nullable=False)
    # tpJornada: 1=Horário diário e semanal fixos 2=12x36 3=Diário fixo folga variável
    # 4=Turno ininterrupto 5=Diário variável 6=Externo não controlado 7=Teletrabalho não controlado
    qtd_hrs_semanais: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    # qtdHrsSem — não informar para tpJornada 5, 6, 7
    nr_dias_remuneracao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # nrDiasRemun — 30 para mensalistas
    desc_jornada: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # horario — descrição livre do horário contratual

    # FGTS
    opcao_fgts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    data_opcao_fgts: Mapped[date | None] = mapped_column(Date, nullable=True)

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
