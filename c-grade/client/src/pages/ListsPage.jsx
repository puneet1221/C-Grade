import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Lock, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { listsApi } from '../api/domainApis.js';
import { moviesApi } from '../api/moviesApi.js';
import { CinemaImage } from '../components/ui/CinemaImage.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';

/**
 * Curated Lists index featuring stacked poster collage cards, like counts,
 * and an interactive list creator modal.
 */
export function ListsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [movieQuery, setMovieQuery] = useState('');
  const debouncedMovieQuery = useDebounce(movieQuery, 240);

  const { data, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => listsApi.list({ limit: 24 }),
  });

  const { data: movieSearchData } = useQuery({
    queryKey: ['list-movie-picker', debouncedMovieQuery],
    queryFn: () => moviesApi.list({ q: debouncedMovieQuery, limit: 8 }),
    enabled: createOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => listsApi.create(payload),
    onSuccess: (res) => {
      toast.success('Curated list published');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setSelectedMovies([]);
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      navigate(`/lists/${res.data.list.slug}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not create list'),
  });

  const likeMutation = useMutation({
    mutationFn: (id) => listsApi.toggleLike(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });

  const lists = data?.data?.lists || [];
  const pickerMovies = movieSearchData?.data?.movies || [];

  function addMovieToList(movie) {
    if (selectedMovies.some((m) => m._id === movie._id)) return;
    setSelectedMovies((prev) => [...prev, movie]);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Curated Lists
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Themed film canons, double features, and regional spotlights assembled by C-Grade members.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              toast.info('Sign in to curate a list');
              navigate('/login');
              return;
            }
            setCreateOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New List
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-shimmer h-72 rounded-2xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          title="No curated lists yet"
          description="Start the first themed collection of films."
          actionLabel="Create First List"
          onAction={() => (isAuthenticated ? setCreateOpen(true) : navigate('/login'))}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const liked = Boolean(user && list.likes?.includes(user._id));
            const previewMovies = (list.movies || []).slice(0, 4);

            return (
              <article
                key={list._id}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-colors hover:border-amber-500/40"
              >
                <div>
                  {/* Stacked poster collage */}
                  <Link
                    to={`/lists/${list.slug}`}
                    className="mb-4 grid h-40 grid-cols-4 gap-1.5 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-1.5"
                  >
                    {[0, 1, 2, 3].map((idx) => {
                      const film = previewMovies[idx];
                      return (
                        <div key={idx} className="h-full overflow-hidden rounded-lg bg-zinc-900">
                          {film ? (
                            <CinemaImage
                              src={film.posterUrl}
                              alt={film.title}
                              title={film.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-zinc-900/70" />
                          )}
                        </div>
                      );
                    })}
                  </Link>

                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/lists/${list.slug}`}
                      className="font-display text-xl font-semibold text-zinc-100 transition-colors hover:text-amber-400"
                    >
                      {list.title}
                    </Link>
                    {!list.isPublic && (
                      <Lock className="mt-1 h-4 w-4 shrink-0 text-zinc-400" aria-label="Private list" />
                    )}
                  </div>

                  {list.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{list.description}</p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Link to={`/u/${list.owner?.username}`} className="font-medium text-zinc-200 hover:text-amber-400">
                      @{list.owner?.username}
                    </Link>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{list.movies?.length || 0} films</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) return navigate('/login');
                      likeMutation.mutate(list._id);
                    }}
                    className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                      liked ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-amber-400' : ''}`} aria-hidden="true" />
                    <span className="font-mono-tabular">{list.likesCount || 0}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Curated List" maxWidth="max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 2) {
              toast.error('Enter a list title');
              return;
            }
            createMutation.mutate({
              title: title.trim(),
              description: description.trim(),
              isPublic,
              movies: selectedMovies.map((m) => m._id),
            });
          }}
          className="space-y-5"
        >
          <div>
            <label htmlFor="list-title" className="mb-1.5 block text-xs font-medium text-zinc-400">
              List Title
            </label>
            <input
              id="list-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Midnight Neo-Noir Double Features"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="list-desc" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Editorial Notes
            </label>
            <textarea
              id="list-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What connects these films?"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Add Films ({selectedMovies.length} selected)
            </span>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={movieQuery}
                onChange={(e) => setMovieQuery(e.target.value)}
                placeholder="Search catalog to add films..."
                className="w-full rounded-lg border border-white/10 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>

            {selectedMovies.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedMovies.map((m) => (
                  <span
                    key={m._id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200"
                  >
                    {m.title}
                    <button
                      type="button"
                      aria-label={`Remove ${m.title}`}
                      onClick={() => setSelectedMovies((prev) => prev.filter((item) => item._id !== m._id))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 p-2">
              {pickerMovies.map((m) => {
                const added = selectedMovies.some((s) => s._id === m._id);
                return (
                  <button
                    key={m._id}
                    type="button"
                    disabled={added}
                    onClick={() => addMovieToList(m)}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                  >
                    <span>
                      {m.title} <span className="text-zinc-500">({m.industry})</span>
                    </span>
                    <span className="text-amber-400">{added ? 'Added' : '+ Add'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Make this list public
          </label>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Publishing...' : 'Publish List'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
