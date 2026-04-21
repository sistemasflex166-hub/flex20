from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes import auth, users, tenants, companies, partners, account_plans, fiscal_entries, fiscal_base
from src.core.config import settings

app = FastAPI(
    title="Flex 2.0 — Sistema de Contabilidade SaaS",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tenants.router, prefix="/api/tenants", tags=["tenants"])
app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(partners.router, prefix="/api/partners", tags=["partners"])
app.include_router(account_plans.router, prefix="/api/account-plans", tags=["account-plans"])
app.include_router(fiscal_entries.router, prefix="/api/fiscal-entries", tags=["fiscal-entries"])
app.include_router(fiscal_base.router, prefix="/api/fiscal-base", tags=["fiscal-base"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
