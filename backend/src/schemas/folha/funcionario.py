from datetime import date
from decimal import Decimal
from pydantic import BaseModel, model_validator
from typing import Self

# ── Tabelas de domínio E-Social ─────────────────────────────────────────────
_RACA_COR = {"1", "2", "3", "4", "5", "6"}
_GRAU_INSTRUCAO = {"01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"}
_ESTADO_CIVIL = {"1", "2", "3", "4", "5", "6", "9"}
_TIPO_ADMISSAO = {"1", "2", "3", "4", "5", "6"}
_TIPO_REGIME_TRABALHO = {"1", "2"}
_REGIME_PREV = {"1", "2", "3"}
_NATUREZA_ATIVIDADE = {"1", "2"}
_TIPO_JORNADA = {"1", "2", "3", "4", "5", "6", "7"}
_JORNADA_SEM_HORAS = {"5", "6", "7"}  # tpJornada que não informam qtdHrsSem
_CODIGO_CATEGORIA = {
    "101", "102", "103", "104", "105", "106", "107", "108", "111",
    "301", "302", "303", "304", "305", "306", "307", "308",
    "401", "410", "701", "711", "712", "721", "722", "731", "734", "738", "761", "771", "781",
    "901", "902", "903", "904",
}
BRASIL = "105"


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
    # ── Identificação ────────────────────────────────────────────────────────
    nome: str
    nome_social: str | None = None
    cpf: str
    pis_pasep: str | None = None
    data_nascimento: date | None = None
    sexo: str | None = None                    # M / F
    estado_civil: str | None = None            # tabela E-Social: 1-9
    grau_instrucao: str | None = None          # tabela E-Social: 01-12
    raca_cor: str | None = None                # tabela E-Social: 1-6
    nome_mae: str | None = None
    nome_pai: str | None = None

    # ── Naturalidade ─────────────────────────────────────────────────────────
    pais_nascimento: str = BRASIL              # código tabela países E-Social
    pais_nacionalidade: str = BRASIL
    municipio_nascimento_ibge: str | None = None  # obrigatório se pais_nascimento = "105"

    # ── Documentos ───────────────────────────────────────────────────────────
    rg: str | None = None
    rg_orgao_emissor: str | None = None
    rg_uf: str | None = None
    rg_data_emissao: date | None = None
    ctps_numero: str | None = None
    ctps_serie: str | None = None
    ctps_uf: str | None = None
    ctps_data_emissao: date | None = None
    titulo_eleitor: str | None = None
    cnh: str | None = None
    cnh_categoria: str | None = None
    cnh_validade: date | None = None

    # ── Deficiência ──────────────────────────────────────────────────────────
    possui_deficiencia: bool = False
    deficiencia_fisica: bool = False
    deficiencia_visual: bool = False
    deficiencia_auditiva: bool = False
    deficiencia_mental: bool = False
    deficiencia_intelectual: bool = False
    deficiencia_reabilitado: bool = False
    deficiencia_observacao: str | None = None

    # ── Endereço ─────────────────────────────────────────────────────────────
    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None
    codigo_municipio_ibge: str | None = None   # código IBGE do município de residência

    # ── Dados contratuais ────────────────────────────────────────────────────
    data_admissao: date
    tipo_admissao: str = "1"                   # tpAdmissao: 1-6
    indicativo_admissao: str | None = None     # indAdmissao: "1" = demitido últimos 18 meses
    tipo_contrato: str = "clt"                 # clt / estagio / aprendiz / autonomo
    tipo_regime_trabalho: str = "1"            # tpRegTrab: 1=CLT 2=Estatutário
    matricula: str | None = None
    codigo_categoria: str = "101"              # codCateg — tabela E-Social
    regime_previdenciario: str = "1"           # tpRegPrev: 1=RGPS 2=RPPS 3=Militares
    natureza_atividade: str = "1"              # natAtividade: 1=Urbano 2=Rural
    opcao_fgts: bool = True
    data_opcao_fgts: date | None = None

    # ── Horário contratual ───────────────────────────────────────────────────
    tipo_jornada: str = "1"                    # tpJornada: 1-7
    qtd_hrs_semanais: Decimal | None = None    # qtdHrsSem — omitir para tpJornada 5,6,7
    nr_dias_remuneracao: int | None = None     # nrDiasRemun — 30 para mensalistas
    desc_jornada: str | None = None            # horario — descrição livre

    # ── Lotação / Remuneração ────────────────────────────────────────────────
    cargo_id: int | None = None
    departamento_id: int | None = None
    sindicato_id: int | None = None
    salario_base: Decimal

    # ── Dados bancários ──────────────────────────────────────────────────────
    banco: str | None = None
    agencia: str | None = None
    conta_bancaria: str | None = None
    tipo_conta: str | None = None

    dependentes: list[DependenteCreate] = []

    @model_validator(mode="after")
    def validar_regras_esocial(self) -> Self:
        errors: list[str] = []

        if self.raca_cor and self.raca_cor not in _RACA_COR:
            errors.append(f"raca_cor '{self.raca_cor}' inválido. Valores aceitos: {sorted(_RACA_COR)}")

        if self.grau_instrucao and self.grau_instrucao not in _GRAU_INSTRUCAO:
            errors.append(f"grau_instrucao '{self.grau_instrucao}' inválido. Valores aceitos: {sorted(_GRAU_INSTRUCAO)}")

        if self.estado_civil and self.estado_civil not in _ESTADO_CIVIL:
            errors.append(f"estado_civil '{self.estado_civil}' inválido. Valores aceitos: {sorted(_ESTADO_CIVIL)}")

        if self.tipo_admissao not in _TIPO_ADMISSAO:
            errors.append(f"tipo_admissao '{self.tipo_admissao}' inválido. Valores aceitos: {sorted(_TIPO_ADMISSAO)}")

        if self.tipo_regime_trabalho not in _TIPO_REGIME_TRABALHO:
            errors.append(f"tipo_regime_trabalho '{self.tipo_regime_trabalho}' inválido. Valores aceitos: {sorted(_TIPO_REGIME_TRABALHO)}")

        if self.regime_previdenciario not in _REGIME_PREV:
            errors.append(f"regime_previdenciario '{self.regime_previdenciario}' inválido. Valores aceitos: {sorted(_REGIME_PREV)}")

        if self.natureza_atividade not in _NATUREZA_ATIVIDADE:
            errors.append(f"natureza_atividade '{self.natureza_atividade}' inválido. Valores aceitos: {sorted(_NATUREZA_ATIVIDADE)}")

        if self.tipo_jornada not in _TIPO_JORNADA:
            errors.append(f"tipo_jornada '{self.tipo_jornada}' inválido. Valores aceitos: {sorted(_TIPO_JORNADA)}")

        if self.codigo_categoria not in _CODIGO_CATEGORIA:
            errors.append(f"codigo_categoria '{self.codigo_categoria}' inválido.")

        if self.pais_nascimento == BRASIL and not self.municipio_nascimento_ibge:
            errors.append("municipio_nascimento_ibge é obrigatório quando pais_nascimento = Brasil (105).")

        if self.tipo_jornada in _JORNADA_SEM_HORAS and self.qtd_hrs_semanais is not None:
            errors.append(f"qtd_hrs_semanais não deve ser informado para tipo_jornada '{self.tipo_jornada}'.")

        if errors:
            raise ValueError("; ".join(errors))

        return self


class FuncionarioUpdate(BaseModel):
    nome: str | None = None
    nome_social: str | None = None
    cpf: str | None = None
    pis_pasep: str | None = None
    data_nascimento: date | None = None
    sexo: str | None = None
    estado_civil: str | None = None
    grau_instrucao: str | None = None
    raca_cor: str | None = None
    nome_mae: str | None = None
    nome_pai: str | None = None

    pais_nascimento: str | None = None
    pais_nacionalidade: str | None = None
    municipio_nascimento_ibge: str | None = None

    rg: str | None = None
    rg_orgao_emissor: str | None = None
    rg_uf: str | None = None
    rg_data_emissao: date | None = None
    ctps_numero: str | None = None
    ctps_serie: str | None = None
    ctps_uf: str | None = None
    ctps_data_emissao: date | None = None
    titulo_eleitor: str | None = None
    cnh: str | None = None
    cnh_categoria: str | None = None
    cnh_validade: date | None = None

    possui_deficiencia: bool | None = None
    deficiencia_fisica: bool | None = None
    deficiencia_visual: bool | None = None
    deficiencia_auditiva: bool | None = None
    deficiencia_mental: bool | None = None
    deficiencia_intelectual: bool | None = None
    deficiencia_reabilitado: bool | None = None
    deficiencia_observacao: str | None = None

    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None
    codigo_municipio_ibge: str | None = None

    tipo_admissao: str | None = None
    indicativo_admissao: str | None = None
    tipo_contrato: str | None = None
    tipo_regime_trabalho: str | None = None
    matricula: str | None = None
    codigo_categoria: str | None = None
    regime_previdenciario: str | None = None
    natureza_atividade: str | None = None
    opcao_fgts: bool | None = None
    data_opcao_fgts: date | None = None

    tipo_jornada: str | None = None
    qtd_hrs_semanais: Decimal | None = None
    nr_dias_remuneracao: int | None = None
    desc_jornada: str | None = None

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
    nome_social: str | None
    cpf: str
    pis_pasep: str | None
    data_nascimento: date | None
    sexo: str | None
    estado_civil: str | None
    grau_instrucao: str | None
    raca_cor: str | None
    nome_mae: str | None
    nome_pai: str | None

    pais_nascimento: str
    pais_nacionalidade: str
    municipio_nascimento_ibge: str | None

    rg: str | None
    rg_orgao_emissor: str | None
    rg_uf: str | None
    rg_data_emissao: date | None
    ctps_numero: str | None
    ctps_serie: str | None
    ctps_uf: str | None
    ctps_data_emissao: date | None
    titulo_eleitor: str | None
    cnh: str | None
    cnh_categoria: str | None
    cnh_validade: date | None

    possui_deficiencia: bool
    deficiencia_fisica: bool
    deficiencia_visual: bool
    deficiencia_auditiva: bool
    deficiencia_mental: bool
    deficiencia_intelectual: bool
    deficiencia_reabilitado: bool
    deficiencia_observacao: str | None

    logradouro: str | None
    numero: str | None
    complemento: str | None
    bairro: str | None
    cidade: str | None
    uf: str | None
    cep: str | None
    codigo_municipio_ibge: str | None

    data_admissao: date
    tipo_admissao: str
    indicativo_admissao: str | None
    tipo_contrato: str
    tipo_regime_trabalho: str
    matricula: str | None
    codigo_categoria: str
    regime_previdenciario: str
    natureza_atividade: str
    opcao_fgts: bool
    data_opcao_fgts: date | None

    tipo_jornada: str
    qtd_hrs_semanais: Decimal | None
    nr_dias_remuneracao: int | None
    desc_jornada: str | None

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
