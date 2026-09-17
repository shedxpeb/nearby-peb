export interface Admin {
  id: string;
  phone: string;
  email: string;
  role: 'ADMIN';
}

export interface DashboardStats {
  new_requests: number;
  unassigned: number;
  assigned: number;
  completed: number;
  total_workers: number;
  active_workers: number;
  available_workers: number;
}

export interface Job {
  id: string;
  job_number: string;
  title: string;
  service_type: string;
  description: string | null;
  problem_description: string | null;
  customer_name: string;
  company_name: string | null;
  customer_phone: string;
  customer_email: string | null;
  site_name: string;
  address_line: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  scheduled_at: string | null;
  estimated_duration_minutes: number | null;
  estimated_payout: number;
  final_payout: number | null;
  priority: 'NORMAL' | 'URGENT' | 'HIGH';
  status: 'REQUESTED' | 'OFFERED' | 'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'PAUSED' | 'WAITING_CUSTOMER' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  required_skill_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  customer_id: string;
  site_id: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  worker_name: string | null;
  primary_trade: string | null;
  worker_phone: string | null;
  worker_rating: number | null;
  assigned_at: string | null;
  accepted_at: string | null;
}

export interface JobDetail extends Job {
  attachments: JobAttachment[];
  assignment_history: AssignmentHistory[];
  status_history: StatusHistory[];
}

export interface JobAttachment {
  id: string;
  job_id: string;
  customer_id: string;
  file_url: string;
  caption: string | null;
  created_at: string;
}

export interface AssignmentHistory {
  id: string;
  job_id: string;
  worker_id: string;
  assigned_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_by_admin: string | null;
  assignment_notes: string | null;
  worker_name: string;
  primary_trade: string;
  worker_phone: string;
}

export interface StatusHistory {
  id: string;
  job_id: string;
  worker_id: string | null;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  worker_name: string | null;
}

export interface Worker {
  id: string;
  user_id: string;
  full_name: string;
  profile_photo_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  primary_trade: string;
  years_experience: number | null;
  previous_company: string | null;
  professional_bio: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  preferred_work_type: string | null;
  languages: string | null;
  rating_avg: number;
  rating_count: number;
  completed_jobs_count: number;
  total_earnings: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  availability_status: 'OFFLINE' | 'ONLINE' | 'BUSY';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  phone: string;
  email: string | null;
  active_assignments_count: number;
}

export interface WorkerDetail extends Worker {
  skills: WorkerSkill[];
  service_areas: WorkerServiceArea[];
  availability: WorkerAvailability[];
  current_assignments: WorkerAssignment[];
  completed_jobs_count: number;
  phone: string;
  email: string | null;
}

export interface WorkerSkill {
  id: string;
  worker_id: string;
  skill_id: string;
  experience_years: number | null;
  created_at: string;
  skill_name: string;
  category: string;
}

export interface WorkerServiceArea {
  id: string;
  worker_id: string;
  service_area_id: string;
  radius_km: number;
  created_at: string;
  updated_at: string;
  area_name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface WorkerAvailability {
  id: string;
  worker_id: string;
  day_of_week: number;
  is_available: boolean;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string | null;
  contact_person: string | null;
  preferred_communication: string;
  phone: string;
  email: string | null;
  total_jobs: number;
  completed_jobs: number;
  active_jobs: number;
  created_at: string;
}

export interface CustomerDetail extends Customer {
  sites: CustomerSite[];
  job_history: Job[];
}

export interface CustomerSite {
  id: string;
  customer_id: string;
  site_name: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkerAssignment {
  id: string;
  job_id: string;
  worker_id: string;
  assigned_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_by_admin: string | null;
  assignment_notes: string | null;
  job_number: string;
  title: string;
  service_type: string;
  status: string;
  scheduled_at: string | null;
}

export interface WorkerCreate {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  primary_trade?: string;
  years_experience?: number;
  professional_bio?: string;
  previous_company?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  preferred_work_type?: string;
  languages?: string;
  skills?: string[];
  service_areas?: string[];
  service_area_radius_km?: number;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
}

export interface ServiceArea {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface WorkerAssignmentResponse {
  id: string;
  job_id: string;
  worker_id: string;
  assigned_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_by_admin: string | null;
  assignment_notes: string | null;
  job_number: string;
  title: string;
  service_type: string;
  status: string;
  scheduled_at: string | null;
}

export interface AssignWorkerRequest {
  worker_id: string;
  notes?: string;
}

export interface ReassignWorkerRequest {
  worker_id: string;
  notes?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

export interface DashboardData {
  statistics: DashboardStats;
  recent_requests: Job[];
  recent_assignments: AssignmentHistory[];
}

export interface DashboardStats {
  new_requests: number;
  unassigned: number;
  assigned: number;
  completed: number;
  total_workers: number;
  active_workers: number;
  available_workers: number;
}