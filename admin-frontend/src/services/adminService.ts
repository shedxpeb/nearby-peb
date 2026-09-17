import api from './api';
import type {
  DashboardData,
  Job,
  JobDetail,
  PaginatedResponse,
  Worker,
  WorkerDetail,
  WorkerCreate,
  WorkerAssignmentResponse,
  AssignWorkerRequest,
  ReassignWorkerRequest,
  Skill,
  ServiceArea,
  Customer,
  CustomerDetail,
} from '../types';

export const adminService = {
  // Dashboard
  async getDashboard(): Promise<{ success: boolean; data: DashboardData }> {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  // Jobs
  async getJobs(params?: {
    status?: string;
    service?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: PaginatedResponse<Job> }> {
    const response = await api.get('/api/admin/jobs', { params });
    return response.data;
  },

  async getJob(jobId: string): Promise<{ success: boolean; data: JobDetail }> {
    const response = await api.get(`/api/admin/jobs/${jobId}`);
    return response.data;
  },

  async assignWorker(jobId: string, data: AssignWorkerRequest): Promise<{
    success: boolean;
    data: { job: Job; assignment: WorkerAssignmentResponse };
  }> {
    const response = await api.post(`/api/admin/jobs/${jobId}/assign-worker`, data);
    return response.data;
  },

  async reassignWorker(jobId: string, data: ReassignWorkerRequest): Promise<{
    success: boolean;
    data: { job: Job; assignment: WorkerAssignmentResponse };
  }> {
    const response = await api.post(`/api/admin/jobs/${jobId}/reassign-worker`, data);
    return response.data;
  },

  // Workers
  async getWorkers(params?: {
    search?: string;
    skill?: string;
    service_area?: string;
    availability?: string;
    profile_complete?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: PaginatedResponse<Worker> }> {
    const response = await api.get('/api/admin/workers', { params });
    return response.data;
  },

  async getWorker(workerId: string): Promise<{ success: boolean; data: WorkerDetail }> {
    const response = await api.get(`/api/admin/workers/${workerId}`);
    return response.data;
  },

  async createWorker(data: WorkerCreate): Promise<{
    success: boolean;
    data: {
      user: { id: string; phone: string; email: string | null; role: string };
      worker: { id: string; full_name: string; primary_trade: string; status: string; availability_status: string };
    };
  }> {
    const response = await api.post('/api/admin/workers', data);
    return response.data;
  },

  // Form data
  async getSkills(): Promise<{ success: boolean; data: Skill[] }> {
    const response = await api.get('/api/admin/skills');
    return response.data;
  },

  async getServiceAreas(): Promise<{ success: boolean; data: ServiceArea[] }> {
    const response = await api.get('/api/admin/service-areas');
    return response.data;
  },

  // Customers
  async getCustomers(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: PaginatedResponse<Customer> }> {
    const response = await api.get('/api/admin/customers', { params });
    return response.data;
  },

  async getCustomer(customerId: string): Promise<{ success: boolean; data: CustomerDetail }> {
    const response = await api.get(`/api/admin/customers/${customerId}`);
    return response.data;
  },
};