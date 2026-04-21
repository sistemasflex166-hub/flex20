"""
Script para criar o primeiro administrador da plataforma.
Uso: python -m scripts.seed_admin
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.core.config import settings
from src.core.security import hash_password
from src.models.tenant import Tenant  # noqa: F401 — necessário para o mapper do SQLAlchemy
from src.models.user import User, UserRole

engine = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
Session = async_sessionmaker(engine, expire_on_commit=False)


async def main() -> None:
    email = input("E-mail do admin: ").strip()
    password = input("Senha: ").strip()
    full_name = input("Nome completo: ").strip()

    async with Session() as db:
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.PLATFORM_ADMIN,
        )
        db.add(user)
        await db.commit()
        print(f"Admin criado com ID {user.id}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
