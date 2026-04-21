from pydantic import BaseModel
from src.models.account_plan import AccountType, AccountNature


class AccountPlanCreate(BaseModel):
    code: str
    name: str
    account_type: AccountType
    nature: AccountNature
    parent_id: int | None = None
    accepts_entries: bool = True


class AccountPlanUpdate(BaseModel):
    name: str | None = None
    accepts_entries: bool | None = None
    is_active: bool | None = None


class AccountPlanResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    account_type: AccountType
    nature: AccountNature
    parent_id: int | None
    accepts_entries: bool
    is_active: bool

    model_config = {"from_attributes": True}
