"""partner code sequencial e product_id em fiscal_entry_items

Revision ID: 005
Revises: 004
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Código sequencial imutável para parceiros
    op.add_column("partners", sa.Column("code", sa.Integer, nullable=True), schema="public")

    # Preenche code para registros existentes (sequência por company_id)
    op.execute("""
        WITH numbered AS (
            SELECT id, company_id,
                   ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY id) AS rn
            FROM public.partners
        )
        UPDATE public.partners p
        SET code = n.rn
        FROM numbered n
        WHERE p.id = n.id
    """)

    # Torna NOT NULL após preenchimento
    op.alter_column("partners", "code", nullable=False, schema="public")

    # Vincula produto ao item do lançamento (já existe product_id, só garante que está presente)
    # product_id já existe na tabela fiscal_entry_items desde a migration 003


def downgrade() -> None:
    op.drop_column("partners", "code", schema="public")
