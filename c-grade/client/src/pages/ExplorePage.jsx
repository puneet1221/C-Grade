import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { diaryApi } from '../api/domainApis.js';
import { moviesApi } from '../api/moviesApi.js';
import { MovieCard } from '../components/movies/MovieCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { MovieGridSkeleton } from '../components/ui/Skeletons.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { GENRES, INDUSTRIES } from '../utils/constants.js';

/**
 * Explore catalog page with debounced search and URL-synced multi-faceted
 * filtering across genre, cinema industry, release years, minimum rating, and sort order.
 */
export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const debouncedSearch = useDebounce(searchInput, 280);

  const genre = searchParams.get('genre') || 'All';
  const industry = searchParams.get('industry') || 'All';
  const sort = searchParams.get('sort') || 'popular';
  const minRating = searchParams.get('minRating') || '';
  const yearFrom = searchParams.get('yearFrom') || '';
  const yearTo = searchParams.get('yearTo') || '';
  const page = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    if (urlQ !== searchInput) {
      setSearchInput(urlQ);
    }
    // Sync when navigating via header or footer links
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('q')]);

  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    if (debouncedSearch !== currentQ) {
      const next = new URLSearchParams(searchParams);
      if (debouncedSearch.trim()) next.set('q', debouncedSearch.trim());
      else next.delete('q');
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All') {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next);
  }

  function resetFilters() {
    setSearchInput('');
    setSearchParams({});
  }

  const { data, isLoading } = useQuery({
    queryKey: ['movies', 'explore', { q: debouncedSearch, genre, industry, sort, minRating, yearFrom, yearTo, page }],
    queryFn: () =>
      moviesApi.list({
        q: debouncedSearch || undefined,
        genre: genre !== 'All' ? genre : undefined,
        industry: industry !== 'All' ? industry : undefined,
        sort,
        minRating: minRating || undefined,
        yearFrom: yearFrom || undefined,
        yearTo: yearTo || undefined,
        page,
        limit: 12,
      }),
  });

  const { data: diaryData } = useQuery({
    queryKey: ['diary', 'me'],
    queryFn: () => diaryApi.getMine(),
    enabled: isAuthenticated,
  });

  const watchlistIds = useMemo(
    () => new Set((diaryData?.data?.watchlist || []).map((i) => i.movie?._id).filter(Boolean)),
    [diaryData]
  );

  const watchedIds = useMemo(
    () => new Set((diaryData?.data?.watched || []).map((i) => i.movie?._id).filter(Boolean)),
    [diaryData]
  );

  const watchlistMutation = useMutation({
    mutationFn: (movieId) => diaryApi.toggleWatchlist(movieId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['diary', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['movies', 'explore'] });
    },
  });

  const watchedMutation = useMutation({
    mutationFn: (movieId) => diaryApi.markWatched(movieId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['diary', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['movies', 'explore'] });
    },
  });

  const movies = data?.data?.movies || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
          Explore Cinema
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Search across C-Grade and the global TMDB archive, or filter by industry, genre, release era, and community ratings.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 sm:p-5 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Title, director, or cast..."
            aria-label="Search films"
            className="h-10 w-full rounded-lg border border-white/10 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Filter by industry"
            value={industry}
            onChange={(e) => updateParam('industry', e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind === 'All' ? 'All Industries' : ind}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Filter by genre"
            value={genre}
            onChange={(e) => updateParam('genre', e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g === 'All' ? 'All Genres' : g}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Filter by minimum rating"
            value={minRating}
            onChange={(e) => updateParam('minRating', e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          >
            <option value="">Any Rating</option>
            <option value="4.5">4.5+ Masterpieces</option>
            <option value="4">4.0+ Essential</option>
            <option value="3.5">3.5+ Very Good</option>
            <option value="3">3.0+ Solid</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Sort films"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          >
            <option value="popular">Most Popular</option>
            <option value="top-rated">Top Rated</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Classics First</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 lg:col-span-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400">Release Year:</span>
            <input
              type="number"
              min="1900"
              max="2030"
              placeholder="From"
              aria-label="Release year from"
              value={yearFrom}
              onChange={(e) => updateParam('yearFrom', e.target.value)}
              className="font-mono-tabular h-8 w-24 rounded-md border border-white/10 bg-zinc-950 px-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
            <span className="text-zinc-600">—</span>
            <input
              type="number"
              min="1900"
              max="2030"
              placeholder="To"
              aria-label="Release year to"
              value={yearTo}
              onChange={(e) => updateParam('yearTo', e.target.value)}
              className="font-mono-tabular h-8 w-24 rounded-md border border-white/10 bg-zinc-950 px-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono-tabular text-xs text-zinc-400">
              {meta.total} {meta.total === 1 ? 'film' : 'films'}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-amber-400"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Results grid */}
      {isLoading ? (
        <MovieGridSkeleton count={12} />
      ) : movies.length === 0 ? (
        <EmptyState
          title="No films match those filters"
          description="Try broadening your release year range, switching cinema industries, or clearing your search query."
          actionLabel="Reset All Filters"
          onAction={resetFilters}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {movies.map((movie) => (
              <MovieCard
                key={movie._id}
                movie={movie}
                inWatchlist={watchlistIds.has(movie._id)}
                isWatched={watchedIds.has(movie._id)}
                onToggleWatchlist={(m) => {
                  if (!isAuthenticated) return navigate('/login');
                  watchlistMutation.mutate(m._id);
                }}
                onToggleWatched={(m) => {
                  if (!isAuthenticated) return navigate('/login');
                  watchedMutation.mutate(m._id);
                }}
              />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={meta.page <= 1}
                onClick={() => updateParam('page', meta.page - 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-200 hover:border-amber-500/40 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="font-mono-tabular text-xs text-zinc-400">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={meta.page >= meta.totalPages}
                onClick={() => updateParam('page', meta.page + 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-200 hover:border-amber-500/40 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
