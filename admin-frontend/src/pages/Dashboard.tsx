import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { adminAuthService } from '../services/adminAuth';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  LogOut,
  TrendingUp,
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: adminService.getDashboard,
  });

  const handleLogout = () => {
    adminAuthService.logout();
    adminAuthService.clearToken();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error loading dashboard</div>
      </div>
    );
  }

  const stats = dashboardData?.data?.statistics;
  const recentRequests = dashboardData?.data?.recent_requests || [];
  const recentAssignments = dashboardData?.data?.recent_assignments || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <LayoutDashboard className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">ShedX Admin</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/jobs" className="text-gray-700 hover:text-gray-900">
                Requests
              </Link>
              <Link to="/workers" className="text-gray-700 hover:text-gray-900">
                Workers
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-2">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="New Requests"
            value={stats?.new_requests || 0}
            icon={<AlertCircle className="h-6 w-6 text-orange-500" />}
            color="orange"
          />
          <StatCard
            title="Unassigned"
            value={stats?.unassigned || 0}
            icon={<Clock className="h-6 w-6 text-yellow-500" />}
            color="yellow"
          />
          <StatCard
            title="Assigned"
            value={stats?.assigned || 0}
            icon={<ClipboardList className="h-6 w-6 text-blue-500" />}
            color="blue"
          />
          <StatCard
            title="Total Workers"
            value={stats?.total_workers || 0}
            icon={<Users className="h-6 w-6 text-purple-500" />}
            color="purple"
          />
          <StatCard
            title="Active Workers"
            value={stats?.active_workers || 0}
            icon={<UserCheck className="h-6 w-6 text-green-500" />}
            color="green"
          />
          <StatCard
            title="Available Workers"
            value={stats?.available_workers || 0}
            icon={<TrendingUp className="h-6 w-6 text-indigo-500" />}
            color="indigo"
          />
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentRequests.length === 0 ? (
              <div className="px-6 py-4 text-gray-500">No recent requests</div>
            ) : (
              recentRequests.slice(0, 5).map((request) => (
                <Link
                  key={request.id}
                  to={`/jobs/${request.id}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{request.title}</p>
                      <p className="text-sm text-gray-500">{request.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        request.status === 'REQUESTED' ? 'bg-orange-100 text-orange-800' :
                        request.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Assignments</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentAssignments.length === 0 ? (
              <div className="px-6 py-4 text-gray-500">No recent assignments</div>
            ) : (
              recentAssignments.slice(0, 5).map((assignment) => (
                <div key={assignment.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{assignment.worker_name}</p>
                      <p className="text-sm text-gray-500">{assignment.job_number}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    orange: 'bg-orange-50 border-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}