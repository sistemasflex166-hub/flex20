"""integracao_contabil_modo — parâmetro de integração fiscal/contábil por empresa

Revision ID: 015
Revises: 014
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column(
            "integracao_contabil_modo",
            sa.String(20),
            nullable=False,
            server_default="conta_unica",
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("companies", "integracao_contabil_modo", schema="public")
