import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { adminAuthService } from '../services/adminAuth';
import { Search, UserCheck, MapPin, Phone, Star } from 'lucide-react';
import type { Worker } from '../types';

export default function Workers() {
  const [search, setSearch] = useState('');
  const [availability, setAvailability] = useState('');
  const [profileComplete, setProfileComplete] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['workers', search, availability, profileComplete, page],
    queryFn: () => adminService.getWorkers({
      search,
      availability,
      profile_complete: profileComplete,
      limit: 20,
      offset: page * 20,
    }),
  });

  const workers = data?.data?.items || [];
  const total = data?.data?.total || 0;

  const handleLogout = () => {
    adminAuthService.logout();
    adminAuthService.clearToken();
    window.location.href = '/login';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-100 text-green-800';
      case 'OFFLINE': return 'bg-gray-100 text-gray-800';
      case 'BUSY': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <span className="mx-2 text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Workers Directory</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/jobs" className="text-gray-700 hover:text-gray-900">
                Requests
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Availability</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="BUSY">Busy</option>
              </select>
              <select
                value={profileComplete}
                onChange={(e) => setProfileComplete(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Profiles</option>
                <option value="true">Complete</option>
                <option value="false">Incomplete</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-600">Loading workers...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">Error loading workers</div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No workers found</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map((worker) => (
                <div key={worker.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-gray-900">{worker.full_name}</h3>
                          <p className="text-sm text-gray-600">{worker.primary_trade}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(worker.status)}`}>
                          {worker.status}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAvailabilityColor(worker.availability_status)}`}>
                          {worker.availability_status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {worker.phone}
                      </div>
                      {worker.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <div className="h-4 w-4 mr-2" />
                          {worker.email}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="h-4 w-4 mr-2" />
                        {worker.rating_avg.toFixed(1)} ({worker.rating_count} reviews)
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <UserCheck className="h-4 w-4 mr-2" />
                        {worker.completed_jobs_count} completed jobs
                      </div>
                      {worker.active_assignments_count > 0 && (
                        <div className="flex items-center text-sm text-orange-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          {worker.active_assignments_count} active assignment(s)
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/workers/${worker.id}`}
                      className="block w-full text-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {page * 20 + 1} to {Math.min((page + 1) * 20, total)} of {total} workers
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * 20 >= total}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}