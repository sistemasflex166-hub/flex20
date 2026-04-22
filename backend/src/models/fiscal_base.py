import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Numeric, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class ProductUnit(str, enum.Enum):
    UN = "UN"
    KG = "KG"
    MT = "MT"
    LT = "LT"
    CX = "CX"
    PC = "PC"
    HR = "HR"
    DZ = "DZ"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)

    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    ncm: Mapped[str | None] = mapped_column(String(10), nullable=True)
    unit: Mapped[str] = mapped_column(String(5), nullable=False, default="UN")
    price: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_product_company_code"),
        {"schema": "public"},
    )


class ServiceItem(Base):
    __tablename__ = "service_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)

    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    service_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    cnae: Mapped[str | None] = mapped_column(String(10), nullable=True)
    iss_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    simples_anexo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pis_rate: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    cofins_rate: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    account_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_service_item_company_code"),
        {"schema": "public"},
    )


class CFOP(Base):
    __tablename__ = "cfops"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)

    code: Mapped[str] = mapped_column(String(5), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    is_input: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_cfop_tenant_code"),
        {"schema": "public"},
    )


class OperationNature(Base):
    __tablename__ = "operation_natures"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)
    cfop_id: Mapped[int | None] = mapped_column(ForeignKey("public.cfops.id"), nullable=True)

    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    simples_anexo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pis_rate: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    cofins_rate: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    account_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_operation_nature_company_code"),
        {"schema": "public"},
    )

    cfop: Mapped["CFOP | None"] = relationship("CFOP")
