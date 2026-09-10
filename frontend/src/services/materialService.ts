import { api } from "./api";
export const materialService = {
  list: (jobId: string) => api.get(`/api/jobs/${jobId}/materials`),
  create: (jobId: string, payload: Record<string, unknown>) => api.post(`/api/jobs/${jobId}/materials`, payload),
};