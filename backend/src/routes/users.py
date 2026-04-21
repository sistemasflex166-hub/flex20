from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import require_platform_admin, require_office_admin, get_current_user
from src.models.user import User, UserRole
from src.schemas.user import UserCreate, UserResponse
from src.services import user_service

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_admin),
):
    # Admins de escritório só podem criar usuários dentro do próprio tenant
    if current_user.role == UserRole.OFFICE_ADMIN:
        if body.role == UserRole.PLATFORM_ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente")
        body.tenant_id = current_user.tenant_id

    return await user_service.create_user(body, db)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
