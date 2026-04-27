"""accountant and company new fields

Revision ID: 013
Revises: 012
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'accountants',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('tenant_id', sa.Integer, sa.ForeignKey('public.tenants.id'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('cpf', sa.String(14), nullable=True),
        sa.Column('crc', sa.String(20), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('email', sa.String(254), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema='public',
    )

    op.add_column('companies', sa.Column('cnae', sa.String(10), nullable=True), schema='public')
    op.add_column('companies', sa.Column('opening_date', sa.Date, nullable=True), schema='public')
    op.add_column('companies', sa.Column('accountant_id', sa.Integer, sa.ForeignKey('public.accountants.id'), nullable=True), schema='public')


def downgrade():
    op.drop_column('companies', 'accountant_id', schema='public')
    op.drop_column('companies', 'opening_date', schema='public')
    op.drop_column('companies', 'cnae', schema='public')
    op.drop_table('accountants', schema='public')
