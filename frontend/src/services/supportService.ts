import { api } from "./api";
export const supportService = {
  listTickets: () => api.get("/api/support/tickets"),
  ticket: (id: string) => api.get(`/api/support/tickets/${id}`),
  createTicket: (payload: Record<string, unknown>) => api.post("/api/support/tickets", payload),
  sendMessage: (id: string, message: string) => api.post(`/api/support/tickets/${id}/messages`, { message }),
};