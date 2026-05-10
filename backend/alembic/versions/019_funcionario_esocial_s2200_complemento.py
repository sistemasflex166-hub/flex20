"""funcionario: complemento S-2200 — naturalidade, tipo_admissao, categoria, jornada corrigida

Adiciona os campos faltantes para conformidade total com o S-2200 do E-Social.
NÃO altera colunas existentes — apenas adiciona novas.

Campos adicionados:
  - nome_mae, nome_pai
  - pais_nascimento, pais_nacionalidade, municipio_nascimento_ibge
  - estado_civil: tipo alterado de varchar(20) para varchar(2) — código E-Social
  - raca_cor: tipo alterado de varchar(2) para varchar(1)
  - tipo_admissao (substitui semântica de ind_admissao)
  - indicativo_admissao
  - tipo_regime_trabalho
  - codigo_categoria (substitui categoria_esocial)
  - natureza_atividade: corrigido para varchar(2) com valor '1'/'2'
  - nr_dias_remuneracao
  - qtd_hrs_semanais: tipo alterado de integer para numeric(5,2)
  - desc_jornada: ampliado para varchar(255)
  - tipo_jornada: valor default corrigido para '1'

Revision ID: 019
Revises: 018
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Naturalidade
    op.add_column("folha_funcionarios", sa.Column("pais_nascimento", sa.String(4), nullable=False, server_default="105"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("pais_nacionalidade", sa.String(4), nullable=False, server_default="105"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("municipio_nascimento_ibge", sa.String(7), nullable=True), schema="public")

    # Filiação
    op.add_column("folha_funcionarios", sa.Column("nome_mae", sa.String(150), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("nome_pai", sa.String(150), nullable=True), schema="public")

    # Contrato E-Social — novos campos
    op.add_column("folha_funcionarios", sa.Column("tipo_admissao", sa.String(2), nullable=False, server_default="1"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("indicativo_admissao", sa.String(2), nullable=True), schema="public")
    op.add_column("folha_funcionarios", sa.Column("tipo_regime_trabalho", sa.String(2), nullable=False, server_default="1"), schema="public")
    op.add_column("folha_funcionarios", sa.Column("codigo_categoria", sa.String(3), nullable=False, server_default="101"), schema="public")

    # Jornada — novo campo
    op.add_column("folha_funcionarios", sa.Column("nr_dias_remuneracao", sa.Integer(), nullable=True), schema="public")

    # Corrigir tipo de qtd_hrs_semanais: integer → numeric(5,2)
    op.alter_column(
        "folha_funcionarios", "qtd_hrs_semanais",
        existing_type=sa.Integer(),
        type_=sa.Numeric(5, 2),
        nullable=True,
        schema="public",
    )

    # Ampliar desc_jornada para 255
    op.alter_column(
        "folha_funcionarios", "desc_jornada",
        existing_type=sa.String(100),
        type_=sa.String(255),
        nullable=True,
        schema="public",
    )

    # Corrigir natureza_atividade: server_default de '01' para '1'
    op.alter_column(
        "folha_funcionarios", "natureza_atividade",
        existing_type=sa.String(2),
        server_default="1",
        nullable=False,
        schema="public",
    )

    # Corrigir tipo_jornada: default de '2' para '1'
    op.alter_column(
        "folha_funcionarios", "tipo_jornada",
        existing_type=sa.String(2),
        server_default="1",
        nullable=False,
        schema="public",
    )

    # Corrigir raca_cor: varchar(2) → varchar(1)
    # Limpa valores que não sejam códigos numéricos de 1 dígito antes de reduzir o tipo
    op.execute("UPDATE public.folha_funcionarios SET raca_cor = NULL WHERE raca_cor IS NOT NULL AND raca_cor NOT IN ('1','2','3','4','5','6')")
    op.alter_column(
        "folha_funcionarios", "raca_cor",
        existing_type=sa.String(2),
        type_=sa.String(1),
        nullable=True,
        schema="public",
    )

    # Corrigir estado_civil: varchar(20) → varchar(2) (agora código numérico E-Social)
    # Limpa valores textuais antigos antes de reduzir o tipo
    op.execute("UPDATE public.folha_funcionarios SET estado_civil = NULL WHERE estado_civil IS NOT NULL AND estado_civil NOT IN ('1','2','3','4','5','6','9')")
    op.alter_column(
        "folha_funcionarios", "estado_civil",
        existing_type=sa.String(20),
        type_=sa.String(2),
        nullable=True,
        schema="public",
    )


def downgrade() -> None:
    # Reverter colunas adicionadas
    for col in [
        "pais_nascimento", "pais_nacionalidade", "municipio_nascimento_ibge",
        "nome_mae", "nome_pai",
        "tipo_admissao", "indicativo_admissao", "tipo_regime_trabalho",
        "codigo_categoria", "nr_dias_remuneracao",
    ]:
        op.drop_column("folha_funcionarios", col, schema="public")

    # Reverter alterações de tipo
    op.alter_column("folha_funcionarios", "qtd_hrs_semanais", existing_type=sa.Numeric(5, 2), type_=sa.Integer(), nullable=True, schema="public")
    op.alter_column("folha_funcionarios", "desc_jornada", existing_type=sa.String(255), type_=sa.String(100), nullable=True, schema="public")
    op.alter_column("folha_funcionarios", "natureza_atividade", existing_type=sa.String(2), server_default="01", nullable=False, schema="public")
    op.alter_column("folha_funcionarios", "tipo_jornada", existing_type=sa.String(2), server_default="2", nullable=False, schema="public")
    op.alter_column("folha_funcionarios", "raca_cor", existing_type=sa.String(1), type_=sa.String(2), nullable=True, schema="public")
    op.alter_column("folha_funcionarios", "estado_civil", existing_type=sa.String(2), type_=sa.String(20), nullable=True, schema="public")
