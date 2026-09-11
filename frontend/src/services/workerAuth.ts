import { api, sessionStorage } from "./api";

export const workerAuth = {
  async register(payload: { full_name: string; phone: string; email?: string; password: string }) {
    const result = await api.post<{ token: string }>("/api/worker/auth/register", payload);
    await sessionStorage.write(result.token);
    return result;
  },
  async login(phone: string, password: string) {
    const result = await api.post<{ token: string }>("/api/worker/auth/login", { phone, password });
    await sessionStorage.write(result.token);
    return result;
  },
  async logout() {
    try { await api.post("/api/worker/auth/logout"); } finally { await sessionStorage.clear(); }
  },
  me: () => api.get("/api/worker/auth/me"),
  forgotPassword: (phone: string) => api.post("/api/worker/auth/forgot-password", { phone }),
};
