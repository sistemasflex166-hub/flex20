"""company_partners — quadro societário

Revision ID: 014
Revises: 013
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_partners",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=True),
        sa.Column("rg", sa.String(20), nullable=True),
        sa.Column("rg_issuer", sa.String(20), nullable=True),
        sa.Column("birth_date", sa.Date, nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("equity_share", sa.Numeric(5, 2), nullable=True),
        sa.Column("address", sa.String(300), nullable=True),
        sa.Column("address_number", sa.String(20), nullable=True),
        sa.Column("complement", sa.String(100), nullable=True),
        sa.Column("neighborhood", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(2), nullable=True),
        sa.Column("zip_code", sa.String(9), nullable=True),
        sa.Column("is_responsible", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )
    op.create_index("ix_company_partners_company_id", "company_partners", ["company_id"], schema="public")


def downgrade() -> None:
    op.drop_index("ix_company_partners_company_id", "company_partners", schema="public")
    op.drop_table("company_partners", schema="public")
