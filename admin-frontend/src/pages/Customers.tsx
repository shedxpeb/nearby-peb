import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import type { Customer } from '../types';
import { Search, Phone, Mail, ArrowRight } from 'lucide-react';
import Card from '../components/Card';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchCustomers = async () => {
    try {
      const response = await adminService.getCustomers({ search, limit: 50 });
      setCustomers(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
      </div>

      {/* Search */}
      <Card padding="sm">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers by name, company, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </Card>

      {/* Customer List */}
      {customers.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-500">
            {search ? 'No customers found matching your search.' : 'No customers yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              padding="sm"
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{customer.full_name}</h3>
                    {customer.company_name && (
                      <span className="text-sm text-slate-500">• {customer.company_name}</span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-slate-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center text-slate-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Jobs</p>
                    <p className="font-semibold text-slate-900">{customer.total_jobs}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
