from datetime import date
from pydantic import BaseModel
from src.models.company import CompanyRegime, CompanyType


class CompanyCreate(BaseModel):
    name: str
    trade_name: str | None = None
    cnpj: str | None = None
    cpf: str | None = None
    state_registration: str | None = None
    municipal_registration: str | None = None
    company_type: CompanyType
    regime: CompanyRegime
    address: str | None = None
    address_number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    phone: str | None = None
    email: str | None = None
    cnae: str | None = None
    opening_date: date | None = None
    accountant_id: int | None = None
    integracao_contabil_modo: str = "conta_unica"


class CompanyUpdate(BaseModel):
    name: str | None = None
    trade_name: str | None = None
    cnpj: str | None = None
    cpf: str | None = None
    state_registration: str | None = None
    municipal_registration: str | None = None
    company_type: CompanyType | None = None
    regime: CompanyRegime | None = None
    address: str | None = None
    address_number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    phone: str | None = None
    email: str | None = None
    cnae: str | None = None
    opening_date: date | None = None
    accountant_id: int | None = None
    integracao_contabil_modo: str | None = None


class CompanyResponse(BaseModel):
    id: int
    code: int
    tenant_id: int
    name: str
    trade_name: str | None
    cnpj: str | None
    cpf: str | None
    state_registration: str | None
    municipal_registration: str | None
    company_type: CompanyType
    regime: CompanyRegime
    address: str | None
    address_number: str | None
    complement: str | None
    neighborhood: str | None
    city: str | None
    state: str | None
    zip_code: str | None
    phone: str | None
    email: str | None
    cnae: str | None
    opening_date: date | None
    accountant_id: int | None
    is_active: bool
    integracao_contabil_modo: str

    model_config = {"from_attributes": True}
