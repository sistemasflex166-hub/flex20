import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from src.models.user import User, RefreshToken
from src.services.user_service import get_user_by_email


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def login(email: str, password: str, db: AsyncSession) -> tuple[str, str]:
    user = await get_user_by_email(email, db)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    tenant_schema = user.tenant.schema_name if user.tenant else None
    access_token = create_access_token(user.id, user.role, tenant_schema)
    refresh_token = create_refresh_token(user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    await db.commit()
    return access_token, refresh_token


async def refresh(token: str, db: AsyncSession) -> str:
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    token_hash = _hash_token(token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    stored = result.scalar_one_or_none()
    if not stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expirado ou revogado")

    stored.revoked = True
    await db.commit()

    user_result = await db.execute(select(User).where(User.id == stored.user_id))
    user: User = user_result.scalar_one()
    tenant_schema = user.tenant.schema_name if user.tenant else None
    return create_access_token(user.id, user.role, tenant_schema)


async def logout(token: str, db: AsyncSession) -> None:
    token_hash = _hash_token(token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = result.scalar_one_or_none()
    if stored:
        stored.revoked = True
        await db.commit()
