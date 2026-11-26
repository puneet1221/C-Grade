import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Check, Clock, Eye, Lock, PenLine, Play, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { diaryApi } from '../api/domainApis.js';
import { moviesApi } from '../api/moviesApi.js';
import { reviewsApi } from '../api/reviewsApi.js';
import { RatingHistogram } from '../components/movies/RatingHistogram.jsx';
import { TrailerModal } from '../components/movies/TrailerModal.jsx';
import { ReviewCard } from '../components/reviews/ReviewCard.jsx';
import { ReviewFormModal } from '../components/reviews/ReviewFormModal.jsx';
import { CinemaImage } from '../components/ui/CinemaImage.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ReviewSkeleton } from '../components/ui/Skeletons.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { formatReleaseDate, formatRuntime, formatYear, isMovieReleased } from '../utils/formatters.js';

/**
 * Flagship Movie Detail page with parallax-style backdrop, 2:3 poster,
 * cast carousel, YouTube trailer lightbox, Recharts rating histogram,
 * and full review + nested discussion threads.
 */
export function MovieDetailPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [reviewSort, setReviewSort] = useState('helpful');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const { data: detailData, isLoading: detailLoading, isError } = useQuery({
    queryKey: ['movie-detail', slug],
    queryFn: () => moviesApi.detail(slug),
  });

  const movie = detailData?.data?.movie;
  const userDiary = detailData?.data?.userDiary;
  const userReview = detailData?.data?.userReview;

  useEffect(() => {
    if (movie?.slug && slug && slug !== movie.slug && /^tmdb-\d+$/i.test(slug)) {
      queryClient.setQueryData(['movie-detail', movie.slug], detailData);
      navigate(`/movies/${movie.slug}`, { replace: true });
    }
  }, [movie?.slug, slug, detailData, queryClient, navigate]);

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['movie-reviews', movie?._id, reviewSort],
    queryFn: () => reviewsApi.listForMovie(movie._id, { sort: reviewSort, limit: 20 }),
    enabled: Boolean(movie?._id),
  });

  const watchlistMutation = useMutation({
    mutationFn: () => diaryApi.toggleWatchlist(movie._id),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['movie-detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['diary', 'me'] });
    },
  });

  const watchedMutation = useMutation({
    mutationFn: () => diaryApi.markWatched(movie._id),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['movie-detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['diary', 'me'] });
    },
  });

  if (detailLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6">
        <div className="skeleton-shimmer h-80 w-full rounded-2xl" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="skeleton-shimmer h-64 rounded-2xl" />
          <div className="space-y-4 lg:col-span-2">
            <ReviewSkeleton />
            <ReviewSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="Film not found"
          description="This title may have been removed or the URL is incorrect."
          actionLabel="Explore Catalog"
          actionTo="/explore"
        />
      </div>
    );
  }

  const inWatchlist = userDiary?.status === 'watchlist';
  const isWatched = userDiary?.status === 'watched';
  const reviews = reviewsData?.data?.reviews || [];
  const released = isMovieReleased(movie);

  return (
    <div className="pb-16">
      {/* Full-bleed atmospheric backdrop */}
      <div className="relative overflow-hidden border-b border-white/10 bg-[#09090B]">
        <div className="absolute inset-0 h-[440px]">
          <CinemaImage
            src={movie.backdropUrl || movie.posterUrl}
            alt={`${movie.title} backdrop`}
            title={movie.title}
            className="h-full w-full object-cover opacity-45"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/75 to-black/35"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -top-10 left-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
            aria-hidden="true"
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6 md:pt-28">
          <div className="flex flex-col gap-8 md:flex-row md:items-end">
            {/* 2:3 Poster */}
            <div className="w-48 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-2xl sm:w-56">
              <div className="aspect-[2/3]">
                <CinemaImage
                  src={movie.posterUrl}
                  alt={`${movie.title} poster`}
                  title={movie.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Film Header & Primary Actions */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-300">
                <Link
                  to={`/explore?industry=${encodeURIComponent(movie.industry)}`}
                  className="text-amber-400 hover:text-amber-300"
                >
                  {movie.industry}
                </Link>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  {released ? formatYear(movie.releaseDate) : `Releases ${formatReleaseDate(movie.releaseDate)}`}
                </span>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono-tabular">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                  {formatRuntime(movie.runtime)}
                </span>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span>{movie.language}</span>
              </div>

              <h1 className="font-display text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="mt-2.5 text-base italic text-amber-200/90">{movie.tagline}</p>
              )}

              <p className="mt-3 text-sm text-zinc-300">
                Directed by <span className="font-semibold text-zinc-100">{movie.director}</span>
                {movie.genres?.length > 0 && (
                  <>
                    <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
                    <span className="text-zinc-400">{movie.genres.join(' · ')}</span>
                  </>
                )}
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                {movie.overview}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {released || userReview ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast.info('Sign in to publish a review');
                        navigate('/login');
                        return;
                      }
                      setEditingReview(userReview || null);
                      setReviewModalOpen(true);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
                  >
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                    {userReview ? 'Edit Your Review' : 'Write a Review'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Reviews unlock after the film is released"
                    className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-4 text-sm font-medium text-zinc-400 whitespace-nowrap shrink-0"
                  >
                    <Lock className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                    Reviews Open on Release
                  </button>
                )}

                {movie.trailerUrl && (
                  <button
                    type="button"
                    onClick={() => setTrailerOpen(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-zinc-900/80 px-4 text-sm font-medium text-zinc-100 transition-colors hover:border-amber-500/40 whitespace-nowrap shrink-0"
                  >
                    <Play className="h-4 w-4 fill-zinc-100" aria-hidden="true" />
                    Watch Trailer
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) return navigate('/login');
                    watchlistMutation.mutate();
                  }}
                  className={`inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    inWatchlist
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                      : 'border-white/15 bg-zinc-900/80 text-zinc-200 hover:border-white/30'
                  }`}
                >
                  {inWatchlist ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {inWatchlist ? 'In Watchlist' : 'Watchlist'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) return navigate('/login');
                    watchedMutation.mutate();
                  }}
                  className={`inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isWatched
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/15 bg-zinc-900/80 text-zinc-200 hover:border-white/30'
                  }`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {isWatched ? 'Watched' : 'Mark Watched'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid: Ratings Hub & Cast + Reviews */}
      <div className="mx-auto mt-10 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12">
        <aside className="space-y-8 lg:col-span-4">
          <RatingHistogram
            averageRating={movie.averageRating}
            ratingsCount={movie.ratingsCount}
            ratingDistribution={movie.ratingDistribution}
          />

          {movie.cast?.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <Users className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-zinc-100">Principal Cast</h2>
              </div>
              <div className="space-y-3">
                {movie.cast.map((member, idx) => (
                  <div key={`${member.name}-${idx}`} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800 text-xs font-semibold text-amber-400">
                      {member.profileUrl ? (
                        <CinemaImage
                          src={member.profileUrl}
                          alt={member.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">{member.name}</p>
                      {member.character && (
                        <p className="truncate text-xs text-zinc-400">{member.character}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="lg:col-span-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <h2 className="font-display text-2xl font-semibold text-zinc-50">
              Reviews & Discussions
            </h2>

            <div className="flex items-center gap-2">
              <label htmlFor="review-sort" className="text-xs text-zinc-400">
                Sort by
              </label>
              <select
                id="review-sort"
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 focus:border-amber-500/60 focus:outline-none"
              >
                <option value="helpful">Most Helpful</option>
                <option value="newest">Newest</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="space-y-4">
              <ReviewSkeleton />
              <ReviewSkeleton />
            </div>
          ) : reviews.length === 0 ? (
            released ? (
              <EmptyState
                title="No reviews yet"
                description={`Be the first cinephile to share a half-star verdict on ${movie.title}.`}
                actionLabel="Write First Review"
                onAction={() => {
                  if (!isAuthenticated) return navigate('/login');
                  setEditingReview(null);
                  setReviewModalOpen(true);
                }}
              />
            ) : (
              <EmptyState
                title="Reviews open on release"
                description={
                  movie.releaseDate
                    ? `${movie.title} has not been released yet. Community reviews will unlock on ${formatReleaseDate(movie.releaseDate)}.`
                    : `${movie.title} does not have a confirmed release date yet. Reviews will unlock once released.`
                }
              />
            )
          ) : (
            <div className="space-y-5">
              {reviews.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  movieId={movie._id}
                  onEdit={(rev) => {
                    setEditingReview(rev);
                    setReviewModalOpen(true);
                  }}
                  onDeleted={() => {
                    queryClient.invalidateQueries({ queryKey: ['movie-detail', slug] });
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <TrailerModal
        movie={movie}
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
      />

      <ReviewFormModal
        open={reviewModalOpen && (released || Boolean(editingReview))}
        onClose={() => setReviewModalOpen(false)}
        movie={movie}
        existingReview={editingReview}
      />
    </div>
  );
}
