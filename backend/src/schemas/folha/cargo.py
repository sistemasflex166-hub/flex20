from decimal import Decimal
from pydantic import BaseModel


class CargoCreate(BaseModel):
    descricao: str
    cbo: str | None = None
    salario_normativo: Decimal | None = None


class CargoUpdate(BaseModel):
    descricao: str | None = None
    cbo: str | None = None
    salario_normativo: Decimal | None = None


class CargoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    descricao: str
    cbo: str | None
    salario_normativo: Decimal | None
    ativo: bool

    model_config = {"from_attributes": True}
