"""funcionario: campos E-Social obrigatorios

Revision ID: 018
Revises: 017
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Identificação complementar
    op.add_column("folha_funcionarios", sa.Column("nome_social", sa.String(150), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("raca_cor", sa.String(2), nullable=True), schema="public")

    # Documentos
    op.add_column("folha_funcionarios", sa.Column("rg", sa.String(20), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("rg_orgao_emissor", sa.String(20), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("rg_uf", sa.String(2), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("rg_data_emissao", sa.Date(), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("ctps_numero", sa.String(20), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("ctps_serie", sa.String(10), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("ctps_uf", sa.String(2), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("ctps_data_emissao", sa.Date(), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("titulo_eleitor", sa.String(20), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("cnh", sa.String(20), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("cnh_categoria", sa.String(5), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("cnh_validade", sa.Date(), nullable=True), schema="public")

    # Deficiência
    op.add_column("folha_funcionarios", sa.Column("possui_deficiencia", sa.Boolean(), nullable=False, server_default="false"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("deficiencia_fisica", sa.Boolean(), nullable=False, server_default="false"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("deficiencia_visual", sa.Boolean(), nullable=False, server_default="false"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("deficiencia_auditiva", sa.Boolean(), nullable=False, server_default="false"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("deficiencia_mental", sa.Boolean(), nullable=False, server_default="false"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("deficiencia_intelectual", sa.Boolean(), nullable=False, server_default="false"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("deficiencia_reabilitado", sa.Boolean(), nullable=False, server_default="false"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("deficiencia_observacao", sa.String(255), nullable=True), schema="public")

    # Endereço complementar
    op.add_column("folha_funcionarios", sa.Column("codigo_municipio_ibge", sa.String(7), nullable=True), schema="public")

    # Contrato E-Social
    op.add_column("folha_funcionarios", sa.Column("ind_admissao", sa.String(2), nullable=False, server_default="1"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("categoria_esocial", sa.String(3), nullable=False, server_default="101"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("regime_previdenciario", sa.String(2), nullable=False, server_default="1"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("natureza_atividade", sa.String(2), nullable=False, server_default="01"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("tipo_jornada", sa.String(2), nullable=False, server_default="2"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("qtd_hrs_semanais", sa.Integer(), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("desc_jornada", sa.String(100), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("opcao_fgts", sa.Boolean(), nullable=False, server_default="true"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("data_opcao_fgts", sa.Date(), nullable=True), schema="public")


def downgrade() -> None:
    cols = [
        "nome_social", "raca_cor",
        "rg", "rg_orgao_emissor", "rg_uf", "rg_data_emissao",
        "ctps_numero", "ctps_serie", "ctps_uf", "ctps_data_emissao",
        "titulo_eleitor", "cnh", "cnh_categoria", "cnh_validade",
        "possui_deficiencia", "deficiencia_fisica", "deficiencia_visual",
        "deficiencia_auditiva", "deficiencia_mental", "deficiencia_intelectual",
        "deficiencia_reabilitado", "deficiencia_observacao",
        "codigo_municipio_ibge",
        "ind_admissao", "categoria_esocial", "regime_previdenciario",
        "natureza_atividade", "tipo_jornada", "qtd_hrs_semanais", "desc_jornada",
        "opcao_fgts", "data_opcao_fgts",
    ]
    for col in cols:
        op.drop_column("folha_funcionarios", col, schema="public")
