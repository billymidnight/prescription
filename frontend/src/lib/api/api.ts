import axios from 'axios';
import { useAuthStore } from '../state/authStore';
import supabase from '../supabaseClient';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const api = axios.create({
  baseURL,
  timeout: 10000,
});

// Attach auth headers
api.interceptors.request.use((config) => {
  try {
    const user = useAuthStore.getState().user;
    if (user) {
      const headers = (config.headers as Record<string, any>) || {};
      if (user.email) headers['X-User-Email'] = user.email;
      if (user.username) headers['X-User-Name'] = user.username;
      if (user.role) headers['X-User-Role'] = user.role;
      config.headers = headers as any;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

// ============= AUTH API =============

export async function fetchCurrentUser() {
  const session = await supabase.auth.getSession();
  let token = (session as any)?.data?.session?.access_token;
  if (!token) token = useAuthStore.getState().accessToken ?? null;
  if (!token) return null;
  
  const headers = { Authorization: `Bearer ${token}` };
  const r = await api.get('/auth/me', { headers });
  return r.data.user || null;
}

// ============= PLACEHOLDER ENDPOINTS =============

export async function fetchHomeData() {
  const r = await api.get('/home');
  return r.data;
}

export async function fetchDashboardData() {
  const session = await supabase.auth.getSession();
  let token = (session as any)?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  
  const headers = { Authorization: `Bearer ${token}` };
  const r = await api.get('/dashboard', { headers });
  return r.data;
}

// ============= ADD MORE API FUNCTIONS HERE =============

export default api;
