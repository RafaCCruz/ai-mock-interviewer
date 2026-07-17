import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import AsyncGroq
from dotenv import load_dotenv

# Carrega as chaves do arquivo .env
load_dotenv()

app = FastAPI(title="AI Mock Interviewer API")

# O CORS permite que o frontend se comunique com o backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializa o cliente da Groq de forma assíncrona
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

@app.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Recebe um arquivo de áudio e envia para o Whisper hospedado na Groq.
    """
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="O arquivo enviado não é um áudio válido.")

    # Lemos o arquivo para a memória
    audio_bytes = await file.read()
    
    # A Groq também precisa da tupla com nome e bytes
    audio_file_tuple = ("audio.webm", audio_bytes)

    try:
        # Enviamos para a API de transcrição da Groq
        response = await client.audio.transcriptions.create(
            model="whisper-large-v3", # Modelo open-source hospedado na Groq
            file=audio_file_tuple,
            language="pt" # Força o português
        )
        
        return {"transcription": response.text}

    except Exception as e:
        print(f"Erro na Groq: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar o áudio na IA.")