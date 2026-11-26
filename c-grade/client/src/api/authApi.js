import { axiosClient } from './axiosClient.js';

export const authApi = {
  register: (payload) => axiosClient.post('/auth/register', payload).then((r) => r.data),
  verifyEmail: (payload) => axiosClient.post('/auth/verify-email', payload).then((r) => r.data),
  resendVerification: (payload) =>
    axiosClient.post('/auth/resend-verification', payload).then((r) => r.data),
  login: (payload) => axiosClient.post('/auth/login', payload).then((r) => r.data),
  logout: () => axiosClient.post('/auth/logout').then((r) => r.data),
  refresh: () => axiosClient.post('/auth/refresh').then((r) => r.data),
  session: () => axiosClient.get('/auth/session').then((r) => r.data),
  me: () => axiosClient.get('/auth/me').then((r) => r.data),
  forgotPassword: (payload) => axiosClient.post('/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (token, payload) => axiosClient.post(`/auth/reset-password/${token}`, payload).then((r) => r.data),
  changePassword: (payload) => axiosClient.patch('/auth/change-password', payload).then((r) => r.data),
};
