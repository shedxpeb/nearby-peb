import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { formatDate, formatDateTime, formatPreferredDate } from '../utils/dateUtils';
import type { WorkerDetail as WorkerDetailType } from '../types';
import { ArrowLeft, Users, Phone, CheckCircle, Clock, Award, Calendar, Wrench, MapPin, Star, Briefcase } from 'lucide-react';
import Card from '../components/Card';

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWorkerDetail = useCallback(async () => {
    try {
      const response = await adminService.getWorker(id!);
      setWorker(response.data);
    } catch (error) {
      console.error('Failed to fetch worker detail:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchWorkerDetail();
      // Poll every 15 seconds for live updates
      const interval = setInterval(fetchWorkerDetail, 15000);
      return () => clearInterval(interval);
    }
  }, [id, fetchWorkerDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Worker not found</p>
      </div>
    );
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/workers')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Workers
      </button>

      {/* Worker Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${worker.status === 'ACTIVE' ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Users className={`w-7 h-7 ${worker.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{worker.full_name}</h1>
                {worker.status === 'ACTIVE' ? (
                  <span className="flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-slate-600 text-sm flex-wrap">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {worker.phone}
                </div>
                {worker.rating_avg && worker.rating_avg > 0 && (
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    <span className="font-medium">{worker.rating_avg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-center px-3 py-2 bg-indigo-50 rounded-lg min-w-[60px]">
              <p className="text-slate-500 text-xs mb-1">Current</p>
              <p className="text-slate-900 text-lg font-bold">{worker.current_assignments?.length || 0}</p>
            </div>
            <div className="text-center px-3 py-2 bg-green-50 rounded-lg min-w-[60px]">
              <p className="text-slate-500 text-xs mb-1">Done</p>
              <p className="text-slate-900 text-lg font-bold">{worker.completed_jobs_count}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Assignments */}
      {worker.current_assignments && worker.current_assignments.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Current Assignments
          </h2>
          <div className="space-y-3">
            {worker.current_assignments.map((assignment) => (
              <div
                key={assignment.job_id}
                onClick={() => navigate(`/jobs/${assignment.job_id}`)}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{assignment.title || 'Untitled Job'}</p>
                    <p className="text-sm text-slate-500">{assignment.job_number}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    assignment.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                    assignment.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
                {assignment.service_type && (
                  <p className="text-sm text-slate-600">{assignment.service_type}</p>
                )}
                {assignment.scheduled_at && (
                  <p className="text-xs text-slate-500 mt-1">
                    Scheduled: {formatPreferredDate(assignment.scheduled_at)}
                  </p>
                )}
                {assignment.assigned_at && (
                  <p className="text-xs text-slate-500 mt-1">
                    Assigned: {formatDateTime(assignment.assigned_at)}
                  </p>
                )}
                {assignment.completed_at && (
                  <p className="text-xs text-slate-500 mt-1">
                    Completed: {formatDateTime(assignment.completed_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Skills & Expertise
            </h2>
            {worker.skills && worker.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {worker.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    {skill.skill_name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No skills listed</p>
            )}
          </Card>

          {/* Service Areas */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Service Areas
            </h2>
            {worker.service_areas && worker.service_areas.length > 0 ? (
              <div className="space-y-2">
                {worker.service_areas.map((area, index) => (
                  <div key={index} className="flex items-center text-slate-700">
                    <MapPin className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{area.area_name || `${area.city}, ${area.state}`}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No service areas listed</p>
            )}
          </Card>

          {/* Availability */}
          {worker.availability && worker.availability.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Weekly Availability
              </h2>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const availRecord = worker.availability?.find((a) => a.day_of_week === index);
                  const isAvailable = availRecord?.is_available;
                  return (
                    <div
                      key={day}
                      className={`text-center p-2 rounded-lg ${
                        isAvailable
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1">{day}</p>
                      {isAvailable ? (
                        <CheckCircle className="w-4 h-4 mx-auto" />
                      ) : (
                        <Clock className="w-4 h-4 mx-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Contact Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 text-sm mb-1">Phone</p>
                <p className="text-slate-900 font-medium">{worker.phone}</p>
              </div>
              {worker.email && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Email</p>
                  <p className="text-slate-900 font-medium break-all">{worker.email}</p>
                </div>
              )}
              {worker.emergency_contact_name && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Emergency Contact Name</p>
                  <p className="text-slate-900 font-medium">{worker.emergency_contact_name}</p>
                </div>
              )}
              {worker.emergency_contact_number && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Emergency Contact Number</p>
                  <p className="text-slate-900 font-medium">{worker.emergency_contact_number}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Professional Information */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Professional Information
            </h2>
            <div className="space-y-3">
              {worker.primary_trade && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Primary Trade</p>
                  <p className="text-slate-900 font-medium">{worker.primary_trade}</p>
                </div>
              )}
              {worker.years_experience !== null && worker.years_experience !== undefined && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Years of Experience</p>
                  <p className="text-slate-900 font-medium">{worker.years_experience} years</p>
                </div>
              )}
              {worker.professional_bio && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Professional Bio</p>
                  <p className="text-slate-900 font-medium text-sm">{worker.professional_bio}</p>
                </div>
              )}
              {worker.previous_company && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Previous Company</p>
                  <p className="text-slate-900 font-medium">{worker.previous_company}</p>
                </div>
              )}
              {worker.preferred_work_type && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Preferred Work Type</p>
                  <p className="text-slate-900 font-medium">{worker.preferred_work_type}</p>
                </div>
              )}
              {worker.languages && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Languages</p>
                  <p className="text-slate-900 font-medium">{worker.languages}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Performance */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Performance
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Rating</span>
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  <span className="font-medium">{worker.rating_avg || 'N/A'}</span>
                  {worker.rating_count && worker.rating_count > 0 && (
                    <span className="text-xs text-slate-400 ml-1">({worker.rating_count})</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Completed</span>
                <span className="text-slate-900 font-medium">{worker.completed_jobs_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Current Load</span>
                <span className="text-slate-900 font-medium">{worker.current_assignments?.length || 0}</span>
              </div>
              {worker.total_earnings !== null && worker.total_earnings !== undefined && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-slate-500">Total Earnings</span>
                  <span className="text-slate-900 font-medium">
                    ${worker.total_earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Joined Date */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Member Since
            </h2>
            <p className="text-slate-900 font-medium">
              {formatDate(worker.created_at)}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
