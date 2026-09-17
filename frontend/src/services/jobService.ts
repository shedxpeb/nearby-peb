import { api } from "./api";
import type { Job } from "@/src/types/worker";
import { formatPreferredDate } from "@/src/utils/workerDateUtils";

export function normalizeJob(value: any): Job {
  const minutes = Number(value.estimated_duration_minutes ?? 240);
  return {
    id: String(value.id), service: value.service_type ?? value.title ?? "Field Service Job", company: value.company_name ?? value.company ?? "Project Team",
    location: [value.city, value.state].filter(Boolean).join(", ") || value.address_line || "Site location", address: value.address_line || [value.city, value.state].filter(Boolean).join(", ") || "Site location",
    distance: value.distance_km ? `${value.distance_km} km` : "Nearby",
    duration: `${Math.max(1, Math.round(minutes / 60))}–${Math.max(2, Math.round(minutes / 60) + 1)} hours`, payout: Number(value.estimated_payout ?? value.final_payout ?? 0),
    urgency: value.priority === "URGENT" || value.priority === "HIGH" ? "Urgent" : "Standard", scheduled: formatPreferredDate(value.scheduled_at),
    description: value.description ?? value.problem_description ?? "Service assignment from ShedX.", materials: [], status: String(value.status ?? "REQUESTED").toLowerCase() as Job["status"],
  } as Job;
}

export const jobService = {
  list: () => api.get("/api/jobs"),
  requests: () => api.get("/api/jobs/requests"),
  active: () => api.get("/api/jobs/active"),
  history: () => api.get("/api/jobs/history"),
  detail: (id: string) => api.get(`/api/jobs/${id}`),
  view: (id: string) => api.post(`/api/jobs/${id}/view`),
  accept: (id: string) => api.post(`/api/jobs/${id}/accept`),
  decline: (id: string) => api.post(`/api/jobs/${id}/decline`),
  enRoute: (id: string) => api.post(`/api/jobs/${id}/en-route`),
  arrived: (id: string) => api.post(`/api/jobs/${id}/arrived`),
  start: (id: string) => api.post(`/api/jobs/${id}/start`),
  pause: (id: string) => api.post(`/api/jobs/${id}/pause`),
  resume: (id: string) => api.post(`/api/jobs/${id}/resume`),
  complete: (id: string) => api.post(`/api/jobs/${id}/complete`),
  tasks: (id: string) => api.get(`/api/jobs/${id}/tasks`),
  checklist: (id: string) => api.get(`/api/jobs/${id}/checklist`),
  progress: (id: string) => api.get(`/api/jobs/${id}/progress`),
  saveProgress: (id: string, payload: Record<string, unknown>) => api.post(`/api/jobs/${id}/progress`, payload),
};
