import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { diaryApi } from '../api/domainApis.js';
import { moviesApi } from '../api/moviesApi.js';
import { HeroSpotlight } from '../components/movies/HeroSpotlight.jsx';
import { MovieRow } from '../components/movies/MovieRow.jsx';
import { TrailerModal } from '../components/movies/TrailerModal.jsx';
import { HeroSkeleton, MovieGridSkeleton } from '../components/ui/Skeletons.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { GENRES } from '../utils/constants.js';

/**
 * Home discovery page featuring Spotlight Hero, Trending, Top Rated, New Releases,
 * Genre quick-browse, and dedicated world cinema industry rows.
 */
export function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [trailerMovie, setTrailerMovie] = useState(null);
  const genreScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateGenreScrollState = useCallback(() => {
    const el = genreScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateGenreScrollState();
    window.addEventListener('resize', updateGenreScrollState);
    return () => window.removeEventListener('resize', updateGenreScrollState);
  }, [updateGenreScrollState]);

  function scrollGenres(direction) {
    const el = genreScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 260, behavior: 'smooth' });
  }

  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['movies', 'featured'],
    queryFn: () => moviesApi.featured(),
  });

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['movies', 'trending'],
    queryFn: () => moviesApi.trending(),
  });

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['movies', 'home-catalog'],
    queryFn: () => moviesApi.list({ limit: 48, sort: 'top-rated' }),
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
    },
    onError: () => toast.error('Could not update watchlist'),
  });

  const watchedMutation = useMutation({
    mutationFn: (movieId) => diaryApi.markWatched(movieId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['diary', 'me'] });
    },
    onError: () => toast.error('Could not update watch diary'),
  });

  function handleToggleWatchlist(movie) {
    if (!isAuthenticated) {
      toast.info('Sign in to save films to your watchlist');
      navigate('/login');
      return;
    }
    watchlistMutation.mutate(movie._id);
  }

  function handleToggleWatched(movie) {
    if (!isAuthenticated) {
      toast.info('Sign in to log films in your watch diary');
      navigate('/login');
      return;
    }
    watchedMutation.mutate(movie._id);
  }

  const featured = featuredData?.data?.movies || [];
  const trending = (trendingData?.data?.movies || []).slice(0, 6);
  const allMovies = catalogData?.data?.movies || [];

  const topRated = useMemo(
    () => [...allMovies].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6),
    [allMovies]
  );

  const newReleases = useMemo(
    () =>
      [...allMovies]
        .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
        .slice(0, 6),
    [allMovies]
  );

  const hollywood = useMemo(
    () => allMovies.filter((m) => m.industry === 'Hollywood').slice(0, 6),
    [allMovies]
  );

  const bollywood = useMemo(
    () => allMovies.filter((m) => m.industry === 'Bollywood').slice(0, 6),
    [allMovies]
  );

  const southIndian = useMemo(
    () =>
      allMovies
        .filter((m) => ['Tamil', 'Telugu', 'Malayalam'].includes(m.industry))
        .slice(0, 6),
    [allMovies]
  );

  const eastAsian = useMemo(
    () =>
      allMovies
        .filter((m) => ['Korean', 'Japanese'].includes(m.industry))
        .slice(0, 6),
    [allMovies]
  );

  return (
    <div className="pb-10">
      {featuredLoading ? (
        <HeroSkeleton />
      ) : (
        <HeroSpotlight
          movies={featured}
          watchlistIds={watchlistIds}
          onWatchTrailer={(m) => setTrailerMovie(m)}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

      {/* Browse by Genre bar */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6" aria-label="Browse by genre">
        <div className="relative flex items-center">
          {canScrollLeft && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#09090B] via-[#09090B]/80 to-transparent"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => scrollGenres(-1)}
                aria-label="Scroll genres left"
                className="absolute left-0 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-zinc-900/95 text-zinc-200 shadow-lg backdrop-blur-md transition-colors hover:border-amber-500/60 hover:text-amber-300"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

          <div
            ref={genreScrollRef}
            onScroll={updateGenreScrollState}
            className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto scroll-smooth py-0.5"
          >
            {GENRES.filter((g) => g !== 'All').map((genre) => (
              <Link
                key={genre}
                to={`/explore?genre=${encodeURIComponent(genre)}`}
                className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-900/60 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-300"
              >
                {genre}
              </Link>
            ))}
          </div>

          {canScrollRight && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#09090B] via-[#09090B]/80 to-transparent"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => scrollGenres(1)}
                aria-label="Scroll genres right"
                className="absolute right-0 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-zinc-900/95 text-zinc-200 shadow-lg backdrop-blur-md transition-colors hover:border-amber-500/60 hover:text-amber-300"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </section>

      {trendingLoading || catalogLoading ? (
        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
          <MovieGridSkeleton count={6} />
          <MovieGridSkeleton count={6} />
        </div>
      ) : (
        <>
          <MovieRow
            title="Trending Now"
            subtitle="Most discussed and actively logged films this week"
            movies={trending}
            seeAllTo="/explore?sort=popular"
            watchlistIds={watchlistIds}
            watchedIds={watchedIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleWatched={handleToggleWatched}
          />

          <MovieRow
            title="Top Rated on C-Grade"
            subtitle="Highest community scores across every era"
            movies={topRated}
            seeAllTo="/explore?sort=top-rated"
            watchlistIds={watchlistIds}
            watchedIds={watchedIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleWatched={handleToggleWatched}
          />

          <MovieRow
            title="New & Recent Releases"
            subtitle="Fresh theatrical arrivals and recent premieres"
            movies={newReleases}
            seeAllTo="/explore?sort=newest"
            watchlistIds={watchlistIds}
            watchedIds={watchedIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleWatched={handleToggleWatched}
          />

          <MovieRow
            title="South Indian Cinema"
            subtitle="Tamil, Telugu, and Malayalam acclaimed storytelling"
            movies={southIndian}
            seeAllTo="/explore?industry=Tamil"
            watchlistIds={watchlistIds}
            watchedIds={watchedIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleWatched={handleToggleWatched}
          />

          <MovieRow
            title="Bollywood Spotlight"
            subtitle="Atmospheric Hindi thrillers, satire, and folk epics"
            movies={bollywood}
            seeAllTo="/explore?industry=Bollywood"
            watchlistIds={watchlistIds}
            watchedIds={watchedIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleWatched={handleToggleWatched}
          />

          <MovieRow
            title="Korean & Japanese Cinema"
            subtitle="Masterworks from Seoul and Tokyo"
            movies={eastAsian}
            seeAllTo="/explore?industry=Korean"
            watchlistIds={watchlistIds}
            watchedIds={watchedIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleWatched={handleToggleWatched}
          />

          <MovieRow
            title="Hollywood Features"
            subtitle="Widescreen epics and precision character dramas"
            movies={hollywood}
            seeAllTo="/explore?industry=Hollywood"
            watchlistIds={watchlistIds}
            watchedIds={watchedIds}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleWatched={handleToggleWatched}
          />
        </>
      )}

      <TrailerModal
        movie={trailerMovie}
        open={Boolean(trailerMovie)}
        onClose={() => setTrailerMovie(null)}
      />
    </div>
  );
}
