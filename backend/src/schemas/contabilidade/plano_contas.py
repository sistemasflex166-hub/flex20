from pydantic import BaseModel, field_validator


class MascaraCreate(BaseModel):
    mascara: str
    separador: str = "."

class MascaraResponse(BaseModel):
    id: int
    company_id: int
    mascara: str
    separador: str
    quantidade_niveis: int

    model_config = {"from_attributes": True}


class PlanoContasCreate(BaseModel):
    classificacao: str
    descricao: str
    natureza: str
    tipo: str
    codigo_reduzido: str | None = None
    titulo_dre: str | None = None
    grupo_dre: str | None = None
    codigo_ecf: str | None = None
    parent_id: int | None = None

class PlanoContasUpdate(BaseModel):
    descricao: str | None = None
    natureza: str | None = None
    tipo: str | None = None
    codigo_reduzido: str | None = None
    titulo_dre: str | None = None
    grupo_dre: str | None = None
    codigo_ecf: str | None = None

class PlanoContasResponse(BaseModel):
    id: int
    company_id: int
    classificacao: str
    descricao: str
    nivel: int
    natureza: str
    tipo: str
    codigo_reduzido: str | None
    titulo_dre: str | None
    grupo_dre: str | None
    codigo_ecf: str | None
    ativo: bool
    parent_id: int | None

    model_config = {"from_attributes": True}
