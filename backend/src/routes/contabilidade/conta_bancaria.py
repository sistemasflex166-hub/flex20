from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.models.contabilidade.conta_bancaria import ContaBancaria, HistoricoBancario
from src.schemas.contabilidade.conta_bancaria import (
    ContaBancariaCreate, ContaBancariaUpdate, ContaBancariaResponse,
    HistoricoBancarioCreate, HistoricoBancarioUpdate, HistoricoBancarioResponse,
)

router = APIRouter()


@router.get("/", response_model=list[ContaBancariaResponse])
async def list_contas(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(ContaBancaria).where(ContaBancaria.company_id == company_id, ContaBancaria.ativo == True))
    return list(result.scalars().all())


@router.post("/", response_model=ContaBancariaResponse, status_code=201)
async def create_conta(company_id: int, data: ContaBancariaCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    obj = ContaBancaria(company_id=company_id, **data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{id}", response_model=ContaBancariaResponse)
async def update_conta(id: int, company_id: int, data: ContaBancariaUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(ContaBancaria).where(ContaBancaria.id == id, ContaBancaria.company_id == company_id))
    obj = result.scalar_one()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{id}/deactivate", response_model=ContaBancariaResponse)
async def deactivate_conta(id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(ContaBancaria).where(ContaBancaria.id == id, ContaBancaria.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    await db.refresh(obj)
    return obj


# Históricos bancários
@router.get("/historicos", response_model=list[HistoricoBancarioResponse])
async def list_historicos(company_id: int, conta_bancaria_id: int | None = None, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    q = select(HistoricoBancario).where(HistoricoBancario.company_id == company_id, HistoricoBancario.ativo == True)
    if conta_bancaria_id:
        q = q.where(HistoricoBancario.conta_bancaria_id == conta_bancaria_id)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/historicos", response_model=HistoricoBancarioResponse, status_code=201)
async def create_historico(company_id: int, data: HistoricoBancarioCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    obj = HistoricoBancario(company_id=company_id, **data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/historicos/{id}", response_model=HistoricoBancarioResponse)
async def update_historico(id: int, company_id: int, data: HistoricoBancarioUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(HistoricoBancario).where(HistoricoBancario.id == id, HistoricoBancario.company_id == company_id))
    obj = result.scalar_one()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/historicos/{id}/deactivate", response_model=HistoricoBancarioResponse)
async def deactivate_historico(id: int, company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(HistoricoBancario).where(HistoricoBancario.id == id, HistoricoBancario.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    await db.refresh(obj)
    return obj
