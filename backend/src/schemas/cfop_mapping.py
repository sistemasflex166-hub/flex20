from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CfopMappingBase(BaseModel):
    cfop_origin: str
    cfop_destination: str
    company_id: Optional[int] = None
    description: Optional[str] = None


class CfopMappingCreate(CfopMappingBase):
    pass


class CfopMappingUpdate(BaseModel):
    cfop_destination: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CfopMappingResponse(CfopMappingBase):
    id: int
    tenant_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
