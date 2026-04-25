from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class ConfiguracaoZeramento(Base):
    __tablename__ = "configuracoes_zeramento"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("public.companies.id"), nullable=False, unique=True)
    conta_zeramento_id: Mapped[int] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=False)
    conta_resultado_id: Mapped[int] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = ({"schema": "public"},)
