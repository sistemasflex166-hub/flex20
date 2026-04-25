from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class CentroCustoCreate(BaseModel):
    descricao: str

class CentroCustoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    descricao: str
    ativo: bool

    model_config = {"from_attributes": True}


class HistoricoPadraoCreate(BaseModel):
    descricao: str

class HistoricoPadraoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    descricao: str
    ativo: bool

    model_config = {"from_attributes": True}


class LancamentoCreate(BaseModel):
    data: date
    conta_debito_id: int | None = None
    conta_credito_id: int | None = None
    historico_padrao_id: int | None = None
    historico_complemento: str | None = None
    valor: Decimal
    centro_custo_id: int | None = None

class LancamentoUpdate(BaseModel):
    data: date | None = None
    conta_debito_id: int | None = None
    conta_credito_id: int | None = None
    historico_padrao_id: int | None = None
    historico_complemento: str | None = None
    valor: Decimal | None = None
    centro_custo_id: int | None = None

class ContaResumo(BaseModel):
    id: int
    classificacao: str
    descricao: str
    codigo_reduzido: str | None

    model_config = {"from_attributes": True}

class LancamentoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    data: date
    conta_debito_id: int | None
    conta_credito_id: int | None
    historico_padrao_id: int | None
    historico_complemento: str | None
    valor: Decimal
    centro_custo_id: int | None
    origem: str
    conciliado: bool
    excluido: bool
    conta_debito: ContaResumo | None = None
    conta_credito: ContaResumo | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TotalizadorDia(BaseModel):
    data: date
    total_debito: Decimal
    total_credito: Decimal
    diferenca: Decimal
