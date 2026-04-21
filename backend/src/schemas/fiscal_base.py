from pydantic import BaseModel
from src.models.fiscal_base import ProductUnit


class ProductCreate(BaseModel):
    code: str
    name: str
    ncm: str | None = None
    unit: ProductUnit = ProductUnit.UN
    price: float | None = None


class ProductUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    ncm: str | None = None
    unit: ProductUnit | None = None
    price: float | None = None


class ProductResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    ncm: str | None
    unit: ProductUnit
    price: float | None
    is_active: bool

    model_config = {"from_attributes": True}


class ServiceItemCreate(BaseModel):
    code: str
    name: str
    service_code: str | None = None
    cnae: str | None = None
    iss_rate: float | None = None


class ServiceItemUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    service_code: str | None = None
    cnae: str | None = None
    iss_rate: float | None = None


class ServiceItemResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    service_code: str | None
    cnae: str | None
    iss_rate: float | None
    is_active: bool

    model_config = {"from_attributes": True}


class CFOPCreate(BaseModel):
    code: str
    description: str
    is_input: bool


class CFOPUpdate(BaseModel):
    code: str | None = None
    description: str | None = None
    is_input: bool | None = None


class CFOPResponse(BaseModel):
    id: int
    code: str
    description: str
    is_input: bool
    is_active: bool

    model_config = {"from_attributes": True}


class OperationNatureCreate(BaseModel):
    code: str
    name: str
    cfop_id: int | None = None


class OperationNatureUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    cfop_id: int | None = None


class OperationNatureResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    cfop_id: int | None
    is_active: bool

    model_config = {"from_attributes": True}
