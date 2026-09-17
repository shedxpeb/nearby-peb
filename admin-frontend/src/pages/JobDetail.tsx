import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { formatDateTime, formatPreferredDate } from '../utils/dateUtils';
import { ArrowLeft, MapPin, Calendar, User as UserIcon, Phone, Building2, CheckCircle, Users, X, AlertCircle, Paperclip } from 'lucide-react';
import Card from '../components/Card';
import type { JobDetail, JobAttachment } from '../types';

interface WorkerUI {
  id: string;
  full_name: string;
  phone: string;
  status: string;
}

type TabType = 'overview' | 'timeline' | 'attachments';

interface WorkerUI {
  id: string;
  full_name: string;
  phone: string;
  status: string;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [workers, setWorkers] = useState<WorkerUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const navigate = useNavigate();

  const fetchJobDetail = useCallback(async () => {
    try {
      const response = await adminService.getJob(id!);
      setJob(response.data);
    } catch (error) {
      console.error('Failed to fetch job detail:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchWorkers = useCallback(async () => {
    try {
      const response = await adminService.getWorkers();
      const items = response.data.items || [];
      setWorkers(items.map((w: any) => ({
        id: w.id,
        full_name: w.full_name,
        phone: w.phone,
        status: w.status,
      })));
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
      fetchWorkers();
      // Poll every 15 seconds for live updates
      const interval = setInterval(fetchJobDetail, 15000);
      return () => clearInterval(interval);
    }
  }, [id, fetchJobDetail, fetchWorkers]);

  const handleAssignWorker = async () => {
    if (!selectedWorker) return;
    setAssigning(true);
    try {
      await adminService.assignWorker(id!, { worker_id: selectedWorker, notes: '' });
      setShowWorkerModal(false);
      setSelectedWorker('');
      fetchJobDetail();
    } catch (error) {
      console.error('Failed to assign worker:', error);
    } finally {
      setAssigning(false);
    }
  };

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

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Job not found</p>
      </div>
    );
  }

  const isUnassigned = !job.worker_name;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/jobs')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </button>

      {/* Job Header */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm font-mono text-slate-600">{job.job_number}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(job.status)}`}>
            {job.status}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {job.priority}
          </span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-2">{job.title}</h1>
        <p className="text-slate-600">{job.description}</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center text-sm text-slate-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Created: {formatDateTime(job.created_at)}</span>
          </div>
          {job.scheduled_at && (
            <div className="flex items-center text-sm text-slate-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Preferred: {formatPreferredDate(job.scheduled_at)}</span>
            </div>
          )}
          {job.completed_at && (
            <div className="flex items-center text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Completed: {formatDateTime(job.completed_at)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {(['overview', 'timeline', 'attachments'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Assignment - PROMINENT FOR UNASSIGNED */}
          <Card className={isUnassigned ? 'border-amber-300 bg-amber-50' : ''}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Worker Assignment
            </h2>
            {job.worker_name ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-slate-900 font-medium">{job.worker_name}</p>
                    <p className="text-green-600 text-sm">{job.worker_phone}</p>
                  </div>
                </div>
                <p className="text-slate-500 text-sm">Worker has been assigned to this request.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-100 rounded-lg border border-amber-300">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <p className="text-amber-800 font-medium">Not Assigned</p>
                </div>
                <button
                  onClick={() => setShowWorkerModal(true)}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-lg"
                >
                  Assign Worker
                </button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Customer Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center text-slate-700">
                  <UserIcon className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                  <span className="font-medium">{job.customer_name}</span>
                </div>
                <div className="flex items-center text-slate-700">
                  <Phone className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                  <span>{job.customer_phone}</span>
                </div>
                {job.customer_email && (
                  <div className="flex items-center text-slate-700">
                    <UserIcon className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{job.customer_email}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Site Information */}
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Site Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center text-slate-700">
                  <Building2 className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                  <span className="font-medium">{job.site_name}</span>
                </div>
                <div className="flex items-start text-slate-700">
                  <MapPin className="w-5 h-5 mr-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{job.address_line || `${job.city}, ${job.state}`} {job.postal_code && `- ${job.postal_code}`}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'timeline' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Timeline
          </h2>
          <div className="space-y-4">
            {job.status_history && job.status_history.length > 0 ? (
              job.status_history.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      event.new_status === 'REQUESTED' ? 'bg-indigo-600' :
                      event.new_status === 'ASSIGNED' ? 'bg-blue-600' :
                      event.new_status === 'ACCEPTED' ? 'bg-green-600' :
                      event.new_status === 'COMPLETED' ? 'bg-green-600' :
                      'bg-slate-400'
                    }`}></div>
                    {index < job.status_history.length - 1 && <div className="w-0.5 h-8 bg-slate-200 ml-3"></div>}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{event.new_status}</p>
                    <p className="text-sm text-slate-500">{formatDateTime(event.created_at)}</p>
                    {event.reason && <p className="text-sm text-slate-600 mt-1">{event.reason}</p>}
                    {event.worker_name && <p className="text-sm text-slate-600 mt-1">Worker: {event.worker_name}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 mt-1.5"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Request Created</p>
                  <p className="text-sm text-slate-500">{formatDateTime(job.created_at)}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'attachments' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Paperclip className="w-5 h-5 mr-2" />
            Attachments
          </h2>
          {job.attachments && job.attachments.length > 0 ? (
            <div className="space-y-3">
              {job.attachments.map((attachment: JobAttachment) => (
                <div key={attachment.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <Paperclip className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{attachment.caption || 'Attachment'}</p>
                    <a 
                      href={attachment.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800 truncate"
                    >
                      {attachment.file_url}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No attachments</p>
          )}
        </Card>
      )}

      {/* Worker Selection Modal */}
      {showWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowWorkerModal(false)}></div>
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md border border-slate-200 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">Select Worker</h3>
              <button onClick={() => setShowWorkerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {workers.filter(w => w.status === 'ACTIVE').map((worker) => (
                <button
                  key={worker.id}
                  onClick={() => setSelectedWorker(worker.id)}
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    selectedWorker === worker.id
                      ? 'bg-indigo-50 border-indigo-500 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{worker.full_name}</p>
                      <p className="text-sm text-slate-500">{worker.phone}</p>
                    </div>
                    {selectedWorker === worker.id && (
                      <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowWorkerModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignWorker}
                disabled={!selectedWorker || assigning}
                className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
