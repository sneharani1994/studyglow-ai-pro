import { api, API_BASE_URL, setAuthToken } from "../client";

/**
 * Auth service — matches backend at /api/auth/* (Supabase-backed).
 * Login/signup return { user, session } where session.access_token is the bearer.
 */

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; avatar_url?: string;[k: string]: unknown };
  [k: string]: unknown;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  session: SupabaseSession | null;
}

export interface LoginInput { email: string; password: string }
export interface SignupInput { email: string; password: string; name: string }

const REFRESH_KEY = "studygpt.auth.refresh";

function normalizeUser(u: SupabaseUser): AuthUser {
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? "",
    name: (meta.full_name as string) || (u.email ? u.email.split("@")[0] : "User"),
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
  };
}

function persistSession(session: SupabaseSession | null) {
  if (!session) {
    setAuthToken(null);
    if (typeof window !== "undefined") localStorage.removeItem(REFRESH_KEY);
    return;
  }
  setAuthToken(session.access_token);
  if (typeof window !== "undefined" && session.refresh_token) {
    localStorage.setItem(REFRESH_KEY, session.refresh_token);
  }
}

export const authService = {
  /** POST /api/auth/login */
  async login(input: LoginInput): Promise<AuthResponse> {
    const res = await api.post<{ user: SupabaseUser; session: SupabaseSession }>(
      "/api/auth/login",
      input,
      { skipAuth: true },
    );
    persistSession(res.session);
    return { user: normalizeUser(res.user), session: res.session };
  },

  /** POST /api/auth/signup. May return null session (email verification required). */
  async signup(input: SignupInput): Promise<AuthResponse> {
    const res = await api.post<{ user: SupabaseUser; session: SupabaseSession | null }>(
      "/api/auth/signup",
      { email: input.email, password: input.password, fullName: input.name },
      { skipAuth: true },
    );
    if (res.session) persistSession(res.session);
    return { user: normalizeUser(res.user), session: res.session };
  },

  /** POST /api/auth/logout */
  async logout(): Promise<void> {
    try { await api.post("/api/auth/logout"); } finally { persistSession(null); }
  },

  /** GET /api/auth/session → { user } */
  async me(): Promise<AuthUser> {
    const res = await api.get<{ user: SupabaseUser }>("/api/auth/session");
    return normalizeUser(res.user);
  },

  /** POST /api/auth/forgot-password */
  forgotPassword: (email: string): Promise<void> =>
    api.post("/api/auth/forgot-password", { email }, { skipAuth: true, responseType: "void" }),

  /** POST /api/auth/reset-password (requires recovery token in Authorization header) */
  resetPassword: (password: string): Promise<void> =>
    api.post("/api/auth/reset-password", { password }, { responseType: "void" }),

  /** POST /api/auth/refresh-token */
  async refresh(): Promise<AuthResponse | null> {
    if (typeof window === "undefined") return null;
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    const res = await api.post<{ user: SupabaseUser; session: SupabaseSession }>(
      "/api/auth/refresh-token",
      { refreshToken },
      { skipAuth: true },
    );
    persistSession(res.session);
    return { user: normalizeUser(res.user), session: res.session };
  },

  /** GET /api/auth/google → { url } */
  async googleUrl(): Promise<string> {
    const redirectTo = `${window.location.origin}/app/dashboard`;
    const res = await api.get<{ url: string }>("/api/auth/google", {
      skipAuth: true,
      query: { redirect_to: redirectTo },
    });
    return res.url;
  },

  /** Direct redirect helper for OAuth buttons. */
  oauthUrl: (provider: "google" | "github"): string => {
    const redirectTo = encodeURIComponent(`${window.location.origin}/app/dashboard`);
    return `${API_BASE_URL}/api/auth/${provider}?redirect_to=${redirectTo}`;
  },
};