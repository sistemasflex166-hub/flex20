"""folha_itens — linhas do holerite calculadas por funcionário

Revision ID: 021
Revises: 020
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "folha_itens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("folha_id", sa.Integer(), sa.ForeignKey("public.folha_pagamentos.id"), nullable=False),
        sa.Column("funcionario_id", sa.Integer(), sa.ForeignKey("public.folha_funcionarios.id"), nullable=False),
        sa.Column("evento_id", sa.Integer(), sa.ForeignKey("public.folha_eventos.id"), nullable=True),
        sa.Column("tipo_linha", sa.String(20), nullable=False),
        sa.Column("descricao", sa.String(150), nullable=False),
        sa.Column("tipo", sa.String(15), nullable=False),
        sa.Column("referencia", sa.Numeric(10, 4), nullable=True),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        schema="public",
    )
    op.create_index("ix_folha_itens_folha_id", "folha_itens", ["folha_id"], schema="public")
    op.create_index("ix_folha_itens_funcionario_id", "folha_itens", ["funcionario_id"], schema="public")


def downgrade() -> None:
    op.drop_index("ix_folha_itens_funcionario_id", table_name="folha_itens", schema="public")
    op.drop_index("ix_folha_itens_folha_id", table_name="folha_itens", schema="public")
    op.drop_table("folha_itens", schema="public")
