"""
Serviço de importação de XML NFS-e padrão nacional.

Regras de negócio:
- Emitente (emit.CNPJ) = prestador = empresa cadastrada → serviço_prestado (saída)
- Tomador (toma.CNPJ)  = empresa cadastrada            → serviço_tomado   (entrada)
- Controle de duplicidade por (company_id, document_number, document_series, document_model='NFS-e')
- Parceiro (tomador se prestado, prestador se tomado) criado/atualizado com dados do XML
- on_duplicate: "skip" ignora, "overwrite" substitui
"""
import re
from datetime import date
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.company import Company
from src.models.fiscal_entry import FiscalEntry, FiscalEntryItem
from src.models.fiscal_base import ServiceItem
from src.models.partner import Partner
from src.services.nfse_parser import NfseData, NfseParte, parse_nfse_xml
from src.services.fiscal_entry_service import _next_code

OnDuplicate = Literal["skip", "overwrite"]


def _clean_doc(value: str | None) -> str | None:
    if value is None:
        return None
    return re.sub(r"\D", "", value) or None


def _clean_cep(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    return digits[:8] if digits else None


def _parse_date(iso_str: str) -> date:
    return date.fromisoformat(iso_str[:10])


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


async def _next_partner_code(company_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(Partner.code)).where(Partner.company_id == company_id)
    )
    current = result.scalar()
    return (current or 0) + 1


async def _find_or_create_partner(
    parte: NfseParte,
    partner_type: str,
    company_id: int,
    tenant_id: int,
    db: AsyncSession,
) -> Partner | None:
    cnpj_cpf = _clean_doc(parte.cnpj or parte.cpf)
    if not cnpj_cpf and not parte.nome:
        return None

    partner: Partner | None = None
    if cnpj_cpf:
        result = await db.execute(
            select(Partner).where(
                Partner.company_id == company_id,
                Partner.cnpj_cpf == cnpj_cpf,
            )
        )
        partner = result.scalar_one_or_none()

    person_type = "juridica" if len(cnpj_cpf or "") == 14 else "fisica"
    zip_code = _clean_cep(parte.cep)

    if partner:
        partner.name = parte.nome or partner.name
        if parte.logradouro:
            partner.address = parte.logradouro
            partner.address_number = parte.numero
            partner.complement = parte.complemento
            partner.neighborhood = parte.bairro
            partner.state = parte.uf
        if zip_code:
            partner.zip_code = zip_code
        if parte.fone:
            partner.phone = parte.fone
        if parte.email:
            partner.email = parte.email
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
            cnpj_cpf=cnpj_cpf,
            address=parte.logradouro,
            address_number=parte.numero,
            complement=parte.complemento,
            neighborhood=parte.bairro,
            state=parte.uf,
            zip_code=zip_code,
            phone=parte.fone,
            email=parte.email,
            is_active=True,
        )
        db.add(partner)
        await db.flush()

    return partner


async def _find_service_item_by_code(
    cod_serv: str | None,
    company_id: int,
    db: AsyncSession,
) -> ServiceItem | None:
    """
    Busca ServiceItem pelo cTribNac do XML.
    Estratégia de match em ordem de prioridade:
      1. service_code exato (ex: "171901" == "171901")
      2. service_code prefixo do cTribNac (ex: "1719" é prefixo de "171901")
      3. cTribNac começa com service_code (mesmo caso acima, via LIKE)
      4. code do cadastro == cTribNac
    """
    if not cod_serv:
        return None
    clean = cod_serv.strip()

    # 1. Match exato
    result = await db.execute(
        select(ServiceItem).where(
            ServiceItem.company_id == company_id,
            ServiceItem.is_active == True,
            ServiceItem.service_code == clean,
        )
    )
    item = result.scalar_one_or_none()
    if item:
        return item

    # 2. cTribNac começa com o service_code cadastrado (match por prefixo)
    from sqlalchemy import func as sqlfunc
    result2 = await db.execute(
        select(ServiceItem).where(
            ServiceItem.company_id == company_id,
            ServiceItem.is_active == True,
            ServiceItem.service_code.isnot(None),
            sqlfunc.length(ServiceItem.service_code) > 0,
        )
    )
    candidates = list(result2.scalars().all())
    for candidate in candidates:
        sc = (candidate.service_code or "").strip()
        if sc and (clean.startswith(sc) or sc.startswith(clean)):
            return candidate

    # 3. Pelo campo 'code' do cadastro
    result3 = await db.execute(
        select(ServiceItem).where(
            ServiceItem.company_id == company_id,
            ServiceItem.is_active == True,
            ServiceItem.code == clean,
        )
    )
    return result3.scalar_one_or_none()


async def _find_existing_entry(
    company_id: int, document_number: str, document_series: str, db: AsyncSession
) -> FiscalEntry | None:
    result = await db.execute(
        select(FiscalEntry).where(
            FiscalEntry.company_id == company_id,
            FiscalEntry.document_number == document_number,
            FiscalEntry.document_series == document_series,
            FiscalEntry.document_model == "NFS-e",
            FiscalEntry.is_active == True,
        )
    )
    return result.scalar_one_or_none()


async def preview_nfse_xml(xml_content: bytes, tenant_id: int, db: AsyncSession) -> dict:
    nfse = parse_nfse_xml(xml_content)

    emit_cnpj = _clean_doc(nfse.emit.cnpj)
    toma_cnpj = _clean_doc(nfse.toma.cnpj or nfse.toma.cpf)

    company = None
    is_provided = False  # True = serviço prestado (saída), False = serviço tomado (entrada)

    if emit_cnpj:
        company = await _find_company_by_cnpj(emit_cnpj, tenant_id, db)
    if company:
        is_provided = True
    else:
        if toma_cnpj:
            company = await _find_company_by_cnpj(toma_cnpj, tenant_id, db)
        if company:
            is_provided = False

    existing = None
    if company:
        existing = await _find_existing_entry(company.id, nfse.n_nfse, nfse.serie, db)

    v = nfse.valores
    return {
        "tipo": "NFS-e",
        "n_nfse": nfse.n_nfse,
        "n_dps": nfse.n_dps,
        "serie": nfse.serie,
        "chave": nfse.chave,
        "dh_emi": nfse.dh_emi,
        "d_compet": nfse.d_compet,
        "tp_amb": nfse.tp_amb,
        "is_provided": is_provided,
        "emit": {"cnpj": emit_cnpj, "nome": nfse.emit.nome, "uf": nfse.emit.uf},
        "toma": {"cnpj_cpf": toma_cnpj, "nome": nfse.toma.nome, "uf": nfse.toma.uf},
        "company_id": company.id if company else None,
        "company_name": company.name if company else None,
        "cnpj_not_found": company is None,
        "cnpj_in_file": emit_cnpj or toma_cnpj or "?",
        "already_imported": existing is not None,
        "existing_entry_id": existing.id if existing else None,
        "cod_serv": nfse.cod_serv,
        "desc_serv": nfse.desc_serv,
        "totais": {
            "v_serv": str(v.v_serv),
            "v_issqn": str(v.v_issqn),
            "p_aliq_issqn": str(v.p_aliq_issqn),
            "v_pis": str(v.v_pis),
            "v_cofins": str(v.v_cofins),
            "v_irrf": str(v.v_irrf),
            "v_csll": str(v.v_csll),
            "v_total_ret": str(v.v_total_ret),
            "v_liq": str(v.v_liq),
            "iss_retido": v.iss_retido,
        },
    }


async def import_nfse_xml(
    xml_content: bytes,
    tenant_id: int,
    on_duplicate: OnDuplicate,
    db: AsyncSession,
) -> FiscalEntry:
    nfse = parse_nfse_xml(xml_content)

    emit_cnpj = _clean_doc(nfse.emit.cnpj)
    toma_cnpj = _clean_doc(nfse.toma.cnpj or nfse.toma.cpf)

    company: Company | None = None
    is_provided = False

    if emit_cnpj:
        company = await _find_company_by_cnpj(emit_cnpj, tenant_id, db)
    if company:
        is_provided = True
    else:
        if toma_cnpj:
            company = await _find_company_by_cnpj(toma_cnpj, tenant_id, db)
        if company:
            is_provided = False

    if company is None:
        cnpj_in_file = emit_cnpj or toma_cnpj or "?"
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Nenhuma empresa cadastrada com CNPJ {cnpj_in_file} neste escritório.",
        )

    # Parceiro: tomador se prestado, prestador se tomado
    if is_provided:
        partner = await _find_or_create_partner(nfse.toma, "cliente", company.id, tenant_id, db)
        partner_name = nfse.toma.nome
        partner_cnpj = toma_cnpj
    else:
        partner = await _find_or_create_partner(nfse.emit, "fornecedor", company.id, tenant_id, db)
        partner_name = nfse.emit.nome
        partner_cnpj = emit_cnpj

    entry_type = "service_provided" if is_provided else "service_taken"
    entry_date = _parse_date(nfse.dh_emi)
    compet_date = _parse_date(nfse.d_compet)
    v = nfse.valores

    entry_fields = dict(
        entry_type=entry_type,
        entry_date=entry_date,
        competence_date=compet_date,
        document_number=nfse.n_nfse,
        document_series=nfse.serie,
        document_model="NFS-e",
        access_key=(nfse.chave or None)[:44] if nfse.chave else None,
        partner_id=partner.id if partner else None,
        partner_name=partner_name,
        partner_cnpj_cpf=partner_cnpj,
        total_services=float(v.v_serv),
        total_gross=float(v.v_liq),
        iss_value=float(v.v_issqn),
        pis_value=float(v.v_pis),
        cofins_value=float(v.v_cofins),
    )

    service_item = await _find_service_item_by_code(nfse.cod_serv, company.id, db)

    existing = await _find_existing_entry(company.id, nfse.n_nfse, nfse.serie, db)
    if existing:
        if on_duplicate == "skip":
            return existing
        for field, value in entry_fields.items():
            setattr(existing, field, value)
        existing.is_active = True
        entry = existing
        await db.flush()
        # Remove itens anteriores para recriar com dados atualizados
        old_items_result = await db.execute(
            select(FiscalEntryItem).where(FiscalEntryItem.entry_id == entry.id)
        )
        for old_item in old_items_result.scalars().all():
            await db.delete(old_item)
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

    # Cria item representando o serviço importado
    item = FiscalEntryItem(
        entry_id=entry.id,
        company_id=company.id,
        tenant_id=tenant_id,
        service_item_id=service_item.id if service_item else None,
        description=nfse.desc_serv or (service_item.name if service_item else "Serviço"),
        unit="SV",
        quantity=1,
        unit_price=float(v.v_serv),
        total=float(v.v_serv),
        pis_value=float(v.v_pis),
        cofins_value=float(v.v_cofins),
    )
    db.add(item)

    await db.commit()

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(FiscalEntry).options(selectinload(FiscalEntry.items)).where(FiscalEntry.id == entry.id)
    )
    return result.scalar_one()
