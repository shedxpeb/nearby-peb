import { api } from "./api";
export const notificationService = {
  list: () => api.get("/api/notifications"),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post("/api/notifications/read-all"),
};