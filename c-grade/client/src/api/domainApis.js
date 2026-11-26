import { axiosClient } from './axiosClient.js';

export const diaryApi = {
  getMine: () => axiosClient.get('/diary/me').then((r) => r.data),
  toggleWatchlist: (movieId) => axiosClient.post(`/diary/${movieId}/watchlist`).then((r) => r.data),
  markWatched: (movieId, payload = {}) => axiosClient.post(`/diary/${movieId}/watched`, payload).then((r) => r.data),
};

export const listsApi = {
  list: (params) => axiosClient.get('/lists', { params }).then((r) => r.data),
  detail: (slug) => axiosClient.get(`/lists/${slug}`).then((r) => r.data),
  create: (payload) => axiosClient.post('/lists', payload).then((r) => r.data),
  update: (id, payload) => axiosClient.patch(`/lists/${id}`, payload).then((r) => r.data),
  remove: (id) => axiosClient.delete(`/lists/${id}`).then((r) => r.data),
  toggleLike: (id) => axiosClient.post(`/lists/${id}/like`).then((r) => r.data),
};

export const usersApi = {
  profile: (username) => axiosClient.get(`/users/${username}`).then((r) => r.data),
  updateMe: (payload) => axiosClient.patch('/users/me', payload).then((r) => r.data),
  toggleFollow: (userId) => axiosClient.post(`/users/${userId}/follow`).then((r) => r.data),
  feed: () => axiosClient.get('/feed').then((r) => r.data),
};

export const adminApi = {
  stats: () => axiosClient.get('/admin/stats').then((r) => r.data),
  reports: () => axiosClient.get('/admin/reports').then((r) => r.data),
  moderateReview: (reviewId, action) =>
    axiosClient.patch(`/admin/reviews/${reviewId}/moderate`, { action }).then((r) => r.data),
  users: (params) => axiosClient.get('/admin/users', { params }).then((r) => r.data),
  createUser: (payload) => axiosClient.post('/admin/users', payload).then((r) => r.data),
  updateUserStatus: (userId, payload) =>
    axiosClient.patch(`/admin/users/${userId}/status`, payload).then((r) => r.data),
  deleteUser: (userId) => axiosClient.delete(`/admin/users/${userId}`).then((r) => r.data),
};
