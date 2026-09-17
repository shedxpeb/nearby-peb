import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { adminAuthService } from './services/adminAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Workers from './pages/Workers';
import WorkerDetail from './pages/WorkerDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import AdminLayout from './components/AdminLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = adminAuthService.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [showWorkerCreateModal, setShowWorkerCreateModal] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout title="Dashboard" subtitle="Overview of service operations">
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <AdminLayout title="Service Requests" subtitle="Manage customer service requests">
                <Jobs />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute>
              <AdminLayout title="Request Details" subtitle="View and manage service request">
                <JobDetail />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workers"
          element={
            <ProtectedRoute>
              <AdminLayout 
                title="Workers" 
                subtitle="Manage workforce directory"
                action={
                  <button
                    onClick={() => setShowWorkerCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Worker</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                }
              >
                <Workers showCreateModal={showWorkerCreateModal} setShowCreateModal={setShowWorkerCreateModal} />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workers/:id"
          element={
            <ProtectedRoute>
              <AdminLayout title="Worker Profile" subtitle="View worker details and assignments">
                <WorkerDetail />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <AdminLayout title="Customers" subtitle="Manage customer directory">
                <Customers />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <AdminLayout title="Customer Details" subtitle="View customer profile and history">
                <CustomerDetail />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
