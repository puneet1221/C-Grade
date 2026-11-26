import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Film, Search, User as UserIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { moviesApi } from '../../api/moviesApi.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { formatYear } from '../../utils/formatters.js';
import { CinemaImage } from '../ui/CinemaImage.jsx';

/**
 * Command Palette (Cmd/Ctrl + K) offering instant debounced live search across
 * movies, directors, cast members, and cinephile profiles.
 */
export function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 240);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleShortcut(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onClose('toggle');
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
    }
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ['command-search', debouncedQuery],
    queryFn: () =>
      moviesApi.list({
        q: debouncedQuery.trim(),
        limit: 6,
        includeUsers: 'true',
      }),
    enabled: open && debouncedQuery.trim().length > 0,
  });

  const movies = data?.data?.movies || [];
  const users = data?.data?.users || [];

  function goTo(path) {
    onClose();
    navigate(path);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20 sm:pt-28" role="dialog" aria-modal="true" aria-label="Search C-Grade">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.16 }}
            className="glass-surface relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              <Search className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    e.preventDefault();
                    goTo(`/explore?q=${encodeURIComponent(query.trim())}`);
                  }
                }}
                placeholder="Search any film globally, directors, cast, or @members..."
                aria-label="Search films, directors, cast, or members"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3">
              {!debouncedQuery.trim() ? (
                <div className="px-3 py-8 text-center text-sm text-zinc-400">
                  Search any title worldwide like <span className="text-zinc-200">Inception</span> or{' '}
                  <span className="text-zinc-200">Maharaja</span>, a director, or a member handle.
                </div>
              ) : isFetching ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="skeleton-shimmer h-14 rounded-xl" />
                  ))}
                </div>
              ) : movies.length === 0 && users.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-zinc-400">
                  No films or members matched "{debouncedQuery}".
                </div>
              ) : (
                <div className="space-y-4">
                  {movies.length > 0 && (
                    <div>
                      <p className="px-3 pb-2 text-xs font-medium text-zinc-400">Films</p>
                      <div className="space-y-1">
                        {movies.map((movie) => {
                          const metaLine = [
                            movie.releaseDate ? formatYear(movie.releaseDate) : '',
                            movie.director,
                            movie.industry,
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return (
                            <button
                              key={movie._id}
                              type="button"
                              onClick={() => goTo(`/movies/${movie.slug}`)}
                              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/10"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="h-12 w-8 shrink-0 overflow-hidden rounded border border-white/10 bg-zinc-900">
                                  <CinemaImage
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    title={movie.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-zinc-100">{movie.title}</p>
                                  <p className="truncate text-xs text-zinc-400">
                                    {metaLine || movie.industry}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono-tabular shrink-0 text-xs font-medium text-amber-400">
                                {movie.averageRating > 0 ? `★ ${movie.averageRating.toFixed(1)}` : 'NR'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {users.length > 0 && (
                    <div>
                      <p className="px-3 pb-2 text-xs font-medium text-zinc-400">Members</p>
                      <div className="space-y-1">
                        {users.map((u) => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => goTo(`/u/${u.username}`)}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/10"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-amber-400">
                                <UserIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-zinc-100">{u.name}</p>
                                <p className="text-xs text-zinc-400">@{u.username}</p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {debouncedQuery.trim() && (
              <div className="border-t border-white/10 bg-zinc-950/70 px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => goTo(`/explore?q=${encodeURIComponent(debouncedQuery.trim())}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
                >
                  <Film className="h-3.5 w-3.5" aria-hidden="true" />
                  View all results in Explore
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
