from datetime import date
from decimal import Decimal
from pydantic import BaseModel, model_validator
from typing import Any, Self


class FaixaINSS(BaseModel):
    limite: Decimal | None = None   # None = última faixa (acima do teto)
    aliquota: Decimal               # percentual: 7.5, 9, 12, 14


class FaixaIRRF(BaseModel):
    limite: Decimal | None = None   # None = última faixa (isento acima)
    aliquota: Decimal               # percentual: 0, 7.5, 15, 22.5, 27.5
    parcela_deduzir: Decimal = Decimal("0")


class TabelaINSSCreate(BaseModel):
    competencia_inicio: date
    competencia_fim: date | None = None
    faixas: list[FaixaINSS]
    teto_contribuicao: Decimal

    @model_validator(mode="after")
    def validar(self) -> Self:
        if not self.faixas:
            raise ValueError("faixas não pode ser vazia")
        if self.competencia_fim and self.competencia_fim < self.competencia_inicio:
            raise ValueError("competencia_fim deve ser >= competencia_inicio")
        return self

    def faixas_as_json(self) -> list[dict]:
        return [f.model_dump() for f in self.faixas]


class TabelaINSSUpdate(BaseModel):
    competencia_fim: date | None = None
    faixas: list[FaixaINSS] | None = None
    teto_contribuicao: Decimal | None = None

    def faixas_as_json(self) -> list[dict] | None:
        if self.faixas is None:
            return None
        return [f.model_dump() for f in self.faixas]


class TabelaINSSResponse(BaseModel):
    id: int
    competencia_inicio: date
    competencia_fim: date | None
    faixas: list[Any]
    teto_contribuicao: Decimal

    model_config = {"from_attributes": True}


class TabelaIRRFCreate(BaseModel):
    competencia_inicio: date
    competencia_fim: date | None = None
    faixas: list[FaixaIRRF]
    valor_dependente: Decimal
    desconto_simplificado: Decimal

    @model_validator(mode="after")
    def validar(self) -> Self:
        if not self.faixas:
            raise ValueError("faixas não pode ser vazia")
        if self.competencia_fim and self.competencia_fim < self.competencia_inicio:
            raise ValueError("competencia_fim deve ser >= competencia_inicio")
        return self

    def faixas_as_json(self) -> list[dict]:
        return [f.model_dump() for f in self.faixas]


class TabelaIRRFUpdate(BaseModel):
    competencia_fim: date | None = None
    faixas: list[FaixaIRRF] | None = None
    valor_dependente: Decimal | None = None
    desconto_simplificado: Decimal | None = None

    def faixas_as_json(self) -> list[dict] | None:
        if self.faixas is None:
            return None
        return [f.model_dump() for f in self.faixas]


class TabelaIRRFResponse(BaseModel):
    id: int
    competencia_inicio: date
    competencia_fim: date | None
    faixas: list[Any]
    valor_dependente: Decimal
    desconto_simplificado: Decimal

    model_config = {"from_attributes": True}
