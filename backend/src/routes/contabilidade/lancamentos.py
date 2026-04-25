from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.schemas.contabilidade.lancamento import (
    CentroCustoCreate, CentroCustoResponse,
    HistoricoPadraoCreate, HistoricoPadraoResponse,
    LancamentoCreate, LancamentoUpdate, LancamentoResponse, TotalizadorDia,
)
from src.services.contabilidade import lancamento as svc

router = APIRouter()


# Centro de custo
@router.get("/centros-custo", response_model=list[CentroCustoResponse])
async def list_cc(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.list_centros_custo(company_id, db)


@router.post("/centros-custo", response_model=CentroCustoResponse, status_code=201)
async def create_cc(company_id: int, data: CentroCustoCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.create_centro_custo(company_id, data, db)


@router.patch("/centros-custo/{id}", response_model=CentroCustoResponse)
async def update_cc(id: int, company_id: int, data: CentroCustoCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.update_centro_custo(id, company_id, data, db)


@router.patch("/centros-custo/{id}/deactivate", response_model=CentroCustoResponse)
async def deactivate_cc(id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.deactivate_centro_custo(id, company_id, db)


# Histórico padrão
@router.get("/historicos-padrao", response_model=list[HistoricoPadraoResponse])
async def list_hist(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.list_historicos(company_id, db)


@router.post("/historicos-padrao", response_model=HistoricoPadraoResponse, status_code=201)
async def create_hist(company_id: int, data: HistoricoPadraoCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.create_historico(company_id, data, db)


@router.patch("/historicos-padrao/{id}", response_model=HistoricoPadraoResponse)
async def update_hist(id: int, company_id: int, data: HistoricoPadraoCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.update_historico(id, company_id, data, db)


@router.patch("/historicos-padrao/{id}/deactivate", response_model=HistoricoPadraoResponse)
async def deactivate_hist(id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.deactivate_historico(id, company_id, db)


# Lançamentos
@router.get("/", response_model=list[LancamentoResponse])
async def list_lanc(
    company_id: int,
    data_ini: date | None = None,
    data_fim: date | None = None,
    incluir_excluidos: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_lancamentos(company_id, db, data_ini, data_fim, incluir_excluidos)


@router.get("/totalizador", response_model=TotalizadorDia)
async def totalizador(company_id: int, data: date, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.totalizador_dia(company_id, data, db)


@router.post("/", response_model=LancamentoResponse, status_code=201)
async def create_lanc(company_id: int, data: LancamentoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.create_lancamento(company_id, user.id, data, db)


@router.patch("/{id}", response_model=LancamentoResponse)
async def update_lanc(id: int, company_id: int, data: LancamentoUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return await svc.update_lancamento(id, company_id, user.id, data, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{id}/excluir")
async def excluir_lanc(id: int, company_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await svc.soft_delete_lancamento(id, company_id, user.id, db)
    return {"ok": True}


@router.delete("/{id}/definitivo")
async def hard_delete_lanc(id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    await svc.hard_delete_lancamento(id, company_id, db)
    return {"ok": True}


@router.post("/{id}/estornar", response_model=LancamentoResponse)
async def estornar_lanc(id: int, company_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.estornar_lancamento(id, company_id, user.id, db)
