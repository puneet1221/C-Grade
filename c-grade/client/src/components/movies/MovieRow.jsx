import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MovieCard } from './MovieCard.jsx';

/**
 * Editorial section grid row for home discovery feeds and industry showcases.
 */
export function MovieRow({
  title,
  subtitle,
  movies = [],
  seeAllTo,
  watchlistIds = new Set(),
  watchedIds = new Set(),
  onToggleWatchlist,
  onToggleWatched,
}) {
  if (!movies.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        </div>
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300 whitespace-nowrap"
          >
            Explore All
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard
            key={movie._id}
            movie={movie}
            inWatchlist={watchlistIds.has(movie._id)}
            isWatched={watchedIds.has(movie._id)}
            onToggleWatchlist={onToggleWatchlist}
            onToggleWatched={onToggleWatched}
          />
        ))}
      </div>
    </section>
  );
}
