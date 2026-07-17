"use client";

import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const { isRecording, audioUrl, startRecording, stopRecording } = useAudioRecorder();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center gap-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800">Mock Interviewer</h1>
        
        <p className="text-gray-600 text-center text-sm">
          Grave sua resposta para analisarmos.
        </p>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all w-full flex justify-center items-center gap-2 ${
            isRecording 
              ? "bg-red-500 hover:bg-red-600 animate-pulse" 
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isRecording ? "⏹ Parar Gravação" : "⏺ Iniciar Gravação"}
        </button>

        {audioUrl && (
          <div className="w-full flex flex-col items-center gap-2 mt-4">
            <span className="text-sm font-medium text-gray-500">Sua Resposta:</span>
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}
      </div>
    </main>
  );
}