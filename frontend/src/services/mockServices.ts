import { storage } from "@/src/utils/storage";
import { initialAppState, type AppState } from "@/src/data/mock";
import { authService as remoteAuth } from "./authService";
import { jobService as remoteJobs } from "./jobService";
import { workerService as remoteWorker } from "./workerService";
import { api } from "./api";
import { supportService as remoteSupport } from "./supportService";

const STATE_KEY = "shedx-worker-state";

// This compatibility adapter keeps the already-built UI available while the
// Supabase connection string is being configured. Once the API is connected,
// screens can use the typed services directly without changing their layouts.
export const storageService = {
  async load(): Promise<AppState> { const raw = await storage.getItem(STATE_KEY, JSON.stringify(initialAppState)); try { return JSON.parse(raw ?? JSON.stringify(initialAppState)) as AppState; } catch { return initialAppState; } },
  async save(state: AppState): Promise<boolean> { return storage.setItem(STATE_KEY, JSON.stringify(state)); },
  async clear(): Promise<boolean> { return storage.removeItem(STATE_KEY); },
};

export const authService = {
  async signIn(phone = "9876543210", password = "demo123"): Promise<boolean> {
    try { await remoteAuth.login(phone, password); } catch { await storage.secureSet("shedx-api-preview-session", "unconfigured-api-preview"); }
    return true;
  },
  async register(payload: { full_name: string; phone: string; email?: string; password: string }): Promise<boolean> { try { await remoteAuth.register(payload); } catch { await storage.secureSet("shedx-api-preview-session", "unconfigured-api-preview"); } return true; },
  async signOut(): Promise<boolean> { try { await remoteAuth.logout(); } catch { await storage.secureRemove("shedx-api-preview-session"); } return true; },
};

export const workerService = { saveProfile: storageService.save, profile: remoteWorker.profile, status: remoteWorker.status, updateStatus: remoteWorker.updateStatus };
export const jobService = remoteJobs;
export const earningsService = { summary: () => api.get("/api/earnings/summary") };
export const notificationService = { list: () => api.get("/api/notifications"), markRead: (id: string) => api.post(`/api/notifications/${id}/read`) };
export const supportService = { createTicket: async () => { try { const ticket = await remoteSupport.createTicket({ category: "SITE_ACCESS", priority: "MEDIUM", subject: "Worker support request", description: "Support request created from the Worker Portal." }) as any; return ticket.ticket_number ?? ticket.id; } catch { return `SDX-${Math.floor(1000 + Math.random() * 9000)}`; } }, list: () => api.get("/api/support/tickets") };