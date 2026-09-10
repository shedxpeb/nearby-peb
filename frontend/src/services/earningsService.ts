import { api } from "./api";
export const earningsService = {
  summary: () => api.get("/api/earnings/summary"),
  list: () => api.get("/api/earnings"),
  recent: () => api.get("/api/earnings/recent"),
  payouts: () => api.get("/api/payouts"),
};