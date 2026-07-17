import os
import tempfile # <-- NOVO
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse # <-- NOVO
from starlette.background import BackgroundTask # <-- NOVO
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import AsyncGroq
from dotenv import load_dotenv
import edge_tts # <-- NOVO

load_dotenv()

app = FastAPI(title="AI Mock Interviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

# --- NOVA ESTRUTURA DE DADOS ---
# Define exatamente o que o backend espera receber do frontend
class AnswerRequest(BaseModel):
    transcription: str
    job_role: str = "Desenvolvedor Front-end" # Vamos deixar um valor padrão por enquanto

@app.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # ... (Mantenha o código de transcrição exatamente como estava, sem alterações)
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


# --- NOVO ENDPOINT DE ANÁLISE ---
@app.post("/api/interview/analyze")
async def analyze_answer(request: AnswerRequest):
    """
    Recebe a transcrição, envia para o LLaMA 3 atuar como recrutador e devolve feedback + nova pergunta.
    """
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
            model="llama-3.3-70b-versatile", # Modelo super inteligente da Groq
            temperature=0.7, # 0.7 dá um equilíbrio bom entre criatividade e foco
            max_tokens=300
        )

        # Pegamos a resposta bruta da IA
        ia_response = chat_completion.choices[0].message.content

        # Separamos o Feedback da Pergunta usando o caractere | que pedimos no prompt
        parts = ia_response.split("|")
        feedback = parts[0].strip() if len(parts) > 0 else "Não consegui gerar um feedback."
        next_question = parts[1].strip() if len(parts) > 1 else "Pode me falar mais sobre sua experiência?"

        return {
            "feedback": feedback,
            "next_question": next_question
        }

    except Exception as e:
        print(f"Erro no LLaMA: {e}")
        raise HTTPException(status_code=500, detail="Erro ao analisar a resposta.")
    
    # --- NOVO ENDPOINT: TEXT-TO-SPEECH (TTS) ---

class TTSRequest(BaseModel):
    text: str

@app.post("/api/audio/tts")
async def text_to_speech(request: TTSRequest):
    """
    Recebe um texto e transforma em áudio usando vozes neurais da Microsoft.
    """
    try:
        # Escolhemos uma voz brasileira realista (Francisca ou Antonio)
        voice = "pt-BR-FranciscaNeural" 
        communicate = edge_tts.Communicate(request.text, voice)
        
        # Criamos um arquivo temporário no sistema para salvar o mp3
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        temp_file.close() # Fechamos para que o edge_tts possa escrever nele
        
        # Gera e salva o áudio no arquivo
        await communicate.save(temp_file.name)
        
        # Retornamos o arquivo de áudio para o frontend.
        # O BackgroundTask garante que o arquivo seja apagado do seu HD após o envio.
        return FileResponse(
            path=temp_file.name, 
            media_type="audio/mpeg",
            background=BackgroundTask(os.unlink, temp_file.name)
        )
    except Exception as e:
        print(f"Erro no TTS: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar áudio da IA.")