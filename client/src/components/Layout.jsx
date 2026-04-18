import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, progress, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const allComplete = progress?.pre_assessment_complete && 
                      progress?.training_complete && 
                      progress?.post_assessment_complete;

  function navLink(to, label) {
    const active = location.pathname === to;
    return (
      <Link to={to} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-700 hover:text-white'
      }`}>{label}</Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <span>🛡️</span> PhishGuard
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-200">
                {user?.full_name} | {user?.groups?.name || 'Group N/A'}
              </span>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="text-sm bg-red-600 hover:bg-red-500 px-3 py-1 rounded">
                Logout
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-700">
            {navLink('/', 'Dashboard')}
            {progress?.pre_assessment_complete && !progress?.training_complete && navLink('/training', 'Training')}
            {allComplete && navLink('/results', 'Results')}
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}