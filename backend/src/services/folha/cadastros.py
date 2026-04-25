from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.folha.cargo import Cargo
from src.models.folha.departamento import Departamento
from src.models.folha.sindicato import Sindicato
from src.models.folha.evento import Evento
from src.models.folha.funcionario import Funcionario, DependenteFuncionario
from src.schemas.folha.cargo import CargoCreate, CargoUpdate
from src.schemas.folha.departamento import DepartamentoCreate, DepartamentoUpdate
from src.schemas.folha.sindicato import SindicatoCreate, SindicatoUpdate
from src.schemas.folha.evento import EventoCreate, EventoUpdate
from src.schemas.folha.funcionario import FuncionarioCreate, FuncionarioUpdate


async def _next_seq(model, company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(model.codigo)).where(model.company_id == company_id)
    )
    last = result.scalar() or 0
    return last + 1


# ── Cargos ──────────────────────────────────────────────────────────────────

async def list_cargos(company_id: int, db: AsyncSession, apenas_ativos: bool = True) -> list[Cargo]:
    q = select(Cargo).where(Cargo.company_id == company_id)
    if apenas_ativos:
        q = q.where(Cargo.ativo == True)
    result = await db.execute(q.order_by(Cargo.codigo))
    return list(result.scalars().all())


async def create_cargo(company_id: int, data: CargoCreate, db: AsyncSession) -> Cargo:
    obj = Cargo(
        company_id=company_id,
        codigo=await _next_seq(Cargo, company_id, db),
        **data.model_dump(),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_cargo(id: int, company_id: int, data: CargoUpdate, db: AsyncSession) -> Cargo:
    result = await db.execute(select(Cargo).where(Cargo.id == id, Cargo.company_id == company_id))
    obj = result.scalar_one()
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


async def inativar_cargo(id: int, company_id: int, db: AsyncSession) -> Cargo:
    result = await db.execute(select(Cargo).where(Cargo.id == id, Cargo.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Departamentos ────────────────────────────────────────────────────────────

async def list_departamentos(company_id: int, db: AsyncSession, apenas_ativos: bool = True) -> list[Departamento]:
    q = select(Departamento).where(Departamento.company_id == company_id)
    if apenas_ativos:
        q = q.where(Departamento.ativo == True)
    result = await db.execute(q.order_by(Departamento.codigo))
    return list(result.scalars().all())


async def create_departamento(company_id: int, data: DepartamentoCreate, db: AsyncSession) -> Departamento:
    obj = Departamento(
        company_id=company_id,
        codigo=await _next_seq(Departamento, company_id, db),
        **data.model_dump(),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_departamento(id: int, company_id: int, data: DepartamentoUpdate, db: AsyncSession) -> Departamento:
    result = await db.execute(select(Departamento).where(Departamento.id == id, Departamento.company_id == company_id))
    obj = result.scalar_one()
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


async def inativar_departamento(id: int, company_id: int, db: AsyncSession) -> Departamento:
    result = await db.execute(select(Departamento).where(Departamento.id == id, Departamento.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Sindicatos ───────────────────────────────────────────────────────────────

async def list_sindicatos(company_id: int, db: AsyncSession, apenas_ativos: bool = True) -> list[Sindicato]:
    q = select(Sindicato).where(Sindicato.company_id == company_id)
    if apenas_ativos:
        q = q.where(Sindicato.ativo == True)
    result = await db.execute(q.order_by(Sindicato.codigo))
    return list(result.scalars().all())


async def create_sindicato(company_id: int, data: SindicatoCreate, db: AsyncSession) -> Sindicato:
    obj = Sindicato(
        company_id=company_id,
        codigo=await _next_seq(Sindicato, company_id, db),
        **data.model_dump(),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_sindicato(id: int, company_id: int, data: SindicatoUpdate, db: AsyncSession) -> Sindicato:
    result = await db.execute(select(Sindicato).where(Sindicato.id == id, Sindicato.company_id == company_id))
    obj = result.scalar_one()
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


async def inativar_sindicato(id: int, company_id: int, db: AsyncSession) -> Sindicato:
    result = await db.execute(select(Sindicato).where(Sindicato.id == id, Sindicato.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Eventos ──────────────────────────────────────────────────────────────────

async def list_eventos(company_id: int, db: AsyncSession, apenas_ativos: bool = True) -> list[Evento]:
    q = select(Evento).where(Evento.company_id == company_id)
    if apenas_ativos:
        q = q.where(Evento.ativo == True)
    result = await db.execute(q.order_by(Evento.codigo))
    return list(result.scalars().all())


async def create_evento(company_id: int, data: EventoCreate, db: AsyncSession) -> Evento:
    obj = Evento(
        company_id=company_id,
        codigo=await _next_seq(Evento, company_id, db),
        **data.model_dump(),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_evento(id: int, company_id: int, data: EventoUpdate, db: AsyncSession) -> Evento:
    result = await db.execute(select(Evento).where(Evento.id == id, Evento.company_id == company_id))
    obj = result.scalar_one()
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


async def inativar_evento(id: int, company_id: int, db: AsyncSession) -> Evento:
    result = await db.execute(select(Evento).where(Evento.id == id, Evento.company_id == company_id))
    obj = result.scalar_one()
    obj.ativo = False
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Funcionários ─────────────────────────────────────────────────────────────

async def list_funcionarios(company_id: int, db: AsyncSession, apenas_ativos: bool = True) -> list[Funcionario]:
    q = (
        select(Funcionario)
        .options(selectinload(Funcionario.dependentes))
        .where(Funcionario.company_id == company_id)
    )
    if apenas_ativos:
        q = q.where(Funcionario.ativo == True)
    result = await db.execute(q.order_by(Funcionario.codigo))
    return list(result.scalars().all())


async def get_funcionario(id: int, company_id: int, db: AsyncSession) -> Funcionario:
    result = await db.execute(
        select(Funcionario)
        .options(selectinload(Funcionario.dependentes))
        .where(Funcionario.id == id, Funcionario.company_id == company_id)
    )
    return result.scalar_one()


async def create_funcionario(company_id: int, data: FuncionarioCreate, db: AsyncSession) -> Funcionario:
    dependentes_data = data.dependentes
    payload = data.model_dump(exclude={"dependentes"})
    obj = Funcionario(
        company_id=company_id,
        codigo=await _next_seq(Funcionario, company_id, db),
        **payload,
    )
    db.add(obj)
    await db.flush()
    for dep in dependentes_data:
        db.add(DependenteFuncionario(funcionario_id=obj.id, **dep.model_dump()))
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_funcionario(id: int, company_id: int, data: FuncionarioUpdate, db: AsyncSession) -> Funcionario:
    result = await db.execute(
        select(Funcionario)
        .options(selectinload(Funcionario.dependentes))
        .where(Funcionario.id == id, Funcionario.company_id == company_id)
    )
    obj = result.scalar_one()
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


async def inativar_funcionario(id: int, company_id: int, motivo: str | None, db: AsyncSession) -> Funcionario:
    from datetime import date
    result = await db.execute(
        select(Funcionario)
        .options(selectinload(Funcionario.dependentes))
        .where(Funcionario.id == id, Funcionario.company_id == company_id)
    )
    obj = result.scalar_one()
    obj.ativo = False
    obj.data_inativacao = date.today()
    obj.motivo_inativacao = motivo
    await db.commit()
    await db.refresh(obj)
    return obj
