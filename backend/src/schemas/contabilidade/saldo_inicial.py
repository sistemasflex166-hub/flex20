from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class SaldoInicialCreate(BaseModel):
    data: date
    conta_id: int
    natureza: str  # D ou C
    valor: Decimal
    observacao: str | None = None


class SaldoInicialUpdate(BaseModel):
    natureza: str | None = None
    valor: Decimal | None = None
    observacao: str | None = None


class SaldoInicialResponse(BaseModel):
    id: int
    company_id: int
    data: date
    conta_id: int
    natureza: str
    valor: Decimal
    observacao: str | None
    usuario_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TotalizadorSaldos(BaseModel):
    total_debito: Decimal
    total_credito: Decimal
    diferenca: Decimal
