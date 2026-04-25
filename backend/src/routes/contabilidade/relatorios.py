from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.services.contabilidade import balancete as svc_balancete, razao as svc_razao

router = APIRouter()


class LinhaBalanceteResponse(BaseModel):
    conta_id: int
    classificacao: str
    descricao: str
    nivel: int
    tipo: str
    natureza: str
    saldo_anterior: Decimal
    debitos: Decimal
    creditos: Decimal
    saldo_atual: Decimal

    model_config = {"from_attributes": True}


class LinhaRazaoResponse(BaseModel):
    lancamento_id: int | None
    data: date
    codigo: int | None
    historico: str
    origem: str
    debito: Decimal
    credito: Decimal
    saldo: Decimal

    model_config = {"from_attributes": True}


class RazaoResponse(BaseModel):
    conta_id: int
    classificacao: str
    descricao: str
    natureza: str
    linhas: list[LinhaRazaoResponse]


@router.get("/razao", response_model=RazaoResponse)
async def razao(
    company_id: int,
    conta_id: int,
    data_ini: date,
    data_fim: date,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    conta, linhas = await svc_razao.gerar_razao(company_id, conta_id, data_ini, data_fim, db)
    return RazaoResponse(
        conta_id=conta.id,
        classificacao=conta.classificacao,
        descricao=conta.descricao,
        natureza=conta.natureza,
        linhas=[LinhaRazaoResponse(**l.__dict__) for l in linhas],
    )


@router.get("/balancete", response_model=list[LinhaBalanceteResponse])
async def balancete(
    company_id: int,
    data_ini: date,
    data_fim: date,
    nivel_maximo: int | None = None,
    apenas_com_movimento: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc_balancete.gerar_balancete(
        company_id, data_ini, data_fim, db, nivel_maximo, apenas_com_movimento
    )
