const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}, retries = 2) {
  const token = localStorage.getItem('phishguard_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

      if (res.status === 503 && i < retries) {
        console.log(`Server busy, retrying (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
        continue;
      }

      if (res.status === 401) {
        localStorage.removeItem('phishguard_token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      if (res.headers.get('content-type')?.includes('text/csv')) {
        return res.text();
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Session expired') throw err;
      if (i < retries && (err.name === 'TypeError' || err.message.includes('fetch'))) {
        console.log(`Network error, retrying (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  getTrainingModule: () => request('/training/module'),
  completeTraining: () => request('/training/complete', { method: 'POST' }),
  exploreModule: (groupId) => request(`/training/explore/${groupId}`),
  getScenarios: (phase) => request(`/simulation/scenarios/${phase}`),
  evaluateDecision: (body) => request('/simulation/evaluate', { method: 'POST', body: JSON.stringify(body) }),
  logInteraction: (body) => request('/logs/interaction', { method: 'POST', body: JSON.stringify(body) }),
  completeAssessment: (body) => request('/logs/complete-assessment', { method: 'POST', body: JSON.stringify(body) }),
  getResults: () => request('/logs/results'),
  getDashboard: () => request('/admin/dashboard'),
  getParticipation: () => request('/admin/participation'),
  exportData: () => request('/admin/export'),
  deleteUser: (userId) => request(`/admin/user/${userId}`, { method: 'DELETE' }),
  clearAllStudents: () => request('/admin/users/all', { method: 'DELETE' }),
};