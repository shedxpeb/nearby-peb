import { api } from "./api";

export const skillsService = {
  list: () => api.get("/api/skills"),
};
