"""
Parser de XML NFS-e padrão nacional (http://www.sped.fazenda.gov.br/nfse).
Suporta o layout gerado pelo emissor nacional (nfse.gov.br) versão 1.01.
"""
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

NS = "http://www.sped.fazenda.gov.br/nfse"


def _tag(el: ET.Element, *path: str) -> Optional[ET.Element]:
    """Navega por múltiplos níveis de tags no namespace."""
    cur = el
    for tag in path:
        found = cur.find(f"{{{NS}}}{tag}")
        if found is None:
            return None
        cur = found
    return cur


def _t(el: ET.Element, *path: str) -> Optional[str]:
    node = _tag(el, *path)
    return node.text.strip() if node is not None and node.text else None


def _d(el: ET.Element, *path: str) -> Decimal:
    val = _t(el, *path)
    return Decimal(val) if val else Decimal("0")


@dataclass
class NfseParte:
    cnpj: Optional[str]
    cpf: Optional[str]
    nome: Optional[str]
    logradouro: Optional[str]
    numero: Optional[str]
    complemento: Optional[str]
    bairro: Optional[str]
    cod_municipio: Optional[str]
    uf: Optional[str]
    cep: Optional[str]
    fone: Optional[str]
    email: Optional[str]


@dataclass
class NfseValores:
    v_serv: Decimal          # valor bruto do serviço
    v_bc_issqn: Decimal      # base de cálculo ISS
    p_aliq_issqn: Decimal    # alíquota ISS (ex: 2.00 = 2%)
    v_issqn: Decimal         # valor ISS
    v_total_ret: Decimal     # total de retenções federais
    v_liq: Decimal           # valor líquido
    v_pis: Decimal
    v_cofins: Decimal
    v_irrf: Decimal
    v_csll: Decimal
    p_aliq_pis: Decimal
    p_aliq_cofins: Decimal
    iss_retido: bool         # True = ISS retido na fonte


@dataclass
class NfseData:
    # Identificação
    n_nfse: str              # número da NFS-e
    n_dps: str               # número do DPS (RPS)
    serie: str
    chave: str               # Id do infNFSe
    dh_emi: str              # data/hora emissão (ISO)
    d_compet: str            # competência (YYYY-MM-DD)
    tp_amb: str              # 1=producao, 2=homologacao

    # Partes
    emit: NfseParte          # emitente (prestador)
    toma: NfseParte          # tomador

    # Serviço
    cod_serv: Optional[str]  # cTribNac (LC 116)
    desc_serv: Optional[str] # xDescServ
    loc_prest: Optional[str] # cLocPrestacao (IBGE)
    cnae: Optional[str]

    valores: NfseValores

    # Regime tributário do prestador
    opc_simples_nac: Optional[str]  # opSimpNac: 1=SN, 2=não optante


def _parse_parte_emit(root: ET.Element) -> NfseParte:
    """Lê <emit> da raiz NFSe (dados completos com endereço)."""
    emit = _tag(root, "infNFSe", "emit")
    if emit is None:
        return NfseParte(None, None, None, None, None, None, None, None, None, None, None, None)

    cnpj = _t(emit, "CNPJ")
    cpf = _t(emit, "CPF")
    nome = _t(emit, "xNome")
    fone = _t(emit, "fone")
    email = _t(emit, "email")

    ender = _tag(emit, "enderNac")
    logradouro = _t(ender, "xLgr") if ender is not None else None
    numero = _t(ender, "nro") if ender is not None else None
    complemento = _t(ender, "xCpl") if ender is not None else None
    bairro = _t(ender, "xBairro") if ender is not None else None
    cod_mun = _t(ender, "cMun") if ender is not None else None
    uf = _t(ender, "UF") if ender is not None else None
    cep = _t(ender, "CEP") if ender is not None else None

    return NfseParte(
        cnpj=cnpj, cpf=cpf, nome=nome,
        logradouro=logradouro, numero=numero, complemento=complemento,
        bairro=bairro, cod_municipio=cod_mun, uf=uf, cep=cep,
        fone=fone, email=email,
    )


def _parse_parte_toma(dps: ET.Element) -> NfseParte:
    """Lê <toma> dentro de <infDPS>."""
    inf = _tag(dps, "infDPS")
    toma = _tag(inf, "toma") if inf is not None else None
    if toma is None:
        return NfseParte(None, None, None, None, None, None, None, None, None, None, None, None)

    cnpj = _t(toma, "CNPJ")
    cpf = _t(toma, "CPF")
    nome = _t(toma, "xNome")
    fone = _t(toma, "fone")
    email = _t(toma, "email")

    end = _tag(toma, "end")
    logradouro = _t(end, "xLgr") if end is not None else None
    numero = _t(end, "nro") if end is not None else None
    complemento = _t(end, "xCpl") if end is not None else None
    bairro = _t(end, "xBairro") if end is not None else None
    uf = None
    cep = None
    cod_mun = None

    # endNac dentro de end
    end_nac = _tag(end, "endNac") if end is not None else None
    if end_nac is not None:
        cod_mun = _t(end_nac, "cMun")
        cep = _t(end_nac, "CEP")
        uf = _t(end_nac, "UF")

    return NfseParte(
        cnpj=cnpj, cpf=cpf, nome=nome,
        logradouro=logradouro, numero=numero, complemento=complemento,
        bairro=bairro, cod_municipio=cod_mun, uf=uf, cep=cep,
        fone=fone, email=email,
    )


def parse_nfse_xml(content: bytes) -> NfseData:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise ValueError(f"XML inválido: {exc}") from exc

    # Suporta root direto <NFSe> ou wrapper <compNfse>/<nfseProc>
    local = root.tag.split("}")[-1] if "}" in root.tag else root.tag
    if local in ("compNfse", "nfseProc", "ConsultarNfseResposta"):
        nfse_el = root.find(f"{{{NS}}}NFSe")
        if nfse_el is None:
            raise ValueError("Tag <NFSe> não encontrada no XML")
        root = nfse_el
    elif local != "NFSe":
        raise ValueError(f"XML não reconhecido como NFS-e nacional (root: {local})")

    inf_nfse = _tag(root, "infNFSe")
    if inf_nfse is None:
        raise ValueError("Tag <infNFSe> não encontrada")

    dps_el = _tag(inf_nfse, "DPS")
    if dps_el is None:
        raise ValueError("Tag <DPS> não encontrada dentro de <infNFSe>")

    inf_dps = _tag(dps_el, "infDPS")
    if inf_dps is None:
        raise ValueError("Tag <infDPS> não encontrada")

    # Identificação
    n_nfse = _t(inf_nfse, "nNFSe") or ""
    n_dps = _t(inf_dps, "nDPS") or ""
    serie = _t(inf_dps, "serie") or ""
    chave = inf_nfse.get("Id", "")
    dh_emi = _t(inf_dps, "dhEmi") or ""
    d_compet = _t(inf_dps, "dCompet") or dh_emi[:10]
    tp_amb = _t(inf_dps, "tpAmb") or "1"

    # Partes
    emit = _parse_parte_emit(root)
    toma = _parse_parte_toma(dps_el)

    # Serviço
    serv = _tag(inf_dps, "serv")
    cod_serv = _t(serv, "cServ", "cTribNac") if serv is not None else None
    cnae = _t(serv, "cServ", "cNAT") if serv is not None else None
    desc_serv = _t(serv, "cServ", "xDescServ") if serv is not None else None
    loc_prest = _t(serv, "locPrest", "cLocPrestacao") if serv is not None else None

    # Regime tributário
    prest = _tag(inf_dps, "prest")
    opc_simples = _t(prest, "regTrib", "opSimpNac") if prest is not None else None

    # Valores — lê da raiz infNFSe para os totais já calculados pela SEFAZ
    val_raiz = _tag(inf_nfse, "valores")
    v_bc = _d(val_raiz, "vBC") if val_raiz is not None else Decimal("0")
    p_aliq = _d(val_raiz, "pAliqAplic") if val_raiz is not None else Decimal("0")
    v_issqn = _d(val_raiz, "vISSQN") if val_raiz is not None else Decimal("0")
    v_total_ret = _d(val_raiz, "vTotalRet") if val_raiz is not None else Decimal("0")
    v_liq = _d(val_raiz, "vLiq") if val_raiz is not None else Decimal("0")

    # Valores de serviço e tributos federais ficam no DPS
    val_dps = _tag(inf_dps, "valores")
    v_serv = _d(val_dps, "vServPrest", "vServ") if val_dps is not None else v_bc

    trib = _tag(val_dps, "trib") if val_dps is not None else None
    trib_fed = _tag(trib, "tribFed") if trib is not None else None
    pisc = _tag(trib_fed, "piscofins") if trib_fed is not None else None

    p_aliq_pis = _d(pisc, "pAliqPis") if pisc is not None else Decimal("0")
    p_aliq_cofins = _d(pisc, "pAliqCofins") if pisc is not None else Decimal("0")
    v_pis = _d(pisc, "vPis") if pisc is not None else Decimal("0")
    v_cofins = _d(pisc, "vCofins") if pisc is not None else Decimal("0")
    v_irrf = _d(trib_fed, "vRetIRRF") if trib_fed is not None else Decimal("0")
    v_csll = _d(trib_fed, "vRetCSLL") if trib_fed is not None else Decimal("0")

    # ISS retido: tpRetISSQN == 1
    trib_mun = _tag(trib, "tribMun") if trib is not None else None
    tp_ret = _t(trib_mun, "tpRetISSQN") if trib_mun is not None else None
    iss_retido = tp_ret == "1"

    valores = NfseValores(
        v_serv=v_serv,
        v_bc_issqn=v_bc,
        p_aliq_issqn=p_aliq,
        v_issqn=v_issqn,
        v_total_ret=v_total_ret,
        v_liq=v_liq,
        v_pis=v_pis,
        v_cofins=v_cofins,
        v_irrf=v_irrf,
        v_csll=v_csll,
        p_aliq_pis=p_aliq_pis,
        p_aliq_cofins=p_aliq_cofins,
        iss_retido=iss_retido,
    )

    return NfseData(
        n_nfse=n_nfse,
        n_dps=n_dps,
        serie=serie,
        chave=chave,
        dh_emi=dh_emi,
        d_compet=d_compet,
        tp_amb=tp_amb,
        emit=emit,
        toma=toma,
        cod_serv=cod_serv,
        desc_serv=desc_serv,
        loc_prest=loc_prest,
        cnae=cnae,
        valores=valores,
        opc_simples_nac=opc_simples,
    )
