import { storage } from "@/src/utils/storage";
import { initialAppState, type AppState } from "@/src/data/mock";
import { authService as remoteAuth } from "./authService";
import { supportService as remoteSupport } from "./supportService";

const STATE_KEY = "shedx-worker-state";

// Local persistence for the worker UI workspace (draft state, preferences).
export const storageService = {
  async load(): Promise<AppState> { const raw = await storage.getItem(STATE_KEY, JSON.stringify(initialAppState)); try { return JSON.parse(raw ?? JSON.stringify(initialAppState)) as AppState; } catch { return initialAppState; } },
  async save(state: AppState): Promise<boolean> { return storage.setItem(STATE_KEY, JSON.stringify(state)); },
  async clear(): Promise<boolean> { return storage.removeItem(STATE_KEY); },
};

// Strict pass-through to the real API. Failures throw so the UI can show real errors —
// no fake sessions, no masked backend failures.
export const authService = {
  async signIn(phone: string, password: string): Promise<boolean> { await remoteAuth.login(phone, password); return true; },
  async register(payload: { full_name: string; phone: string; email?: string; password: string }): Promise<boolean> { await remoteAuth.register(payload); return true; },
  async signOut(): Promise<boolean> { await remoteAuth.logout(); return true; },
};

export const supportService = {
  async createTicket(payload: Record<string, unknown>): Promise<string> {
    const ticket = (await remoteSupport.createTicket(payload)) as any;
    return ticket.ticket_number ?? String(ticket.id);
  },
};
