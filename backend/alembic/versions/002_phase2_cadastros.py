"""phase2 cadastros base

Revision ID: 002
Revises: 001
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.Integer, nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("trade_name", sa.String(200), nullable=True),
        sa.Column("cnpj", sa.String(18), nullable=True),
        sa.Column("cpf", sa.String(14), nullable=True),
        sa.Column("state_registration", sa.String(30), nullable=True),
        sa.Column("municipal_registration", sa.String(30), nullable=True),
        sa.Column("company_type", sa.String(20), nullable=False),
        sa.Column("regime", sa.String(30), nullable=False),
        sa.Column("address", sa.String(300), nullable=True),
        sa.Column("address_number", sa.String(20), nullable=True),
        sa.Column("complement", sa.String(100), nullable=True),
        sa.Column("neighborhood", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(2), nullable=True),
        sa.Column("zip_code", sa.String(9), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "code", name="uq_company_tenant_code"),
        schema="public",
    )

    op.create_table(
        "partners",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("partner_type", sa.String(20), nullable=False),
        sa.Column("person_type", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("trade_name", sa.String(200), nullable=True),
        sa.Column("cnpj_cpf", sa.String(18), nullable=True),
        sa.Column("state_registration", sa.String(30), nullable=True),
        sa.Column("municipal_registration", sa.String(30), nullable=True),
        sa.Column("address", sa.String(300), nullable=True),
        sa.Column("address_number", sa.String(20), nullable=True),
        sa.Column("complement", sa.String(100), nullable=True),
        sa.Column("neighborhood", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(2), nullable=True),
        sa.Column("zip_code", sa.String(9), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )

    op.create_table(
        "account_plans",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("parent_id", sa.Integer, sa.ForeignKey("public.account_plans.id"), nullable=True),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("account_type", sa.String(30), nullable=False),
        sa.Column("nature", sa.String(20), nullable=False),
        sa.Column("accepts_entries", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "code", name="uq_account_plan_company_code"),
        schema="public",
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("ncm", sa.String(10), nullable=True),
        sa.Column("unit", sa.String(5), nullable=False, server_default="UN"),
        sa.Column("price", sa.Numeric(15, 2), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "code", name="uq_product_company_code"),
        schema="public",
    )

    op.create_table(
        "service_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("service_code", sa.String(10), nullable=True),
        sa.Column("cnae", sa.String(10), nullable=True),
        sa.Column("iss_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "code", name="uq_service_item_company_code"),
        schema="public",
    )

    op.create_table(
        "cfops",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("code", sa.String(5), nullable=False),
        sa.Column("description", sa.String(300), nullable=False),
        sa.Column("is_input", sa.Boolean, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.UniqueConstraint("tenant_id", "code", name="uq_cfop_tenant_code"),
        schema="public",
    )

    op.create_table(
        "operation_natures",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("cfop_id", sa.Integer, sa.ForeignKey("public.cfops.id"), nullable=True),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "code", name="uq_operation_nature_company_code"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("operation_natures", schema="public")
    op.drop_table("cfops", schema="public")
    op.drop_table("service_items", schema="public")
    op.drop_table("products", schema="public")
    op.drop_table("account_plans", schema="public")
    op.drop_table("partners", schema="public")
    op.drop_table("companies", schema="public")
