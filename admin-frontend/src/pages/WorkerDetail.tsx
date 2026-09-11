import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { adminAuthService } from '../services/adminAuth';
import { ArrowLeft, User, Phone, Mail, MapPin, Star, Clock, Briefcase, Calendar, CheckCircle } from 'lucide-react';
import type { WorkerDetail } from '../types';

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: workerData, isLoading, error } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => adminService.getWorker(id!),
    enabled: !!id,
  });

  const worker = workerData?.data;

  const handleLogout = () => {
    adminAuthService.logout();
    adminAuthService.clearToken();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading worker details...</div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error loading worker details</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/workers" className="flex items-center text-gray-700 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Workers
              </Link>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Worker Profile */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <h1 className="text-2xl font-bold text-gray-900">{worker.full_name}</h1>
                    <p className="text-gray-600">{worker.primary_trade}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    worker.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    worker.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {worker.status}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    worker.availability_status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                    worker.availability_status === 'OFFLINE' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {worker.availability_status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-gray-600">{worker.phone}</p>
                </div>
                {worker.email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-2" />
                    <p className="text-gray-600">{worker.email}</p>
                  </div>
                )}
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-gray-600">{worker.rating_avg.toFixed(1)} ({worker.rating_count} reviews)</p>
                </div>
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-gray-600">{worker.completed_jobs_count} completed jobs</p>
                </div>
              </div>

              {worker.professional_bio && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Professional Bio</h3>
                  <p className="text-gray-600">{worker.professional_bio}</p>
                </div>
              )}

              {worker.years_experience && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Experience</h3>
                  <p className="text-gray-600">{worker.years_experience} years</p>
                </div>
              )}

              {worker.previous_company && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Previous Company</h3>
                  <p className="text-gray-600">{worker.previous_company}</p>
                </div>
              )}
            </div>

            {/* Skills */}
            {worker.skills && worker.skills.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                    >
                      {skill.skill_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service Areas */}
            {worker.service_areas && worker.service_areas.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Areas</h2>
                <div className="space-y-3">
                  {worker.service_areas.map((area) => (
                    <div key={area.id} className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{area.area_name}</p>
                        <p className="text-sm text-gray-600">{area.city}, {area.state}</p>
                        <p className="text-sm text-gray-600">Radius: {area.radius_km} km</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {worker.availability && worker.availability.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Availability</h2>
                <div className="space-y-2">
                  {worker.availability.map((avail) => (
                    <div key={avail.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][avail.day_of_week]}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {avail.is_available ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <div className="h-5 w-5 mr-2" />
                        )}
                        <span className="text-gray-600">
                          {avail.start_time} - {avail.end_time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current Assignments */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Assignments</h2>
              
              {worker.current_assignments && worker.current_assignments.length > 0 ? (
                <div className="space-y-3">
                  {worker.current_assignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      to={`/jobs/${assignment.job_id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{assignment.title}</p>
                          <p className="text-sm text-gray-600">{assignment.job_number}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          assignment.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                          assignment.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(assignment.assigned_at).toLocaleString()}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-600">
                  No current assignments
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Earnings</span>
                  <span className="font-medium text-gray-900">₹{worker.total_earnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed Jobs</span>
                  <span className="font-medium text-gray-900">{worker.completed_jobs_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Assignments</span>
                  <span className="font-medium text-gray-900">{worker.active_assignments_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating</span>
                  <span className="font-medium text-gray-900">{worker.rating_avg.toFixed(1)}/5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}