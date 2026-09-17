export type JobStatus = "requested" | "accepted" | "en_route" | "arrived" | "active" | "completed" | "waiting_customer";
export type ScreenName =
  | "welcome" | "login" | "register" | "details" | "area" | "success" | "ready"
  | "home" | "jobs" | "job" | "accepted" | "navigation" | "arrived" | "start"
  | "work" | "materials" | "progress" | "photos" | "confirmation" | "completed" | "complete"
  | "history" | "earnings" | "notifications" | "profile" | "settings" | "support" | "chat";

export type Job = {
  id: string;
  service: string;
  company: string;
  location: string;
  address: string;
  distance: string;
  duration: string;
  payout: number;
  urgency: "Urgent" | "Standard";
  scheduled: string;
  description: string;
  materials: string[];
  status: JobStatus;
};

export type WorkerProfile = {
  name: string;
  trade: string;
  rating: number;
  jobs: number;
};

export type Notification = {
  id: string;
  kind: string;
  title: string;
  text: string;
  time: string;
  unread: boolean;
};

export type Material = {
  name: string;
  qty: number;
  unit: string;
  rate: number;
};

export type Expense = {
  name: string;
  amount: number;
};

export type AppState = {
  authenticated: boolean;
  currentScreen: ScreenName;
  worker: WorkerProfile;
  isOnline: boolean;
  selectedJobId: string;
  progress: number;
  currentTask: string;
  selectedSkills: string[];
  areas: string[];
  notifications: Notification[];
  materials: Material[];
  expenses: Expense[];
  jobs: Job[];
};

export const initialAppState: AppState = {
  authenticated: false,
  currentScreen: "home",
  worker: { name: "", trade: "", rating: 0, jobs: 0 },
  isOnline: false,
  selectedJobId: "",
  progress: 0,
  currentTask: "",
  selectedSkills: [],
  areas: [],
  notifications: [],
  materials: [],
  expenses: [],
  jobs: [],
};
