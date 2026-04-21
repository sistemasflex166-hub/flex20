from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.user import User
from src.schemas.account_plan import AccountPlanCreate, AccountPlanUpdate, AccountPlanResponse
from src.services import account_plan_service

router = APIRouter()


@router.post("/", response_model=AccountPlanResponse, status_code=201)
async def create_account(
    company_id: int,
    body: AccountPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await account_plan_service.create_account(company_id, current_user.tenant_id, body, db)  # type: ignore[arg-type]


@router.get("/", response_model=list[AccountPlanResponse])
async def list_accounts(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await account_plan_service.list_accounts(company_id, current_user.tenant_id, db)  # type: ignore[arg-type]


@router.patch("/{account_id}", response_model=AccountPlanResponse)
async def update_account(
    company_id: int,
    account_id: int,
    body: AccountPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    return await account_plan_service.update_account(account_id, company_id, current_user.tenant_id, body, db)  # type: ignore[arg-type]
