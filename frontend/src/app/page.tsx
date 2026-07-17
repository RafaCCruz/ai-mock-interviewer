"use client";

import { useEffect, useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const { isRecording, audioUrl, audioBlob, startRecording, stopRecording } = useAudioRecorder();
  
  // Novos estados para controlarmos a tela de carregamento e o texto final
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Fica "vigiando" o audioBlob. Toda vez que ele muda (ou seja, quando paramos de gravar), roda esse código
  useEffect(() => {
    const sendAudioForTranscription = async () => {
      // Se não tiver áudio, não faz nada
      if (!audioBlob) return;

      setIsTranscribing(true);
      setTranscription(null);

      // Preparamos o arquivo para envio, imitando um formulário HTML
      const formData = new FormData();
      // O nome do campo "file" deve ser exato ao que configuramos no backend (FastAPI)
      formData.append("file", audioBlob, "audio.webm");

      try {
        // Faz a chamada para a nossa API Python
        const response = await fetch("http://localhost:8000/api/audio/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Erro na comunicação com o backend");
        }

        // Recebe o JSON de volta e salva o texto
        const data = await response.json();
        setTranscription(data.transcription);
      } catch (error) {
        console.error("Erro ao enviar áudio:", error);
        setTranscription("❌ Ocorreu um erro ao tentar transcrever o áudio.");
      } finally {
        setIsTranscribing(false);
      }
    };

    sendAudioForTranscription();
  }, [audioBlob]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center gap-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800">Mock Interviewer</h1>
        
        <p className="text-gray-600 text-center text-sm">
          Grave sua resposta para analisarmos.
        </p>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all w-full flex justify-center items-center gap-2 ${
            isRecording 
              ? "bg-red-500 hover:bg-red-600 animate-pulse" 
              : "bg-blue-600 hover:bg-blue-700"
          } ${isTranscribing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isRecording ? "⏹ Parar Gravação" : "⏺ Iniciar Gravação"}
        </button>

        {audioUrl && (
          <div className="w-full flex flex-col items-center gap-2 mt-4">
            <audio src={audioUrl} controls className="w-full h-10" />
          </div>
        )}

        {/* Área para exibir o status ou a transcrição */}
        <div className="w-full mt-2">
          {isTranscribing && (
            <div className="flex items-center justify-center gap-2 text-blue-600 font-medium">
              <span className="animate-spin text-xl">⏳</span> Transcrevendo...
            </div>
          )}
          
          {transcription && !isTranscribing && (
            <div className="bg-gray-100 p-4 rounded-lg w-full text-sm text-gray-700 mt-2">
              <strong className="block text-gray-900 mb-1">Você disse:</strong>
              {transcription}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}