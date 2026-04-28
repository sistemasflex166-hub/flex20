from datetime import datetime, date
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Numeric, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class CompanyPartner(Base):
    """Sócio / responsável vinculado a uma empresa."""

    __tablename__ = "company_partners"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    rg: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rg_issuer: Mapped[str | None] = mapped_column(String(20), nullable=True)  # órgão expedidor
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)

    # Participação societária
    equity_share: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)  # percentual %

    # Endereço
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    address_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    complement: Mapped[str | None] = mapped_column(String(100), nullable=True)
    neighborhood: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(9), nullable=True)

    is_responsible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = {"schema": "public"}

    company: Mapped["Company"] = relationship("Company", back_populates="partners")
