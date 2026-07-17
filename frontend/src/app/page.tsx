"use client";

import { useEffect, useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const { isRecording, audioUrl, audioBlob, startRecording, stopRecording } = useAudioRecorder();
  
  const [transcription, setTranscription] = useState<string | null>(null);
  
  // NOVOS ESTADOS: Para guardar a resposta da IA
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nextQuestion, setNextQuestion] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processInterview = async () => {
      if (!audioBlob) return;

      setIsProcessing(true);
      setTranscription(null);
      setFeedback(null);
      setNextQuestion(null);

      // --- PASSO 1: Transcrição (Whisper) ---
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");

      try {
        const transcribeRes = await fetch("http://localhost:8000/api/audio/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!transcribeRes.ok) throw new Error("Erro na transcrição");
        const transcribeData = await transcribeRes.json();
        const userText = transcribeData.transcription;
        setTranscription(userText);

        // --- PASSO 2: Avaliação da IA (LLaMA) ---
        // Agora fazemos uma SEGUNDA chamada pro backend, enviando o texto para ser analisado
        const analyzeRes = await fetch("http://localhost:8000/api/interview/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            transcription: userText,
            job_role: "Desenvolvedor Front-end" // Fixo por enquanto
          }),
        });

        if (!analyzeRes.ok) throw new Error("Erro na análise");
        const analyzeData = await analyzeRes.json();
        
        // Salvamos o feedback e a nova pergunta no estado para aparecer na tela
        setFeedback(analyzeData.feedback);
        setNextQuestion(analyzeData.next_question);

      } catch (error) {
        console.error("Erro no fluxo da entrevista:", error);
        setTranscription("❌ Ocorreu um erro no processamento.");
      } finally {
        setIsProcessing(false);
      }
    };

    processInterview();
  }, [audioBlob]);

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

        {/* LOADING STATE */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-blue-600 font-medium mt-4 animate-pulse">
            <span>⏳ A IA está ouvindo e pensando...</span>
          </div>
        )}

        {/* FEEDBACK E PERGUNTA DA IA NA TELA */}
        {!isProcessing && transcription && (
          <div className="w-full mt-6 space-y-4">
            {/* O que você disse */}
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Sua Resposta (Transcrição):</span>
              <p className="text-gray-800">{transcription}</p>
            </div>

            {/* Avaliação do Recrutador */}
            {feedback && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 block">Feedback do Recrutador:</span>
                <p className="text-green-900">{feedback}</p>
              </div>
            )}

            {/* Próxima Pergunta */}
            {nextQuestion && (
              <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm mt-6">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1 block">Próxima Pergunta:</span>
                <p className="text-blue-900 font-semibold text-lg">{nextQuestion}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}