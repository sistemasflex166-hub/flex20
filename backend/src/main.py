from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes import auth, users, tenants, companies, partners, account_plans, fiscal_entries, fiscal_base, nfe_import
from src.routes.contabilidade import plano_contas as cont_plano_contas, lancamentos as cont_lancamentos, conta_bancaria as cont_conta_bancaria, saldo_inicial as cont_saldo_inicial, relatorios as cont_relatorios
from src.routes.folha import cadastros as folha_cadastros
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
app.include_router(nfe_import.router, prefix="/api/nfe", tags=["nfe-import"])
app.include_router(cont_plano_contas.router, prefix="/api/contabilidade/plano-contas", tags=["contabilidade-plano-contas"])
app.include_router(cont_lancamentos.router, prefix="/api/contabilidade/lancamentos", tags=["contabilidade-lancamentos"])
app.include_router(cont_conta_bancaria.router, prefix="/api/contabilidade/contas-bancarias", tags=["contabilidade-contas-bancarias"])
app.include_router(cont_saldo_inicial.router, prefix="/api/contabilidade/saldos-iniciais", tags=["contabilidade-saldos-iniciais"])
app.include_router(cont_relatorios.router, prefix="/api/contabilidade/relatorios", tags=["contabilidade-relatorios"])
app.include_router(folha_cadastros.router, prefix="/api/folha", tags=["folha-cadastros"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
