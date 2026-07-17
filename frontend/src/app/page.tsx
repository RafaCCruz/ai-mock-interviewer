"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const { isRecording, audioBlob, startRecording, stopRecording } = useAudioRecorder();
  
  const [jobRole, setJobRole] = useState("Desenvolvedor Front-end");
  
  const [transcription, setTranscription] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nextQuestion, setNextQuestion] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const processInterview = async () => {
      if (!audioBlob) return;

      setIsProcessing(true);
      setTranscription(null);
      setFeedback(null);
      setNextQuestion(null);
      setAiAudioUrl(null);

      try {
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

        const analyzeRes = await fetch("http://localhost:8000/api/interview/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            transcription: userText,
            job_role: jobRole 
          }),
        });

        if (!analyzeRes.ok) throw new Error("Erro na análise");
        const analyzeData = await analyzeRes.json();
        
        setFeedback(analyzeData.feedback);
        setNextQuestion(analyzeData.next_question);

        const ttsRes = await fetch("http://localhost:8000/api/audio/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: analyzeData.next_question }),
        });

        if (!ttsRes.ok) throw new Error("Erro ao gerar áudio");
        
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

  useEffect(() => {
    if (aiAudioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.play().catch(e => console.log("Autoplay bloqueado", e));
    }
  }, [aiAudioUrl]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center gap-6 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-800">Mock Interviewer AI</h1>
        
        {/* --- NOVO: BOTÃO PARA O HISTÓRICO --- */}
        <Link 
          href="/historico" 
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-4 transition-colors"
        >
          Ver meu histórico de entrevistas
        </Link>
        
        <div className="w-full max-w-xs flex flex-col items-center gap-2">
          <label htmlFor="jobRole" className="text-sm font-semibold text-gray-600">
            Qual vaga você está aplicando?
          </label>
          <input
            id="jobRole"
            type="text"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            disabled={isProcessing || isRecording}
            placeholder="Ex: Cientista de Dados"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center font-medium text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`px-8 py-4 rounded-full font-bold text-white transition-all w-full max-w-xs flex justify-center items-center gap-2 shadow-md mt-2 ${
            isRecording 
              ? "bg-red-500 hover:bg-red-600 shadow-red-200" 
              : "bg-blue-600 hover:bg-blue-700"
          } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isRecording ? "⏹ Encerrar Resposta" : "⏺ Responder (Áudio)"}
        </button>

        {/* --- ANIMAÇÃO DE ONDAS DE ÁUDIO --- */}
        {isRecording && (
          <div className="flex justify-center items-end gap-1.5 h-10 mt-2">
            {[0, 0.2, 0.4, 0.15, 0.3, 0.5, 0.25, 0.1, 0.45].map((delay, index) => (
              <div
                key={index}
                className="w-2 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: ["40%", "80%", "100%", "60%", "90%", "50%", "75%", "45%", "85%"][index],
                  animationDelay: `${delay}s`,
                  animationDuration: "0.8s"
                }}
              />
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-blue-600 font-medium mt-4 animate-pulse">
            <span>⏳ A IA está ouvindo e pensando...</span>
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