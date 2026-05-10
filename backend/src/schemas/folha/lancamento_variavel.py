from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, model_validator
from typing import Self


class LancamentoVariavelCreate(BaseModel):
    folha_id: int | None = None
    funcionario_id: int
    evento_id: int
    competencia_mes: int   # 1-12
    competencia_ano: int
    quantidade: Decimal | None = None
    valor: Decimal | None = None
    observacao: str | None = None

    @model_validator(mode="after")
    def validar(self) -> Self:
        if not (1 <= self.competencia_mes <= 12):
            raise ValueError("competencia_mes deve ser entre 1 e 12")
        if self.valor is None and self.quantidade is None:
            raise ValueError("Informe pelo menos valor ou quantidade")
        return self


class LancamentoVariavelUpdate(BaseModel):
    quantidade: Decimal | None = None
    valor: Decimal | None = None
    observacao: str | None = None


class EventoResumo(BaseModel):
    id: int
    codigo: int
    descricao: str
    tipo: str
    natureza: str

    model_config = {"from_attributes": True}


class FuncionarioResumo(BaseModel):
    id: int
    codigo: int
    nome: str

    model_config = {"from_attributes": True}


class LancamentoVariavelResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    folha_id: int | None
    funcionario_id: int
    evento_id: int
    competencia_mes: int
    competencia_ano: int
    quantidade: Decimal | None
    valor: Decimal | None
    observacao: str | None
    excluido: bool
    data_exclusao: datetime | None
    created_at: datetime
    funcionario: FuncionarioResumo
    evento: EventoResumo

    model_config = {"from_attributes": True}
