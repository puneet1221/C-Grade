import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { reviewsApi } from '../../api/reviewsApi.js';
import { MOOD_TAGS } from '../../utils/constants.js';
import { HalfStarRating } from '../ui/HalfStarRating.jsx';
import { Modal } from '../ui/Modal.jsx';

/**
 * Create/Edit review modal with interactive half-star selector, mood tags,
 * spoiler toggle, watched date, and rewatch toggle.
 */
export function ReviewFormModal({ open, onClose, movie, existingReview = null, onSaved }) {
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(4.0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [watchedDate, setWatchedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRewatch, setIsRewatch] = useState(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 4.0);
      setTitle(existingReview.title || '');
      setBody(existingReview.body || '');
      setTags(existingReview.tags || []);
      setContainsSpoilers(Boolean(existingReview.containsSpoilers));
      setWatchedDate(
        existingReview.watchedDate
          ? new Date(existingReview.watchedDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setIsRewatch(Boolean(existingReview.isRewatch));
    } else if (open) {
      setRating(4.0);
      setTitle('');
      setBody('');
      setTags([]);
      setContainsSpoilers(false);
      setWatchedDate(new Date().toISOString().slice(0, 10));
      setIsRewatch(false);
    }
  }, [existingReview, open]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      existingReview
        ? reviewsApi.update(existingReview._id, payload)
        : reviewsApi.create(movie._id, payload),
    onSuccess: (res) => {
      toast.success(existingReview ? 'Review updated' : 'Review published');
      queryClient.invalidateQueries({ queryKey: ['movie-detail'] });
      queryClient.invalidateQueries({ queryKey: ['movie-reviews', movie._id] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      onSaved?.(res.data);
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save review');
    },
  });

  function toggleTag(tag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 4 ? [...prev, tag] : prev
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (body.trim().length < 10) {
      toast.error('Please write at least 10 characters for your review');
      return;
    }
    mutation.mutate({
      rating,
      title: title.trim(),
      body: body.trim(),
      tags,
      containsSpoilers,
      watchedDate,
      isRewatch,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existingReview ? `Edit Review — ${movie?.title}` : `Review ${movie?.title}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <span className="mb-2 block text-xs font-medium text-zinc-400">Your Rating</span>
          <HalfStarRating value={rating} onChange={setRating} size="lg" showVerdict />
        </div>

        <div>
          <label htmlFor="review-headline" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Headline (optional)
          </label>
          <input
            id="review-headline"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your verdict in one line..."
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="review-body" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Review
          </label>
          <textarea
            id="review-body"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts on direction, cinematography, performances, and pacing..."
            className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3.5 text-sm leading-relaxed text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium text-zinc-400">
            Mood & Craft Tags (up to 4)
          </span>
          <div className="flex flex-wrap gap-2">
            {MOOD_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'border-amber-500/70 bg-amber-500/15 text-amber-300'
                      : 'border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="watched-date" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Watched On
            </label>
            <input
              id="watched-date"
              type="date"
              value={watchedDate}
              onChange={(e) => setWatchedDate(e.target.value)}
              className="font-mono-tabular w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div className="flex flex-col justify-end gap-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={containsSpoilers}
                onChange={(e) => setContainsSpoilers(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-zinc-950 accent-amber-500"
              />
              Contains Spoilers (blur with Spoiler Shield)
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isRewatch}
                onChange={(e) => setIsRewatch(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-zinc-950 accent-amber-500"
              />
              I have watched this film before (Rewatch)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : existingReview ? 'Update Review' : 'Publish Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
