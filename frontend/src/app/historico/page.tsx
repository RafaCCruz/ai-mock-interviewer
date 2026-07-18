"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, authFetch } from "@/context/AuthContext";

interface InterviewTurn {
  id: number;
  job_role: string;
  user_transcription: string;
  ai_feedback: string;
  ai_next_question: string;
  created_at: string;
}

export default function HistoryPage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<InterviewTurn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.push("/login");
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    const fetchHistory = async () => {
      try {
        const response = await authFetch(token, "/api/interview/history");
        if (!response.ok) throw new Error("Falha ao carregar histórico");
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar seu histórico agora.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  if (authLoading || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] text-[#8C97A6]">
        <span className="font-mono text-sm animate-pulse">carregando…</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-12 text-[#E7ECF2]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#8C97A6]">
              seu progresso
            </span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Histórico de entrevistas
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-[#E7ECF2] transition-colors hover:border-white/20"
          >
            ← Voltar
          </Link>
        </div>

        {isLoading ? (
          <div className="font-mono text-sm text-[#F2B705] animate-pulse">
            carregando histórico…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#E2543A]/30 bg-[#E2543A]/10 p-6 text-sm text-[#F3A08F]">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-[#8C97A6]">
              Você ainda não tem entrevistas salvas.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-full bg-[#F2B705] px-5 py-2 text-sm font-bold text-[#0B0F14]"
            >
              Fazer minha primeira prática
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((turn) => (
              <div
                key={turn.id}
                className="rounded-2xl border border-white/10 bg-[#10151C] p-6"
              >
                <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="rounded-full border border-[#F2B705]/30 bg-[#F2B705]/10 px-3 py-1 font-mono text-xs font-semibold text-[#F2B705]">
                    {turn.job_role}
                  </span>
                  <span className="font-mono text-xs text-[#5B6674]">
                    {new Date(turn.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-[#8C97A6]">
                      você disse
                    </span>
                    <p className="italic text-[#C7CED8]">
                      &quot;{turn.user_transcription}&quot;
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#3FB27F]/30 bg-[#3FB27F]/10 p-3">
                    <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-[#3FB27F]">
                      feedback da IA
                    </span>
                    <p className="text-sm text-[#E7ECF2]">{turn.ai_feedback}</p>
                  </div>

                  <div className="rounded-lg border border-[#F2B705]/30 bg-[#F2B705]/10 p-3">
                    <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-[#F2B705]">
                      pergunta da IA
                    </span>
                    <p className="text-sm font-semibold text-[#E7ECF2]">
                      {turn.ai_next_question}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}