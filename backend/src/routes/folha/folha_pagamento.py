from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.schemas.folha.folha_pagamento import (
    FolhaPagamentoCreate,
    FolhaPagamentoResponse,
    ItemFolhaResponse,
    ResumoFuncionarioFolha,
)
from src.services.folha import calculo as svc
from src.models.folha.folha_pagamento import ItemFolha
from decimal import Decimal

router = APIRouter()
_ZERO = Decimal("0.00")


@router.get("/folhas", response_model=list[FolhaPagamentoResponse])
async def listar_folhas(company_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.list_folhas(company_id, db)


@router.post("/folhas", response_model=FolhaPagamentoResponse, status_code=201)
async def criar_folha(company_id: int, data: FolhaPagamentoCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await svc.create_folha(company_id, data, db)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/folhas/{folha_id}/calcular", response_model=FolhaPagamentoResponse)
async def calcular(folha_id: int, company_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await svc.calcular_folha(folha_id, company_id, db)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/folhas/{folha_id}/fechar", response_model=FolhaPagamentoResponse)
async def fechar(folha_id: int, company_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await svc.fechar_folha(folha_id, company_id, db)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/folhas/{folha_id}/reabrir", response_model=FolhaPagamentoResponse)
async def reabrir(folha_id: int, company_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await svc.reabrir_folha(folha_id, company_id, db)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("/folhas/{folha_id}/itens", response_model=list[ItemFolhaResponse])
async def listar_itens(folha_id: int, company_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.get_itens_folha(folha_id, company_id, db)


@router.get("/folhas/{folha_id}/resumo", response_model=list[ResumoFuncionarioFolha])
async def resumo_por_funcionario(folha_id: int, company_id: int, db: AsyncSession = Depends(get_db)):
    itens = await svc.get_itens_folha(folha_id, company_id, db)

    agrupado: dict[int, dict] = {}
    for item in itens:
        fid = item.funcionario_id
        if fid not in agrupado:
            agrupado[fid] = {
                "funcionario_id": fid,
                "funcionario_codigo": item.funcionario.codigo,
                "funcionario_nome": item.funcionario.nome,
                "total_proventos": _ZERO,
                "total_descontos": _ZERO,
                "liquido": _ZERO,
                "inss": _ZERO,
                "irrf": _ZERO,
                "fgts": _ZERO,
                "itens": [],
            }
        g = agrupado[fid]
        g["itens"].append(item)
        if item.tipo == "provento":
            g["total_proventos"] += item.valor
        elif item.tipo == "desconto":
            g["total_descontos"] += item.valor
        if item.tipo_linha == "inss":
            g["inss"] += item.valor
        elif item.tipo_linha == "irrf":
            g["irrf"] += item.valor
        elif item.tipo_linha == "fgts":
            g["fgts"] += item.valor

    for g in agrupado.values():
        g["liquido"] = g["total_proventos"] - g["total_descontos"]

    return list(agrupado.values())
