from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user
from src.models.user import User
from src.schemas.folha.cargo import CargoCreate, CargoUpdate, CargoResponse
from src.schemas.folha.departamento import DepartamentoCreate, DepartamentoUpdate, DepartamentoResponse
from src.schemas.folha.sindicato import SindicatoCreate, SindicatoUpdate, SindicatoResponse
from src.schemas.folha.evento import EventoCreate, EventoUpdate, EventoResponse
from src.schemas.folha.funcionario import FuncionarioCreate, FuncionarioUpdate, FuncionarioResponse
from src.schemas.folha.tabelas_tributarias import (
    TabelaINSSCreate, TabelaINSSUpdate, TabelaINSSResponse,
    TabelaIRRFCreate, TabelaIRRFUpdate, TabelaIRRFResponse,
)
from src.services.folha import cadastros as svc

router = APIRouter()


# ── Cargos ──────────────────────────────────────────────────────────────────

@router.get("/cargos", response_model=list[CargoResponse])
async def list_cargos(
    company_id: int,
    apenas_ativos: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_cargos(company_id, db, apenas_ativos)


@router.post("/cargos", response_model=CargoResponse)
async def create_cargo(
    company_id: int,
    data: CargoCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_cargo(company_id, data, db)


@router.patch("/cargos/{id}", response_model=CargoResponse)
async def update_cargo(
    id: int,
    company_id: int,
    data: CargoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_cargo(id, company_id, data, db)


@router.patch("/cargos/{id}/inativar", response_model=CargoResponse)
async def inativar_cargo(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.inativar_cargo(id, company_id, db)


# ── Departamentos ────────────────────────────────────────────────────────────

@router.get("/departamentos", response_model=list[DepartamentoResponse])
async def list_departamentos(
    company_id: int,
    apenas_ativos: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_departamentos(company_id, db, apenas_ativos)


@router.post("/departamentos", response_model=DepartamentoResponse)
async def create_departamento(
    company_id: int,
    data: DepartamentoCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_departamento(company_id, data, db)


@router.patch("/departamentos/{id}", response_model=DepartamentoResponse)
async def update_departamento(
    id: int,
    company_id: int,
    data: DepartamentoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_departamento(id, company_id, data, db)


@router.patch("/departamentos/{id}/inativar", response_model=DepartamentoResponse)
async def inativar_departamento(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.inativar_departamento(id, company_id, db)


# ── Sindicatos ───────────────────────────────────────────────────────────────

@router.get("/sindicatos", response_model=list[SindicatoResponse])
async def list_sindicatos(
    company_id: int,
    apenas_ativos: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_sindicatos(company_id, db, apenas_ativos)


@router.post("/sindicatos", response_model=SindicatoResponse)
async def create_sindicato(
    company_id: int,
    data: SindicatoCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_sindicato(company_id, data, db)


@router.patch("/sindicatos/{id}", response_model=SindicatoResponse)
async def update_sindicato(
    id: int,
    company_id: int,
    data: SindicatoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_sindicato(id, company_id, data, db)


@router.patch("/sindicatos/{id}/inativar", response_model=SindicatoResponse)
async def inativar_sindicato(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.inativar_sindicato(id, company_id, db)


# ── Eventos ──────────────────────────────────────────────────────────────────

@router.get("/eventos", response_model=list[EventoResponse])
async def list_eventos(
    company_id: int,
    apenas_ativos: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_eventos(company_id, db, apenas_ativos)


@router.post("/eventos", response_model=EventoResponse)
async def create_evento(
    company_id: int,
    data: EventoCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_evento(company_id, data, db)


@router.patch("/eventos/{id}", response_model=EventoResponse)
async def update_evento(
    id: int,
    company_id: int,
    data: EventoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_evento(id, company_id, data, db)


@router.patch("/eventos/{id}/inativar", response_model=EventoResponse)
async def inativar_evento(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.inativar_evento(id, company_id, db)


# ── Funcionários ─────────────────────────────────────────────────────────────

@router.get("/funcionarios", response_model=list[FuncionarioResponse])
async def list_funcionarios(
    company_id: int,
    apenas_ativos: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_funcionarios(company_id, db, apenas_ativos)


@router.get("/funcionarios/{id}", response_model=FuncionarioResponse)
async def get_funcionario(
    id: int,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.get_funcionario(id, company_id, db)


@router.post("/funcionarios", response_model=FuncionarioResponse)
async def create_funcionario(
    company_id: int,
    data: FuncionarioCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_funcionario(company_id, data, db)


@router.patch("/funcionarios/{id}", response_model=FuncionarioResponse)
async def update_funcionario(
    id: int,
    company_id: int,
    data: FuncionarioUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_funcionario(id, company_id, data, db)


class InativarFuncionarioBody(FuncionarioUpdate):
    motivo: str | None = None


@router.patch("/funcionarios/{id}/inativar", response_model=FuncionarioResponse)
async def inativar_funcionario(
    id: int,
    company_id: int,
    motivo: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.inativar_funcionario(id, company_id, motivo, db)


# ── Tabela INSS ──────────────────────────────────────────────────────────────

@router.get("/tabelas/inss", response_model=list[TabelaINSSResponse])
async def list_tabelas_inss(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_tabelas_inss(db)


@router.post("/tabelas/inss", response_model=TabelaINSSResponse, status_code=201)
async def create_tabela_inss(
    data: TabelaINSSCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_tabela_inss(data, db)


@router.patch("/tabelas/inss/{id}", response_model=TabelaINSSResponse)
async def update_tabela_inss(
    id: int,
    data: TabelaINSSUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_tabela_inss(id, data, db)


@router.delete("/tabelas/inss/{id}", status_code=204)
async def delete_tabela_inss(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await svc.delete_tabela_inss(id, db)


# ── Tabela IRRF ──────────────────────────────────────────────────────────────

@router.get("/tabelas/irrf", response_model=list[TabelaIRRFResponse])
async def list_tabelas_irrf(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_tabelas_irrf(db)


@router.post("/tabelas/irrf", response_model=TabelaIRRFResponse, status_code=201)
async def create_tabela_irrf(
    data: TabelaIRRFCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.create_tabela_irrf(data, db)


@router.patch("/tabelas/irrf/{id}", response_model=TabelaIRRFResponse)
async def update_tabela_irrf(
    id: int,
    data: TabelaIRRFUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.update_tabela_irrf(id, data, db)


@router.delete("/tabelas/irrf/{id}", status_code=204)
async def delete_tabela_irrf(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await svc.delete_tabela_irrf(id, db)
