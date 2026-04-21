"""
Script para redefinir a senha de um usuário.
Uso: python -m scripts.reset_password
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.core.config import settings
from src.core.security import hash_password
from src.models.tenant import Tenant  # noqa: F401
from src.models.user import User

engine = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
Session = async_sessionmaker(engine, expire_on_commit=False)


async def main() -> None:
    email = input("E-mail do usuário: ").strip()
    password = input("Nova senha: ").strip()

    async with Session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print("Usuário não encontrado.")
            return
        user.hashed_password = hash_password(password)
        await db.commit()
        print(f"Senha atualizada para o usuário ID {user.id}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
