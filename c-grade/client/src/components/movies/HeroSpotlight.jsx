import { Bookmark, Check, ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatRuntime, formatYear } from '../../utils/formatters.js';
import { CinemaImage } from '../ui/CinemaImage.jsx';

/**
 * Auto-rotating Cinematic Hero Spotlight featuring Ken Burns motion,
 * measured obsidian gradient scrim, trailer lightbox trigger, and one-click Watchlist toggle.
 */
export function HeroSpotlight({
  movies = [],
  watchlistIds = new Set(),
  onWatchTrailer,
  onToggleWatchlist,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (movies.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % movies.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movies.length) return null;

  const movie = movies[activeIndex % movies.length];
  const inWatchlist = watchlistIds.has(movie._id);

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#09090B]">
      <div className="relative h-[540px] w-full md:h-[620px]">
        <div key={movie._id} className="animate-ken-burns absolute inset-0">
          <CinemaImage
            src={movie.backdropUrl || movie.posterUrl}
            alt={`${movie.title} backdrop`}
            title={movie.title}
            className="h-full w-full object-cover opacity-70"
          />
        </div>

        {/* Measured obsidian gradient scrim & subtle Cinema Gold ambient glow */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/55 to-black/30"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#09090B]/95 via-[#09090B]/50 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-12 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 sm:px-6 md:pb-16">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2.5 text-xs font-medium text-zinc-300">
              <span className="text-amber-400">Spotlight Selection</span>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span>{movie.industry}</span>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span className="font-mono-tabular">{formatYear(movie.releaseDate)}</span>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span className="font-mono-tabular">{formatRuntime(movie.runtime)}</span>
              {movie.averageRating > 0 && (
                <>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="font-mono-tabular inline-flex items-center gap-1 text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true" />
                    {movie.averageRating.toFixed(1)}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl md:text-6xl">
              <Link to={`/movies/${movie.slug}`} className="transition-colors hover:text-amber-200">
                {movie.title}
              </Link>
            </h1>

            {movie.tagline && (
              <p className="mt-3 text-base italic text-amber-200/90 sm:text-lg">
                {movie.tagline}
              </p>
            )}

            <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              {movie.overview}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5 sm:gap-3">
              {movie.trailerUrl && (
                <button
                  type="button"
                  onClick={() => onWatchTrailer?.(movie)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 sm:h-11 sm:px-5"
                >
                  <Play className="h-4 w-4 fill-zinc-950" aria-hidden="true" />
                  Watch Trailer
                </button>
              )}

              <button
                type="button"
                onClick={() => onToggleWatchlist?.(movie)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 sm:h-11 sm:px-5 ${
                  inWatchlist
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                    : 'border-white/15 bg-zinc-900/75 text-zinc-100 hover:border-white/30 hover:bg-zinc-900'
                }`}
              >
                {inWatchlist ? (
                  <Check className="h-4 w-4 text-amber-400" aria-hidden="true" />
                ) : (
                  <Bookmark className="h-4 w-4" aria-hidden="true" />
                )}
                {inWatchlist ? 'In Watchlist' : '+ Watchlist'}
              </button>

              <Link
                to={`/movies/${movie.slug}`}
                className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-50 whitespace-nowrap shrink-0 sm:h-11 sm:px-4"
              >
                Film Details
              </Link>
            </div>
          </div>

          {movies.length > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {movies.map((m, idx) => (
                  <button
                    key={m._id}
                    type="button"
                    aria-label={`Show spotlight ${m.title}`}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeIndex ? 'w-8 bg-amber-400' : 'w-3 bg-white/25 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous spotlight film"
                  onClick={() => setActiveIndex((prev) => (prev - 1 + movies.length) % movies.length)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-900/70 text-zinc-300 transition-colors hover:border-amber-400/50 hover:text-zinc-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next spotlight film"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % movies.length)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-900/70 text-zinc-300 transition-colors hover:border-amber-400/50 hover:text-zinc-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
