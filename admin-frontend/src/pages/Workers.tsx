import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import type { Worker, Skill, ServiceArea } from '../types';
import { Search, Users, CheckCircle, Clock, Phone, Star, Filter, X, AlertCircle, Wrench, MapPin } from 'lucide-react';
import Card from '../components/Card';

interface WorkersProps {
  showCreateModal?: boolean;
  setShowCreateModal?: (show: boolean) => void;
}

export default function Workers({ showCreateModal: externalShowCreateModal, setShowCreateModal: externalSetShowCreateModal }: WorkersProps = {}) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [internalShowCreateModal, setInternalShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    primary_trade: '',
    years_experience: '',
    professional_bio: '',
    previous_company: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    preferred_work_type: '',
    languages: '',
    skills: [] as string[],
    service_areas: [] as string[],
    service_area_radius_km: 10,
  });
  const navigate = useNavigate();

  // Use external modal state if provided, otherwise use internal state
  const showCreateModal = externalShowCreateModal !== undefined ? externalShowCreateModal : internalShowCreateModal;
  const setShowCreateModal = externalSetShowCreateModal || setInternalShowCreateModal;

  const fetchWorkers = async () => {
    try {
      const response = await adminService.getWorkers();
      setWorkers(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const [skillsResponse, areasResponse] = await Promise.all([
        adminService.getSkills(),
        adminService.getServiceAreas(),
      ]);
      setSkills(skillsResponse.data);
      setServiceAreas(areasResponse.data);
    } catch (error) {
      console.error('Failed to fetch form options:', error);
    }
  };

  const handleCreateWorker = async () => {
    setFormError('');

    // Validation
    if (!createForm.full_name || createForm.full_name.trim().length < 2) {
      setFormError('Full name must be at least 2 characters');
      return;
    }
    if (!createForm.phone || createForm.phone.length < 8 || createForm.phone.length > 32) {
      setFormError('Phone must be between 8 and 32 characters');
      return;
    }
    if (!createForm.password || createForm.password.length < 6 || createForm.password.length > 128) {
      setFormError('Password must be between 6 and 128 characters');
      return;
    }
    if (createForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createForm.email)) {
        setFormError('Please enter a valid email address');
        return;
      }
    }

    // Parse years experience once
    let yearsExp: number | undefined = undefined;
    if (createForm.years_experience) {
      const parsed = parseInt(createForm.years_experience, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 80) {
        setFormError('Years of experience must be between 0 and 80');
        return;
      }
      yearsExp = parsed;
    }

    setCreating(true);
    try {
      await adminService.createWorker({
        ...createForm,
        years_experience: yearsExp,
      });
      setShowCreateModal(false);
      setCreateForm({
        full_name: '',
        phone: '',
        email: '',
        password: '',
        primary_trade: '',
        years_experience: '',
        professional_bio: '',
        previous_company: '',
        emergency_contact_name: '',
        emergency_contact_number: '',
        preferred_work_type: '',
        languages: '',
        skills: [],
        service_areas: [],
        service_area_radius_km: 10,
      });
      fetchWorkers();
    } catch (error: unknown) {
      console.error('Failed to create worker:', error);
      const err = error as { response?: { data?: { detail?: { message?: string } | string } }; message?: string };
      const detail = err?.response?.data?.detail;
      const detailMessage = typeof detail === 'object' && detail !== null ? detail.message : undefined;
      const dataMessage = typeof err?.response?.data === 'object' && err?.response?.data !== null && 'message' in err.response.data ? (err.response.data as { message?: string }).message : undefined;
      const errorMessage = detailMessage || dataMessage || err?.message || 'Failed to create worker. Please try again.';
      setFormError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchFormOptions();
    // Poll every 15 seconds for live updates
    const interval = setInterval(fetchWorkers, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.full_name.toLowerCase().includes(search.toLowerCase()) ||
                         worker.phone.includes(search);
    const matchesFilter = filter === 'ALL' ||
                         (filter === 'ACTIVE' && worker.status === 'ACTIVE') ||
                         (filter === 'INACTIVE' && worker.status !== 'ACTIVE');
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total</p>
              <p className="text-lg font-bold text-slate-900">{workers.length}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Active</p>
              <p className="text-lg font-bold text-slate-900">{workers.filter(w => w.status === 'ACTIVE').length}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Available</p>
              <p className="text-lg font-bold text-slate-900">{workers.filter(w => w.status === 'ACTIVE' && w.active_assignments_count === 0).length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors bg-white appearance-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setFormError('');
          }}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4" />
          Add Worker
        </button>
      </div>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No workers found</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map((worker) => (
            <Card
              key={worker.id}
              onClick={() => navigate(`/workers/${worker.id}`)}
              padding="sm"
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${worker.status === 'ACTIVE' ? 'bg-green-100' : 'bg-slate-100'}`}>
                  <Users className={`w-5 h-5 ${worker.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 truncate">{worker.full_name}</h3>
                  <div className="flex items-center gap-2">
                    {worker.status === 'ACTIVE' ? (
                      <span className="flex items-center text-green-600 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center text-slate-400 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                {worker.rating_avg > 0 && (
                  <div className="flex items-center text-amber-500 flex-shrink-0">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    <span className="font-medium text-sm">{worker.rating_avg}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center text-slate-600 text-sm mb-3">
                <Phone className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                <span className="truncate">{worker.phone}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-sm">
                <span className="text-slate-500">Assignments:</span>
                <span className="text-slate-900 font-medium">{worker.active_assignments_count}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Worker Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add New Worker</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter email (optional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Trade</label>
                <input
                  type="text"
                  value={createForm.primary_trade}
                  onChange={(e) => setCreateForm({ ...createForm, primary_trade: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="PEB Service Professional"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={createForm.years_experience}
                    onChange={(e) => setCreateForm({ ...createForm, years_experience: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter years"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Previous Company</label>
                  <input
                    type="text"
                    value={createForm.previous_company}
                    onChange={(e) => setCreateForm({ ...createForm, previous_company: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter previous company"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Professional Bio</label>
                <textarea
                  value={createForm.professional_bio}
                  onChange={(e) => setCreateForm({ ...createForm, professional_bio: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  rows={3}
                  placeholder="Enter professional bio"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={createForm.emergency_contact_name}
                    onChange={(e) => setCreateForm({ ...createForm, emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Number</label>
                  <input
                    type="tel"
                    value={createForm.emergency_contact_number}
                    onChange={(e) => setCreateForm({ ...createForm, emergency_contact_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter emergency contact number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Work Type</label>
                  <input
                    type="text"
                    value={createForm.preferred_work_type}
                    onChange={(e) => setCreateForm({ ...createForm, preferred_work_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter preferred work type"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Languages</label>
                  <input
                    type="text"
                    value={createForm.languages}
                    onChange={(e) => setCreateForm({ ...createForm, languages: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter languages (comma separated)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Wrench className="w-4 h-4 mr-2" />
                  Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => {
                        const newSkills = createForm.skills.includes(skill.name)
                          ? createForm.skills.filter(s => s !== skill.name)
                          : [...createForm.skills, skill.name];
                        setCreateForm({ ...createForm, skills: newSkills });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        createForm.skills.includes(skill.name)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Service Areas
                </label>
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        const newAreas = createForm.service_areas.includes(area.name)
                          ? createForm.service_areas.filter(a => a !== area.name)
                          : [...createForm.service_areas, area.name];
                        setCreateForm({ ...createForm, service_areas: newAreas });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        createForm.service_areas.includes(area.name)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {area.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateWorker}
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Worker'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
