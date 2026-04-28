import enum
from datetime import datetime, date
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Integer, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class CompanyRegime(str, enum.Enum):
    SIMPLES_NACIONAL = "simples_nacional"
    LUCRO_PRESUMIDO = "lucro_presumido"
    LUCRO_REAL = "lucro_real"
    MEI = "mei"


class CompanyType(str, enum.Enum):
    LTDA = "ltda"
    EIRELI = "eireli"
    SA = "sa"
    MEI = "mei"
    AUTONOMO = "autonomo"
    OUTROS = "outros"


class Company(Base):
    """
    Empresa cliente do escritório.
    Código sequencial imutável por tenant — gerado automaticamente, nunca editável.
    """

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[int] = mapped_column(Integer, nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    trade_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    state_registration: Mapped[str | None] = mapped_column(String(30), nullable=True)
    municipal_registration: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Usando String para evitar conflito de criação automática de tipo pelo SQLAlchemy
    company_type: Mapped[str] = mapped_column(String(20), nullable=False)
    regime: Mapped[str] = mapped_column(String(30), nullable=False)

    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    address_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    complement: Mapped[str | None] = mapped_column(String(100), nullable=True)
    neighborhood: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(9), nullable=True)

    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)

    cnae: Mapped[str | None] = mapped_column(String(10), nullable=True)
    opening_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    accountant_id: Mapped[int | None] = mapped_column(ForeignKey("public.accountants.id"), nullable=True)

    integracao_contabil_modo: Mapped[str] = mapped_column(String(20), nullable=False, server_default="conta_unica")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_company_tenant_code"),
        {"schema": "public"},
    )

    tenant: Mapped["Tenant"] = relationship("Tenant")
    accountant: Mapped["Accountant"] = relationship("Accountant", foreign_keys=[accountant_id])
    partners: Mapped[list["CompanyPartner"]] = relationship("CompanyPartner", back_populates="company", cascade="all, delete-orphan")
