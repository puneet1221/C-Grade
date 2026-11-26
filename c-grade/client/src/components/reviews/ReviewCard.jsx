import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CornerDownRight,
  Edit3,
  Eye,
  Flag,
  MessageSquare,
  RotateCcw,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { reviewsApi } from '../../api/reviewsApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { formatDate } from '../../utils/formatters.js';
import { HalfStarRating } from '../ui/HalfStarRating.jsx';
import { Modal } from '../ui/Modal.jsx';

/**
 * Editorial review card featuring Spoiler Shield blur toggle, Helpful voting,
 * 1-level nested comment threads, author edit/delete, and report modal.
 */
export function ReviewCard({ review, movieId, onEdit, onDeleted }) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isAuthor = Boolean(user && review.author?._id === user._id);
  const canModify = isAuthor || isAdmin;
  const hasLiked = Boolean(user && review.likes?.includes(user._id));

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['review-comments', review._id],
    queryFn: () => reviewsApi.listComments(review._id),
    enabled: commentsOpen,
  });

  const comments = commentsData?.data?.comments || [];

  const likeMutation = useMutation({
    mutationFn: () => reviewsApi.toggleLike(review._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie-reviews', movieId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Sign in to vote helpful');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => reviewsApi.remove(review._id),
    onSuccess: () => {
      toast.success('Review deleted');
      queryClient.invalidateQueries({ queryKey: ['movie-reviews', movieId] });
      onDeleted?.();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not delete review');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (payload) => reviewsApi.createComment(review._id, payload),
    onSuccess: () => {
      setCommentText('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['review-comments', review._id] });
      queryClient.invalidateQueries({ queryKey: ['movie-reviews', movieId] });
      toast.success('Comment posted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => reviewsApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', review._id] });
      queryClient.invalidateQueries({ queryKey: ['movie-reviews', movieId] });
      toast.success('Comment removed');
    },
  });

  const reportMutation = useMutation({
    mutationFn: (reason) => reviewsApi.report(review._id, reason),
    onSuccess: () => {
      setReportOpen(false);
      setReportReason('');
      toast.success('Review flagged for moderation');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not submit report');
    },
  });

  function handleCommentSubmit(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to join the discussion');
      return;
    }
    if (!commentText.trim()) return;
    commentMutation.mutate({
      body: commentText.trim(),
      parentComment: replyTo?._id || null,
    });
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 transition-colors hover:border-white/15">
      {/* Author header & rating */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/u/${review.author?.username}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-sm font-semibold text-amber-400"
          >
            {review.author?.name?.charAt(0)?.toUpperCase() || 'C'}
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm">
              <Link
                to={`/u/${review.author?.username}`}
                className="font-semibold text-zinc-100 hover:text-amber-400"
              >
                {review.author?.name || 'Member'}
              </Link>
              <span className="text-zinc-500" aria-hidden="true">·</span>
              <span className="text-xs text-zinc-400">@{review.author?.username}</span>
              {review.author?.role === 'critic' && (
                <>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-xs font-medium text-amber-400">Critic</span>
                </>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span>{formatDate(review.watchedDate || review.createdAt)}</span>
              {review.isRewatch && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-zinc-300">
                    <RotateCcw className="h-3 w-3 text-amber-400" aria-hidden="true" />
                    Rewatch
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <HalfStarRating value={review.rating} readOnly size="sm" showVerdict />
      </div>

      {/* Review headline & tags (unboxed metadata) */}
      {review.title && (
        <h3 className="font-display mt-4 text-lg font-semibold text-zinc-100">{review.title}</h3>
      )}

      {review.tags?.length > 0 && (
        <p className="mt-2 text-xs font-medium text-amber-300/90">
          {review.tags.join(' · ')}
        </p>
      )}

      {/* Review body with Spoiler Shield */}
      <div className="relative mt-3">
        {review.containsSpoilers && !spoilerRevealed ? (
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <p className="select-none text-sm leading-relaxed text-zinc-300 blur-md" aria-hidden="true">
              {review.body}
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setSpoilerRevealed(true)}
                className="glass-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-amber-300 transition-colors hover:border-amber-400/50 hover:text-amber-200"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Contains Spoilers — Click to Reveal
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">{review.body}</p>
        )}
      </div>

      {/* Engagement bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                toast.error('Sign in to vote helpful');
                return;
              }
              likeMutation.mutate();
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
              hasLiked ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-amber-400/20' : ''}`} aria-hidden="true" />
            <span className="font-mono-tabular">{review.likesCount || 0}</span>
            <span>Helpful</span>
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen((prev) => !prev)}
            aria-expanded={commentsOpen}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="font-mono-tabular">{review.commentsCount || 0}</span>
            <span>Comments</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isAuthor && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(review)}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-amber-400"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
          )}
          {canModify && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </button>
          )}
          {!isAuthor && (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('Sign in to report a review');
                  return;
                }
                setReportOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-rose-400"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              Report
            </button>
          )}
        </div>
      </div>

      {/* 1-level nested comment thread */}
      {commentsOpen && (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          {commentsLoading ? (
            <div className="skeleton-shimmer h-16 rounded-xl" />
          ) : comments.length === 0 ? (
            <p className="text-xs text-zinc-500">No comments yet. Start the discussion below.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment._id} className="space-y-2 rounded-xl bg-zinc-950/60 p-3.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/u/${comment.author?.username}`}
                        className="font-semibold text-zinc-200 hover:text-amber-400"
                      >
                        {comment.author?.name}
                      </Link>
                      <span className="text-zinc-500">@{comment.author?.username}</span>
                      <span className="text-zinc-600" aria-hidden="true">·</span>
                      <span className="text-zinc-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAuthenticated && (
                        <button
                          type="button"
                          onClick={() => setReplyTo(comment)}
                          className="text-zinc-400 hover:text-amber-400"
                        >
                          Reply
                        </button>
                      )}
                      {(user?._id === comment.author?._id || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => deleteCommentMutation.mutate(comment._id)}
                          aria-label="Delete comment"
                          className="text-zinc-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">{comment.body}</p>

                  {comment.replies?.length > 0 && (
                    <div className="mt-2 space-y-2 border-t border-white/5 pl-4 pt-2">
                      {comment.replies.map((reply) => (
                        <div key={reply._id} className="flex items-start justify-between gap-2 text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <CornerDownRight className="h-3 w-3 text-amber-400" aria-hidden="true" />
                              <Link
                                to={`/u/${reply.author?.username}`}
                                className="font-semibold text-zinc-200 hover:text-amber-400"
                              >
                                {reply.author?.name}
                              </Link>
                              <span>·</span>
                              <span>{formatDate(reply.createdAt)}</span>
                            </div>
                            <p className="mt-1 pl-4 text-sm text-zinc-300">{reply.body}</p>
                          </div>
                          {(user?._id === reply.author?._id || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => deleteCommentMutation.mutate(reply._id)}
                              aria-label="Delete reply"
                              className="text-zinc-500 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="space-y-2">
            {replyTo && (
              <div className="flex items-center justify-between text-xs text-amber-300">
                <span>Replying to @{replyTo.author?.username}</span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancel reply
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isAuthenticated ? 'Add a comment to this review...' : 'Sign in to comment...'}
                aria-label="Write a comment"
                className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={commentMutation.isPending || !commentText.trim()}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {commentMutation.isPending ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Report Modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report Review"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (reportReason.trim().length < 4) {
              toast.error('Please describe the issue briefly');
              return;
            }
            reportMutation.mutate(reportReason.trim());
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor={`report-${review._id}`} className="mb-1.5 block text-sm font-medium text-zinc-300">
              Reason for moderation review
            </label>
            <textarea
              id={`report-${review._id}`}
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Unmarked major plot spoiler, spam, or abusive content..."
              className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reportMutation.isPending}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              Submit Report
            </button>
          </div>
        </form>
      </Modal>
    </article>
  );
}
