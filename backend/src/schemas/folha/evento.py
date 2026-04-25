from pydantic import BaseModel


class EventoCreate(BaseModel):
    descricao: str
    tipo: str                           # provento / desconto
    natureza: str                       # fixo / variavel / percentual
    incide_inss: bool = False
    incide_irrf: bool = False
    incide_fgts: bool = False
    incide_ferias: bool = False
    incide_decimo_terceiro: bool = False
    incide_aviso_previo: bool = False
    conta_debito_id: int | None = None
    conta_credito_id: int | None = None
    historico_padrao_id: int | None = None
    gera_lancamento_contabil: bool = True


class EventoUpdate(EventoCreate):
    descricao: str | None = None
    tipo: str | None = None
    natureza: str | None = None


class EventoResponse(BaseModel):
    id: int
    company_id: int
    codigo: int
    descricao: str
    tipo: str
    natureza: str
    incide_inss: bool
    incide_irrf: bool
    incide_fgts: bool
    incide_ferias: bool
    incide_decimo_terceiro: bool
    incide_aviso_previo: bool
    conta_debito_id: int | None
    conta_credito_id: int | None
    historico_padrao_id: int | None
    gera_lancamento_contabil: bool
    ativo: bool

    model_config = {"from_attributes": True}
