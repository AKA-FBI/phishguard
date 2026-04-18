import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', matric_number: '', department: '', year_of_study: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, year_of_study: form.year_of_study ? parseInt(form.year_of_study) : null };
      const data = await api.register(payload);
      login(data.session, { ...data.user, role: 'student' }, { pre_assessment_complete: false, training_complete: false, post_assessment_complete: false });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-blue-900 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-brand-800">🛡️ PhishGuard</h1>
          <p className="text-gray-500 mt-1">Create your account to begin</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Surname Firstname Middlename" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matric Number *</label>
              <input type="text" value={form.matric_number} onChange={e => update('matric_number', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="e.g. 19/0001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" value={form.department} onChange={e => update('department', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
              <select value={form.year_of_study} onChange={e => update('year_of_study', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                <option value="">Select year</option>
                <option value="1">100 Level</option>
                <option value="2">200 Level</option>
                <option value="3">300 Level</option>
                <option value="4">400 Level</option>
                <option value="5">500 Level</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="your.email@abuad.edu.ng" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="At least 6 characters" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2">
            {loading ? 'Creating account...' : 'Register & Begin'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already registered? <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
