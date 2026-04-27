"""historico_receita: adiciona simples_codigo e recriar unique constraint

Revision ID: 012
Revises: 011
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna com default "geral" para registros existentes
    op.add_column(
        "historico_receita_simples",
        sa.Column("simples_codigo", sa.String(10), nullable=False, server_default="geral"),
        schema="public",
    )

    # Remove constraint antiga (company+ano+mes)
    op.drop_constraint(
        "uq_receita_empresa_competencia",
        "historico_receita_simples",
        schema="public",
        type_="unique",
    )

    # Cria constraint nova (company+ano+mes+simples_codigo)
    op.create_unique_constraint(
        "uq_receita_empresa_competencia_codigo",
        "historico_receita_simples",
        ["company_id", "competencia_ano", "competencia_mes", "simples_codigo"],
        schema="public",
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_receita_empresa_competencia_codigo",
        "historico_receita_simples",
        schema="public",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_receita_empresa_competencia",
        "historico_receita_simples",
        ["company_id", "competencia_ano", "competencia_mes"],
        schema="public",
    )
    op.drop_column("historico_receita_simples", "simples_codigo", schema="public")
