from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class SindicatoCreate(BaseModel):
    nome: str
    cnpj: str | None = None
    data_base: date | None = None
    percentual_contribuicao: Decimal = Decimal("0")


class SindicatoUpdate(BaseModel):
    nome: str | None = None
    cnpj: str | None = None
    data_base: date | None = None
    percentual_contribuicao: Decimal | None = None


class SindicatoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    nome: str
    cnpj: str | None
    data_base: date | None
    percentual_contribuicao: Decimal
    ativo: bool

    model_config = {"from_attributes": True}
