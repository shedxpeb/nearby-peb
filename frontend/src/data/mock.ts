export type JobStatus = "requested" | "accepted" | "en_route" | "arrived" | "active" | "completed";
export type ScreenName =
  | "welcome" | "login" | "register" | "details" | "area" | "success" | "ready"
  | "home" | "jobs" | "job" | "accepted" | "navigation" | "arrived" | "start"
  | "work" | "materials" | "progress" | "photos" | "confirmation" | "completed"
  | "history" | "earnings" | "notifications" | "profile" | "settings" | "support";

export type Job = {
  id: string;
  service: string;
  company: string;
  location: string;
  distance: string;
  duration: string;
  payout: number;
  urgency: "Urgent" | "Standard";
  scheduled: string;
  description: string;
  materials: string[];
  status: JobStatus;
};

export const skills = [
  "Roof Panel Repair", "Wall Cladding Repair", "Structure Repair", "Gutter & Downpipe Repair",
  "Crane Support", "Mezzanine Work", "Leak Inspection", "Fastener Replacement",
  "Protective Coating", "General Maintenance",
];

export let jobs: Job[] = [
  {
    id: "job-abc", service: "Roof Panel Repair", company: "ABC Manufacturing", location: "Sanand, Ahmedabad",
    distance: "2.4 km", duration: "4–6 hours", payout: 1500, urgency: "Urgent", scheduled: "12 Sep 2026 · 10:00 AM",
    description: "Replace two damaged roof panels and reseal the north-facing joint after a monsoon leak inspection.",
    materials: ["Roof Panel", "Self Drilling Screw", "Silicone Sealant"], status: "requested",
  },
  {
    id: "job-wall", service: "Wall Cladding Repair", company: "Shree Steel Pvt Ltd", location: "Changodar, Ahmedabad",
    distance: "4.1 km", duration: "3–4 hours", payout: 2000, urgency: "Standard", scheduled: "13 Sep 2026 · 09:30 AM",
    description: "Repair loose wall cladding on the west elevation and replace exposed fasteners.",
    materials: ["Wall Cladding", "Fasteners"], status: "requested",
  },
  {
    id: "job-gutter", service: "Gutter Repair", company: "Modern Castings", location: "Odhav, Ahmedabad",
    distance: "12 km", duration: "2–3 hours", payout: 1800, urgency: "Standard", scheduled: "14 Sep 2026 · 11:00 AM",
    description: "Inspect and repair blocked gutter components along the east shed line.",
    materials: ["Gutter Components", "Sealant"], status: "requested",
  },
  {
    id: "job-crane", service: "Crane Support", company: "KVN Industries", location: "Vatva, Ahmedabad",
    distance: "8.6 km", duration: "5 hours", payout: 2500, urgency: "Standard", scheduled: "15 Sep 2026 · 08:00 AM",
    description: "Provide trained ground support during structural member placement.",
    materials: ["Safety Harness", "Fasteners"], status: "requested",
  },
];

export function replaceJobs(next: Job[]) { jobs = next; }

export const completedJobs = [
  { id: "history-1", service: "Roof Panel Repair", company: "ABC Manufacturing", location: "Sanand, Ahmedabad", date: "12 Sep 2026", amount: 1500, status: "Completed" },
  { id: "history-2", service: "Wall Cladding Repair", company: "Shree Steel Pvt Ltd", location: "Changodar, Ahmedabad", date: "10 Sep 2026", amount: 2300, status: "Completed" },
  { id: "history-3", service: "Gutter Repair", company: "Modern Castings", location: "Odhav, Ahmedabad", date: "08 Sep 2026", amount: 1800, status: "Completed" },
  { id: "history-4", service: "Crane Support", company: "KVN Industries", location: "Vatva, Ahmedabad", date: "05 Sep 2026", amount: 2500, status: "Completed" },
];

export const notifications = [
  { id: "n1", kind: "job", title: "New job request", text: "Roof Panel Repair at Sanand, Ahmedabad", time: "2 min ago", unread: true },
  { id: "n2", kind: "success", title: "Job accepted", text: "You accepted the ABC Manufacturing job", time: "10 min ago", unread: true },
  { id: "n3", kind: "message", title: "Customer message", text: "Please call me when you reach the gate.", time: "1 hour ago", unread: false },
  { id: "n4", kind: "payment", title: "Payment received", text: "₹1,500 credited for your completed job", time: "Yesterday", unread: false },
  { id: "n5", kind: "offer", title: "New job request", text: "Wall Cladding Repair near Changodar", time: "Yesterday", unread: false },
];

export const serviceAreas = ["Ahmedabad", "Gandhinagar", "Sanand"];

export const initialAppState = {
  authenticated: false,
  worker: { name: "Vikas Patel", trade: "PEB Service Professional", rating: 4.8, jobs: 126 },
  isOnline: false,
  selectedJobId: "job-abc",
  progress: 50,
  currentTask: "Installing new panels",
  selectedSkills: ["Roof Panel Repair", "Leak Inspection", "Fastener Replacement"],
  areas: serviceAreas,
  notifications,
  materials: [
    { name: "Roof Panel", qty: 2, unit: "pcs", rate: 900 },
    { name: "Self Drilling Screw", qty: 20, unit: "pcs", rate: 60 },
    { name: "Silicone Sealant", qty: 2, unit: "pcs", rate: 300 },
  ],
  expenses: [{ name: "Travel", amount: 240 }, { name: "Tools", amount: 160 }],
};

export type AppState = typeof initialAppState;