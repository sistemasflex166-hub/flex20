import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class AccountType(str, enum.Enum):
    ATIVO = "ativo"
    PASSIVO = "passivo"
    PATRIMONIO_LIQUIDO = "patrimonio_liquido"
    RECEITA = "receita"
    DESPESA = "despesa"
    CUSTO = "custo"


class AccountNature(str, enum.Enum):
    DEVEDORA = "devedora"
    CREDORA = "credora"


class AccountPlan(Base):
    __tablename__ = "account_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("public.account_plans.id"), nullable=True)

    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    account_type: Mapped[str] = mapped_column(String(30), nullable=False)
    nature: Mapped[str] = mapped_column(String(20), nullable=False)
    accepts_entries: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_account_plan_company_code"),
        {"schema": "public"},
    )

    parent: Mapped["AccountPlan | None"] = relationship("AccountPlan", remote_side="AccountPlan.id")
    company: Mapped["Company"] = relationship("Company")
