from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ConfiguracaoSimplesRequest(BaseModel):
    anexo_principal: str
    usa_fator_r: bool = False
    data_inicio_simples: date


class ConfiguracaoSimplesResponse(BaseModel):
    id: int
    company_id: int
    anexo_principal: str
    usa_fator_r: bool
    data_inicio_simples: date
    limite_anual: Decimal
    ativo: bool

    model_config = {"from_attributes": True}


class HistoricoReceitaRequest(BaseModel):
    competencia_mes: int
    competencia_ano: int
    receita_bruta: Decimal


class HistoricoReceitaResponse(BaseModel):
    id: int
    company_id: int
    competencia_mes: int
    competencia_ano: int
    simples_codigo: str
    receita_bruta: Decimal
    origem: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class DetalheAtividade(BaseModel):
    simples_codigo: str
    receita_bruta: Decimal
    origem: str


class ReceitaMesResponse(BaseModel):
    competencia_mes: int
    competencia_ano: int
    receita_total: Decimal
    detalhamento: list[DetalheAtividade]
    tem_automatico: bool


class PreviewRequest(BaseModel):
    competencia_mes: int
    competencia_ano: int
    receita_mes: Decimal


class DistribuicaoTributos(BaseModel):
    irpj: Decimal
    csll: Decimal
    cofins: Decimal
    pis: Decimal
    cpp: Decimal
    icms: Decimal
    iss: Decimal


class DetalheRbt12(BaseModel):
    mes: int
    ano: int
    receita: Decimal
    ausente: bool


class PreviewResponse(BaseModel):
    company_id: int
    competencia_mes: int
    competencia_ano: int
    rbt12: Decimal
    detalhamento_rbt12: list[DetalheRbt12]
    meses_ausentes: int
    receita_mes: Decimal
    anexo_aplicado: str
    faixa_aplicada: int
    fator_r: Decimal | None
    aliquota_nominal: Decimal
    valor_deduzir: Decimal
    aliquota_efetiva: Decimal
    valor_das: Decimal
    distribuicao: DistribuicaoTributos
    data_vencimento: date
    inclui_cpp: bool


class ApuracaoRequest(BaseModel):
    competencia_mes: int
    competencia_ano: int
    receita_mes: Decimal


class ApuracaoResponse(BaseModel):
    id: int
    company_id: int
    competencia_mes: int
    competencia_ano: int
    rbt12: Decimal
    receita_mes: Decimal
    anexo_aplicado: str
    faixa_aplicada: int
    fator_r: Decimal | None
    aliquota_nominal: Decimal
    valor_deduzir: Decimal
    aliquota_efetiva: Decimal
    valor_das: Decimal
    valor_irpj: Decimal
    valor_csll: Decimal
    valor_cofins: Decimal
    valor_pis: Decimal
    valor_cpp: Decimal
    valor_icms: Decimal
    valor_iss: Decimal
    status: str
    data_vencimento: date
    pgdas_gerado: bool
    bloqueado: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
