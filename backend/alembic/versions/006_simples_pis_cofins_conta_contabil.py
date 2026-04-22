"""simples nacional, pis, cofins e conta contabil em natureza e servicos

Revision ID: 006
Revises: 005
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    # operation_natures
    op.add_column("operation_natures", sa.Column("simples_anexo", sa.String(20), nullable=True), schema="public")
    op.add_column("operation_natures", sa.Column("pis_rate", sa.Numeric(5, 4), nullable=True), schema="public")
    op.add_column("operation_natures", sa.Column("cofins_rate", sa.Numeric(5, 4), nullable=True), schema="public")
    op.add_column("operation_natures", sa.Column("account_code", sa.String(30), nullable=True), schema="public")

    # service_items
    op.add_column("service_items", sa.Column("simples_anexo", sa.String(20), nullable=True), schema="public")
    op.add_column("service_items", sa.Column("pis_rate", sa.Numeric(5, 4), nullable=True), schema="public")
    op.add_column("service_items", sa.Column("cofins_rate", sa.Numeric(5, 4), nullable=True), schema="public")
    op.add_column("service_items", sa.Column("account_code", sa.String(30), nullable=True), schema="public")


def downgrade():
    for col in ["simples_anexo", "pis_rate", "cofins_rate", "account_code"]:
        op.drop_column("operation_natures", col, schema="public")
        op.drop_column("service_items", col, schema="public")
