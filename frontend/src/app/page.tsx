"use client";

import { useEffect, useState, useRef } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const { isRecording, audioBlob, startRecording, stopRecording } = useAudioRecorder();
  
  const [transcription, setTranscription] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nextQuestion, setNextQuestion] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // NOVO ESTADO: Guarda o link do áudio da IA para tocarmos
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  
  // Usamos useRef para acessar o player de áudio HTML e dar play automático
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const processInterview = async () => {
      if (!audioBlob) return;

      setIsProcessing(true);
      setTranscription(null);
      setFeedback(null);
      setNextQuestion(null);
      setAiAudioUrl(null); // Limpa o áudio anterior

      try {
        // --- PASSO 1: Transcrição (Whisper/Groq) ---
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const transcribeRes = await fetch("http://localhost:8000/api/audio/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!transcribeRes.ok) throw new Error("Erro na transcrição");
        const transcribeData = await transcribeRes.json();
        const userText = transcribeData.transcription;
        setTranscription(userText);

        // --- PASSO 2: Avaliação da IA (LLaMA 3.3) ---
        const analyzeRes = await fetch("http://localhost:8000/api/interview/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            transcription: userText,
            job_role: "Desenvolvedor Front-end" 
          }),
        });

        if (!analyzeRes.ok) throw new Error("Erro na análise");
        const analyzeData = await analyzeRes.json();
        
        setFeedback(analyzeData.feedback);
        setNextQuestion(analyzeData.next_question);

        // --- PASSO 3: Geração de Voz (TTS) ---
        // Pegamos a "next_question" gerada no Passo 2 e mandamos para virar áudio
        const ttsRes = await fetch("http://localhost:8000/api/audio/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: analyzeData.next_question }),
        });

        if (!ttsRes.ok) throw new Error("Erro ao gerar áudio");
        
        // Transformamos a resposta bruta em um arquivo tocável no navegador
        const audioBlobResult = await ttsRes.blob();
        const url = URL.createObjectURL(audioBlobResult);
        setAiAudioUrl(url);

      } catch (error) {
        console.error("Erro no fluxo da entrevista:", error);
        setTranscription("❌ Ocorreu um erro no processamento. Tente novamente.");
      } finally {
        setIsProcessing(false);
      }
    };

    processInterview();
  }, [audioBlob]);

  // NOVO EFEITO: Toca o áudio automaticamente assim que ele carregar na tela
  useEffect(() => {
    if (aiAudioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.play().catch(e => console.log("Autoplay bloqueado pelo navegador", e));
    }
  }, [aiAudioUrl]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center gap-6 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-800">Mock Interviewer AI</h1>
        
        <p className="text-gray-600 text-center">
          Vaga: <span className="font-semibold text-blue-600">Desenvolvedor Front-end</span>
        </p>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`px-8 py-4 rounded-full font-bold text-white transition-all w-full max-w-xs flex justify-center items-center gap-2 shadow-md ${
            isRecording 
              ? "bg-red-500 hover:bg-red-600 animate-pulse" 
              : "bg-blue-600 hover:bg-blue-700"
          } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isRecording ? "⏹ Encerrar Resposta" : "⏺ Responder (Áudio)"}
        </button>

        {isProcessing && (
          <div className="flex items-center gap-2 text-blue-600 font-medium mt-4 animate-pulse">
            <span>⏳ A IA está ouvindo, pensando e preparando a voz...</span>
          </div>
        )}

        {!isProcessing && transcription && (
          <div className="w-full mt-6 space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Sua Resposta:</span>
              <p className="text-gray-800">{transcription}</p>
            </div>

            {feedback && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 block">Feedback:</span>
                <p className="text-green-900">{feedback}</p>
              </div>
            )}

            {nextQuestion && (
              <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm mt-6">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1 block">Próxima Pergunta:</span>
                <p className="text-blue-900 font-semibold text-lg mb-4">{nextQuestion}</p>
                
                {/* O PLAYER INVISÍVEL DA IA */}
                {aiAudioUrl && (
                  <audio ref={audioPlayerRef} src={aiAudioUrl} controls className="w-full h-10" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}