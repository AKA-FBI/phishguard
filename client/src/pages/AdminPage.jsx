import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState([]);
  const [participation, setParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleting, setDeleting] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([api.getDashboard(), api.getParticipation()])
      .then(([dashData, partData]) => {
        setDashboard(dashData.dashboard || []);
        setParticipation(partData);
      })
      .catch(err => console.error('Admin data error:', err))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  async function handleDeleteUser(userId, name) {
    if (!window.confirm(`Are you sure you want to delete ${name} and all their data? This cannot be undone.`)) return;
    setDeleting(userId);
    try {
      await api.deleteUser(userId);
      loadData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearing(true);
    try {
      const result = await api.clearAllStudents();
      alert(`Cleared ${result.deleted} student(s) and all associated data.`);
      setConfirmClear(false);
      loadData();
    } catch (err) {
      alert('Clear failed: ' + err.message);
    } finally {
      setClearing(false);
    }
  }

  async function handleExport() {
    try {
      const csvText = await api.exportData();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phishguard_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  function handleLogout() { logout(); navigate('/login'); }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading admin dashboard...</div>;

  const groups = ['Text-Based', 'Video-Based', 'Interactive'];

  function getMetric(group, phase, metric) {
    const entry = dashboard.find(d => d.group === group && d.phase === phase);
    return entry ? entry[metric] : 0;
  }

  const comparisonData = groups.map(g => ({
    group: g,
    'Pre Detection Rate': getMetric(g, 'pre_training', 'avg_detection_rate'),
    'Post Detection Rate': getMetric(g, 'post_training', 'avg_detection_rate'),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">🛡️ PhishGuard Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.full_name}</span>
          <button onClick={() => navigate('/')} className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded">Student View</button>
          <button onClick={handleLogout} className="text-sm bg-red-600 hover:bg-red-500 px-3 py-1 rounded">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-1 mb-8 bg-gray-200 rounded-lg p-1 w-fit">
          {['overview', 'participation', 'export'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-500">Total Participants</p>
                <p className="text-3xl font-bold text-gray-900">{participation?.summary?.total_registered || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-500">Pre-Assessment Done</p>
                <p className="text-3xl font-bold text-blue-600">{participation?.summary?.pre_complete || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-500">Training Done</p>
                <p className="text-3xl font-bold text-purple-600">{participation?.summary?.training_complete || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-500">Fully Complete</p>
                <p className="text-3xl font-bold text-green-600">{participation?.summary?.fully_complete || 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detection Rate by Group (Pre vs Post)</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="group" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Pre Detection Rate" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Post Detection Rate" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Group Metrics</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Group</th>
                      <th className="text-left py-3 px-4">Phase</th>
                      <th className="text-center py-3 px-4">Participants</th>
                      <th className="text-center py-3 px-4">Avg Detection</th>
                      <th className="text-center py-3 px-4">Avg CTR</th>
                      <th className="text-center py-3 px-4">Avg FPR</th>
                      <th className="text-center py-3 px-4">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{row.group}</td>
                        <td className="py-3 px-4">{row.phase === 'pre_training' ? 'Pre' : 'Post'}</td>
                        <td className="py-3 px-4 text-center">{row.participants}</td>
                        <td className="py-3 px-4 text-center">{row.avg_detection_rate}%</td>
                        <td className="py-3 px-4 text-center">{row.avg_click_through_rate}%</td>
                        <td className="py-3 px-4 text-center">{row.avg_false_positive_rate}%</td>
                        <td className="py-3 px-4 text-center">{(row.avg_response_time_ms / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                    {dashboard.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-gray-400">No assessment data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PARTICIPATION TAB */}
        {activeTab === 'participation' && participation && (
          <div>
            {/* Clear All Button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Participant Progress</h2>
              <div className="flex items-center gap-2">
                {confirmClear && (
                  <span className="text-red-600 text-sm font-medium">Are you sure? This deletes ALL student data.</span>
                )}
                <button 
                  onClick={handleClearAll} 
                  disabled={clearing}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    confirmClear 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {clearing ? 'Clearing...' : confirmClear ? 'Yes, Clear All Students' : 'Clear All Student Data'}
                </button>
                {confirmClear && (
                  <button onClick={() => setConfirmClear(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-3">Name</th>
                      <th className="text-left py-3 px-3">Matric</th>
                      <th className="text-left py-3 px-3">Dept</th>
                      <th className="text-left py-3 px-3">Group</th>
                      <th className="text-center py-3 px-3">Pre-Test</th>
                      <th className="text-center py-3 px-3">Training</th>
                      <th className="text-center py-3 px-3">Post-Test</th>
                      <th className="text-center py-3 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(participation.participants || []).map((p, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3">{p.name}</td>
                        <td className="py-2 px-3 text-gray-500">{p.matric}</td>
                        <td className="py-2 px-3 text-gray-500">{p.department || '—'}</td>
                        <td className="py-2 px-3">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{p.group}</span>
                        </td>
                        <td className="py-2 px-3 text-center">{p.pre_complete ? '✅' : '⬜'}</td>
                        <td className="py-2 px-3 text-center">{p.training_complete ? '✅' : '⬜'}</td>
                        <td className="py-2 px-3 text-center">{p.post_complete ? '✅' : '⬜'}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleDeleteUser(p.id, p.name)}
                            disabled={deleting === p.id}
                            className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                          >
                            {deleting === p.id ? 'Deleting...' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!participation.participants || participation.participants.length === 0) && (
                      <tr><td colSpan={8} className="py-8 text-center text-gray-400">No participants yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="bg-white rounded-xl shadow p-8 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-gray-900">Export Research Data</h2>
            <p className="text-gray-600 mt-2 mb-6">
              Download anonymised participant-level data as a CSV file for statistical analysis in SPSS, R, or Excel.
              All identifying information is replaced with anonymous participant codes.
            </p>
            <button onClick={handleExport}
              className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Download CSV Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
}