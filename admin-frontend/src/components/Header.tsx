import { useNavigate } from 'react-router-dom';
import { adminAuthService } from '../services/adminAuth';
import { Menu, LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, onMenuClick, action }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    adminAuthService.logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {action && <div className="flex items-center gap-2">{action}</div>}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
