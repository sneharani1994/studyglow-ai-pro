/**
 * Centralized API client for the StudyGPT frontend.
 *
 * All network requests should go through `apiFetch` so we have a single
 * place to configure the base URL, auth headers, and error handling.
 */

export const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  "https://studyglow-backend-production.up.railway.app";

const TOKEN_STORAGE_KEY = "studygpt.auth.token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** JSON body — will be stringified automatically. Use `rawBody` for FormData/Blob. */
  body?: unknown;
  /** Raw body passthrough (FormData, Blob, string, etc.) — skips JSON serialization. */
  rawBody?: BodyInit;
  /** Query string params appended to the URL. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Skip attaching the Authorization header even if a token exists. */
  skipAuth?: boolean;
  /** Parse response as this type. Defaults to "json". */
  responseType?: "json" | "text" | "blob" | "void";
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function buildUrl(
  path: string,
  query?: ApiFetchOptions["query"],
): string {
  const url = path.startsWith("http")
    ? new URL(path)
    : new URL(
        path.startsWith("/") ? path : `/${path}`,
        API_BASE_URL,
      );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    body,
    rawBody,
    query,
    skipAuth,
    responseType = "json",
    headers,
    ...rest
  } = options;

  const finalHeaders = new Headers(headers);
  if (!skipAuth) {
    const token = getAuthToken();
    if (token && !finalHeaders.has("Authorization")) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let finalBody: BodyInit | undefined;
  if (rawBody !== undefined) {
    finalBody = rawBody;
  } else if (body !== undefined) {
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
    finalBody = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
      0,
      null,
    );
  }

  if (!res.ok) {
    let errData: unknown = null;
    try {
      errData = await res.json();
    } catch {
      try {
        errData = await res.text();
      } catch {
        /* ignore */
      }
    }
    const message =
      (errData && typeof errData === "object" && "message" in errData
        ? String((errData as any).message)
        : null) || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, errData);
  }

  if (responseType === "void" || res.status === 204) return undefined as T;
  if (responseType === "text") return (await res.text()) as T;
  if (responseType === "blob") return (await res.blob()) as T;

  // json (default) — tolerate empty bodies
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  get: <T = unknown>(path: string, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};