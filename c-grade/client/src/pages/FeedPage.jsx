import { useQuery } from '@tanstack/react-query';
import { Eye, MessageSquareQuote, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usersApi } from '../api/domainApis.js';
import { CinemaImage } from '../components/ui/CinemaImage.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { HalfStarRating } from '../components/ui/HalfStarRating.jsx';
import { ReviewSkeleton } from '../components/ui/Skeletons.jsx';
import { formatDate } from '../utils/formatters.js';

/**
 * Chronological Activity Feed of reviews, ratings, and watch diary logs
 * from followed critics and friends.
 */
export function FeedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => usersApi.feed(),
  });

  const events = data?.data?.events || [];
  const isCommunityFallback = data?.data?.isCommunityFallback;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
          Activity Feed
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {isCommunityFallback
            ? 'Showing community highlights. Follow critics and friends to personalize your screening feed.'
            : 'Latest ratings, reviews, and diary logs from critics and friends you follow.'}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <ReviewSkeleton />
          <ReviewSkeleton />
          <ReviewSkeleton />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Your feed is quiet"
          description="Explore films and follow critics whose taste resonates with yours."
          actionLabel="Explore Films"
          actionTo="/explore"
        />
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <article
              key={ev.id}
              className="flex gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-colors hover:border-white/20"
            >
              <Link
                to={`/movies/${ev.movie?.slug}`}
                className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950"
              >
                <CinemaImage
                  src={ev.movie?.posterUrl}
                  alt={ev.movie?.title}
                  title={ev.movie?.title}
                  className="h-full w-full object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  {ev.type === 'review' ? (
                    <MessageSquareQuote className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  )}
                  <Link
                    to={`/u/${ev.actor?.username}`}
                    className="font-semibold text-zinc-100 hover:text-amber-400"
                  >
                    {ev.actor?.name}
                  </Link>
                  <span>{ev.type === 'review' ? 'reviewed' : 'watched'}</span>
                  <Link
                    to={`/movies/${ev.movie?.slug}`}
                    className="font-semibold text-amber-300 hover:text-amber-200"
                  >
                    {ev.movie?.title}
                  </Link>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(ev.createdAt)}</span>
                </div>

                {ev.type === 'review' && ev.review && (
                  <div className="mt-2.5">
                    <HalfStarRating value={ev.review.rating} readOnly size="sm" showVerdict />
                    {ev.review.title && (
                      <h3 className="font-display mt-2 text-base font-semibold text-zinc-100">
                        {ev.review.title}
                      </h3>
                    )}
                    <p className="mt-1 line-clamp-3 text-sm text-zinc-300">
                      {ev.review.containsSpoilers
                        ? 'Spoiler-shielded review — open film page to reveal.'
                        : ev.review.body}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
