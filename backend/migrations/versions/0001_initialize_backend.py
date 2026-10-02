"""Initialize backend migration history.

Revision ID: 0001
Revises:
Create Date: 2026-09-23
"""

from collections.abc import Sequence

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # User and session tables belong to P0-03; this revision starts history only.
    pass


def downgrade() -> None:
    pass
