import { api } from "./api";
export const expenseService = {
  list: (jobId: string) => api.get(`/api/jobs/${jobId}/expenses`),
  create: (jobId: string, payload: Record<string, unknown>) => api.post(`/api/jobs/${jobId}/expenses`, payload),
};