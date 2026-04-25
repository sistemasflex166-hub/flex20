"""folha_base

Revision ID: 010_folha_base
Revises: 009_contabilidade_base
Create Date: 2026-04-25
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade():
    # Cargos
    op.create_table(
        "folha_cargos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(100), nullable=False),
        sa.Column("cbo", sa.String(10), nullable=True),
        sa.Column("salario_normativo", sa.Numeric(15, 2), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Departamentos
    op.create_table(
        "folha_departamentos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(100), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Sindicatos
    op.create_table(
        "folha_sindicatos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("cnpj", sa.String(18), nullable=True),
        sa.Column("data_base", sa.Date(), nullable=True),
        sa.Column("percentual_contribuicao", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Eventos da folha
    op.create_table(
        "folha_eventos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(100), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("natureza", sa.String(15), nullable=False),
        sa.Column("incide_inss", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("incide_irrf", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("incide_fgts", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("incide_ferias", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("incide_decimo_terceiro", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("incide_aviso_previo", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("conta_debito_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("conta_credito_id", sa.Integer(), sa.ForeignKey("public.plano_contas.id"), nullable=True),
        sa.Column("historico_padrao_id", sa.Integer(), sa.ForeignKey("public.historicos_padrao.id"), nullable=True),
        sa.Column("gera_lancamento_contabil", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Funcionários
    op.create_table(
        "folha_funcionarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=False),
        sa.Column("pis_pasep", sa.String(14), nullable=True),
        sa.Column("data_nascimento", sa.Date(), nullable=True),
        sa.Column("sexo", sa.String(1), nullable=True),
        sa.Column("estado_civil", sa.String(20), nullable=True),
        sa.Column("grau_instrucao", sa.String(10), nullable=True),
        sa.Column("logradouro", sa.String(100), nullable=True),
        sa.Column("numero", sa.String(10), nullable=True),
        sa.Column("complemento", sa.String(50), nullable=True),
        sa.Column("bairro", sa.String(60), nullable=True),
        sa.Column("cidade", sa.String(60), nullable=True),
        sa.Column("uf", sa.String(2), nullable=True),
        sa.Column("cep", sa.String(9), nullable=True),
        sa.Column("data_admissao", sa.Date(), nullable=False),
        sa.Column("tipo_contrato", sa.String(20), nullable=False, server_default="clt"),
        sa.Column("regime_trabalho", sa.String(20), nullable=False, server_default="clt"),
        sa.Column("matricula", sa.String(20), nullable=True),
        sa.Column("cargo_id", sa.Integer(), sa.ForeignKey("public.folha_cargos.id"), nullable=True),
        sa.Column("departamento_id", sa.Integer(), sa.ForeignKey("public.folha_departamentos.id"), nullable=True),
        sa.Column("sindicato_id", sa.Integer(), sa.ForeignKey("public.folha_sindicatos.id"), nullable=True),
        sa.Column("salario_base", sa.Numeric(15, 2), nullable=False),
        sa.Column("banco", sa.String(10), nullable=True),
        sa.Column("agencia", sa.String(10), nullable=True),
        sa.Column("conta_bancaria", sa.String(20), nullable=True),
        sa.Column("tipo_conta", sa.String(10), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("data_inativacao", sa.Date(), nullable=True),
        sa.Column("motivo_inativacao", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Dependentes de funcionários
    op.create_table(
        "folha_dependentes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("funcionario_id", sa.Integer(), sa.ForeignKey("public.folha_funcionarios.id"), nullable=False),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("data_nascimento", sa.Date(), nullable=True),
        sa.Column("parentesco", sa.String(30), nullable=True),
        sa.Column("cpf", sa.String(14), nullable=True),
        sa.Column("deduz_irrf", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Tabela INSS versionada
    op.create_table(
        "folha_tabela_inss",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("competencia_inicio", sa.Date(), nullable=False),
        sa.Column("competencia_fim", sa.Date(), nullable=True),
        sa.Column("faixas", sa.JSON(), nullable=False),
        sa.Column("teto_contribuicao", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Tabela IRRF versionada
    op.create_table(
        "folha_tabela_irrf",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("competencia_inicio", sa.Date(), nullable=False),
        sa.Column("competencia_fim", sa.Date(), nullable=True),
        sa.Column("faixas", sa.JSON(), nullable=False),
        sa.Column("valor_dependente", sa.Numeric(10, 2), nullable=False),
        sa.Column("desconto_simplificado", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Folhas de pagamento
    op.create_table(
        "folha_pagamentos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("competencia_mes", sa.Integer(), nullable=False),
        sa.Column("competencia_ano", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(15), nullable=False, server_default="aberta"),
        sa.Column("total_proventos", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_descontos", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_liquido", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_inss_empregado", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_irrf", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_fgts", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_inss_patronal", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_rat_fap", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_terceiros", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("data_calculo", sa.DateTime(), nullable=True),
        sa.Column("data_fechamento", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Lançamentos variáveis
    op.create_table(
        "folha_lancamentos_variaveis",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("folha_id", sa.Integer(), sa.ForeignKey("public.folha_pagamentos.id"), nullable=False),
        sa.Column("funcionario_id", sa.Integer(), sa.ForeignKey("public.folha_funcionarios.id"), nullable=False),
        sa.Column("evento_id", sa.Integer(), sa.ForeignKey("public.folha_eventos.id"), nullable=False),
        sa.Column("competencia_mes", sa.Integer(), nullable=False),
        sa.Column("competencia_ano", sa.Integer(), nullable=False),
        sa.Column("quantidade", sa.Numeric(10, 4), nullable=True),
        sa.Column("valor", sa.Numeric(15, 2), nullable=True),
        sa.Column("observacao", sa.String(300), nullable=True),
        sa.Column("excluido", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("data_exclusao", sa.DateTime(), nullable=True),
        sa.Column("excluido_definitivamente", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        schema="public",
    )

    # Seed das tabelas tributárias 2025
    op.execute("""
        INSERT INTO public.folha_tabela_inss (competencia_inicio, competencia_fim, faixas, teto_contribuicao)
        VALUES (
            '2025-01-01',
            NULL,
            '[
                {"limite": 1518.00, "aliquota": 7.5},
                {"limite": 2793.88, "aliquota": 9.0},
                {"limite": 4190.83, "aliquota": 12.0},
                {"limite": 8157.41, "aliquota": 14.0}
            ]'::json,
            908.86
        )
    """)

    op.execute("""
        INSERT INTO public.folha_tabela_irrf (competencia_inicio, competencia_fim, faixas, valor_dependente, desconto_simplificado)
        VALUES (
            '2025-01-01',
            NULL,
            '[
                {"limite": 2259.20, "aliquota": 0.0, "parcela_deduzir": 0.0},
                {"limite": 2826.65, "aliquota": 7.5, "parcela_deduzir": 169.44},
                {"limite": 3751.05, "aliquota": 15.0, "parcela_deduzir": 381.44},
                {"limite": 4664.68, "aliquota": 22.5, "parcela_deduzir": 662.77},
                {"limite": null,    "aliquota": 27.5, "parcela_deduzir": 896.00}
            ]'::json,
            189.59,
            564.80
        )
    """)


def downgrade():
    op.drop_table("folha_lancamentos_variaveis", schema="public")
    op.drop_table("folha_pagamentos", schema="public")
    op.drop_table("folha_tabela_irrf", schema="public")
    op.drop_table("folha_tabela_inss", schema="public")
    op.drop_table("folha_dependentes", schema="public")
    op.drop_table("folha_funcionarios", schema="public")
    op.drop_table("folha_eventos", schema="public")
    op.drop_table("folha_sindicatos", schema="public")
    op.drop_table("folha_departamentos", schema="public")
    op.drop_table("folha_cargos", schema="public")
