"""partner_cfop_entrada — adiciona cfop_entrada ao cadastro de parceiros

Revision ID: 017
Revises: 016
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "partners",
        sa.Column("cfop_entrada", sa.String(5), nullable=True),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("partners", "cfop_entrada", schema="public")
