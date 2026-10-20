import axios from 'axios';

export const TOKEN_KEY = 'pti.token';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/register');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('pti:logout'));
    }
    return Promise.reject(error);
  },
);

/** `{ code, message, details }` from any API error, or a generic network message. */
export function apiError(error) {
  const e = error?.response?.data?.error;
  if (e) return e;
  return { code: 'NETWORK', message: error?.message ?? 'Network error' };
}
