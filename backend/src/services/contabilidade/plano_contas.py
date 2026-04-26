from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from src.models.contabilidade.plano_contas import MascaraPlanoContas, PlanoContas
from src.models.contabilidade.lancamento import LancamentoContabil
from src.models.company import Company
from src.schemas.contabilidade.plano_contas import MascaraCreate, PlanoContasCreate, PlanoContasUpdate


async def _get_tenant_id(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(select(Company.tenant_id).where(Company.id == company_id))
    return result.scalar_one()


def _calcular_nivel(classificacao: str, separador: str = ".") -> int:
    return len(classificacao.split(separador))


def _calcular_quantidade_niveis(mascara: str, separador: str = ".") -> int:
    return len(mascara.split(separador))


async def get_or_create_mascara(company_id: int, data: MascaraCreate, db: AsyncSession) -> MascaraPlanoContas:
    result = await db.execute(select(MascaraPlanoContas).where(MascaraPlanoContas.company_id == company_id))
    existing = result.scalar_one_or_none()
    qtd = _calcular_quantidade_niveis(data.mascara, data.separador)
    if existing:
        existing.mascara = data.mascara
        existing.separador = data.separador
        existing.quantidade_niveis = qtd
        await db.commit()
        await db.refresh(existing)
        return existing
    obj = MascaraPlanoContas(company_id=company_id, mascara=data.mascara, separador=data.separador, quantidade_niveis=qtd)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_mascara(company_id: int, db: AsyncSession) -> MascaraPlanoContas | None:
    result = await db.execute(select(MascaraPlanoContas).where(MascaraPlanoContas.company_id == company_id))
    return result.scalar_one_or_none()


async def list_contas(company_id: int, db: AsyncSession, apenas_ativas: bool = True) -> list[PlanoContas]:
    q = select(PlanoContas).where(PlanoContas.company_id == company_id)
    if apenas_ativas:
        q = q.where(PlanoContas.ativo == True)
    q = q.order_by(PlanoContas.classificacao)
    result = await db.execute(q)
    return list(result.scalars().all())


async def _inferir_parent_id(company_id: int, classificacao: str, separador: str, db: AsyncSession) -> int | None:
    partes = classificacao.split(separador)
    if len(partes) <= 1:
        return None
    classificacao_pai = separador.join(partes[:-1])
    result = await db.execute(
        select(PlanoContas.id).where(PlanoContas.company_id == company_id, PlanoContas.classificacao == classificacao_pai)
    )
    return result.scalar_one_or_none()


async def _inferir_tipo(classificacao: str, separador: str, quantidade_niveis: int) -> str:
    nivel = len(classificacao.split(separador))
    return "analitica" if nivel == quantidade_niveis else "sintetica"


async def create_conta(company_id: int, tenant_id: int | None, data: PlanoContasCreate, db: AsyncSession) -> PlanoContas:
    if not tenant_id:
        tenant_id = await _get_tenant_id(company_id, db)
    mascara = await get_mascara(company_id, db)
    separador = mascara.separador if mascara else "."
    quantidade_niveis = mascara.quantidade_niveis if mascara else 1
    nivel = _calcular_nivel(data.classificacao, separador)

    # tipo automático: último nível = analítica, demais = sintética
    tipo = await _inferir_tipo(data.classificacao, separador, quantidade_niveis)

    # parent_id inferido pela classificação pai se não informado
    parent_id = data.parent_id
    if parent_id is None:
        parent_id = await _inferir_parent_id(company_id, data.classificacao, separador, db)

    obj = PlanoContas(
        company_id=company_id,
        tenant_id=tenant_id,
        parent_id=parent_id,
        classificacao=data.classificacao,
        descricao=data.descricao,
        nivel=nivel,
        natureza=data.natureza,
        tipo=tipo,
        codigo_reduzido=data.codigo_reduzido or None,
        titulo_dre=data.titulo_dre,
        grupo_dre=data.grupo_dre,
        codigo_ecf=data.codigo_ecf,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_conta(conta_id: int, company_id: int, data: PlanoContasUpdate, db: AsyncSession) -> PlanoContas:
    result = await db.execute(select(PlanoContas).where(PlanoContas.id == conta_id, PlanoContas.company_id == company_id))
    conta = result.scalar_one()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(conta, field, value)
    await db.commit()
    await db.refresh(conta)
    return conta


async def deactivate_conta(conta_id: int, company_id: int, db: AsyncSession) -> PlanoContas:
    result = await db.execute(select(PlanoContas).where(PlanoContas.id == conta_id, PlanoContas.company_id == company_id))
    conta = result.scalar_one()
    conta.ativo = False
    await db.commit()
    await db.refresh(conta)
    return conta


async def hard_delete_conta(conta_id: int, company_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(PlanoContas).where(PlanoContas.id == conta_id, PlanoContas.company_id == company_id)
    )
    conta = result.scalar_one_or_none()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")

    # Não permitir excluir se existir conta filha
    filhos = await db.execute(
        select(func.count()).where(PlanoContas.parent_id == conta_id)
    )
    if filhos.scalar_one() > 0:
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir esta conta pois existem contas de nível inferior vinculadas a ela. Exclua-as primeiro.",
        )

    # Não permitir excluir se existir lançamento usando esta conta
    uso = await db.execute(
        select(func.count()).select_from(LancamentoContabil).where(
            or_(
                LancamentoContabil.conta_debito_id == conta_id,
                LancamentoContabil.conta_credito_id == conta_id,
            )
        )
    )
    if uso.scalar_one() > 0:
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir esta conta pois ela está sendo utilizada em lançamentos contábeis.",
        )

    await db.delete(conta)
    await db.commit()


async def copiar_plano(origem_id: int, destino_id: int, tenant_id: int | None, db: AsyncSession) -> int:
    mascara_orig = await get_mascara(origem_id, db)
    mascara_dest = await get_mascara(destino_id, db)
    if mascara_orig and mascara_dest and mascara_orig.mascara != mascara_dest.mascara:
        raise ValueError(f"Máscaras incompatíveis: origem={mascara_orig.mascara}, destino={mascara_dest.mascara}")

    if not tenant_id:
        tenant_id = await _get_tenant_id(destino_id, db)
    contas = await list_contas(origem_id, db)
    id_map: dict[int, int] = {}
    for conta in contas:
        parent_new_id = id_map.get(conta.parent_id) if conta.parent_id else None
        novo = PlanoContas(
            company_id=destino_id,
            tenant_id=tenant_id,
            parent_id=parent_new_id,
            classificacao=conta.classificacao,
            descricao=conta.descricao,
            nivel=conta.nivel,
            natureza=conta.natureza,
            tipo=conta.tipo,
            codigo_reduzido=conta.codigo_reduzido,
            titulo_dre=conta.titulo_dre,
            grupo_dre=conta.grupo_dre,
            codigo_ecf=conta.codigo_ecf,
        )
        db.add(novo)
        await db.flush()
        id_map[conta.id] = novo.id
    await db.commit()
    return len(id_map)
