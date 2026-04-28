from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class FiscalEntryItemCreate(BaseModel):
    description: str
    ncm: Optional[str] = None
    cfop_id: Optional[int] = None
    product_id: Optional[int] = None
    service_item_id: Optional[int] = None
    quantity: float = 1
    unit: str = "UN"
    unit_price: float = 0
    discount: float = 0
    total: float = 0
    icms_cst: Optional[str] = None
    icms_base: float = 0
    icms_rate: float = 0
    icms_value: float = 0
    pis_cst: Optional[str] = None
    pis_rate: float = 0
    pis_value: float = 0
    cofins_cst: Optional[str] = None
    cofins_rate: float = 0
    cofins_value: float = 0


class FiscalEntryItemResponse(FiscalEntryItemCreate):
    id: int
    entry_id: int
    company_id: int
    tenant_id: int
    cfop_code: Optional[str] = None

    model_config = {"from_attributes": True}


class FiscalEntryCreate(BaseModel):
    company_id: int
    entry_type: str  # purchase | sale | service_provided | service_taken | transport | other
    entry_date: date
    competence_date: date
    document_number: Optional[str] = None
    document_series: Optional[str] = None
    document_model: Optional[str] = None
    partner_id: Optional[int] = None
    partner_name: Optional[str] = None
    partner_cnpj_cpf: Optional[str] = None
    cfop_id: Optional[int] = None
    operation_nature_id: Optional[int] = None
    total_products: float = 0
    total_services: float = 0
    total_discount: float = 0
    total_other: float = 0
    total_gross: float = 0
    icms_base: float = 0
    icms_value: float = 0
    pis_value: float = 0
    cofins_value: float = 0
    iss_value: float = 0
    ibs_value: float = 0
    cbs_value: float = 0
    access_key: Optional[str] = None
    notes: Optional[str] = None
    items: list[FiscalEntryItemCreate] = []


class FiscalEntryUpdate(BaseModel):
    entry_date: Optional[date] = None
    competence_date: Optional[date] = None
    document_number: Optional[str] = None
    document_series: Optional[str] = None
    document_model: Optional[str] = None
    partner_id: Optional[int] = None
    partner_name: Optional[str] = None
    partner_cnpj_cpf: Optional[str] = None
    cfop_id: Optional[int] = None
    operation_nature_id: Optional[int] = None
    total_products: Optional[float] = None
    total_services: Optional[float] = None
    total_discount: Optional[float] = None
    total_other: Optional[float] = None
    total_gross: Optional[float] = None
    icms_base: Optional[float] = None
    icms_value: Optional[float] = None
    pis_value: Optional[float] = None
    cofins_value: Optional[float] = None
    iss_value: Optional[float] = None
    ibs_value: Optional[float] = None
    cbs_value: Optional[float] = None
    access_key: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[list[FiscalEntryItemCreate]] = None


class FiscalEntryResponse(BaseModel):
    id: int
    code: int
    company_id: int
    tenant_id: int
    entry_type: str
    entry_date: date
    competence_date: date
    document_number: Optional[str]
    document_series: Optional[str]
    document_model: Optional[str]
    partner_id: Optional[int]
    partner_name: Optional[str]
    partner_cnpj_cpf: Optional[str]
    cfop_id: Optional[int]
    operation_nature_id: Optional[int]
    total_products: float
    total_services: float
    total_discount: float
    total_other: float
    total_gross: float
    icms_base: float
    icms_value: float
    pis_value: float
    cofins_value: float
    iss_value: float
    ibs_value: float
    cbs_value: float
    access_key: Optional[str]
    notes: Optional[str]
    is_active: bool
    deleted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    items: list[FiscalEntryItemResponse] = []
    status_contabil: str
    lancamento_contabil_id: Optional[int]
    erro_contabil: Optional[str]

    model_config = {"from_attributes": True}


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class ClearTrashRequest(BaseModel):
    company_id: int


class BulkDeleteResponse(BaseModel):
    deleted: int
