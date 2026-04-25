from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class DependenteCreate(BaseModel):
    nome: str
    data_nascimento: date | None = None
    parentesco: str | None = None
    cpf: str | None = None
    deduz_irrf: bool = True


class DependenteResponse(BaseModel):
    id: int
    funcionario_id: int
    nome: str
    data_nascimento: date | None
    parentesco: str | None
    cpf: str | None
    deduz_irrf: bool

    model_config = {"from_attributes": True}


class FuncionarioCreate(BaseModel):
    nome: str
    cpf: str
    pis_pasep: str | None = None
    data_nascimento: date | None = None
    sexo: str | None = None
    estado_civil: str | None = None
    grau_instrucao: str | None = None

    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None

    data_admissao: date
    tipo_contrato: str = "clt"
    regime_trabalho: str = "clt"
    matricula: str | None = None
    cargo_id: int | None = None
    departamento_id: int | None = None
    sindicato_id: int | None = None
    salario_base: Decimal

    banco: str | None = None
    agencia: str | None = None
    conta_bancaria: str | None = None
    tipo_conta: str | None = None

    dependentes: list[DependenteCreate] = []


class FuncionarioUpdate(BaseModel):
    nome: str | None = None
    cpf: str | None = None
    pis_pasep: str | None = None
    data_nascimento: date | None = None
    sexo: str | None = None
    estado_civil: str | None = None
    grau_instrucao: str | None = None

    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None

    tipo_contrato: str | None = None
    regime_trabalho: str | None = None
    matricula: str | None = None
    cargo_id: int | None = None
    departamento_id: int | None = None
    sindicato_id: int | None = None
    salario_base: Decimal | None = None

    banco: str | None = None
    agencia: str | None = None
    conta_bancaria: str | None = None
    tipo_conta: str | None = None


class FuncionarioResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    nome: str
    cpf: str
    pis_pasep: str | None
    data_nascimento: date | None
    sexo: str | None
    estado_civil: str | None
    grau_instrucao: str | None
    logradouro: str | None
    numero: str | None
    complemento: str | None
    bairro: str | None
    cidade: str | None
    uf: str | None
    cep: str | None
    data_admissao: date
    tipo_contrato: str
    regime_trabalho: str
    matricula: str | None
    cargo_id: int | None
    departamento_id: int | None
    sindicato_id: int | None
    salario_base: Decimal
    banco: str | None
    agencia: str | None
    conta_bancaria: str | None
    tipo_conta: str | None
    ativo: bool
    data_inativacao: date | None
    motivo_inativacao: str | None
    dependentes: list[DependenteResponse] = []

    model_config = {"from_attributes": True}
