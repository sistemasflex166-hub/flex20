from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class Evento(Base):
    __tablename__ = "folha_eventos"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo: Mapped[int] = mapped_column(Integer, nullable=False)
    descricao: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)       # provento / desconto
    natureza: Mapped[str] = mapped_column(String(15), nullable=False)   # fixo / variavel / percentual

    incide_inss: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    incide_irrf: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    incide_fgts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    incide_ferias: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    incide_decimo_terceiro: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    incide_aviso_previo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    conta_debito_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)
    conta_credito_id: Mapped[int | None] = mapped_column(ForeignKey("public.plano_contas.id"), nullable=True)
    historico_padrao_id: Mapped[int | None] = mapped_column(ForeignKey("public.historicos_padrao.id"), nullable=True)
    gera_lancamento_contabil: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
