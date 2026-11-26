import { axiosClient } from './axiosClient.js';

export const reviewsApi = {
  listForMovie: (movieId, params) => axiosClient.get(`/movies/${movieId}/reviews`, { params }).then((r) => r.data),
  create: (movieId, payload) => axiosClient.post(`/movies/${movieId}/reviews`, payload).then((r) => r.data),
  update: (reviewId, payload) => axiosClient.patch(`/reviews/${reviewId}`, payload).then((r) => r.data),
  remove: (reviewId) => axiosClient.delete(`/reviews/${reviewId}`).then((r) => r.data),
  toggleLike: (reviewId) => axiosClient.post(`/reviews/${reviewId}/like`).then((r) => r.data),
  report: (reviewId, reason) => axiosClient.post(`/reviews/${reviewId}/report`, { reason }).then((r) => r.data),
  listComments: (reviewId) => axiosClient.get(`/reviews/${reviewId}/comments`).then((r) => r.data),
  createComment: (reviewId, payload) => axiosClient.post(`/reviews/${reviewId}/comments`, payload).then((r) => r.data),
  deleteComment: (commentId) => axiosClient.delete(`/comments/${commentId}`).then((r) => r.data),
};
