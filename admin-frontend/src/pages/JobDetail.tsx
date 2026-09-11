import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { adminAuthService } from '../services/adminAuth';
import { ArrowLeft, User, MapPin, Calendar, Clock, Phone, Mail, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { JobDetail, Worker } from '../types';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: jobData, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => adminService.getJob(id!),
    enabled: !!id,
  });

  const { data: workersData } = useQuery({
    queryKey: ['workers'],
    queryFn: () => adminService.getWorkers({ limit: 100 }),
  });

  const assignMutation = useMutation({
    mutationFn: (data: { worker_id: string; notes?: string }) =>
      adminService.assignWorker(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAssignModal(false);
      setSelectedWorker('');
      setNotes('');
    },
  });

  const job = jobData?.data;
  const workers = workersData?.data?.items || [];

  const handleLogout = () => {
    adminAuthService.logout();
    adminAuthService.clearToken();
    window.location.href = '/login';
  };

  const handleAssign = () => {
    if (selectedWorker) {
      assignMutation.mutate({ worker_id: selectedWorker, notes });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error loading job details</div>
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
              <Link to="/jobs" className="flex items-center text-gray-700 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Requests
              </Link>
            </div>
            <nav className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/workers" className="text-gray-700 hover:text-gray-900">
                Workers
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
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <p className="text-gray-600">{job.job_number}</p>
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  job.status === 'REQUESTED' ? 'bg-orange-100 text-orange-800' :
                  job.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                  job.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Service Type</p>
                    <p className="text-gray-600">{job.service_type}</p>
                  </div>
                </div>

                {job.problem_description && (
                  <div className="flex items-start">
                    <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Problem Description</p>
                      <p className="text-gray-600">{job.problem_description}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Requested Date</p>
                    <p className="text-gray-600">{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {job.scheduled_at && (
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Scheduled Date</p>
                      <p className="text-gray-600">{new Date(job.scheduled_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{job.customer_name}</p>
                    {job.company_name && <p className="text-sm text-gray-600">{job.company_name}</p>}
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <p className="text-gray-600">{job.customer_phone}</p>
                </div>
                {job.customer_email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-gray-600">{job.customer_email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Site Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Site Information</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{job.site_name}</p>
                    {job.address_line && <p className="text-sm text-gray-600">{job.address_line}</p>}
                    <p className="text-sm text-gray-600">{job.city}, {job.state}</p>
                    {job.postal_code && <p className="text-sm text-gray-600">{job.postal_code}</p>}
                  </div>
                </div>
                {job.site_contact_name && (
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-gray-600">{job.site_contact_name}</p>
                  </div>
                )}
                {job.site_contact_phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-gray-600">{job.site_contact_phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            {job.attachments && job.attachments.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
                <div className="grid grid-cols-2 gap-4">
                  {job.attachments.map((attachment) => (
                    <div key={attachment.id} className="border border-gray-200 rounded-lg p-4">
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Attachment
                      </a>
                      {attachment.caption && (
                        <p className="text-sm text-gray-600 mt-2">{attachment.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assignment Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h2>
              
              {job.worker_name ? (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <p className="font-medium text-gray-900">{job.worker_name}</p>
                      <p className="text-sm text-gray-600">{job.primary_trade}</p>
                    </div>
                  </div>
                  {job.worker_phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-gray-600">{job.worker_phone}</p>
                    </div>
                  )}
                  {job.assigned_at && (
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-600">
                        Assigned: {new Date(job.assigned_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-orange-500 mr-2" />
                    <p className="text-gray-600">No worker assigned</p>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Assign Worker
                  </button>
                </div>
              )}
            </div>

            {/* Status History */}
            {job.status_history && job.status_history.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
                <div className="space-y-3">
                  {job.status_history.map((history) => (
                    <div key={history.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{history.new_status}</span>
                        <span className="text-gray-500">
                          {new Date(history.created_at).toLocaleString()}
                        </span>
                      </div>
                      {history.old_status && (
                        <p className="text-gray-600">from {history.old_status}</p>
                      )}
                      {history.reason && (
                        <p className="text-gray-600">{history.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Assign Worker Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Worker</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Worker
                  </label>
                  <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Choose a worker...</option>
                    {workers
                      .filter(w => w.status === 'ACTIVE')
                      .map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.full_name} - {worker.primary_trade}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add any notes about this assignment..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedWorker || assignMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}