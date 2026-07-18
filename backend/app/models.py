from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sessions = relationship("InterviewSession", back_populates="user")


class InterviewSession(Base):
    """
    Representa uma 'entrevista' completa: a vaga (link + descrição extraída),
    o currículo enviado e o histórico de perguntas/respostas daquela sessão.
    """
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    job_role = Column(String, nullable=False)
    job_link = Column(String, nullable=True)
    job_description_text = Column(Text, nullable=True)

    resume_filename = Column(String, nullable=True)
    resume_text = Column(Text, nullable=True)
    resume_suggestions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="sessions")
    turns = relationship("InterviewTurn", back_populates="session")


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    job_role = Column(String, index=True)
    user_transcription = Column(Text, nullable=False)
    ai_feedback = Column(Text, nullable=False)
    ai_next_question = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("InterviewSession", back_populates="turns")