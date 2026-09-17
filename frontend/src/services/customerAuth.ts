import { api, sessionStorage } from "./api";

export const customerAuth = {
  async register(payload: { full_name: string; phone: string; email?: string; password: string }) {
    try {
      const result = await api.post<{ token: string }>("/api/customer/auth/register", payload);
      await sessionStorage.write(result.token);
      return result;
    } catch (e: any) {
      // Handle 409 Conflict errors with specific messages
      if (e.status === 409) {
        const code = e.code || "USER_EXISTS";
        const message = e.message || "An account already exists for this phone or email.";
        const error = new Error(message) as any;
        error.status = 409;
        error.code = code;
        throw error;
      }
      throw e;
    }
  },
  async login(phone: string, password: string) {
    const result = await api.post<{ token: string }>("/api/customer/auth/login", { phone, password });
    await sessionStorage.write(result.token);
    return result;
  },
  async logout() {
    try { await api.post("/api/customer/auth/logout"); } finally { await sessionStorage.clear(); }
  },
  async me() {
    return await api.get("/api/customer/auth/me");
  },
  forgotPassword: (phone: string) => api.post("/api/customer/auth/forgot-password", { phone }),
};
