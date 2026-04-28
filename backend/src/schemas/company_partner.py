from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class CompanyPartnerCreate(BaseModel):
    name: str
    cpf: Optional[str] = None
    rg: Optional[str] = None
    rg_issuer: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    equity_share: Optional[float] = None
    address: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    is_responsible: bool = False


class CompanyPartnerUpdate(BaseModel):
    name: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    rg_issuer: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    equity_share: Optional[float] = None
    address: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    is_responsible: Optional[bool] = None


class CompanyPartnerResponse(CompanyPartnerCreate):
    id: int
    company_id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
