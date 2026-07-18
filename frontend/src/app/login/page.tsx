"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6 text-[#E7ECF2]">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-[#8C97A6] hover:text-[#E7ECF2]"
        >
          <span className="text-[#F2B705]">●</span> mock/interviewer
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#10151C] p-8">
          <div className="mb-6 flex gap-1 rounded-lg border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                mode === "login"
                  ? "bg-[#F2B705] text-[#0B0F14]"
                  : "text-[#8C97A6] hover:text-[#E7ECF2]"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                mode === "register"
                  ? "bg-[#F2B705] text-[#0B0F14]"
                  : "text-[#8C97A6] hover:text-[#E7ECF2]"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8C97A6]">
                e-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F14] px-4 py-3 outline-none focus:border-[#F2B705]/60 focus:ring-2 focus:ring-[#F2B705]/20"
                placeholder="voce@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8C97A6]">
                senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F14] px-4 py-3 outline-none focus:border-[#F2B705]/60 focus:ring-2 focus:ring-[#F2B705]/20"
                placeholder="mínimo 6 caracteres"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[#E2543A]/30 bg-[#E2543A]/10 p-3 text-sm text-[#F3A08F]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#F2B705] py-3 font-bold text-[#0B0F14] transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {isSubmitting
                ? "Aguarde…"
                : mode === "login"
                ? "Entrar"
                : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}