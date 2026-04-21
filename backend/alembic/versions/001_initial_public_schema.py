"""initial public schema

Revision ID: 001
Revises:
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE SCHEMA IF NOT EXISTS public')

    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(60), unique=True, nullable=False),
        sa.Column("schema_name", sa.String(60), unique=True, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"], schema="public")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(254), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(128), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("role", sa.Enum(
            "platform_admin", "office_admin", "office_user", "business_owner",
            name="userrole"
        ), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("public.tenants.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )
    op.create_index("ix_users_email", "users", ["email"], schema="public")

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("public.users.id"), nullable=False),
        sa.Column("token_hash", sa.String(128), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )
    op.create_index("ix_refresh_tokens_hash", "refresh_tokens", ["token_hash"], schema="public")


def downgrade() -> None:
    op.drop_table("refresh_tokens", schema="public")
    op.drop_table("users", schema="public")
    op.drop_table("tenants", schema="public")
    op.execute("DROP TYPE IF EXISTS userrole")
