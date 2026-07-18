import os
import tempfile
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import AsyncGroq
from dotenv import load_dotenv
import edge_tts

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import InterviewTurn, InterviewSession, User
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.document_parsing import extract_resume_text, extract_job_description

load_dotenv()

app = FastAPI(title="AI Mock Interviewer API")

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))


# ============================================================
# AUTENTICAÇÃO
# ============================================================
class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    email: str


@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado.")

    if len(request.password) < 6:
        raise HTTPException(
            status_code=400, detail="A senha precisa ter pelo menos 6 caracteres."
        )

    user = User(
        email=request.email.lower(),
        hashed_password=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, email=user.email)


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, email=user.email)


@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}


# ============================================================
# ÁUDIO
# ============================================================
@app.post("/api/audio/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="O arquivo enviado não é um áudio válido.")

    audio_bytes = await file.read()
    audio_file_tuple = ("audio.webm", audio_bytes, file.content_type)

    try:
        response = await client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file_tuple,
            language="pt",
            prompt="Transcrição de uma entrevista de emprego em português do Brasil. O candidato responde de forma clara.",
        )
        return {"transcription": response.text.strip()}
    except Exception as e:
        print(f"Erro na Groq: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar o áudio na IA.")


class TTSRequest(BaseModel):
    text: str


@app.post("/api/audio/tts")
async def text_to_speech(request: TTSRequest):
    try:
        voice = "pt-BR-FranciscaNeural"
        communicate = edge_tts.Communicate(request.text, voice)

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        temp_file.close()

        await communicate.save(temp_file.name)

        return FileResponse(
            path=temp_file.name,
            media_type="audio/mpeg",
            background=BackgroundTask(os.unlink, temp_file.name),
        )
    except Exception as e:
        print(f"Erro no TTS: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar áudio da IA.")


# ============================================================
# ENTREVISTA (agora com sessão vinculada a vaga + currículo)
# ============================================================
def build_context_block(session: InterviewSession) -> str:
    """Monta o bloco de contexto (vaga + currículo) usado em todo prompt da sessão."""
    parts = [f"Cargo/vaga informado pelo candidato: {session.job_role}"]

    if session.job_description_text:
        parts.append(
            "Descrição da vaga extraída do link enviado pelo candidato "
            f"(use isso para direcionar as perguntas):\n{session.job_description_text}"
        )
    if session.resume_text:
        parts.append(
            "Currículo do candidato (use isso para perguntar sobre experiências "
            f"reais dele e cruzar com a vaga):\n{session.resume_text}"
        )
    return "\n\n".join(parts)


@app.post("/api/interview/start")
async def start_interview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    job_role: str = Form(...),
    job_link: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
):
    """
    Cria uma nova sessão de entrevista. Opcionalmente recebe o link da vaga
    (a descrição é extraída automaticamente) e o currículo (PDF ou .txt).
    Retorna já a primeira pergunta, personalizada com esse contexto.
    """
    job_description_text = None
    if job_link:
        try:
            job_description_text = await extract_job_description(job_link)
        except Exception as e:
            print(f"Erro ao ler link da vaga: {e}")
            # não trava o fluxo: segue sem descrição da vaga
            job_description_text = None

    resume_text = None
    resume_filename = None
    if resume is not None:
        try:
            resume_bytes = await resume.read()
            resume_text = extract_resume_text(resume_bytes, resume.content_type)
            resume_filename = resume.filename
        except Exception as e:
            print(f"Erro ao ler currículo: {e}")
            raise HTTPException(
                status_code=400,
                detail="Não consegui ler o currículo enviado. Envie um PDF ou .txt.",
            )

    session = InterviewSession(
        user_id=current_user.id,
        job_role=job_role,
        job_link=job_link,
        job_description_text=job_description_text,
        resume_text=resume_text,
        resume_filename=resume_filename,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    context_block = build_context_block(session)
    system_prompt = f"""
    Você é um recrutador sênior experiente, especializado na área de atuação da vaga abaixo.
    Adapte completamente seu vocabulário e os critérios de avaliação à natureza dessa vaga
    (pode ser tecnologia, vendas, saúde, educação, operações, jurídico, etc.).

    {context_block}

    Gere a PRIMEIRA pergunta da entrevista. Se houver descrição da vaga e/ou currículo,
    conecte a pergunta com pontos específicos deles (uma experiência do currículo, um requisito
    da vaga). Se não houver, faça uma pergunta inicial genérica e adequada ao cargo informado.

    Retorne APENAS a pergunta, sem formatação markdown, sem numeração, sem texto adicional.
    """

    try:
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=200,
        )
        first_question = chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erro ao gerar primeira pergunta: {e}")
        first_question = f"Para começar, me conte um pouco sobre sua experiência relacionada à vaga de {job_role}."

    return {
        "session_id": session.id,
        "job_role": session.job_role,
        "has_job_description": bool(job_description_text),
        "has_resume": bool(resume_text),
        "first_question": first_question,
    }


class AnswerRequest(BaseModel):
    session_id: int
    transcription: str


@app.post("/api/interview/analyze")
async def analyze_answer(
    request: AnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == request.session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sessão de entrevista não encontrada.")

    context_block = build_context_block(session)
    system_prompt = f"""
    Você é um recrutador sênior experiente conduzindo uma entrevista.

    {context_block}

    Avalie a última resposta do candidato considerando a vaga e, quando disponível,
    o currículo dele. Seja direto, educado e construtivo.

    Retorne SUA RESPOSTA EXATAMENTE no formato abaixo, usando o caractere | como separador,
    sem quebras de linha adicionais ou formatação markdown:
    [Feedback rápido sobre a resposta do candidato] | [Uma nova pergunta coerente com a vaga
    e, se possível, com o currículo, para dar continuidade]
    """

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.transcription},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=300,
        )

        ia_response = chat_completion.choices[0].message.content
        parts = ia_response.split("|")
        feedback = parts[0].strip() if len(parts) > 0 else "Não consegui gerar um feedback."
        next_question = (
            parts[1].strip() if len(parts) > 1 else "Pode me falar mais sobre sua experiência?"
        )

        novo_turno = InterviewTurn(
            session_id=session.id,
            user_id=current_user.id,
            job_role=session.job_role,
            user_transcription=request.transcription,
            ai_feedback=feedback,
            ai_next_question=next_question,
        )
        db.add(novo_turno)
        db.commit()

        return {"feedback": feedback, "next_question": next_question}

    except Exception as e:
        print(f"Erro no LLaMA ou Banco: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao analisar a resposta ou salvar histórico.")


@app.get("/api/interview/history")
async def get_interview_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Histórico apenas do usuário logado, mais recentes primeiro."""
    historico = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.user_id == current_user.id)
        .order_by(InterviewTurn.id.desc())
        .all()
    )
    return historico


# ============================================================
# CURRÍCULO — sugestões de melhoria com base na vaga
# ============================================================
@app.post("/api/resume/suggestions")
async def get_resume_suggestions(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sessão de entrevista não encontrada.")

    if not session.resume_text:
        raise HTTPException(
            status_code=400,
            detail="Esta sessão não tem currículo enviado para gerar sugestões.",
        )

    if session.resume_suggestions:
        return {"suggestions": session.resume_suggestions}

    prompt = f"""
    Você é um consultor de carreira especialista em otimizar currículos para vagas específicas.

    Vaga (cargo: {session.job_role}):
    {session.job_description_text or "Descrição da vaga não informada, use apenas o cargo."}

    Currículo do candidato:
    {session.resume_text}

    Analise o currículo à luz dessa vaga e sugira melhorias concretas: palavras-chave da vaga
    ausentes no currículo, experiências que deveriam ser destacadas ou reescritas, e pontos fracos
    de formatação/clareza. Escreva em tópicos curtos e diretos, em português, sem introduções longas.
    """

    try:
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=700,
        )
        suggestions = chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erro ao gerar sugestões de currículo: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar sugestões de currículo.")

    session.resume_suggestions = suggestions
    db.commit()

    return {"suggestions": suggestions}