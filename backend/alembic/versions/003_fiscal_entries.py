"""fiscal entries

Revision ID: 003
Revises: 002
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fiscal_entries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.Integer, nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("entry_type", sa.String(30), nullable=False),
        sa.Column("entry_date", sa.Date, nullable=False),
        sa.Column("competence_date", sa.Date, nullable=False),
        sa.Column("document_number", sa.String(50), nullable=True),
        sa.Column("document_series", sa.String(5), nullable=True),
        sa.Column("document_model", sa.String(10), nullable=True),
        sa.Column("partner_id", sa.Integer, sa.ForeignKey("public.partners.id"), nullable=True),
        sa.Column("partner_name", sa.String(200), nullable=True),
        sa.Column("partner_cnpj_cpf", sa.String(18), nullable=True),
        sa.Column("cfop_id", sa.Integer, sa.ForeignKey("public.cfops.id"), nullable=True),
        sa.Column("operation_nature_id", sa.Integer, sa.ForeignKey("public.operation_natures.id"), nullable=True),
        sa.Column("total_products", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_services", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_discount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_other", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_gross", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("icms_base", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("icms_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("pis_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("cofins_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("iss_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("ibs_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("cbs_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("access_key", sa.String(44), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "code", name="uq_fiscal_entry_company_code"),
        schema="public",
    )

    op.create_table(
        "fiscal_entry_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("entry_id", sa.Integer, sa.ForeignKey("public.fiscal_entries.id"), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("public.products.id"), nullable=True),
        sa.Column("service_item_id", sa.Integer, sa.ForeignKey("public.service_items.id"), nullable=True),
        sa.Column("description", sa.String(300), nullable=False),
        sa.Column("ncm", sa.String(10), nullable=True),
        sa.Column("cfop_id", sa.Integer, sa.ForeignKey("public.cfops.id"), nullable=True),
        sa.Column("quantity", sa.Numeric(15, 4), nullable=False, server_default="1"),
        sa.Column("unit", sa.String(5), nullable=False, server_default="UN"),
        sa.Column("unit_price", sa.Numeric(15, 4), nullable=False, server_default="0"),
        sa.Column("discount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("icms_cst", sa.String(5), nullable=True),
        sa.Column("icms_base", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("icms_rate", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("icms_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("pis_cst", sa.String(5), nullable=True),
        sa.Column("pis_rate", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("pis_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("cofins_cst", sa.String(5), nullable=True),
        sa.Column("cofins_rate", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("cofins_value", sa.Numeric(15, 2), nullable=False, server_default="0"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("fiscal_entry_items", schema="public")
    op.drop_table("fiscal_entries", schema="public")
