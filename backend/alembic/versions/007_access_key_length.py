"""ampliar access_key para 60 chars para suportar chave NFS-e

Revision ID: 007
Revises: 006
Create Date: 2026-04-22
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "fiscal_entries",
        "access_key",
        type_=sa.String(60),
        schema="public",
    )


def downgrade():
    op.alter_column(
        "fiscal_entries",
        "access_key",
        type_=sa.String(44),
        schema="public",
    )
