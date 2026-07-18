"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAuth, authFetch } from "@/context/AuthContext";

export default function Home() {
  const { token, email, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] text-[#8C97A6]">
        <span className="font-mono text-sm animate-pulse">carregando…</span>
      </main>
    );
  }

  if (!token) return <PublicLanding />;

  return <InterviewApp token={token} email={email} onLogout={logout} />;
}

function PublicLanding() {
  return (
    <main className="min-h-screen bg-[#0B0F14] text-[#E7ECF2]">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-[#F2B705]">●</span>
            <span className="font-semibold tracking-tight">mock/interviewer</span>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-[#F2B705] px-4 py-2 text-sm font-bold text-[#0B0F14] transition-transform hover:scale-[1.03]"
          >
            Entrar / Criar conta
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-6 flex h-40 items-end justify-center gap-1 opacity-[0.15]"
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-[#F2B705]"
              style={{ height: `${20 + Math.abs(Math.sin(i * 0.4)) * 80}%` }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-[#8C97A6]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F2B705]" />
            treino de entrevista de emprego com IA
          </div>

          <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Cole o link da vaga, envie seu currículo,{" "}
            <span className="text-[#F2B705]">treine de verdade</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-[#8C97A6]">
            Para qualquer área. A IA lê a vaga e seu currículo, faz perguntas
            sob medida, dá feedback por voz e ainda sugere melhorias no seu
            currículo para essa vaga específica.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-xl bg-[#F2B705] px-8 py-4 text-center font-bold text-[#0B0F14] shadow-lg shadow-[#F2B705]/20 transition-transform hover:scale-[1.02] sm:w-auto"
            >
              Criar minha conta grátis
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 font-mono text-xs uppercase tracking-[0.2em] text-[#8C97A6]">
            como funciona
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                tag: "01",
                title: "Crie sua conta",
                desc: "Login simples com e-mail e senha. Seu histórico fica salvo só para você.",
              },
              {
                tag: "02",
                title: "Informe a vaga e o currículo",
                desc: "Cole o link da vaga e envie seu currículo em PDF — ambos são opcionais, mas deixam a entrevista mais precisa.",
              },
              {
                tag: "03",
                title: "Pratique e receba sugestões",
                desc: "Responda por áudio, receba feedback e a próxima pergunta na hora, e sugestões de melhoria pro currículo no fim.",
              },
            ].map((step) => (
              <div key={step.tag}>
                <div className="mb-4 font-mono text-sm text-[#F2B705]">
                  {step.tag}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#8C97A6]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[#5B6674] sm:flex-row">
          <span className="font-mono">mock/interviewer</span>
          <span>Feito para treinar entrevistas de qualquer área, em português.</span>
        </div>
      </footer>
    </main>
  );
}

function InterviewApp({
  token,
  email,
  onLogout,
}: {
  token: string;
  email: string | null;
  onLogout: () => void;
}) {
  const { isRecording, audioBlob, startRecording, stopRecording } =
    useAudioRecorder();

  // --- configuração da sessão (antes de começar) ---
  const [jobRole, setJobRole] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // --- sessão ativa ---
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [hasJobDescription, setHasJobDescription] = useState(false);
  const [hasResume, setHasResume] = useState(false);

  // --- fluxo de pergunta/resposta ---
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);

  // --- sugestões de currículo ---
  const [resumeSuggestions, setResumeSuggestions] = useState<string | null>(
    null
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const playTTS = async (text: string) => {
    try {
      const res = await authFetch(token, "/api/audio/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      setAiAudioUrl(URL.createObjectURL(blob));
    } catch {
      // silencioso: áudio é só um "plus", não trava o fluxo
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobRole.trim()) {
      setStartError("Diga para qual vaga você quer treinar.");
      return;
    }

    setIsStarting(true);
    setStartError(null);

    try {
      const formData = new FormData();
      formData.append("job_role", jobRole.trim());
      if (jobLink.trim()) formData.append("job_link", jobLink.trim());
      if (resumeFile) formData.append("resume", resumeFile);

      const res = await authFetch(token, "/api/interview/start", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "Não consegui iniciar a entrevista.");
      }
      const data = await res.json();
      setSessionId(data.session_id);
      setHasJobDescription(data.has_job_description);
      setHasResume(data.has_resume);
      setCurrentQuestion(data.first_question);
      playTTS(data.first_question);
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : "Não consegui iniciar a entrevista."
      );
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    const processAnswer = async () => {
      if (!audioBlob || !sessionId) return;

      setIsProcessing(true);
      setErrorMsg(null);
      setTranscription(null);
      setFeedback(null);
      setAiAudioUrl(null);

      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const transcribeRes = await authFetch(token, "/api/audio/transcribe", {
          method: "POST",
          body: formData,
        });
        if (!transcribeRes.ok) throw new Error("Erro na transcrição");
        const { transcription: userText } = await transcribeRes.json();
        setTranscription(userText);

        const analyzeRes = await authFetch(token, "/api/interview/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, transcription: userText }),
        });
        if (!analyzeRes.ok) throw new Error("Erro na análise");
        const analyzeData = await analyzeRes.json();

        setFeedback(analyzeData.feedback);
        setCurrentQuestion(analyzeData.next_question);
        playTTS(analyzeData.next_question);
      } catch (error) {
        console.error("Erro no fluxo da entrevista:", error);
        setErrorMsg(
          "Não consegui processar sua resposta agora. Tente gravar de novo."
        );
      } finally {
        setIsProcessing(false);
      }
    };

    processAnswer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  useEffect(() => {
    if (aiAudioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.play().catch(() => {});
    }
  }, [aiAudioUrl]);

  const handleLoadSuggestions = async () => {
    if (!sessionId) return;
    setIsLoadingSuggestions(true);
    try {
      const res = await authFetch(
        token,
        `/api/resume/suggestions?session_id=${sessionId}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "Erro ao gerar sugestões.");
      }
      const data = await res.json();
      setResumeSuggestions(data.suggestions);
    } catch (err) {
      setResumeSuggestions(
        err instanceof Error ? err.message : "Erro ao gerar sugestões."
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F14] text-[#E7ECF2]">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-[#F2B705]">●</span>
            <span className="font-semibold tracking-tight">mock/interviewer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/historico"
              className="text-sm text-[#8C97A6] hover:text-[#E7ECF2]"
            >
              Histórico
            </Link>
            <span className="hidden font-mono text-xs text-[#5B6674] sm:inline">
              {email}
            </span>
            <button
              onClick={onLogout}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-[#8C97A6] hover:border-white/20 hover:text-[#E7ECF2]"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {!sessionId ? (
          <form
            onSubmit={handleStart}
            className="rounded-2xl border border-white/10 bg-[#10151C] p-6 sm:p-8"
          >
            <h1 className="mb-1 text-2xl font-bold tracking-tight">
              Configure sua entrevista
            </h1>
            <p className="mb-6 text-sm text-[#8C97A6]">
              Quanto mais contexto você der, mais específicas ficam as
              perguntas e o feedback.
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8C97A6]">
                  vaga *
                </label>
                <input
                  type="text"
                  required
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="Ex: Analista de RH, Vendedor(a), Desenvolvedor Front-end..."
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F14] px-4 py-3 outline-none focus:border-[#F2B705]/60 focus:ring-2 focus:ring-[#F2B705]/20"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8C97A6]">
                  link da vaga (opcional)
                </label>
                <input
                  type="url"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F14] px-4 py-3 outline-none focus:border-[#F2B705]/60 focus:ring-2 focus:ring-[#F2B705]/20"
                />
                <p className="mt-1 text-xs text-[#5B6674]">
                  A IA lê a descrição da vaga automaticamente e baseia as
                  perguntas nela.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8C97A6]">
                  currículo (opcional, PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F14] px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#F2B705] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#0B0F14]"
                />
                <p className="mt-1 text-xs text-[#5B6674]">
                  Usado para personalizar as perguntas e, no fim, sugerir
                  melhorias no currículo para essa vaga.
                </p>
              </div>
            </div>

            {startError && (
              <div className="mt-5 rounded-lg border border-[#E2543A]/30 bg-[#E2543A]/10 p-3 text-sm text-[#F3A08F]">
                {startError}
              </div>
            )}

            <button
              type="submit"
              disabled={isStarting}
              className="mt-6 w-full rounded-xl bg-[#F2B705] py-4 font-bold text-[#0B0F14] shadow-lg shadow-[#F2B705]/20 transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {isStarting ? "Preparando entrevista…" : "Começar entrevista"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {hasJobDescription && (
                <Tag>vaga lida automaticamente do link</Tag>
              )}
              {hasResume && <Tag>currículo em uso</Tag>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#10151C] p-6 sm:p-8">
              {currentQuestion && (
                <div className="mb-6 rounded-xl border-2 border-[#F2B705]/30 bg-[#F2B705]/10 p-5">
                  <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-[#F2B705]">
                    pergunta
                  </span>
                  <p className="text-lg font-semibold text-[#E7ECF2]">
                    {currentQuestion}
                  </p>
                  {aiAudioUrl && (
                    <audio
                      ref={audioPlayerRef}
                      src={aiAudioUrl}
                      controls
                      className="mt-4 h-10 w-full"
                    />
                  )}
                </div>
              )}

              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isRecording
                    ? "bg-[#E2543A] text-white shadow-lg shadow-[#E2543A]/20"
                    : "bg-[#F2B705] text-[#0B0F14] shadow-lg shadow-[#F2B705]/20 hover:brightness-110"
                }`}
              >
                {isRecording ? "⏹ Encerrar resposta" : "⏺ Responder por áudio"}
              </button>

              {isProcessing && (
                <div className="mt-6 flex items-center justify-center gap-2 font-mono text-sm text-[#F2B705]">
                  <span className="animate-pulse">
                    processando resposta e gerando próxima pergunta…
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="mt-6 rounded-lg border border-[#E2543A]/30 bg-[#E2543A]/10 p-4 text-sm text-[#F3A08F]">
                  {errorMsg}
                </div>
              )}

              {!isProcessing && transcription && (
                <div className="mt-8 space-y-4">
                  <Bubble label="sua resposta" tone="neutral">
                    {transcription}
                  </Bubble>
                  {feedback && (
                    <Bubble label="feedback" tone="good">
                      {feedback}
                    </Bubble>
                  )}
                </div>
              )}
            </div>

            {hasResume && (
              <div className="rounded-2xl border border-white/10 bg-[#10151C] p-6 sm:p-8">
                <h2 className="mb-1 font-semibold">
                  Sugestões de melhoria no currículo
                </h2>
                <p className="mb-4 text-sm text-[#8C97A6]">
                  A IA compara seu currículo com a vaga e aponta o que
                  ajustar.
                </p>
                {!resumeSuggestions ? (
                  <button
                    onClick={handleLoadSuggestions}
                    disabled={isLoadingSuggestions}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold hover:border-white/20 disabled:opacity-50"
                  >
                    {isLoadingSuggestions
                      ? "Analisando currículo…"
                      : "Gerar sugestões"}
                  </button>
                ) : (
                  <div className="whitespace-pre-line rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed text-[#C7CED8]">
                    {resumeSuggestions}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#F2B705]/30 bg-[#F2B705]/10 px-3 py-1 font-mono text-xs text-[#F2B705]">
      {children}
    </span>
  );
}

function Bubble({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "neutral" | "good";
  children: React.ReactNode;
}) {
  const styles =
    tone === "good"
      ? "border-[#3FB27F]/30 bg-[#3FB27F]/10"
      : "border-white/10 bg-white/[0.03]";
  const labelStyles = tone === "good" ? "text-[#3FB27F]" : "text-[#8C97A6]";

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <span
        className={`mb-1 block font-mono text-xs uppercase tracking-wider ${labelStyles}`}
      >
        {label}
      </span>
      <div className="text-[#E7ECF2]">{children}</div>
    </div>
  );
}