from pydantic import BaseModel


class ProductCreate(BaseModel):
    code: str
    name: str
    ncm: str | None = None
    unit: str = "UN"
    price: float | None = None


class ProductUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    ncm: str | None = None
    unit: str | None = None
    price: float | None = None


class ProductResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    ncm: str | None
    unit: str
    price: float | None
    is_active: bool

    model_config = {"from_attributes": True}


class ServiceItemCreate(BaseModel):
    code: str
    name: str
    service_code: str | None = None
    cnae: str | None = None
    iss_rate: float | None = None
    simples_anexo: str | None = None
    pis_rate: float | None = None
    cofins_rate: float | None = None
    account_code: str | None = None


class ServiceItemUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    service_code: str | None = None
    cnae: str | None = None
    iss_rate: float | None = None
    simples_anexo: str | None = None
    pis_rate: float | None = None
    cofins_rate: float | None = None
    account_code: str | None = None


class ServiceItemResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    service_code: str | None
    cnae: str | None
    iss_rate: float | None
    simples_anexo: str | None
    pis_rate: float | None
    cofins_rate: float | None
    account_code: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class CFOPCreate(BaseModel):
    code: str
    description: str
    is_input: bool
    conta_contabil_id: int | None = None
    historico_padrao_id: int | None = None


class CFOPUpdate(BaseModel):
    code: str | None = None
    description: str | None = None
    is_input: bool | None = None
    conta_contabil_id: int | None = None
    historico_padrao_id: int | None = None


class CFOPResponse(BaseModel):
    id: int
    code: str
    description: str
    is_input: bool
    is_active: bool
    conta_contabil_id: int | None
    historico_padrao_id: int | None

    model_config = {"from_attributes": True}


class OperationNatureCreate(BaseModel):
    code: str
    name: str
    cfop_id: int | None = None
    simples_anexo: str | None = None
    pis_rate: float | None = None
    cofins_rate: float | None = None
    account_code: str | None = None
    is_billing: bool = False
    conta_debito_id: int | None = None
    conta_credito_id: int | None = None
    historico_padrao_id: int | None = None


class OperationNatureUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    cfop_id: int | None = None
    simples_anexo: str | None = None
    pis_rate: float | None = None
    cofins_rate: float | None = None
    account_code: str | None = None
    is_billing: bool | None = None
    conta_debito_id: int | None = None
    conta_credito_id: int | None = None
    historico_padrao_id: int | None = None


class OperationNatureResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    cfop_id: int | None
    simples_anexo: str | None
    pis_rate: float | None
    cofins_rate: float | None
    account_code: str | None
    is_billing: bool
    is_active: bool
    conta_debito_id: int | None
    conta_credito_id: int | None
    historico_padrao_id: int | None

    model_config = {"from_attributes": True}
