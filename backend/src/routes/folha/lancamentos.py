from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.schemas.folha.lancamento_variavel import (
    LancamentoVariavelCreate, LancamentoVariavelUpdate, LancamentoVariavelResponse,
)
from src.services.folha import lancamentos as svc

router = APIRouter()


@router.get("/lancamentos-variaveis", response_model=list[LancamentoVariavelResponse])
async def list_lancamentos(
    company_id: int,
    folha_id: int | None = None,
    funcionario_id: int | None = None,
    competencia_mes: int | None = None,
    competencia_ano: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_lancamentos(company_id, db, folha_id, funcionario_id, competencia_mes, competencia_ano)


@router.post("/lancamentos-variaveis", response_model=LancamentoVariavelResponse, status_code=201)
async def create_lancamento(
    company_id: int,
    data: LancamentoVariavelCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_lancamento(company_id, data, db)


@router.patch("/lancamentos-variaveis/{id}", response_model=LancamentoVariavelResponse)
async def update_lancamento(
    id: int,
    company_id: int,
    data: LancamentoVariavelUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_lancamento(id, company_id, data, db)


@router.delete("/lancamentos-variaveis/{id}", status_code=204)
async def excluir_lancamento(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await svc.excluir_lancamento(id, company_id, db)


# ── Lixeira ──────────────────────────────────────────────────────────────────

@router.get("/lancamentos-variaveis/lixeira", response_model=list[LancamentoVariavelResponse])
async def list_lixeira(
    company_id: int,
    competencia_mes: int | None = None,
    competencia_ano: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_lixeira(company_id, db, competencia_mes, competencia_ano)


@router.patch("/lancamentos-variaveis/{id}/restaurar", response_model=LancamentoVariavelResponse)
async def restaurar_lancamento(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.restaurar_lancamento(id, company_id, db)


@router.delete("/lancamentos-variaveis/{id}/definitivo", status_code=204)
async def excluir_definitivamente(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await svc.excluir_definitivamente(id, company_id, db)
