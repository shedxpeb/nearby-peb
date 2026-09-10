import { api } from "./api";

export const workerService = {
  profile: () => api.get("/api/worker/profile"),
  updateProfile: (payload: Record<string, unknown>) => api.put("/api/worker/profile", payload),
  skills: () => api.get("/api/worker/skills"),
  updateSkills: (skills: string[]) => api.put("/api/worker/skills", { skills }),
  serviceAreas: () => api.get("/api/worker/service-areas"),
  updateServiceAreas: (areas: string[], radius_km = 10) => api.put("/api/worker/service-areas", { areas, radius_km }),
  availability: () => api.get("/api/worker/availability"),
  updateAvailability: (days: object[]) => api.put("/api/worker/availability", { days }),
  status: () => api.get("/api/worker/status"),
  updateStatus: (status: "ONLINE" | "OFFLINE" | "BUSY") => api.put("/api/worker/status", { status }),
};