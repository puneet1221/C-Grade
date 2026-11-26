import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api/v1';

// In-memory Access Token store (never persisted in localStorage/sessionStorage)
let inMemoryAccessToken = null;
let refreshPromise = null;
let onAuthExpiredHandler = null;

export function setAccessToken(token) {
  inMemoryAccessToken = token || null;
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function registerAuthExpiredHandler(fn) {
  onAuthExpiredHandler = fn;
}

/**
 * Shared Axios instance configured with credentials and automatic
 * single-flight 401 silent refresh token rotation.
 */
export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

axiosClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const { data } = await refreshPromise;
        const nextToken = data?.data?.accessToken;

        if (nextToken) {
          setAccessToken(nextToken);
          originalRequest.headers.Authorization = `Bearer ${nextToken}`;
          return axiosClient(originalRequest);
        }
      } catch (refreshError) {
        setAccessToken(null);
        if (onAuthExpiredHandler) {
          onAuthExpiredHandler();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
