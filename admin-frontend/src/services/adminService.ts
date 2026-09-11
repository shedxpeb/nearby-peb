import api from './api';
import type {
  DashboardData,
  Job,
  JobDetail,
  PaginatedResponse,
  Worker,
  WorkerDetail,
  AssignWorkerRequest,
  ReassignWorkerRequest,
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
    data: { job: Job; assignment: any };
  }> {
    const response = await api.post(`/api/admin/jobs/${jobId}/assign-worker`, data);
    return response.data;
  },

  async reassignWorker(jobId: string, data: ReassignWorkerRequest): Promise<{
    success: boolean;
    data: { job: Job; assignment: any };
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
};