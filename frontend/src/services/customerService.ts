import { api } from "./api";

export type CustomerSite = {
  id: string; site_name: string; address_line?: string; city?: string; state?: string; postal_code?: string;
  latitude?: number; longitude?: number; contact_name?: string; contact_phone?: string; notes?: string;
};

export type JobListTab = "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED";

export const customerService = {
  profile: () => api.get<any>("/api/customer/profile"),
  updateProfile: (payload: Record<string, unknown>) => api.put<any>("/api/customer/profile", payload),

  sites: () => api.get<CustomerSite[]>("/api/customer/sites"),
  createSite: (payload: Record<string, unknown>) => api.post<CustomerSite>("/api/customer/sites", payload),
  updateSite: (id: string, payload: Record<string, unknown>) => api.put<CustomerSite>(`/api/customer/sites/${id}`, payload),
  deleteSite: (id: string) => api.delete(`/api/customer/sites/${id}`),

  jobs: (tab: JobListTab = "ACTIVE", q = "", limit = 10, offset = 0) =>
    api.get<{ total: number; items: any[] }>(`/api/customer/jobs?tab=${tab}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
  createJob: (payload: Record<string, unknown>) => api.post<{ job: any; matched_workers: number }>("/api/jobs", payload),
  job: (id: string) => api.get<any>(`/api/jobs/${id}`),
  jobStatus: (id: string) => api.get<any>(`/api/jobs/${id}/status`),
  cancelJob: (id: string) => api.post<any>(`/api/jobs/${id}/cancel`),
  confirm: (id: string, payload: { customer_name: string; rating: number; comments?: string }) =>
    api.post<any>(`/api/jobs/${id}/customer-confirmation`, payload),

  unreadCount: () => api.get<{ unread: number }>("/api/notifications/unread-count"),
};
