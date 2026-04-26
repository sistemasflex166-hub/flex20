from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.schemas.contabilidade.plano_contas import (
    MascaraCreate, MascaraResponse,
    PlanoContasCreate, PlanoContasUpdate, PlanoContasResponse,
)
from src.services.contabilidade import plano_contas as svc

router = APIRouter()


@router.get("/mascara", response_model=MascaraResponse | None)
async def get_mascara(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.get_mascara(company_id, db)


@router.post("/mascara", response_model=MascaraResponse)
async def save_mascara(company_id: int, data: MascaraCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.get_or_create_mascara(company_id, data, db)


@router.get("/", response_model=list[PlanoContasResponse])
async def list_contas(company_id: int, apenas_ativas: bool = True, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.list_contas(company_id, db, apenas_ativas)


@router.post("/", response_model=PlanoContasResponse, status_code=201)
async def create_conta(company_id: int, data: PlanoContasCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.create_conta(company_id, user.tenant_id, data, db)


@router.patch("/{conta_id}", response_model=PlanoContasResponse)
async def update_conta(conta_id: int, company_id: int, data: PlanoContasUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.update_conta(conta_id, company_id, data, db)


@router.patch("/{conta_id}/deactivate", response_model=PlanoContasResponse)
async def deactivate_conta(conta_id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await svc.deactivate_conta(conta_id, company_id, db)


@router.delete("/{conta_id}/definitivo", status_code=200)
async def hard_delete_conta(conta_id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    await svc.hard_delete_conta(conta_id, company_id, db)
    return {"ok": True}


@router.post("/copiar", status_code=200)
async def copiar_plano(origem_id: int, destino_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        total = await svc.copiar_plano(origem_id, destino_id, user.tenant_id, db)
        return {"copiadas": total}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
