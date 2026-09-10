import { api } from "./api";
export const photoService = {
  list: (jobId: string) => api.get(`/api/jobs/${jobId}/photos`),
  create: (jobId: string, payload: Record<string, unknown>) => api.post(`/api/jobs/${jobId}/photos`, payload),
  remove: (jobId: string, photoId: string) => api.delete(`/api/jobs/${jobId}/photos/${photoId}`),
};