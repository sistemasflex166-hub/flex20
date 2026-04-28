from pydantic import BaseModel
from src.models.partner import PartnerType, PersonType


class PartnerCreate(BaseModel):
    partner_type: PartnerType
    person_type: PersonType
    name: str
    trade_name: str | None = None
    cnpj_cpf: str | None = None
    state_registration: str | None = None
    municipal_registration: str | None = None
    address: str | None = None
    address_number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    phone: str | None = None
    email: str | None = None
    conta_contabil_id: int | None = None


class PartnerUpdate(BaseModel):
    partner_type: PartnerType | None = None
    person_type: PersonType | None = None
    name: str | None = None
    trade_name: str | None = None
    cnpj_cpf: str | None = None
    state_registration: str | None = None
    municipal_registration: str | None = None
    address: str | None = None
    address_number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    phone: str | None = None
    email: str | None = None
    conta_contabil_id: int | None = None


class PartnerResponse(BaseModel):
    id: int
    code: int
    company_id: int
    tenant_id: int
    partner_type: PartnerType
    person_type: PersonType
    name: str
    trade_name: str | None
    cnpj_cpf: str | None
    state_registration: str | None
    municipal_registration: str | None
    city: str | None
    state: str | None
    phone: str | None
    email: str | None
    is_active: bool
    conta_contabil_id: int | None

    model_config = {"from_attributes": True}
