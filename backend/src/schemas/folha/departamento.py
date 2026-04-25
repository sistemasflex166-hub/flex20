from pydantic import BaseModel


class DepartamentoCreate(BaseModel):
    descricao: str


class DepartamentoUpdate(BaseModel):
    descricao: str | None = None


class DepartamentoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    descricao: str
    ativo: bool

    model_config = {"from_attributes": True}
