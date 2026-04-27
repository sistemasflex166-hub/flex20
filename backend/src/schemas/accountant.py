from pydantic import BaseModel


class AccountantCreate(BaseModel):
    name: str
    cpf: str | None = None
    crc: str | None = None
    phone: str | None = None
    email: str | None = None


class AccountantUpdate(BaseModel):
    name: str | None = None
    cpf: str | None = None
    crc: str | None = None
    phone: str | None = None
    email: str | None = None


class AccountantResponse(BaseModel):
    id: int
    tenant_id: int
    name: str
    cpf: str | None
    crc: str | None
    phone: str | None
    email: str | None
    is_active: bool

    model_config = {"from_attributes": True}
