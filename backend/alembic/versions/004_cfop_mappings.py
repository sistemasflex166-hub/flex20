"""cfop mappings

Revision ID: 004
Revises: 003
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cfop_mappings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=True),
        sa.Column("cfop_origin", sa.String(5), nullable=False),
        sa.Column("cfop_destination", sa.String(5), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "company_id", "cfop_origin", name="uq_cfop_mapping"),
        schema="public",
    )
    op.create_index("ix_cfop_mappings_tenant_origin", "cfop_mappings", ["tenant_id", "cfop_origin"], schema="public")


def downgrade() -> None:
    op.drop_index("ix_cfop_mappings_tenant_origin", table_name="cfop_mappings", schema="public")
    op.drop_table("cfop_mappings", schema="public")
