from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ContaBancariaCreate(BaseModel):
    banco: str
    agencia: str
    conta: str
    digito: str | None = None
    tipo_conta: str
    descricao: str
    saldo_inicial: Decimal = Decimal("0")
    data_saldo_inicial: date
    conta_contabil_id: int | None = None

class ContaBancariaUpdate(BaseModel):
    banco: str | None = None
    agencia: str | None = None
    conta: str | None = None
    digito: str | None = None
    tipo_conta: str | None = None
    descricao: str | None = None
    conta_contabil_id: int | None = None

class ContaBancariaResponse(BaseModel):
    id: int
    company_id: int
    banco: str
    agencia: str
    conta: str
    digito: str | None
    tipo_conta: str
    descricao: str
    saldo_inicial: Decimal
    data_saldo_inicial: date
    conta_contabil_id: int | None
    ativo: bool

    model_config = {"from_attributes": True}


class HistoricoBancarioCreate(BaseModel):
    conta_bancaria_id: int
    texto_historico: str
    conta_debito_id: int | None = None
    conta_credito_id: int | None = None
    historico_padrao_id: int | None = None

class HistoricoBancarioUpdate(BaseModel):
    texto_historico: str | None = None
    conta_debito_id: int | None = None
    conta_credito_id: int | None = None
    historico_padrao_id: int | None = None

class HistoricoBancarioResponse(BaseModel):
    id: int
    company_id: int
    conta_bancaria_id: int
    texto_historico: str
    conta_debito_id: int | None
    conta_credito_id: int | None
    historico_padrao_id: int | None
    ativo: bool

    model_config = {"from_attributes": True}
