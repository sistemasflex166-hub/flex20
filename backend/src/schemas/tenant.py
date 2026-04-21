from pydantic import BaseModel


class TenantCreate(BaseModel):
    name: str
    slug: str


class TenantResponse(BaseModel):
    id: int
    name: str
    slug: str
    schema_name: str
    is_active: bool

    model_config = {"from_attributes": True}
