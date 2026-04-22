"""
Parser de XML NF-e modelo 55 (nfeProc versão 4.00).
Retorna um dicionário estruturado com todos os dados relevantes para importação fiscal.
"""
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

NS = "http://www.portalfiscal.inf.br/nfe"


def _t(element: ET.Element, tag: str) -> Optional[str]:
    """Retorna o texto de um sub-elemento ou None."""
    el = element.find(f"{{{NS}}}{tag}")
    return el.text if el is not None else None


def _d(element: ET.Element, tag: str) -> Decimal:
    val = _t(element, tag)
    return Decimal(val) if val else Decimal("0")


@dataclass
class NFeItemTributo:
    icms_csosn: Optional[str] = None
    icms_cst: Optional[str] = None
    icms_base: Decimal = Decimal("0")
    icms_rate: Decimal = Decimal("0")
    icms_value: Decimal = Decimal("0")
    pis_cst: Optional[str] = None
    pis_base: Decimal = Decimal("0")
    pis_rate: Decimal = Decimal("0")
    pis_value: Decimal = Decimal("0")
    cofins_cst: Optional[str] = None
    cofins_base: Decimal = Decimal("0")
    cofins_rate: Decimal = Decimal("0")
    cofins_value: Decimal = Decimal("0")
    ipi_cst: Optional[str] = None
    ipi_value: Decimal = Decimal("0")
    total_trib: Decimal = Decimal("0")


@dataclass
class NFeItem:
    n_item: int = 0
    code: Optional[str] = None
    description: str = ""
    ncm: Optional[str] = None
    cfop: str = ""
    unit: str = "UN"
    quantity: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    total_product: Decimal = Decimal("0")
    discount: Decimal = Decimal("0")
    total_net: Decimal = Decimal("0")
    tributos: NFeItemTributo = field(default_factory=NFeItemTributo)


@dataclass
class NFeEndereco:
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cod_municipio: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None


@dataclass
class NFeParte:
    """Emitente ou destinatário."""
    cnpj: Optional[str] = None
    cpf: Optional[str] = None
    nome: str = ""
    nome_fantasia: Optional[str] = None
    ie: Optional[str] = None
    crt: Optional[str] = None
    endereco: Optional[NFeEndereco] = None

    @property
    def cnpj_cpf(self) -> Optional[str]:
        return self.cnpj or self.cpf


@dataclass
class NFeTotais:
    v_bc: Decimal = Decimal("0")
    v_icms: Decimal = Decimal("0")
    v_fcp: Decimal = Decimal("0")
    v_bc_st: Decimal = Decimal("0")
    v_st: Decimal = Decimal("0")
    v_prod: Decimal = Decimal("0")
    v_frete: Decimal = Decimal("0")
    v_seg: Decimal = Decimal("0")
    v_desc: Decimal = Decimal("0")
    v_ipi: Decimal = Decimal("0")
    v_pis: Decimal = Decimal("0")
    v_cofins: Decimal = Decimal("0")
    v_outro: Decimal = Decimal("0")
    v_nf: Decimal = Decimal("0")
    v_tot_trib: Decimal = Decimal("0")


@dataclass
class NFeData:
    # Identificação
    chave: str = ""
    numero: str = ""
    serie: str = ""
    modelo: str = "55"
    nat_op: str = ""
    tp_nf: str = ""          # "0" entrada, "1" saída (perspectiva do emitente)
    dh_emi: str = ""
    dh_sai_ent: str = ""
    tp_amb: str = ""         # "1" produção, "2" homologação
    fin_nfe: str = ""        # "1" normal, "2" complementar, "3" ajuste, "4" devolução

    # Protocolo de autorização
    n_prot: Optional[str] = None
    dh_recbto: Optional[str] = None

    emit: NFeParte = field(default_factory=NFeParte)
    dest: NFeParte = field(default_factory=NFeParte)

    itens: list[NFeItem] = field(default_factory=list)
    totais: NFeTotais = field(default_factory=NFeTotais)


def _parse_endereco(el: ET.Element) -> NFeEndereco:
    return NFeEndereco(
        logradouro=_t(el, "xLgr"),
        numero=_t(el, "nro"),
        complemento=_t(el, "xCpl"),
        bairro=_t(el, "xBairro"),
        cod_municipio=_t(el, "cMun"),
        municipio=_t(el, "xMun"),
        uf=_t(el, "UF"),
        cep=_t(el, "CEP"),
    )


def _parse_parte(el: ET.Element, ender_tag: str) -> NFeParte:
    parte = NFeParte(
        cnpj=_t(el, "CNPJ"),
        cpf=_t(el, "CPF"),
        nome=_t(el, "xNome") or "",
        nome_fantasia=_t(el, "xFant"),
        ie=_t(el, "IE"),
        crt=_t(el, "CRT"),
    )
    ender_el = el.find(f"{{{NS}}}{ender_tag}")
    if ender_el is not None:
        parte.endereco = _parse_endereco(ender_el)
    return parte


def _parse_icms(imposto_el: ET.Element) -> tuple[Optional[str], Optional[str], Decimal, Decimal, Decimal]:
    """Retorna (csosn, cst, base, aliquota, valor)."""
    icms_wrapper = imposto_el.find(f"{{{NS}}}ICMS")
    if icms_wrapper is None:
        return None, None, Decimal("0"), Decimal("0"), Decimal("0")

    # Percorre qualquer variante de ICMS (ICMS00, ICMS10, ICMSSN102, etc.)
    for child in icms_wrapper:
        csosn = child.find(f"{{{NS}}}CSOSN")
        cst_el = child.find(f"{{{NS}}}CST")
        base = _d(child, "vBC")
        rate = _d(child, "pICMS")
        value = _d(child, "vICMS")
        return (
            csosn.text if csosn is not None else None,
            cst_el.text if cst_el is not None else None,
            base, rate, value,
        )
    return None, None, Decimal("0"), Decimal("0"), Decimal("0")


def _parse_pis_cofins(imposto_el: ET.Element, tributo: str) -> tuple[Optional[str], Decimal, Decimal, Decimal]:
    wrapper = imposto_el.find(f"{{{NS}}}{tributo}")
    if wrapper is None:
        return None, Decimal("0"), Decimal("0"), Decimal("0")
    for child in wrapper:
        cst = _t(child, "CST")
        base = _d(child, "vBC")
        rate = _d(child, "pPIS") if tributo == "PIS" else _d(child, "pCOFINS")
        value = _d(child, "vPIS") if tributo == "PIS" else _d(child, "vCOFINS")
        return cst, base, rate, value
    return None, Decimal("0"), Decimal("0"), Decimal("0")


def _parse_ipi(imposto_el: ET.Element) -> tuple[Optional[str], Decimal]:
    ipi_el = imposto_el.find(f"{{{NS}}}IPI")
    if ipi_el is None:
        return None, Decimal("0")
    for child in ipi_el:
        if child.tag.endswith(("IPI", "IPINT")):
            cst = _t(child, "CST")
            value = _d(child, "vIPI")
            return cst, value
    return None, Decimal("0")


def _parse_item(det_el: ET.Element) -> NFeItem:
    n_item = int(det_el.get("nItem", "0"))
    prod_el = det_el.find(f"{{{NS}}}prod")
    if prod_el is None:
        raise ValueError(f"Item {n_item} sem tag <prod>")

    v_prod = _d(prod_el, "vProd")
    v_desc = _d(prod_el, "vDesc")
    item = NFeItem(
        n_item=n_item,
        code=_t(prod_el, "cProd"),
        description=_t(prod_el, "xProd") or "",
        ncm=_t(prod_el, "NCM"),
        cfop=_t(prod_el, "CFOP") or "",
        unit=_t(prod_el, "uCom") or "UN",
        quantity=_d(prod_el, "qCom"),
        unit_price=_d(prod_el, "vUnCom"),
        total_product=v_prod,
        discount=v_desc,
        total_net=v_prod - v_desc,
    )

    imposto_el = det_el.find(f"{{{NS}}}imposto")
    if imposto_el is not None:
        trib = NFeItemTributo()
        trib.total_trib = _d(imposto_el, "vTotTrib")
        csosn, cst, base, rate, value = _parse_icms(imposto_el)
        trib.icms_csosn = csosn
        trib.icms_cst = cst
        trib.icms_base = base
        trib.icms_rate = rate
        trib.icms_value = value
        trib.pis_cst, trib.pis_base, trib.pis_rate, trib.pis_value = _parse_pis_cofins(imposto_el, "PIS")
        trib.cofins_cst, trib.cofins_base, trib.cofins_rate, trib.cofins_value = _parse_pis_cofins(imposto_el, "COFINS")
        trib.ipi_cst, trib.ipi_value = _parse_ipi(imposto_el)
        item.tributos = trib

    return item


def parse_nfe_xml(xml_content: bytes) -> NFeData:
    """Faz o parse do XML NF-e e retorna um NFeData estruturado."""
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:
        raise ValueError(f"XML inválido: {exc}") from exc

    # Suporta tanto <nfeProc> quanto <NFe> direto
    tag = root.tag.replace(f"{{{NS}}}", "")
    if tag == "nfeProc":
        nfe_el = root.find(f"{{{NS}}}NFe")
        prot_el = root.find(f".//{{{NS}}}infProt")
    elif tag == "NFe":
        nfe_el = root
        prot_el = None
    else:
        raise ValueError(f"Raiz XML não reconhecida: {tag}")

    if nfe_el is None:
        raise ValueError("Tag <NFe> não encontrada no XML")

    inf_nfe = nfe_el.find(f"{{{NS}}}infNFe")
    if inf_nfe is None:
        raise ValueError("Tag <infNFe> não encontrada")

    chave = inf_nfe.get("Id", "").replace("NFe", "")

    ide_el = inf_nfe.find(f"{{{NS}}}ide")
    if ide_el is None:
        raise ValueError("Tag <ide> não encontrada")

    data = NFeData(
        chave=chave,
        numero=_t(ide_el, "nNF") or "",
        serie=_t(ide_el, "serie") or "",
        modelo=_t(ide_el, "mod") or "55",
        nat_op=_t(ide_el, "natOp") or "",
        tp_nf=_t(ide_el, "tpNF") or "",
        dh_emi=_t(ide_el, "dhEmi") or "",
        dh_sai_ent=_t(ide_el, "dhSaiEnt") or "",
        tp_amb=_t(ide_el, "tpAmb") or "",
        fin_nfe=_t(ide_el, "finNFe") or "",
    )

    emit_el = inf_nfe.find(f"{{{NS}}}emit")
    if emit_el is not None:
        data.emit = _parse_parte(emit_el, "enderEmit")

    dest_el = inf_nfe.find(f"{{{NS}}}dest")
    if dest_el is not None:
        data.dest = _parse_parte(dest_el, "enderDest")

    for det_el in inf_nfe.findall(f"{{{NS}}}det"):
        data.itens.append(_parse_item(det_el))

    total_el = inf_nfe.find(f".//{{{NS}}}ICMSTot")
    if total_el is not None:
        t = data.totais
        t.v_bc = _d(total_el, "vBC")
        t.v_icms = _d(total_el, "vICMS")
        t.v_fcp = _d(total_el, "vFCP")
        t.v_bc_st = _d(total_el, "vBCST")
        t.v_st = _d(total_el, "vST")
        t.v_prod = _d(total_el, "vProd")
        t.v_frete = _d(total_el, "vFrete")
        t.v_seg = _d(total_el, "vSeg")
        t.v_desc = _d(total_el, "vDesc")
        t.v_ipi = _d(total_el, "vIPI")
        t.v_pis = _d(total_el, "vPIS")
        t.v_cofins = _d(total_el, "vCOFINS")
        t.v_outro = _d(total_el, "vOutro")
        t.v_nf = _d(total_el, "vNF")
        t.v_tot_trib = _d(total_el, "vTotTrib")

    if prot_el is not None:
        data.n_prot = _t(prot_el, "nProt")
        data.dh_recbto = _t(prot_el, "dhRecbto")

    return data
