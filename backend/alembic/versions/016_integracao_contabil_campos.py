"""integracao_contabil_campos — campos de integração fiscal/contábil em cfops, operation_natures, partners e fiscal_entries

Revision ID: 016
Revises: 015
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 2A — CFOP: campos de integração contábil (modo conta_individual)
    op.add_column("cfops", sa.Column("conta_contabil_id", sa.Integer, nullable=True), schema="public")
    op.add_column("cfops", sa.Column("historico_padrao_id", sa.Integer, nullable=True), schema="public")

    # 2B — Natureza de Operação: campos de integração contábil (modo conta_unica)
    op.add_column("operation_natures", sa.Column("conta_debito_id", sa.Integer, nullable=True), schema="public")
    op.add_column("operation_natures", sa.Column("conta_credito_id", sa.Integer, nullable=True), schema="public")
    op.add_column("operation_natures", sa.Column("historico_padrao_id", sa.Integer, nullable=True), schema="public")

    # 2C — Partners: conta contábil individual
    op.add_column("partners", sa.Column("conta_contabil_id", sa.Integer, nullable=True), schema="public")

    # 2C — Lançamentos fiscais: status de integração contábil
    op.add_column(
        "fiscal_entries",
        sa.Column("status_contabil", sa.String(20), nullable=False, server_default="pendente"),
        schema="public",
    )
    op.add_column("fiscal_entries", sa.Column("lancamento_contabil_id", sa.Integer, nullable=True), schema="public")
    op.add_column("fiscal_entries", sa.Column("erro_contabil", sa.Text, nullable=True), schema="public")


def downgrade() -> None:
    op.drop_column("fiscal_entries", "erro_contabil", schema="public")
    op.drop_column("fiscal_entries", "lancamento_contabil_id", schema="public")
    op.drop_column("fiscal_entries", "status_contabil", schema="public")
    op.drop_column("partners", "conta_contabil_id", schema="public")
    op.drop_column("operation_natures", "historico_padrao_id", schema="public")
    op.drop_column("operation_natures", "conta_credito_id", schema="public")
    op.drop_column("operation_natures", "conta_debito_id", schema="public")
    op.drop_column("cfops", "historico_padrao_id", schema="public")
    op.drop_column("cfops", "conta_contabil_id", schema="public")
