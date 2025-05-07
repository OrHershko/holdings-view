"""add purchase_date to holdings

Revision ID: add_purchase_date
Revises: 67ed9cf6316d
Create Date: 2025-05-20 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_purchase_date'
down_revision: Union[str, None] = '67ed9cf6316d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add purchase_date column to holdings table."""
    op.add_column('holdings', sa.Column('purchase_date', sa.DateTime(), 
                  server_default=sa.func.now(), nullable=False))


def downgrade() -> None:
    """Remove purchase_date column from holdings table."""
    op.drop_column('holdings', 'purchase_date') 