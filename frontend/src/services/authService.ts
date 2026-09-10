import { api, sessionStorage } from "./api";

export const authService = {
  async register(payload: { full_name: string; phone: string; email?: string; password: string }) {
    const result = await api.post<{ token: string }>("/api/auth/register", payload); await sessionStorage.write(result.token); return result;
  },
  async login(phone: string, password: string) {
    const result = await api.post<{ token: string }>("/api/auth/login", { phone, password }); await sessionStorage.write(result.token); return result;
  },
  async logout() { try { await api.post("/api/auth/logout"); } finally { await sessionStorage.clear(); } },
  me: () => api.get("/api/auth/me"),
  forgotPassword: (phone: string) => api.post("/api/auth/forgot-password", { phone }),
};