import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import AsyncGroq
from dotenv import load_dotenv
import edge_tts

# Imports do banco de dados
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import InterviewTurn

load_dotenv()

app = FastAPI(title="AI Mock Interviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite acesso de qualquer site
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

# --- MODELOS DE DADOS ---
class AnswerRequest(BaseModel):
    transcription: str
    job_role: str = "Desenvolvedor Front-end"

class TTSRequest(BaseModel):
    text: str

# --- 1. ENDPOINT DE TRANSCRIÇÃO (Whisper) ---
@app.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="O arquivo enviado não é um áudio válido.")

    audio_bytes = await file.read()
    audio_file_tuple = ("audio.webm", audio_bytes, file.content_type)

    try:
        response = await client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file_tuple,
            language="pt",
            prompt="Transcrição de uma entrevista de emprego em português do Brasil. O candidato responde de forma clara."
        )
        return {"transcription": response.text.strip()}
    except Exception as e:
        print(f"Erro na Groq: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar o áudio na IA.")


# --- 2. ENDPOINT DE ANÁLISE (LLaMA + PostgreSQL) ---
@app.post("/api/interview/analyze")
async def analyze_answer(
    request: AnswerRequest, 
    db: Session = Depends(get_db)
):
    system_prompt = f"""
    Você é um recrutador técnico sênior conduzindo uma entrevista para a vaga de {request.job_role}.
    Sua tarefa é avaliar a última resposta do candidato.
    Seja direto, educado e construtivo.
    
    Retorne SUA RESPOSTA EXATAMENTE no formato abaixo, usando o caractere | como separador, sem quebras de linha adicionais ou formatação markdown:
    [Feedback rápido sobre a resposta do candidato] | [Uma nova pergunta técnica ou comportamental para dar continuidade]
    """

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.transcription}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=300
        )

        ia_response = chat_completion.choices[0].message.content
        parts = ia_response.split("|")
        feedback = parts[0].strip() if len(parts) > 0 else "Não consegui gerar um feedback."
        next_question = parts[1].strip() if len(parts) > 1 else "Pode me falar mais sobre sua experiência?"

        # Salva no Banco de Dados
        novo_turno = InterviewTurn(
            job_role=request.job_role,
            user_transcription=request.transcription,
            ai_feedback=feedback,
            ai_next_question=next_question
        )
        db.add(novo_turno) 
        db.commit()        

        return {
            "feedback": feedback,
            "next_question": next_question
        }

    except Exception as e:
        print(f"Erro no LLaMA ou Banco: {e}")
        db.rollback() 
        raise HTTPException(status_code=500, detail="Erro ao analisar a resposta ou salvar histórico.")


# --- 3. ENDPOINT DE VOZ (Text-to-Speech) ---
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
            background=BackgroundTask(os.unlink, temp_file.name)
        )
    except Exception as e:
        print(f"Erro no TTS: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar áudio da IA.")
    
    # --- 4. ENDPOINT DE HISTÓRICO (PostgreSQL) ---
@app.get("/api/interview/history")
async def get_interview_history(db: Session = Depends(get_db)):
    """
    Busca todas as conversas salvas no banco de dados,
    ordenadas da mais recente para a mais antiga.
    """
    try:
        historico = db.query(InterviewTurn).order_by(InterviewTurn.id.desc()).all()
        return historico
    except Exception as e:
        print(f"Erro ao buscar histórico: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar o histórico de entrevistas.")