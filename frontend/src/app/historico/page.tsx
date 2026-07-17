"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface InterviewTurn {
  id: number;
  job_role: string;
  user_transcription: string;
  ai_feedback: string;
  ai_next_question: string;
  created_at: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<InterviewTurn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("https://mock-interviewer-backend-wxdn.onrender.com/api/interview/history");
        if (!response.ok) throw new Error("Falha ao carregar histórico");
        const data = await response.json();
        setHistory(data);
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Histórico de Entrevistas</h1>
        <Link 
          href="/" 
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
        >
          Voltar para Início
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-blue-600 font-medium mt-10 animate-pulse">
          <span>⏳ Carregando histórico...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center w-full max-w-3xl border border-gray-200">
          <p className="text-gray-500 text-lg">Você ainda não tem entrevistas salvas.</p>
        </div>
      ) : (
        <div className="w-full max-w-3xl space-y-6">
          {history.map((turn) => (
            <div key={turn.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                  💼 {turn.job_role}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {new Date(turn.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Você disse:</span>
                <p className="text-gray-700 italic">&quot;{turn.user_transcription}&quot;</p>
              </div>

              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider block mb-1">Feedback da IA:</span>
                <p className="text-green-900 text-sm">{turn.ai_feedback}</p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">Pergunta da IA:</span>
                <p className="text-blue-900 font-semibold text-sm">{turn.ai_next_question}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}