from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.schemas.simples_nacional.schemas import (
    ConfiguracaoSimplesRequest, ConfiguracaoSimplesResponse,
    HistoricoReceitaRequest, HistoricoReceitaResponse,
    PreviewRequest, PreviewResponse,
    ApuracaoRequest, ApuracaoResponse,
)
from src.services.simples_nacional import configuracao as cfg_svc
from src.services.simples_nacional import calculo_das as das_svc

router = APIRouter()


# ── Configuração ────────────────────────────────────────────────────────────

@router.get("/configuracao", response_model=ConfiguracaoSimplesResponse | None)
async def get_configuracao(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await cfg_svc.get_configuracao(company_id, db)


@router.post("/configuracao", response_model=ConfiguracaoSimplesResponse)
async def salvar_configuracao(company_id: int, data: ConfiguracaoSimplesRequest, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await cfg_svc.salvar_configuracao(company_id, data.anexo_principal, data.usa_fator_r, data.data_inicio_simples, db)


# ── Histórico de receita ─────────────────────────────────────────────────────

@router.get("/historico-receita", response_model=list[HistoricoReceitaResponse])
async def list_historico(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await cfg_svc.list_historico_receita(company_id, db)


@router.post("/historico-receita", response_model=HistoricoReceitaResponse)
async def salvar_receita(company_id: int, data: HistoricoReceitaRequest, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await cfg_svc.salvar_receita_manual(company_id, data.competencia_mes, data.competencia_ano, data.receita_bruta, db)


# ── Cálculo ──────────────────────────────────────────────────────────────────

@router.post("/preview", response_model=PreviewResponse)
async def preview(company_id: int, data: PreviewRequest, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await das_svc.preview_calculo(company_id, data.competencia_mes, data.competencia_ano, data.receita_mes, db)


@router.post("/apuracao", response_model=ApuracaoResponse, status_code=201)
async def calcular(company_id: int, data: ApuracaoRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await das_svc.calcular_das(company_id, data.competencia_mes, data.competencia_ano, data.receita_mes, user.id, db)


@router.get("/apuracao", response_model=list[ApuracaoResponse])
async def list_apuracoes(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await das_svc.list_apuracoes(company_id, db)


@router.post("/apuracao/{apuracao_id}/confirmar", response_model=ApuracaoResponse)
async def confirmar(apuracao_id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await das_svc.confirmar_apuracao(apuracao_id, company_id, db)
