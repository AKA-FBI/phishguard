import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('phishguard_token');
    if (token) {
      api.getMe()
        .then(data => {
          setUser(data.user);
          setProgress(data.progress);
        })
        .catch(() => {
          localStorage.removeItem('phishguard_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function login(session, userData, progressData) {
    localStorage.setItem('phishguard_token', session.access_token);
    setUser(userData);
    setProgress(progressData);
  }

  function logout() {
    localStorage.removeItem('phishguard_token');
    setUser(null);
    setProgress(null);
  }

  function updateProgress(newProgress) {
    setProgress(prev => ({ ...prev, ...newProgress }));
  }

  return (
    <AuthContext.Provider value={{ user, progress, loading, login, logout, updateProgress }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
