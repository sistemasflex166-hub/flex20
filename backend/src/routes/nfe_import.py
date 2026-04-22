from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.core.deps import require_office_user
from src.models.user import User, UserRole
from src.models.cfop_mapping import CfopMapping
from src.schemas.cfop_mapping import CfopMappingCreate, CfopMappingUpdate, CfopMappingResponse
from src.services import nfe_import_service

router = APIRouter()

MAX_XML_SIZE = 5 * 1024 * 1024  # 5 MB


def _resolve_tenant(current_user: User, tenant_id: int | None) -> int:
    if current_user.role == UserRole.PLATFORM_ADMIN:
        if not tenant_id:
            raise HTTPException(status_code=400, detail="tenant_id obrigatório para admin da plataforma")
        return tenant_id
    return current_user.tenant_id  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Importação NF-e
# ---------------------------------------------------------------------------

@router.post("/preview")
async def preview_nfe(
    file: UploadFile = File(...),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    """Faz o parse do XML e retorna um preview sem gravar nada."""
    content = await file.read()
    if len(content) > MAX_XML_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (máximo 5 MB)")
    try:
        return await nfe_import_service.preview_nfe_xml(
            content, _resolve_tenant(current_user, tenant_id), db
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/import")
async def import_nfe(
    file: UploadFile = File(...),
    on_duplicate: str = Query("skip", description="skip | overwrite"),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    """Importa o XML NF-e e cria o lançamento fiscal."""
    if on_duplicate not in ("skip", "overwrite"):
        raise HTTPException(status_code=400, detail="on_duplicate deve ser 'skip' ou 'overwrite'")
    content = await file.read()
    if len(content) > MAX_XML_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (máximo 5 MB)")
    try:
        entry = await nfe_import_service.import_nfe_xml(
            content,
            _resolve_tenant(current_user, tenant_id),
            on_duplicate,  # type: ignore[arg-type]
            db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "id": entry.id,
        "code": entry.code,
        "entry_type": entry.entry_type,
        "document_number": entry.document_number,
        "document_series": entry.document_series,
        "partner_name": entry.partner_name,
        "total_gross": float(entry.total_gross),
        "items_count": len(entry.items),
    }


# ---------------------------------------------------------------------------
# Mapeamentos CFOP
# ---------------------------------------------------------------------------

@router.post("/cfop-mappings", response_model=CfopMappingResponse, status_code=201)
async def create_cfop_mapping(
    body: CfopMappingCreate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = _resolve_tenant(current_user, tenant_id)
    mapping = CfopMapping(tenant_id=tid, **body.model_dump())
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return mapping


@router.get("/cfop-mappings", response_model=list[CfopMappingResponse])
async def list_cfop_mappings(
    company_id: int | None = Query(None),
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = _resolve_tenant(current_user, tenant_id)
    q = select(CfopMapping).where(CfopMapping.tenant_id == tid, CfopMapping.is_active == True)
    if company_id:
        q = q.where(CfopMapping.company_id == company_id)
    result = await db.execute(q.order_by(CfopMapping.cfop_origin))
    return list(result.scalars().all())


@router.patch("/cfop-mappings/{mapping_id}", response_model=CfopMappingResponse)
async def update_cfop_mapping(
    mapping_id: int,
    body: CfopMappingUpdate,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = _resolve_tenant(current_user, tenant_id)
    result = await db.execute(
        select(CfopMapping).where(CfopMapping.id == mapping_id, CfopMapping.tenant_id == tid)
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapeamento não encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(mapping, field, value)
    await db.commit()
    await db.refresh(mapping)
    return mapping


@router.delete("/cfop-mappings/{mapping_id}", status_code=204)
async def delete_cfop_mapping(
    mapping_id: int,
    tenant_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_office_user),
):
    tid = _resolve_tenant(current_user, tenant_id)
    result = await db.execute(
        select(CfopMapping).where(CfopMapping.id == mapping_id, CfopMapping.tenant_id == tid)
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapeamento não encontrado")
    mapping.is_active = False
    await db.commit()
