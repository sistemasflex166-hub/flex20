from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class FolhaPagamentoCreate(BaseModel):
    competencia_mes: int   # 1-12
    competencia_ano: int


class FolhaPagamentoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    competencia_mes: int
    competencia_ano: int
    status: str

    total_proventos: Decimal
    total_descontos: Decimal
    total_liquido: Decimal
    total_inss_empregado: Decimal
    total_irrf: Decimal
    total_fgts: Decimal
    total_inss_patronal: Decimal
    total_rat_fap: Decimal
    total_terceiros: Decimal

    data_calculo: datetime | None
    data_fechamento: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemFolhaFuncionarioResumo(BaseModel):
    id: int
    codigo: int
    nome: str
    model_config = {"from_attributes": True}


class ItemFolhaResponse(BaseModel):
    id: int
    folha_id: int
    funcionario_id: int
    evento_id: int | None
    tipo_linha: str
    descricao: str
    tipo: str
    referencia: Decimal | None
    valor: Decimal
    ordem: int
    funcionario: ItemFolhaFuncionarioResumo

    model_config = {"from_attributes": True}


class ResumoFuncionarioFolha(BaseModel):
    """Totalizadores por funcionário após cálculo."""
    funcionario_id: int
    funcionario_codigo: int
    funcionario_nome: str
    total_proventos: Decimal
    total_descontos: Decimal
    liquido: Decimal
    inss: Decimal
    irrf: Decimal
    fgts: Decimal
    itens: list[ItemFolhaResponse]
