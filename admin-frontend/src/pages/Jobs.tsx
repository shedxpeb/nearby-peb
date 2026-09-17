import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { formatDateTime, formatPreferredDate } from '../utils/dateUtils';
import type { Job } from '../types';
import { Search, Clock, CheckCircle, MapPin, ArrowRight, Filter, Calendar, User as UserIcon } from 'lucide-react';
import Card from '../components/Card';

interface JobUI extends Job {
  assigned_worker?: {
    id: string;
    full_name: string;
    phone: string;
  };
}

export default function Jobs() {
  const [jobs, setJobs] = useState<JobUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchJobs = useCallback(async () => {
    try {
      const response = await adminService.getJobs({
        status: statusFilter === 'ALL' ? '' : statusFilter,
        service: serviceFilter === 'ALL' ? '' : serviceFilter,
        search,
      });
      const items = response.data.items || [];
      setJobs(items.map(job => ({
        ...job,
        description: job.description || job.problem_description || '',
        assigned_worker: job.worker_name ? {
          id: '',
          full_name: job.worker_name,
          phone: job.worker_phone || '',
        } : undefined,
      })));
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter, search]);

  useEffect(() => {
    fetchJobs();
    // Poll every 15 seconds for live updates
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
      case 'WAITING_CUSTOMER': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Extract unique service types for filter
  const serviceTypes = Array.from(new Set(jobs.map(j => j.service_type).filter(Boolean))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by job ID, service, customer, site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors bg-white appearance-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="REQUESTED">Requested</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_CUSTOMER">Waiting Customer</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        {serviceTypes.length > 0 && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors bg-white appearance-none cursor-pointer"
            >
              <option value="ALL">All Services</option>
              {serviceTypes.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Service Requests List */}
      {jobs.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No service requests found</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card padding="sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Job #</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Service</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Customer</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Site</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Created</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Preferred</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Worker</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <td className="py-2 px-3 text-xs font-mono text-slate-600">{job.job_number}</td>
                      <td className="py-2 px-3 text-sm font-medium text-slate-900 truncate max-w-[150px]">{job.service_type || job.title}</td>
                      <td className="py-2 px-3 text-xs text-slate-700 truncate max-w-[120px]">{job.customer_name}</td>
                      <td className="py-2 px-3 text-xs text-slate-700 truncate max-w-[100px]">{job.site_name || job.city}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-600">{formatDateTime(job.created_at)}</td>
                      <td className="py-2 px-3 text-xs text-slate-600">{job.scheduled_at ? formatPreferredDate(job.scheduled_at) : '-'}</td>
                      <td className="py-2 px-3 text-xs">
                        {job.assigned_worker ? (
                          <span className="text-green-600 font-medium">{job.assigned_worker.full_name}</span>
                        ) : (
                          <span className="text-amber-600">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden space-y-2">
            {jobs.map((job) => (
              <Card
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                padding="xs"
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Header: Job ID + Status + Arrow */}
                <div className="flex items-center justify-between mb-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-slate-500 flex-shrink-0">{job.job_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusBadge(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                </div>

                {/* Service Title */}
                <h3 className="text-sm font-semibold text-slate-900 mb-2 truncate">{job.service_type || job.title}</h3>

                {/* Compact Metadata */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Customer: {job.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Site: {job.site_name || job.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Created: {formatDateTime(job.created_at)}</span>
                  </div>
                  {job.scheduled_at && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">Preferred: {formatPreferredDate(job.scheduled_at)}</span>
                    </div>
                  )}
                </div>

                {/* Worker Assignment */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs">
                  {job.assigned_worker ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span className="text-slate-900 truncate">Worker: {job.assigned_worker.full_name}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span className="text-amber-600">Unassigned</span>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
