"""adiciona campo is_billing em operation_natures

Revision ID: 008
Revises: 007
Create Date: 2026-04-22
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "operation_natures",
        sa.Column("is_billing", sa.Boolean(), nullable=False, server_default="false"),
        schema="public",
    )


def downgrade():
    op.drop_column("operation_natures", "is_billing", schema="public")
