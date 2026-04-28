from datetime import date, datetime
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Numeric, Integer, Text, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class FiscalEntry(Base):
    """
    Lançamento fiscal (compra, venda, serviço prestado/tomado, etc.).
    Código sequencial imutável por empresa — gerado automaticamente.
    """

    __tablename__ = "fiscal_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[int] = mapped_column(Integer, nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)

    # Tipo: purchase | sale | service_provided | service_taken | transport | other
    entry_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # Datas
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    competence_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Documento fiscal
    document_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    document_series: Mapped[str | None] = mapped_column(String(5), nullable=True)
    # Modelo: 55 (NF-e), 65 (NFC-e), 57 (CT-e), NFS-e, etc.
    document_model: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Parceiro (cliente ou fornecedor)
    partner_id: Mapped[int | None] = mapped_column(ForeignKey("public.partners.id"), nullable=True)
    partner_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    partner_cnpj_cpf: Mapped[str | None] = mapped_column(String(18), nullable=True)

    # CFOP e natureza de operação
    cfop_id: Mapped[int | None] = mapped_column(ForeignKey("public.cfops.id"), nullable=True)
    operation_nature_id: Mapped[int | None] = mapped_column(ForeignKey("public.operation_natures.id"), nullable=True)

    # Valores totais
    total_products: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total_services: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total_discount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total_other: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total_gross: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)

    # Tributos
    icms_base: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    icms_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    pis_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    cofins_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    iss_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    ibs_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    cbs_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)

    # Observações e chave de acesso (NF-e)
    access_key: Mapped[str | None] = mapped_column(String(60), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Integração contábil
    status_contabil: Mapped[str] = mapped_column(String(20), nullable=False, server_default="pendente")
    lancamento_contabil_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    erro_contabil: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Soft delete
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_fiscal_entry_company_code"),
        {"schema": "public"},
    )

    items: Mapped[list["FiscalEntryItem"]] = relationship("FiscalEntryItem", back_populates="entry", cascade="all, delete-orphan")
    partner: Mapped["Partner | None"] = relationship("Partner")
    cfop: Mapped["CFOP | None"] = relationship("CFOP")


class FiscalEntryItem(Base):
    __tablename__ = "fiscal_entry_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("public.fiscal_entries.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)

    # Produto ou serviço
    product_id: Mapped[int | None] = mapped_column(ForeignKey("public.products.id"), nullable=True)
    service_item_id: Mapped[int | None] = mapped_column(ForeignKey("public.service_items.id"), nullable=True)

    # Descrição (copiada no momento do lançamento para preservar histórico)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    ncm: Mapped[str | None] = mapped_column(String(10), nullable=True)
    cfop_id: Mapped[int | None] = mapped_column(ForeignKey("public.cfops.id"), nullable=True)

    quantity: Mapped[float] = mapped_column(Numeric(15, 4), nullable=False, default=1)
    unit: Mapped[str] = mapped_column(String(5), nullable=False, default="UN")
    unit_price: Mapped[float] = mapped_column(Numeric(15, 4), nullable=False, default=0)
    discount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)

    # Tributos do item
    icms_cst: Mapped[str | None] = mapped_column(String(5), nullable=True)
    icms_base: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    icms_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    icms_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    pis_cst: Mapped[str | None] = mapped_column(String(5), nullable=True)
    pis_rate: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0)
    pis_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    cofins_cst: Mapped[str | None] = mapped_column(String(5), nullable=True)
    cofins_rate: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0)
    cofins_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)

    __table_args__ = {"schema": "public"}

    cfop: Mapped["CFOP | None"] = relationship("CFOP", foreign_keys=[cfop_id], lazy="select")

    entry: Mapped["FiscalEntry"] = relationship("FiscalEntry", back_populates="items")

    @property
    def cfop_code(self) -> str | None:
        return self.cfop.code if self.cfop else None
