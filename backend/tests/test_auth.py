import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.main import app
from src.core.database import Base, get_db
from src.core.security import hash_password
from src.models.user import User, UserRole

TEST_DB_URL = "postgresql+asyncpg://flex:flex@localhost:5432/flex_test"

engine = create_async_engine(TEST_DB_URL)
TestSession = async_sessionmaker(engine, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def platform_admin(setup_db):
    async with TestSession() as db:
        user = User(
            email="admin@platform.com",
            hashed_password=hash_password("senha123"),
            full_name="Admin Plataforma",
            role=UserRole.PLATFORM_ADMIN,
        )
        db.add(user)
        await db.commit()
    return user


@pytest.mark.asyncio
async def test_login_success(platform_admin):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/auth/login", json={
            "email": "admin@platform.com",
            "password": "senha123",
        })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(platform_admin):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/auth/login", json={
            "email": "admin@platform.com",
            "password": "errada",
        })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(platform_admin):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/auth/login", json={
            "email": "admin@platform.com",
            "password": "senha123",
        })
        refresh_token = login.json()["refresh_token"]

        response = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()
