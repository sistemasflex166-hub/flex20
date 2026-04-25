"""cria tabelas base do módulo contabilidade

Revision ID: 009
Revises: 008
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    # Máscara do plano de contas
    op.create_table(
        "mascara_plano_contas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False, unique=True),
        sa.Column("mascara", sa.String(50), nullable=False),
        sa.Column("separador", sa.String(1), nullable=False, server_default="."),
        sa.Column("quantidade_niveis", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="public",
    )

    # Plano de contas (substitui account_plans de forma nova — mantém account_plans para compatibilidade)
    op.create_table(
        "plano_contas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("public.tenants.id"), nullable=False),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("classificacao", sa.String(50), nullable=False),
        sa.Column("descricao", sa.String(200), nullable=False),
        sa.Column("nivel", sa.Integer(), nullable=False),
        sa.Column("natureza", sa.String(1), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("codigo_reduzido", sa.String(20), nullable=True),
        sa.Column("titulo_dre", sa.String(200), nullable=True),
        sa.Column("grupo_dre", sa.String(50), nullable=True),
        sa.Column("codigo_ecf", sa.String(30), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("company_id", "classificacao", name="uq_plano_contas_classificacao"),
        sa.UniqueConstraint("company_id", "codigo_reduzido", name="uq_plano_contas_cod_reduzido"),
        schema="public",
    )

    # Centros de custo
    op.create_table(
        "centros_custo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(200), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("company_id", "codigo", name="uq_centro_custo_codigo"),
        schema="public",
    )

    # Históricos padrão
    op.create_table(
        "historicos_padrao",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(300), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("company_id", "codigo", name="uq_historico_padrao_codigo"),
        schema="public",
    )

    # Contas bancárias
    op.create_table(
        "contas_bancarias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("banco", sa.String(100), nullable=False),
        sa.Column("agencia", sa.String(20), nullable=False),
        sa.Column("conta", sa.String(20), nullable=False),
        sa.Column("digito", sa.String(5), nullable=True),
        sa.Column("tipo_conta", sa.String(10), nullable=False),
        sa.Column("descricao", sa.String(200), nullable=False),
        sa.Column("saldo_inicial", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("data_saldo_inicial", sa.Date(), nullable=False),
        sa.Column("conta_contabil_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="public",
    )

    # Lançamentos contábeis
    op.create_table(
        "lancamentos_contabeis",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("conta_debito_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("conta_credito_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("historico_padrao_id", sa.Integer(), sa.ForeignKey("public.historicos_padrao.id"), nullable=True),
        sa.Column("historico_complemento", sa.String(500), nullable=True),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("centro_custo_id", sa.Integer(), sa.ForeignKey("public.centros_custo.id"), nullable=True),
        sa.Column("origem", sa.String(10), nullable=False, server_default="manual"),
        sa.Column("origem_id", sa.Integer(), nullable=True),
        sa.Column("origem_tipo", sa.String(20), nullable=True),
        sa.Column("conciliado", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("data_conciliacao", sa.Date(), nullable=True),
        sa.Column("conta_bancaria_id", sa.Integer(), sa.ForeignKey("public.contas_bancarias.id"), nullable=True),
        sa.Column("excluido", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("data_exclusao", sa.DateTime(timezone=True), nullable=True),
        sa.Column("usuario_exclusao_id", sa.Integer(), sa.ForeignKey("public.users.id"), nullable=True),
        sa.Column("excluido_definitivamente", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("usuario_criacao_id", sa.Integer(), sa.ForeignKey("public.users.id"), nullable=False),
        sa.Column("usuario_edicao_id", sa.Integer(), sa.ForeignKey("public.users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("company_id", "codigo", name="uq_lancamento_contabil_codigo"),
        schema="public",
    )

    # Históricos bancários
    op.create_table(
        "historicos_bancarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("conta_bancaria_id", sa.Integer(), sa.ForeignKey("public.contas_bancarias.id"), nullable=False),
        sa.Column("texto_historico", sa.String(200), nullable=False),
        sa.Column("conta_debito_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("conta_credito_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("historico_padrao_id", sa.Integer(), sa.ForeignKey("public.historicos_padrao.id"), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="public",
    )

    # Conciliações bancárias
    op.create_table(
        "conciliacoes_bancarias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("conta_bancaria_id", sa.Integer(), sa.ForeignKey("public.contas_bancarias.id"), nullable=False),
        sa.Column("data_importacao", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("arquivo_nome", sa.String(200), nullable=False),
        sa.Column("data_movimento", sa.Date(), nullable=False),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("descricao_ofx", sa.String(500), nullable=False),
        sa.Column("id_transacao_ofx", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pendente"),
        sa.Column("lancamento_id", sa.Integer(), sa.ForeignKey("public.lancamentos_contabeis.id"), nullable=True),
        sa.Column("data_conciliacao", sa.Date(), nullable=True),
        sa.Column("usuario_conciliacao_id", sa.Integer(), sa.ForeignKey("public.users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="public",
    )

    # Saldos iniciais
    op.create_table(
        "saldos_iniciais",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("conta_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=False),
        sa.Column("natureza", sa.String(1), nullable=False),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("observacao", sa.String(500), nullable=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("public.users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="public",
    )

    # Configuração de zeramento
    op.create_table(
        "configuracoes_zeramento",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("public.companies.id"), nullable=False, unique=True),
        sa.Column("conta_zeramento_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=False),
        sa.Column("conta_resultado_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="public",
    )


def downgrade():
    op.drop_table("configuracoes_zeramento", schema="public")
    op.drop_table("saldos_iniciais", schema="public")
    op.drop_table("conciliacoes_bancarias", schema="public")
    op.drop_table("historicos_bancarios", schema="public")
    op.drop_table("lancamentos_contabeis", schema="public")
    op.drop_table("contas_bancarias", schema="public")
    op.drop_table("historicos_padrao", schema="public")
    op.drop_table("centros_custo", schema="public")
    op.drop_table("plano_contas", schema="public")
    op.drop_table("mascara_plano_contas", schema="public")
