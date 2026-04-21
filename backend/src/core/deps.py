from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import decode_token
from src.models.user import User, UserRole
from src.services.user_service import get_user_by_id

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user = await get_user_by_id(int(payload["sub"]), db)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado ou inativo")

    return user


def require_role(*roles: UserRole):
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente")
        return current_user
    return checker


require_platform_admin = require_role(UserRole.PLATFORM_ADMIN)
require_office_admin = require_role(UserRole.PLATFORM_ADMIN, UserRole.OFFICE_ADMIN)
require_office_user = require_role(UserRole.PLATFORM_ADMIN, UserRole.OFFICE_ADMIN, UserRole.OFFICE_USER)
