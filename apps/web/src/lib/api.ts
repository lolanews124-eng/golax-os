const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "golax_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    setToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  raw?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
  retry = true,
): Promise<T> {
  const { body, auth = true, raw, headers, ...rest } = options;
  const token = auth ? getToken() : null;

  const res = await fetch(`${API_URL}/api${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshToken();
    if (newToken) return apiFetch<T>(path, options, false);
  }

  if (!res.ok) {
    let message = res.statusText;
    let details: unknown;
    try {
      const data = await res.json();
      message = data.error ?? message;
      details = data.details;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message, details);
  }

  if (raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Download an export file (CSV/XLSX) with the auth token attached.
export async function downloadExport(
  projectId: string,
  format: "csv" | "xlsx",
  filename: string,
): Promise<void> {
  const token = getToken();
  const res = await fetch(
    `${API_URL}/api/companies/export?projectId=${projectId}&format=${format}`,
    {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) throw new ApiError(res.status, "Export failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { API_URL };
