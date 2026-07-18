"""add users, interview_sessions, and link interview_turns to them

Revision ID: 8f3a1c9d2b40
Revises: 02b0ff496c96
Create Date: 2026-07-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8f3a1c9d2b40'
down_revision: Union[str, Sequence[str], None] = '02b0ff496c96'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # --- interview_sessions ---
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('job_role', sa.String(), nullable=False),
        sa.Column('job_link', sa.String(), nullable=True),
        sa.Column('job_description_text', sa.Text(), nullable=True),
        sa.Column('resume_filename', sa.String(), nullable=True),
        sa.Column('resume_text', sa.Text(), nullable=True),
        sa.Column('resume_suggestions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_interview_sessions_id'), 'interview_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_interview_sessions_user_id'), 'interview_sessions', ['user_id'], unique=False)

    # --- interview_turns: novas colunas ---
    op.add_column('interview_turns', sa.Column('session_id', sa.Integer(), nullable=True))
    op.add_column('interview_turns', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_interview_turns_session_id'), 'interview_turns', ['session_id'], unique=False)
    op.create_index(op.f('ix_interview_turns_user_id'), 'interview_turns', ['user_id'], unique=False)
    op.create_foreign_key(
        'fk_interview_turns_session_id', 'interview_turns', 'interview_sessions', ['session_id'], ['id']
    )
    op.create_foreign_key(
        'fk_interview_turns_user_id', 'interview_turns', 'users', ['user_id'], ['id']
    )
    # Nota: linhas antigas (anteriores ao login) ficarão com session_id/user_id nulos.
    # Se quiser, apague esses registros antigos manualmente, já que não pertencem a nenhum usuário.


def downgrade() -> None:
    op.drop_constraint('fk_interview_turns_user_id', 'interview_turns', type_='foreignkey')
    op.drop_constraint('fk_interview_turns_session_id', 'interview_turns', type_='foreignkey')
    op.drop_index(op.f('ix_interview_turns_user_id'), table_name='interview_turns')
    op.drop_index(op.f('ix_interview_turns_session_id'), table_name='interview_turns')
    op.drop_column('interview_turns', 'user_id')
    op.drop_column('interview_turns', 'session_id')

    op.drop_index(op.f('ix_interview_sessions_user_id'), table_name='interview_sessions')
    op.drop_index(op.f('ix_interview_sessions_id'), table_name='interview_sessions')
    op.drop_table('interview_sessions')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')