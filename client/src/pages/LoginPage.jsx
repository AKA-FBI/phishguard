import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Pre-fill email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('phishguard_email');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });

      // Save or clear email based on remember me
      if (rememberMe) {
        localStorage.setItem('phishguard_email', email);
      } else {
        localStorage.removeItem('phishguard_email');
      }

      login(data.session, data.user, data.progress);
      navigate(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-blue-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-brand-800">🛡️ PhishGuard</h1>
          <p className="text-gray-500 mt-1">Phishing Awareness Training Platform</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" name="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="your.email@abuad.edu.ng"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" name="password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="Enter your password"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="remember" checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
            />
            <label htmlFor="remember" className="text-sm text-gray-600">Remember my email</label>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 space-y-2">
          <p className="text-center text-sm text-gray-500">
            Already have an account? Sign in above.
          </p>
          <Link to="/consent" className="block text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors">
            New here? Start the Study
          </Link>
        </div>
      </div>
    </div>
  );
}