import { api, sessionStorage } from "./api";

export const customerAuth = {
  async register(payload: { full_name: string; phone: string; email?: string; password: string }) {
    const result = await api.post<{ token: string }>("/api/customer/auth/register", payload);
    await sessionStorage.write(result.token);
    return result;
  },
  async login(phone: string, password: string) {
    const result = await api.post<{ token: string }>("/api/customer/auth/login", { phone, password });
    await sessionStorage.write(result.token);
    return result;
  },
  async logout() {
    try { await api.post("/api/customer/auth/logout"); } finally { await sessionStorage.clear(); }
  },
  me: () => api.get("/api/customer/auth/me"),
  forgotPassword: (phone: string) => api.post("/api/customer/auth/forgot-password", { phone }),
};
