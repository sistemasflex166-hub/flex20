from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.accountant import Accountant
from src.models.user import User, UserRole
from src.schemas.accountant import AccountantCreate, AccountantUpdate, AccountantResponse

router = APIRouter()


def _resolve_tenant(user: User, tenant_id: int | None) -> int:
    if user.role == UserRole.PLATFORM_ADMIN:
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id obrigatório para admin da plataforma")
        return tenant_id
    return user.tenant_id  # type: ignore[return-value]


@router.get("/", response_model=list[AccountantResponse])
async def list_accountants(
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = _resolve_tenant(current_user, tenant_id)
    result = await db.execute(
        select(Accountant).where(
            Accountant.tenant_id == tid,
            Accountant.is_active == True,
        ).order_by(Accountant.name)
    )
    return result.scalars().all()


@router.post("/", response_model=AccountantResponse, status_code=201)
async def create_accountant(
    body: AccountantCreate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    obj = Accountant(tenant_id=_resolve_tenant(current_user, tenant_id), **body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{accountant_id}", response_model=AccountantResponse)
async def update_accountant(
    accountant_id: int,
    body: AccountantUpdate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = _resolve_tenant(current_user, tenant_id)
    result = await db.execute(
        select(Accountant).where(
            Accountant.id == accountant_id,
            Accountant.tenant_id == tid,
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Contador não encontrado.")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{accountant_id}", status_code=204)
async def delete_accountant(
    accountant_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = _resolve_tenant(current_user, tenant_id)
    result = await db.execute(
        select(Accountant).where(
            Accountant.id == accountant_id,
            Accountant.tenant_id == tid,
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Contador não encontrado.")
    obj.is_active = False
    await db.commit()
