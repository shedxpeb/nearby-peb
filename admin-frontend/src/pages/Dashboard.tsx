import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import type { DashboardStats, Job } from '../types';
import { Briefcase, Users, Clock, CheckCircle, Activity, ArrowRight, AlertCircle } from 'lucide-react';
import Card from '../components/Card';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      const [statsResponse, jobsResponse] = await Promise.all([
        adminService.getDashboard(),
        adminService.getJobs()
      ]);
      setStats(statsResponse.data.statistics);
      setRecentJobs((jobsResponse.data.items || []).slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Poll every 15 seconds for live updates
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const unassignedCount = stats?.unassigned || 0;
  const newRequestsCount = stats?.new_requests || 0;
  const completedCount = stats?.completed || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards - Compact, action-focused */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* PRIMARY - Action needed */}
        <Card padding="sm" className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-700">New</p>
              <p className="text-lg font-bold text-amber-900">{newRequestsCount}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-700">Unassigned</p>
              <p className="text-lg font-bold text-amber-900">{unassignedCount}</p>
            </div>
          </div>
        </Card>

        {/* SECONDARY */}
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Assigned</p>
              <p className="text-lg font-bold text-slate-900">{stats?.assigned || 0}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Workers</p>
              <p className="text-lg font-bold text-slate-900">{stats?.total_workers || 0}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Active</p>
              <p className="text-lg font-bold text-slate-900">{stats?.active_workers || 0}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Available</p>
              <p className="text-lg font-bold text-slate-900">{stats?.available_workers || 0}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-green-700">Completed</p>
              <p className="text-lg font-bold text-green-900">{completedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Service Requests - PRIMARY ACTION AREA */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pending Service Requests</h2>
            <p className="text-sm text-slate-500">Requests awaiting worker assignment</p>
          </div>
          {unassignedCount > 0 && (
            <button
              onClick={() => navigate('/jobs')}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500">{job.job_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 truncate">{job.title}</p>
                  <p className="text-sm text-slate-500 truncate">{job.customer_name} • {job.city}</p>
                </div>
                <div className="flex-shrink-0">
                  {job.worker_name ? (
                    <span className="flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Assigned
                    </span>
                  ) : (
                    <span className="flex items-center text-sm text-amber-600">
                      <Clock className="w-4 h-4 mr-1" />
                      Unassigned
                    </span>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions - Secondary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/jobs')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            >
              <Briefcase className="w-4 h-4" />
              Requests
            </button>
            <button
              onClick={() => navigate('/workers')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            >
              <Users className="w-4 h-4" />
              Workers
            </button>
          </div>
        </Card>

        <Card padding="sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">System Status</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-slate-600">API Online</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-slate-600">DB Connected</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
