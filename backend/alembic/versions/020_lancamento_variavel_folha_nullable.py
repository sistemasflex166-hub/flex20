"""lancamento_variavel: folha_id nullable — lançamentos podem existir sem folha vinculada

Revision ID: 020
Revises: 019
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "folha_lancamentos_variaveis", "folha_id",
        existing_type=sa.Integer(),
        nullable=True,
        schema="public",
    )


def downgrade() -> None:
    # Zera registros sem folha antes de reverter
    op.execute("UPDATE public.folha_lancamentos_variaveis SET folha_id = NULL WHERE folha_id IS NULL")
    op.alter_column(
        "folha_lancamentos_variaveis", "folha_id",
        existing_type=sa.Integer(),
        nullable=False,
        schema="public",
    )
