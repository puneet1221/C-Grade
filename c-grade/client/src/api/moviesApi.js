import { axiosClient } from './axiosClient.js';

export const moviesApi = {
  list: (params) => axiosClient.get('/movies', { params }).then((r) => r.data),
  featured: () => axiosClient.get('/movies/featured').then((r) => r.data),
  trending: () => axiosClient.get('/movies/trending').then((r) => r.data),
  detail: (slugOrId) => axiosClient.get(`/movies/${slugOrId}`).then((r) => r.data),
  create: (payload) => axiosClient.post('/movies', payload).then((r) => r.data),
  update: (id, payload) => axiosClient.patch(`/movies/${id}`, payload).then((r) => r.data),
  remove: (id) => axiosClient.delete(`/movies/${id}`).then((r) => r.data),
  searchTmdb: (q) => axiosClient.get('/movies/search/tmdb', { params: { q } }).then((r) => r.data),
  importTmdb: (tmdbId) => axiosClient.post(`/movies/import/tmdb/${tmdbId}`).then((r) => r.data),
  syncTmdb: () => axiosClient.post('/movies/sync/tmdb').then((r) => r.data),
};
