"""simples_nacional_base

Revision ID: 011_simples_nacional_base
Revises: 010
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa
from datetime import date

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None

VIGENCIA = date(2018, 1, 1)  # vigência das tabelas LC 155/2016


def upgrade() -> None:
    # --- anexos_simples ---
    op.create_table(
        "anexos_simples",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("codigo", sa.String(5), nullable=False),
        sa.Column("descricao", sa.String(200), nullable=False),
        sa.Column("inclui_cpp", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("vigencia_inicio", sa.Date, nullable=False),
        sa.Column("vigencia_fim", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )

    # --- faixas_simples ---
    op.create_table(
        "faixas_simples",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("anexo_id", sa.Integer, sa.ForeignKey("public.anexos_simples.id"), nullable=False),
        sa.Column("numero_faixa", sa.Integer, nullable=False),
        sa.Column("valor_minimo", sa.Numeric(15, 2), nullable=False),
        sa.Column("valor_maximo", sa.Numeric(15, 2), nullable=True),
        sa.Column("aliquota_nominal", sa.Numeric(7, 4), nullable=False),
        sa.Column("valor_deduzir", sa.Numeric(15, 2), nullable=False),
        sa.Column("perc_irpj", sa.Numeric(7, 4), nullable=False, server_default="0"),
        sa.Column("perc_csll", sa.Numeric(7, 4), nullable=False, server_default="0"),
        sa.Column("perc_cofins", sa.Numeric(7, 4), nullable=False, server_default="0"),
        sa.Column("perc_pis", sa.Numeric(7, 4), nullable=False, server_default="0"),
        sa.Column("perc_cpp", sa.Numeric(7, 4), nullable=False, server_default="0"),
        sa.Column("perc_icms", sa.Numeric(7, 4), nullable=False, server_default="0"),
        sa.Column("perc_iss", sa.Numeric(7, 4), nullable=False, server_default="0"),
        sa.Column("vigencia_inicio", sa.Date, nullable=False),
        sa.Column("vigencia_fim", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )

    # --- configuracoes_simples ---
    op.create_table(
        "configuracoes_simples",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("anexo_principal", sa.String(5), nullable=False),
        sa.Column("usa_fator_r", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("data_inicio_simples", sa.Date, nullable=False),
        sa.Column("limite_anual", sa.Numeric(15, 2), nullable=False, server_default="4800000.00"),
        sa.Column("ativo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", name="uq_config_simples_company"),
        schema="public",
    )

    # --- historico_receita_simples ---
    op.create_table(
        "historico_receita_simples",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("competencia_mes", sa.Integer, nullable=False),
        sa.Column("competencia_ano", sa.Integer, nullable=False),
        sa.Column("receita_bruta", sa.Numeric(15, 2), nullable=False, server_default="0.00"),
        sa.Column("origem", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "competencia_ano", "competencia_mes", name="uq_receita_empresa_competencia"),
        schema="public",
    )

    # --- apuracoes_simples ---
    op.create_table(
        "apuracoes_simples",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("competencia_mes", sa.Integer, nullable=False),
        sa.Column("competencia_ano", sa.Integer, nullable=False),
        sa.Column("rbt12", sa.Numeric(15, 2), nullable=False),
        sa.Column("receita_mes", sa.Numeric(15, 2), nullable=False),
        sa.Column("anexo_aplicado", sa.String(5), nullable=False),
        sa.Column("faixa_aplicada", sa.Integer, nullable=False),
        sa.Column("fator_r", sa.Numeric(7, 4), nullable=True),
        sa.Column("aliquota_nominal", sa.Numeric(7, 4), nullable=False),
        sa.Column("valor_deduzir", sa.Numeric(15, 2), nullable=False),
        sa.Column("aliquota_efetiva", sa.Numeric(7, 4), nullable=False),
        sa.Column("valor_das", sa.Numeric(15, 2), nullable=False),
        sa.Column("valor_irpj", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("valor_csll", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("valor_cofins", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("valor_pis", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("valor_cpp", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("valor_icms", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("valor_iss", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="calculado"),
        sa.Column("data_vencimento", sa.Date, nullable=False),
        sa.Column("pgdas_gerado", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("data_pgdas", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bloqueado", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("usuario_id", sa.Integer, sa.ForeignKey("public.users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "competencia_ano", "competencia_mes", name="uq_apuracao_empresa_competencia"),
        schema="public",
    )

    # --- cfop_simples ---
    op.create_table(
        "cfop_simples",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("public.companies.id"), nullable=False),
        sa.Column("cfop", sa.String(10), nullable=False),
        sa.Column("codigo_simples", sa.String(20), nullable=False),
        sa.Column("anexo", sa.String(5), nullable=False),
        sa.Column("descricao", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="public",
    )

    # =========================================================
    # SEED — Tabelas vigentes (LC 155/2016, vigência 01/01/2018)
    # =========================================================
    anexos = sa.table(
        "anexos_simples",
        sa.column("id", sa.Integer),
        sa.column("codigo", sa.String),
        sa.column("descricao", sa.String),
        sa.column("inclui_cpp", sa.Boolean),
        sa.column("vigencia_inicio", sa.Date),
    )

    op.bulk_insert(anexos, [
        {"id": 1, "codigo": "I",   "descricao": "Comércio",                                              "inclui_cpp": True,  "vigencia_inicio": VIGENCIA},
        {"id": 2, "codigo": "II",  "descricao": "Indústria",                                             "inclui_cpp": True,  "vigencia_inicio": VIGENCIA},
        {"id": 3, "codigo": "III", "descricao": "Serviços (Fator R ≥ 28% ou atividades gerais)",         "inclui_cpp": True,  "vigencia_inicio": VIGENCIA},
        {"id": 4, "codigo": "IV",  "descricao": "Serviços (construção civil, vigilância, limpeza, OAB)", "inclui_cpp": False, "vigencia_inicio": VIGENCIA},
        {"id": 5, "codigo": "V",   "descricao": "Serviços intelectuais/técnicos (Fator R < 28%)",        "inclui_cpp": True,  "vigencia_inicio": VIGENCIA},
    ])

    faixas = sa.table(
        "faixas_simples",
        sa.column("anexo_id", sa.Integer),
        sa.column("numero_faixa", sa.Integer),
        sa.column("valor_minimo", sa.Numeric),
        sa.column("valor_maximo", sa.Numeric),
        sa.column("aliquota_nominal", sa.Numeric),
        sa.column("valor_deduzir", sa.Numeric),
        sa.column("perc_irpj", sa.Numeric),
        sa.column("perc_csll", sa.Numeric),
        sa.column("perc_cofins", sa.Numeric),
        sa.column("perc_pis", sa.Numeric),
        sa.column("perc_cpp", sa.Numeric),
        sa.column("perc_icms", sa.Numeric),
        sa.column("perc_iss", sa.Numeric),
        sa.column("vigencia_inicio", sa.Date),
    )

    op.bulk_insert(faixas, [
        # ---- Anexo I — Comércio ----
        {"anexo_id": 1, "numero_faixa": 1, "valor_minimo": 0,          "valor_maximo": 180000,    "aliquota_nominal": 4.00,  "valor_deduzir": 0,       "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 12.74, "perc_pis": 2.76,  "perc_cpp": 41.50, "perc_icms": 34.00, "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 1, "numero_faixa": 2, "valor_minimo": 180000.01,  "valor_maximo": 360000,    "aliquota_nominal": 7.30,  "valor_deduzir": 5940,    "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 12.74, "perc_pis": 2.76,  "perc_cpp": 41.50, "perc_icms": 34.00, "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 1, "numero_faixa": 3, "valor_minimo": 360000.01,  "valor_maximo": 720000,    "aliquota_nominal": 9.50,  "valor_deduzir": 13860,   "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 12.74, "perc_pis": 2.76,  "perc_cpp": 42.00, "perc_icms": 33.50, "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 1, "numero_faixa": 4, "valor_minimo": 720000.01,  "valor_maximo": 1800000,   "aliquota_nominal": 10.70, "valor_deduzir": 22500,   "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 12.74, "perc_pis": 2.76,  "perc_cpp": 42.00, "perc_icms": 33.50, "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 1, "numero_faixa": 5, "valor_minimo": 1800000.01, "valor_maximo": 3600000,   "aliquota_nominal": 14.30, "valor_deduzir": 87300,   "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 12.74, "perc_pis": 2.76,  "perc_cpp": 42.00, "perc_icms": 33.50, "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 1, "numero_faixa": 6, "valor_minimo": 3600000.01, "valor_maximo": None,       "aliquota_nominal": 19.00, "valor_deduzir": 378000,  "perc_irpj": 13.50, "perc_csll": 10.00, "perc_cofins": 28.27, "perc_pis": 6.13,  "perc_cpp": 42.10, "perc_icms": 0,     "perc_iss": 0,     "vigencia_inicio": VIGENCIA},

        # ---- Anexo II — Indústria ----
        {"anexo_id": 2, "numero_faixa": 1, "valor_minimo": 0,          "valor_maximo": 180000,    "aliquota_nominal": 4.50,  "valor_deduzir": 0,       "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 11.51, "perc_pis": 2.49,  "perc_cpp": 37.50, "perc_icms": 7.50,  "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 2, "numero_faixa": 2, "valor_minimo": 180000.01,  "valor_maximo": 360000,    "aliquota_nominal": 7.80,  "valor_deduzir": 5940,    "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 11.51, "perc_pis": 2.49,  "perc_cpp": 37.50, "perc_icms": 7.50,  "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 2, "numero_faixa": 3, "valor_minimo": 360000.01,  "valor_maximo": 720000,    "aliquota_nominal": 10.00, "valor_deduzir": 13860,   "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 11.51, "perc_pis": 2.49,  "perc_cpp": 37.50, "perc_icms": 7.50,  "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 2, "numero_faixa": 4, "valor_minimo": 720000.01,  "valor_maximo": 1800000,   "aliquota_nominal": 11.20, "valor_deduzir": 22500,   "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 11.51, "perc_pis": 2.49,  "perc_cpp": 37.50, "perc_icms": 7.50,  "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 2, "numero_faixa": 5, "valor_minimo": 1800000.01, "valor_maximo": 3600000,   "aliquota_nominal": 14.70, "valor_deduzir": 85500,   "perc_irpj": 5.50,  "perc_csll": 3.50,  "perc_cofins": 11.51, "perc_pis": 2.49,  "perc_cpp": 37.50, "perc_icms": 7.50,  "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
        {"anexo_id": 2, "numero_faixa": 6, "valor_minimo": 3600000.01, "valor_maximo": None,       "aliquota_nominal": 30.00, "valor_deduzir": 720000,  "perc_irpj": 8.50,  "perc_csll": 7.50,  "perc_cofins": 20.96, "perc_pis": 4.54,  "perc_cpp": 23.50, "perc_icms": 35.00, "perc_iss": 0,     "vigencia_inicio": VIGENCIA},

        # ---- Anexo III — Serviços (Fator R >= 0,28) ----
        {"anexo_id": 3, "numero_faixa": 1, "valor_minimo": 0,          "valor_maximo": 180000,    "aliquota_nominal": 6.00,  "valor_deduzir": 0,       "perc_irpj": 4.00,  "perc_csll": 3.50,  "perc_cofins": 12.82, "perc_pis": 2.78,  "perc_cpp": 43.40, "perc_icms": 0,     "perc_iss": 33.50, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 3, "numero_faixa": 2, "valor_minimo": 180000.01,  "valor_maximo": 360000,    "aliquota_nominal": 11.20, "valor_deduzir": 9360,    "perc_irpj": 4.00,  "perc_csll": 3.50,  "perc_cofins": 14.05, "perc_pis": 3.05,  "perc_cpp": 43.40, "perc_icms": 0,     "perc_iss": 32.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 3, "numero_faixa": 3, "valor_minimo": 360000.01,  "valor_maximo": 720000,    "aliquota_nominal": 13.50, "valor_deduzir": 17640,   "perc_irpj": 4.00,  "perc_csll": 3.50,  "perc_cofins": 13.64, "perc_pis": 2.96,  "perc_cpp": 43.40, "perc_icms": 0,     "perc_iss": 32.50, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 3, "numero_faixa": 4, "valor_minimo": 720000.01,  "valor_maximo": 1800000,   "aliquota_nominal": 16.00, "valor_deduzir": 35640,   "perc_irpj": 4.00,  "perc_csll": 3.50,  "perc_cofins": 13.64, "perc_pis": 2.96,  "perc_cpp": 43.40, "perc_icms": 0,     "perc_iss": 32.50, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 3, "numero_faixa": 5, "valor_minimo": 1800000.01, "valor_maximo": 3600000,   "aliquota_nominal": 21.00, "valor_deduzir": 125640,  "perc_irpj": 4.00,  "perc_csll": 3.50,  "perc_cofins": 12.82, "perc_pis": 2.78,  "perc_cpp": 43.40, "perc_icms": 0,     "perc_iss": 33.50, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 3, "numero_faixa": 6, "valor_minimo": 3600000.01, "valor_maximo": None,       "aliquota_nominal": 33.00, "valor_deduzir": 648000,  "perc_irpj": 35.00, "perc_csll": 15.00, "perc_cofins": 16.03, "perc_pis": 3.47,  "perc_cpp": 0,      "perc_icms": 0,     "perc_iss": 30.50, "vigencia_inicio": VIGENCIA},

        # ---- Anexo IV — Serviços (sem CPP) ----
        {"anexo_id": 4, "numero_faixa": 1, "valor_minimo": 0,          "valor_maximo": 180000,    "aliquota_nominal": 4.50,  "valor_deduzir": 0,       "perc_irpj": 18.80, "perc_csll": 15.20, "perc_cofins": 17.67, "perc_pis": 3.83,  "perc_cpp": 0,      "perc_icms": 0,     "perc_iss": 44.50, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 4, "numero_faixa": 2, "valor_minimo": 180000.01,  "valor_maximo": 360000,    "aliquota_nominal": 9.00,  "valor_deduzir": 8100,    "perc_irpj": 19.80, "perc_csll": 15.20, "perc_cofins": 20.55, "perc_pis": 4.45,  "perc_cpp": 0,      "perc_icms": 0,     "perc_iss": 40.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 4, "numero_faixa": 3, "valor_minimo": 360000.01,  "valor_maximo": 720000,    "aliquota_nominal": 10.20, "valor_deduzir": 12420,   "perc_irpj": 20.80, "perc_csll": 15.20, "perc_cofins": 19.73, "perc_pis": 4.27,  "perc_cpp": 0,      "perc_icms": 0,     "perc_iss": 40.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 4, "numero_faixa": 4, "valor_minimo": 720000.01,  "valor_maximo": 1800000,   "aliquota_nominal": 14.00, "valor_deduzir": 39780,   "perc_irpj": 17.80, "perc_csll": 19.20, "perc_cofins": 18.90, "perc_pis": 4.10,  "perc_cpp": 0,      "perc_icms": 0,     "perc_iss": 40.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 4, "numero_faixa": 5, "valor_minimo": 1800000.01, "valor_maximo": 3600000,   "aliquota_nominal": 22.00, "valor_deduzir": 183780,  "perc_irpj": 18.80, "perc_csll": 19.20, "perc_cofins": 18.08, "perc_pis": 3.92,  "perc_cpp": 0,      "perc_icms": 0,     "perc_iss": 40.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 4, "numero_faixa": 6, "valor_minimo": 3600000.01, "valor_maximo": None,       "aliquota_nominal": 33.00, "valor_deduzir": 828000,  "perc_irpj": 53.50, "perc_csll": 21.50, "perc_cofins": 20.55, "perc_pis": 4.45,  "perc_cpp": 0,      "perc_icms": 0,     "perc_iss": 0,     "vigencia_inicio": VIGENCIA},

        # ---- Anexo V — Serviços intelectuais (Fator R < 0,28) ----
        {"anexo_id": 5, "numero_faixa": 1, "valor_minimo": 0,          "valor_maximo": 180000,    "aliquota_nominal": 15.50, "valor_deduzir": 0,       "perc_irpj": 25.00, "perc_csll": 15.00, "perc_cofins": 14.10, "perc_pis": 3.05,  "perc_cpp": 28.85, "perc_icms": 0,     "perc_iss": 14.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 5, "numero_faixa": 2, "valor_minimo": 180000.01,  "valor_maximo": 360000,    "aliquota_nominal": 18.00, "valor_deduzir": 4500,    "perc_irpj": 23.00, "perc_csll": 15.00, "perc_cofins": 14.10, "perc_pis": 3.05,  "perc_cpp": 27.85, "perc_icms": 0,     "perc_iss": 17.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 5, "numero_faixa": 3, "valor_minimo": 360000.01,  "valor_maximo": 720000,    "aliquota_nominal": 19.50, "valor_deduzir": 9900,    "perc_irpj": 24.00, "perc_csll": 15.00, "perc_cofins": 14.92, "perc_pis": 3.23,  "perc_cpp": 23.85, "perc_icms": 0,     "perc_iss": 19.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 5, "numero_faixa": 4, "valor_minimo": 720000.01,  "valor_maximo": 1800000,   "aliquota_nominal": 20.50, "valor_deduzir": 17100,   "perc_irpj": 21.00, "perc_csll": 15.00, "perc_cofins": 15.74, "perc_pis": 3.41,  "perc_cpp": 23.85, "perc_icms": 0,     "perc_iss": 21.00, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 5, "numero_faixa": 5, "valor_minimo": 1800000.01, "valor_maximo": 3600000,   "aliquota_nominal": 23.00, "valor_deduzir": 62100,   "perc_irpj": 23.00, "perc_csll": 12.50, "perc_cofins": 14.10, "perc_pis": 3.05,  "perc_cpp": 23.85, "perc_icms": 0,     "perc_iss": 23.50, "vigencia_inicio": VIGENCIA},
        {"anexo_id": 5, "numero_faixa": 6, "valor_minimo": 3600000.01, "valor_maximo": None,       "aliquota_nominal": 30.50, "valor_deduzir": 540000,  "perc_irpj": 35.00, "perc_csll": 15.50, "perc_cofins": 16.44, "perc_pis": 3.56,  "perc_cpp": 29.50, "perc_icms": 0,     "perc_iss": 0,     "vigencia_inicio": VIGENCIA},
    ])


def downgrade() -> None:
    op.drop_table("cfop_simples", schema="public")
    op.drop_table("apuracoes_simples", schema="public")
    op.drop_table("historico_receita_simples", schema="public")
    op.drop_table("configuracoes_simples", schema="public")
    op.drop_table("faixas_simples", schema="public")
    op.drop_table("anexos_simples", schema="public")
