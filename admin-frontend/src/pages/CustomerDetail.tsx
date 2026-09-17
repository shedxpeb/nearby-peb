import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import type { CustomerDetail } from '../types';
import { ArrowLeft, Phone, Mail, MapPin, Building2, Briefcase } from 'lucide-react';
import Card from '../components/Card';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCustomerDetail = useCallback(async () => {
    try {
      const response = await adminService.getCustomer(id!);
      setCustomer(response.data);
    } catch (error) {
      console.error('Failed to fetch customer detail:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCustomerDetail();
    }
  }, [id, fetchCustomerDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Customer not found</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* Customer Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">{customer.full_name}</h1>
            {customer.company_name && (
              <p className="text-slate-600">{customer.company_name}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="text-center px-3 py-2 bg-indigo-50 rounded-lg min-w-[60px]">
              <p className="text-slate-500 text-xs mb-1">Total</p>
              <p className="text-slate-900 text-lg font-bold">{customer.total_jobs}</p>
            </div>
            <div className="text-center px-3 py-2 bg-green-50 rounded-lg min-w-[60px]">
              <p className="text-slate-500 text-xs mb-1">Done</p>
              <p className="text-slate-900 text-lg font-bold">{customer.completed_jobs}</p>
            </div>
            <div className="text-center px-3 py-2 bg-amber-50 rounded-lg min-w-[60px]">
              <p className="text-slate-500 text-xs mb-1">Active</p>
              <p className="text-slate-900 text-lg font-bold">{customer.active_jobs}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            Contact Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-center text-slate-700">
              <Phone className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
              <span className="font-medium">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center text-slate-700">
                <Mail className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                <span className="break-all">{customer.email}</span>
              </div>
            )}
            {customer.contact_person && (
              <div className="flex items-center text-slate-700">
                <Phone className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                <span>Contact: {customer.contact_person}</span>
              </div>
            )}
            <div className="flex items-center text-slate-700">
              <Phone className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
              <span>Preferred: {customer.preferred_communication}</span>
            </div>
          </div>
        </Card>

        {/* Service Sites */}
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Service Sites
          </h2>
          {customer.sites && customer.sites.length > 0 ? (
            <div className="space-y-3">
              {customer.sites.map((site) => (
                <div key={site.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-medium text-slate-900">{site.site_name}</p>
                  <div className="flex items-start text-slate-600 text-sm mt-1">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="break-words">
                      {site.address_line || `${site.city}, ${site.state}`} {site.postal_code && `- ${site.postal_code}`}
                    </span>
                  </div>
                  {site.contact_name && (
                    <p className="text-sm text-slate-500 mt-1">Contact: {site.contact_name}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No service sites registered</p>
          )}
        </Card>
      </div>

      {/* Job History */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <Briefcase className="w-5 h-5 mr-2" />
          Job History
        </h2>
        {customer.job_history && customer.job_history.length > 0 ? (
          <div className="space-y-3">
            {customer.job_history.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{job.title}</p>
                    <p className="text-sm text-slate-500">{job.job_number}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                {job.service_type && (
                  <p className="text-sm text-slate-600">{job.service_type}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No job history</p>
        )}
      </Card>
    </div>
  );
}
