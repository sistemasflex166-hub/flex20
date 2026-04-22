from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class CfopMapping(Base):
    """
    De-para de CFOP: vincula o CFOP de saída do fornecedor ao CFOP de entrada usado pela empresa.
    Exemplo: fornecedor emitiu com 5102, eu lanço como 1102.
    """

    __tablename__ = "cfop_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("public.tenants.id"), nullable=False)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("public.companies.id"), nullable=True)

    # CFOP original do fornecedor (saída dele)
    cfop_origin: Mapped[str] = mapped_column(String(5), nullable=False)
    # CFOP de entrada que deve ser usado no lançamento
    cfop_destination: Mapped[str] = mapped_column(String(5), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "company_id", "cfop_origin", name="uq_cfop_mapping"),
        {"schema": "public"},
    )
