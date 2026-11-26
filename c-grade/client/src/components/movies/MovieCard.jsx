import { Bookmark, Check, Eye, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatYear } from '../../utils/formatters.js';
import { CinemaImage } from '../ui/CinemaImage.jsx';

/**
 * Tactile 2:3 film poster card with hover elevation, subtle gold hairline glow,
 * floating quick-action bar, and clean unboxed metadata.
 */
export function MovieCard({
  movie,
  inWatchlist = false,
  isWatched = false,
  onToggleWatchlist,
  onToggleWatched,
}) {
  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-amber-500/45 group-hover:shadow-[0_14px_32px_-12px_rgba(245,158,11,0.28)]">
        <Link to={`/movies/${movie.slug}`} className="block h-full w-full" aria-label={`View ${movie.title}`}>
          <CinemaImage
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            title={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Bottom gradient scrim for score readability */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
          aria-hidden="true"
        />

        {/* Score readout */}
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold backdrop-blur-md">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="font-mono-tabular text-zinc-100">
            {movie.averageRating > 0 ? movie.averageRating.toFixed(1) : 'NR'}
          </span>
        </div>

        {/* Floating quick-action bar */}
        {(onToggleWatchlist || onToggleWatched) && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {onToggleWatchlist && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleWatchlist(movie);
                }}
                aria-label={inWatchlist ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
                title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-md transition-colors ${
                  inWatchlist
                    ? 'border-amber-400/60 bg-amber-500 text-zinc-950'
                    : 'border-white/15 bg-black/70 text-zinc-200 hover:border-amber-400/50 hover:text-amber-300'
                }`}
              >
                {inWatchlist ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </button>
            )}
            {onToggleWatched && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleWatched(movie);
                }}
                aria-label={isWatched ? `Unmark ${movie.title} as watched` : `Mark ${movie.title} as watched`}
                title={isWatched ? 'Watched' : 'Mark Watched'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-md transition-colors ${
                  isWatched
                    ? 'border-emerald-400/60 bg-emerald-500 text-zinc-950'
                    : 'border-white/15 bg-black/70 text-zinc-200 hover:border-emerald-400/50 hover:text-emerald-300'
                }`}
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unboxed editorial metadata */}
      <div className="mt-2.5 min-w-0">
        <Link
          to={`/movies/${movie.slug}`}
          className="block truncate text-sm font-semibold text-zinc-100 transition-colors hover:text-amber-400"
        >
          {movie.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-zinc-400">
          <span className="font-mono-tabular">{formatYear(movie.releaseDate)}</span>
          <span aria-hidden="true"> · </span>
          <span>{movie.industry}</span>
        </p>
      </div>
    </article>
  );
}
