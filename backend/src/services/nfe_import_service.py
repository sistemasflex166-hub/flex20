"""
Serviço de importação de XML NF-e modelo 55.

Regras de negócio:
- Identifica a empresa pelo CNPJ do emitente (saída) ou destinatário (entrada)
- Se o CNPJ não pertencer a nenhuma empresa do tenant, lança erro
- Controle de duplicidade por (company_id, document_number, document_series)
- on_duplicate: "skip" ignora, "overwrite" substitui o lançamento existente
- CFOP de entrada é resolvido via tabela de mapeamento (de-para)
- Parceiro (fornecedor/cliente) é criado ou atualizado com dados do XML
- Produto é criado ou localizado pelo cProd + company_id
- Código do parceiro é sequencial imutável por empresa
"""
from datetime import date
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.company import Company
from src.models.cfop_mapping import CfopMapping
from src.models.fiscal_base import Product
from src.models.fiscal_entry import FiscalEntry, FiscalEntryItem
from src.models.partner import Partner
from src.services.nfe_parser import NFeData, NFeItem, NFeParte, NFeEndereco, parse_nfe_xml
from src.services.fiscal_entry_service import _next_code


OnDuplicate = Literal["skip", "overwrite"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean_doc(value: str | None) -> str | None:
    if value is None:
        return None
    import re
    return re.sub(r"\D", "", value) or None


def _parse_date(iso_str: str) -> date:
    return date.fromisoformat(iso_str[:10])


def _clean_cep(value: str | None) -> str | None:
    if not value:
        return None
    import re
    digits = re.sub(r"\D", "", value)
    return digits[:8] if digits else None


async def _find_company_by_cnpj(cnpj: str, tenant_id: int, db: AsyncSession) -> Company | None:
    clean = _clean_doc(cnpj)
    if not clean:
        return None
    result = await db.execute(
        select(Company).where(
            Company.tenant_id == tenant_id,
            Company.cnpj == clean,
            Company.is_active == True,
        )
    )
    return result.scalar_one_or_none()


async def _find_cfop_mapping(
    cfop_origin: str, tenant_id: int, company_id: int, db: AsyncSession
) -> str | None:
    # Busca específico por empresa primeiro, depois geral do tenant
    result = await db.execute(
        select(CfopMapping).where(
            CfopMapping.tenant_id == tenant_id,
            CfopMapping.cfop_origin == cfop_origin,
            CfopMapping.is_active == True,
            CfopMapping.company_id == company_id,
        )
    )
    mapping = result.scalar_one_or_none()
    if mapping:
        return mapping.cfop_destination

    result = await db.execute(
        select(CfopMapping).where(
            CfopMapping.tenant_id == tenant_id,
            CfopMapping.cfop_origin == cfop_origin,
            CfopMapping.is_active == True,
            CfopMapping.company_id == None,  # noqa: E711
        )
    )
    mapping = result.scalar_one_or_none()
    return mapping.cfop_destination if mapping else None


async def _find_existing_entry(
    company_id: int, document_number: str, document_series: str, db: AsyncSession
) -> FiscalEntry | None:
    result = await db.execute(
        select(FiscalEntry).options(selectinload(FiscalEntry.items)).where(
            FiscalEntry.company_id == company_id,
            FiscalEntry.document_number == document_number,
            FiscalEntry.document_series == document_series,
            FiscalEntry.is_active == True,
        )
    )
    return result.scalar_one_or_none()


async def _next_partner_code(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(Partner.code)).where(Partner.company_id == company_id)
    )
    current = result.scalar()
    return (current or 0) + 1


async def _find_or_create_partner(
    parte: NFeParte,
    partner_type: str,       # "fornecedor" | "cliente"
    company_id: int,
    tenant_id: int,
    db: AsyncSession,
) -> Partner | None:
    cnpj_cpf = _clean_doc(parte.cnpj or parte.cpf)
    if not cnpj_cpf and not parte.nome:
        return None

    # Busca existente pelo documento (dentro da mesma empresa)
    partner: Partner | None = None
    if cnpj_cpf:
        result = await db.execute(
            select(Partner).where(
                Partner.company_id == company_id,
                Partner.cnpj_cpf == cnpj_cpf,
            )
        )
        partner = result.scalar_one_or_none()

    # Determina person_type pelo tamanho do doc
    person_type = "juridica" if len(cnpj_cpf or "") == 14 else "fisica"

    # Dados de endereço
    ender: NFeEndereco | None = parte.endereco
    address = ender.logradouro if ender else None
    address_number = ender.numero if ender else None
    complement = ender.complemento if ender else None
    neighborhood = ender.bairro if ender else None
    city = ender.municipio if ender else None
    state = ender.uf if ender else None
    zip_code = _clean_cep(ender.cep if ender else None)

    if partner:
        # Atualiza dados que podem ter mudado
        partner.name = parte.nome or partner.name
        if parte.nome_fantasia:
            partner.trade_name = parte.nome_fantasia
        if parte.ie:
            partner.state_registration = parte.ie
        if address:
            partner.address = address
            partner.address_number = address_number
            partner.complement = complement
            partner.neighborhood = neighborhood
            partner.city = city
            partner.state = state
        if zip_code:
            partner.zip_code = zip_code
        # Se já é fornecedor e agora é cliente (ou vice-versa), marca como ambos
        if partner.partner_type != partner_type and partner.partner_type != "ambos":
            partner.partner_type = "ambos"
    else:
        code = await _next_partner_code(company_id, db)
        partner = Partner(
            code=code,
            company_id=company_id,
            tenant_id=tenant_id,
            partner_type=partner_type,
            person_type=person_type,
            name=parte.nome or "Sem nome",
            trade_name=parte.nome_fantasia,
            cnpj_cpf=cnpj_cpf,
            state_registration=parte.ie,
            address=address,
            address_number=address_number,
            complement=complement,
            neighborhood=neighborhood,
            city=city,
            state=state,
            zip_code=zip_code,
            is_active=True,
        )
        db.add(partner)
        await db.flush()

    return partner


async def _find_or_create_product(
    c_prod: str,
    description: str,
    ncm: str | None,
    unit: str,
    unit_price: float,
    company_id: int,
    tenant_id: int,
    db: AsyncSession,
) -> Product | None:
    if not c_prod:
        return None

    result = await db.execute(
        select(Product).where(
            Product.company_id == company_id,
            Product.code == c_prod,
        )
    )
    product = result.scalar_one_or_none()

    if product:
        # Atualiza descrição e NCM se mudaram
        product.name = description or product.name
        if ncm:
            product.ncm = ncm
        product.unit = unit or product.unit
    else:
        product = Product(
            company_id=company_id,
            tenant_id=tenant_id,
            code=c_prod,
            name=description,
            ncm=ncm,
            unit=unit or "UN",
            price=unit_price,
            is_active=True,
        )
        db.add(product)
        await db.flush()

    return product


# ---------------------------------------------------------------------------
# Construção dos itens do lançamento
# ---------------------------------------------------------------------------

async def _build_items_async(
    nfe_items: list[NFeItem],
    entry_id: int,
    company_id: int,
    tenant_id: int,
    cfop_map: dict[str, str],
    is_purchase: bool,
    db: AsyncSession,
) -> list[FiscalEntryItem]:
    items = []
    for nfe_item in nfe_items:
        cfop_code = cfop_map.get(nfe_item.cfop, nfe_item.cfop) if is_purchase else nfe_item.cfop

        # Cria ou localiza produto pelo cProd
        product = await _find_or_create_product(
            c_prod=nfe_item.code or "",
            description=nfe_item.description,
            ncm=nfe_item.ncm,
            unit=nfe_item.unit,
            unit_price=float(nfe_item.unit_price),
            company_id=company_id,
            tenant_id=tenant_id,
            db=db,
        )

        trib = nfe_item.tributos
        item = FiscalEntryItem(
            entry_id=entry_id,
            company_id=company_id,
            tenant_id=tenant_id,
            product_id=product.id if product else None,
            description=nfe_item.description,
            ncm=nfe_item.ncm,
            quantity=float(nfe_item.quantity),
            unit=nfe_item.unit,
            unit_price=float(nfe_item.unit_price),
            discount=float(nfe_item.discount),
            total=float(nfe_item.total_net),
            icms_cst=trib.icms_csosn or trib.icms_cst,
            icms_base=float(trib.icms_base),
            icms_rate=float(trib.icms_rate),
            icms_value=float(trib.icms_value),
            pis_cst=trib.pis_cst,
            pis_rate=float(trib.pis_rate),
            pis_value=float(trib.pis_value),
            cofins_cst=trib.cofins_cst,
            cofins_rate=float(trib.cofins_rate),
            cofins_value=float(trib.cofins_value),
        )
        items.append(item)
    return items


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------

async def preview_nfe_xml(
    xml_content: bytes,
    tenant_id: int,
    db: AsyncSession,
) -> dict:
    nfe = parse_nfe_xml(xml_content)

    emit_cnpj = _clean_doc(nfe.emit.cnpj)
    dest_cnpj = _clean_doc(nfe.dest.cnpj)

    company = None
    is_purchase = False

    if emit_cnpj:
        company = await _find_company_by_cnpj(emit_cnpj, tenant_id, db)
    if company:
        is_purchase = False
    else:
        if dest_cnpj:
            company = await _find_company_by_cnpj(dest_cnpj, tenant_id, db)
        if company:
            is_purchase = True

    cnpj_not_found = company is None
    cnpj_in_file = emit_cnpj or dest_cnpj or "?"

    existing = None
    if company:
        existing = await _find_existing_entry(company.id, nfe.numero, nfe.serie, db)

    unmapped_cfops: list[str] = []
    if company and is_purchase:
        for cfop in {item.cfop for item in nfe.itens}:
            mapped = await _find_cfop_mapping(cfop, tenant_id, company.id, db)
            if not mapped:
                unmapped_cfops.append(cfop)

    return {
        "chave": nfe.chave,
        "numero": nfe.numero,
        "serie": nfe.serie,
        "nat_op": nfe.nat_op,
        "dh_emi": nfe.dh_emi,
        "tp_amb": nfe.tp_amb,
        "is_purchase": is_purchase,
        "emit": {
            "cnpj": emit_cnpj,
            "nome": nfe.emit.nome,
            "uf": nfe.emit.endereco.uf if nfe.emit.endereco else None,
        },
        "dest": {
            "cnpj_cpf": dest_cnpj or _clean_doc(nfe.dest.cpf),
            "nome": nfe.dest.nome,
            "uf": nfe.dest.endereco.uf if nfe.dest.endereco else None,
        },
        "company_id": company.id if company else None,
        "company_name": company.name if company else None,
        "cnpj_not_found": cnpj_not_found,
        "cnpj_in_file": cnpj_in_file,
        "already_imported": existing is not None,
        "existing_entry_id": existing.id if existing else None,
        "unmapped_cfops": unmapped_cfops,
        "totais": {
            "v_prod": str(nfe.totais.v_prod),
            "v_desc": str(nfe.totais.v_desc),
            "v_nf": str(nfe.totais.v_nf),
            "v_icms": str(nfe.totais.v_icms),
            "v_pis": str(nfe.totais.v_pis),
            "v_cofins": str(nfe.totais.v_cofins),
        },
        "itens": [
            {
                "n_item": i.n_item,
                "c_prod": i.code,
                "description": i.description,
                "ncm": i.ncm,
                "cfop": i.cfop,
                "quantity": str(i.quantity),
                "unit": i.unit,
                "unit_price": str(i.unit_price),
                "total_net": str(i.total_net),
            }
            for i in nfe.itens
        ],
    }


# ---------------------------------------------------------------------------
# Importação
# ---------------------------------------------------------------------------

async def import_nfe_xml(
    xml_content: bytes,
    tenant_id: int,
    on_duplicate: OnDuplicate,
    db: AsyncSession,
) -> FiscalEntry:
    nfe = parse_nfe_xml(xml_content)

    emit_cnpj = _clean_doc(nfe.emit.cnpj)
    dest_cnpj = _clean_doc(nfe.dest.cnpj)

    company: Company | None = None
    is_purchase = False

    if emit_cnpj:
        company = await _find_company_by_cnpj(emit_cnpj, tenant_id, db)
    if company:
        is_purchase = False
    else:
        if dest_cnpj:
            company = await _find_company_by_cnpj(dest_cnpj, tenant_id, db)
        if company:
            is_purchase = True

    if company is None:
        cnpj_in_file = emit_cnpj or dest_cnpj or "?"
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Nenhuma empresa cadastrada com CNPJ {cnpj_in_file} neste escritório.",
        )

    # Parceiro correto conforme direção da nota
    if is_purchase:
        # Entrada: emitente é o fornecedor
        partner = await _find_or_create_partner(
            nfe.emit, "fornecedor", company.id, tenant_id, db
        )
        partner_name = nfe.emit.nome
        partner_cnpj = emit_cnpj
    else:
        # Saída: destinatário é o cliente
        partner = await _find_or_create_partner(
            nfe.dest, "cliente", company.id, tenant_id, db
        )
        partner_name = nfe.dest.nome
        partner_cnpj = dest_cnpj or _clean_doc(nfe.dest.cpf)

    # Mapeamento CFOP para entrada
    cfop_map: dict[str, str] = {}
    if is_purchase:
        for cfop in {item.cfop for item in nfe.itens}:
            mapped = await _find_cfop_mapping(cfop, tenant_id, company.id, db)
            if mapped:
                cfop_map[cfop] = mapped

    entry_type = "purchase" if is_purchase else "sale"
    entry_date = _parse_date(nfe.dh_emi)

    entry_fields = dict(
        entry_type=entry_type,
        entry_date=entry_date,
        competence_date=entry_date,
        document_number=nfe.numero,
        document_series=nfe.serie,
        document_model="55",
        access_key=nfe.chave or None,
        partner_id=partner.id if partner else None,
        partner_name=partner_name,
        partner_cnpj_cpf=partner_cnpj,
        total_products=float(nfe.totais.v_prod),
        total_discount=float(nfe.totais.v_desc),
        total_other=float(nfe.totais.v_outro),
        total_gross=float(nfe.totais.v_nf),
        icms_base=float(nfe.totais.v_bc),
        icms_value=float(nfe.totais.v_icms),
        pis_value=float(nfe.totais.v_pis),
        cofins_value=float(nfe.totais.v_cofins),
    )

    # Duplicidade
    existing = await _find_existing_entry(company.id, nfe.numero, nfe.serie, db)
    if existing:
        if on_duplicate == "skip":
            return existing
        for item in list(existing.items):
            await db.delete(item)
        for field, value in entry_fields.items():
            setattr(existing, field, value)
        existing.is_active = True
        entry = existing
        await db.flush()
    else:
        entry = FiscalEntry(
            code=await _next_code(company.id, db),
            company_id=company.id,
            tenant_id=tenant_id,
            **entry_fields,
        )
        db.add(entry)
        await db.flush()

    # Itens com criação/vinculação de produtos
    items = await _build_items_async(
        nfe.itens, entry.id, company.id, tenant_id, cfop_map, is_purchase, db
    )
    for item in items:
        db.add(item)

    await db.commit()

    result = await db.execute(
        select(FiscalEntry).options(selectinload(FiscalEntry.items)).where(FiscalEntry.id == entry.id)
    )
    return result.scalar_one()
