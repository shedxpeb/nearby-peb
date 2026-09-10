import Constants from "expo-constants";
import { storage } from "@/src/utils/storage";

const configured = Constants.expoConfig?.extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
export const API_BASE_URL = configured.replace(/\/$/, "");
const TOKEN_KEY = "shedx-api-token";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "API_ERROR") { super(message); this.status = status; this.code = code; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new ApiError(503, "API base URL is not configured.", "API_NOT_CONFIGURED");
  const token = await storage.secureGet(TOKEN_KEY, "");
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) await sessionStorage.clear();
  if (!response.ok || body.success === false) {
    const error = body.error ?? body.detail ?? {};
    throw new ApiError(response.status, error.message ?? "Request failed.", error.code ?? "API_ERROR");
  }
  return (body.data ?? body) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const sessionStorage = {
  read: () => storage.secureGet(TOKEN_KEY, ""),
  write: (token: string) => storage.secureSet(TOKEN_KEY, token),
  clear: () => storage.secureRemove(TOKEN_KEY),
};