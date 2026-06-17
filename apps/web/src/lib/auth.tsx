"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setToken } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthResponse {
  user: User;
  accessToken: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    setToken(data.accessToken);
    setUser(data.user);
    router.push("/dashboard");
  }

  async function register(name: string, email: string, password: string) {
    const data = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      auth: false,
      body: { name, email, password },
    });
    setToken(data.accessToken);
    setUser(data.user);
    router.push("/dashboard");
  }

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
