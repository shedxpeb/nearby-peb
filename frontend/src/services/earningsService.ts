import { api } from "./api";
export const earningsService = {
  summary: () => api.get("/api/worker/earnings/summary"),
  list: () => api.get("/api/worker/earnings"),
  recent: () => api.get("/api/worker/earnings/recent"),
  payouts: () => api.get("/api/worker/earnings/payouts"),
};