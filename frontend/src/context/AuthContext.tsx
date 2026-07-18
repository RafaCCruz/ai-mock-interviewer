"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://mock-interviewer-backend-wxdn.onrender.com";

const TOKEN_KEY = "mock_interviewer_token";
const EMAIL_KEY = "mock_interviewer_email";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setEmail(localStorage.getItem(EMAIL_KEY));
    setIsLoading(false);
  }, []);

  const persist = (newToken: string, newEmail: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EMAIL_KEY, newEmail);
    setToken(newToken);
    setEmail(newEmail);
  };

  const login = async (emailInput: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.detail ?? "Não foi possível entrar.");
    }
    const data = await res.json();
    persist(data.access_token, data.email);
  };

  const register = async (emailInput: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.detail ?? "Não foi possível criar sua conta.");
    }
    const data = await res.json();
    persist(data.access_token, data.email);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, email, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

/** Helper pra chamar a API já com o header Authorization. */
export function authFetch(
  token: string | null,
  path: string,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, { ...init, headers });
}