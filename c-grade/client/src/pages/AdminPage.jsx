import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Download,
  Edit3,
  Film,
  Flag,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../api/domainApis.js';
import { moviesApi } from '../api/moviesApi.js';
import { CinemaImage } from '../components/ui/CinemaImage.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { INDUSTRIES } from '../utils/constants.js';
import { formatDate, formatYear } from '../utils/formatters.js';

const INITIAL_MOVIE_FORM = {
  title: '',
  tagline: '',
  overview: '',
  posterUrl: '',
  backdropUrl: '',
  trailerUrl: '',
  releaseDate: new Date().toISOString().slice(0, 10),
  runtime: 120,
  genres: 'Drama, Thriller',
  language: 'English',
  industry: 'Hollywood',
  director: '',
  featured: false,
};

/**
 * Admin Moderation & Hybrid Catalog Console:
 * KPI overview, TMDB one-click importer, manual Movie CRUD, and Flagged Review Moderation Queue.
 */
export function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('catalog');

  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbError, setTmdbError] = useState('');
  const [tmdbSearching, setTmdbSearching] = useState(false);

  const [movieModalOpen, setMovieModalOpen] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movieForm, setMovieForm] = useState(INITIAL_MOVIE_FORM);

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(),
  });

  const { data: moviesData, isLoading: moviesLoading } = useQuery({
    queryKey: ['admin-movies'],
    queryFn: () => moviesApi.list({ limit: 48, sort: 'newest' }),
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminApi.reports(),
  });

  const importMutation = useMutation({
    mutationFn: (tmdbId) => moviesApi.importTmdb(tmdbId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'TMDB import failed'),
  });

  const syncTmdbMutation = useMutation({
    mutationFn: () => moviesApi.syncTmdb(),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'TMDB sync failed'),
  });

  const saveMovieMutation = useMutation({
    mutationFn: (payload) =>
      editingMovieId ? moviesApi.update(editingMovieId, payload) : moviesApi.create(payload),
    onSuccess: (res) => {
      toast.success(res.message);
      setMovieModalOpen(false);
      setEditingMovieId(null);
      setMovieForm(INITIAL_MOVIE_FORM);
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save film'),
  });

  const deleteMovieMutation = useMutation({
    mutationFn: (id) => moviesApi.remove(id),
    onSuccess: () => {
      toast.success('Film removed from catalog');
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const moderateMutation = useMutation({
    mutationFn: ({ reviewId, action }) => adminApi.moderateReview(reviewId, action),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  async function handleTmdbSearch(e) {
    e.preventDefault();
    if (!tmdbQuery.trim()) return;
    setTmdbSearching(true);
    setTmdbError('');
    try {
      const res = await moviesApi.searchTmdb(tmdbQuery.trim());
      setTmdbResults(res.data.results || []);
    } catch (err) {
      setTmdbError(err.response?.data?.message || 'TMDB search unavailable');
      setTmdbResults([]);
    } finally {
      setTmdbSearching(false);
    }
  }

  function openCreateMovie() {
    setEditingMovieId(null);
    setMovieForm(INITIAL_MOVIE_FORM);
    setMovieModalOpen(true);
  }

  function openEditMovie(movie) {
    setEditingMovieId(movie._id);
    setMovieForm({
      title: movie.title || '',
      tagline: movie.tagline || '',
      overview: movie.overview || '',
      posterUrl: movie.posterUrl || '',
      backdropUrl: movie.backdropUrl || '',
      trailerUrl: movie.trailerUrl || '',
      releaseDate: movie.releaseDate ? new Date(movie.releaseDate).toISOString().slice(0, 10) : '',
      runtime: movie.runtime || 120,
      genres: (movie.genres || []).join(', '),
      language: movie.language || 'English',
      industry: movie.industry || 'Hollywood',
      director: movie.director || '',
      featured: Boolean(movie.featured),
    });
    setMovieModalOpen(true);
  }

  function handleSaveMovie(e) {
    e.preventDefault();
    const genres = movieForm.genres
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    saveMovieMutation.mutate({
      ...movieForm,
      runtime: Number(movieForm.runtime) || 120,
      genres: genres.length ? genres : ['Drama'],
    });
  }

  const stats = statsData?.data?.stats || {
    totalUsers: 0,
    totalMovies: 0,
    totalReviews: 0,
    flaggedCount: 0,
  };
  const movies = moviesData?.data?.movies || [];
  const reports = reportsData?.data?.reports || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Admin Console
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Manage the hybrid MongoDB + TMDB catalog, spotlight selections, and review moderation queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={syncTmdbMutation.isPending}
            onClick={() => syncTmdbMutation.mutate()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-zinc-900/70 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncTmdbMutation.isPending ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {syncTmdbMutation.isPending ? 'Syncing TMDB...' : 'Sync TMDB Artwork'}
          </button>

          <button
            type="button"
            onClick={openCreateMovie}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Film Manually
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Members', value: stats.totalUsers, icon: Users, accent: 'text-zinc-50' },
          { label: 'Catalog Films', value: stats.totalMovies, icon: Film, accent: 'text-zinc-50' },
          { label: 'Active Reviews', value: stats.totalReviews, icon: MessageSquare, accent: 'text-amber-400' },
          { label: 'Flagged Queue', value: stats.flaggedCount, icon: Flag, accent: stats.flaggedCount > 0 ? 'text-rose-400' : 'text-emerald-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            </div>
            <p className={`font-mono-tabular mt-2 text-3xl font-bold ${kpi.accent}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { key: 'catalog', label: `Catalog (${movies.length})` },
          { key: 'tmdb', label: 'TMDB Importer' },
          { key: 'moderation', label: `Moderation Queue (${reports.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.key
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Catalog CRUD Table */}
      {activeTab === 'catalog' && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-zinc-950/60 text-xs font-medium text-zinc-400">
              <tr>
                <th className="px-4 py-3.5">Film</th>
                <th className="px-4 py-3.5">Director</th>
                <th className="px-4 py-3.5">Industry</th>
                <th className="px-4 py-3.5 text-right">Year</th>
                <th className="px-4 py-3.5 text-right">Score</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {moviesLoading ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <div className="skeleton-shimmer h-20 rounded-xl" />
                  </td>
                </tr>
              ) : (
                movies.map((m) => (
                  <tr key={m._id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-8 shrink-0 overflow-hidden rounded border border-white/10">
                          <CinemaImage src={m.posterUrl} alt={m.title} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{m.title}</p>
                          {m.featured && <span className="text-[11px] text-amber-400">Featured Hero</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{m.director}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.industry}</td>
                    <td className="font-mono-tabular px-4 py-3 text-right text-zinc-400">
                      {formatYear(m.releaseDate)}
                    </td>
                    <td className="font-mono-tabular px-4 py-3 text-right font-semibold text-amber-400">
                      {m.averageRating > 0 ? m.averageRating.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditMovie(m)}
                          aria-label={`Edit ${m.title}`}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-amber-400"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMovieMutation.mutate(m._id)}
                          aria-label={`Delete ${m.title}`}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: TMDB Importer */}
      {activeTab === 'tmdb' && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
          <form onSubmit={handleTmdbSearch} className="mb-6 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={tmdbQuery}
                onChange={(e) => setTmdbQuery(e.target.value)}
                placeholder="Search TMDB by title (e.g., Interstellar, In the Mood for Love)..."
                aria-label="Search TMDB"
                className="h-11 w-full rounded-lg border border-white/10 bg-zinc-950 pl-10 pr-4 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={tmdbSearching}
              className="h-11 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {tmdbSearching ? 'Searching...' : 'Search TMDB'}
            </button>
          </form>

          {tmdbError && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              {tmdbError}
            </div>
          )}

          {tmdbResults.length === 0 ? (
            <EmptyState
              title="TMDB Hybrid Importer"
              description="Search The Movie Database via the server-side proxy and import full metadata, cast, and trailers into MongoDB with one click."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tmdbResults.map((item) => (
                <div key={item.tmdbId} className="flex gap-4 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <CinemaImage src={item.posterUrl} alt={item.title} title={item.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="truncate font-semibold text-zinc-100">{item.title}</h3>
                      <p className="font-mono-tabular text-xs text-zinc-400">
                        {item.releaseDate?.slice(0, 4) || '—'} · TMDB #{item.tmdbId}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-zinc-400">{item.overview}</p>
                    </div>
                    <button
                      type="button"
                      disabled={importMutation.isPending}
                      onClick={() => importMutation.mutate(item.tmdbId)}
                      className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Import to Catalog
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Moderation Queue */}
      {activeTab === 'moderation' && (
        reportsLoading ? (
          <div className="skeleton-shimmer h-48 rounded-2xl" />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Moderation queue is clear"
            description="No flagged reviews currently require attention."
          />
        ) : (
          <div className="space-y-4">
            {reports.map((rep) => (
              <div key={rep._id} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-400">
                      Film: <span className="font-semibold text-zinc-200">{rep.movie?.title}</span> · Author:{' '}
                      <span className="text-amber-400">@{rep.author?.username}</span> · Status:{' '}
                      <span className={rep.status === 'removed' ? 'text-rose-400' : 'text-amber-300'}>
                        {rep.status}
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-zinc-200">{rep.body}</p>
                    <div className="mt-3 space-y-1">
                      {rep.reports?.map((r, i) => (
                        <p key={i} className="text-xs text-rose-300">
                          Report ({formatDate(r.createdAt)}): {r.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moderateMutation.mutate({ reviewId: rep._id, action: 'dismiss' })}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10"
                    >
                      Dismiss Reports
                    </button>
                    <button
                      type="button"
                      onClick={() => moderateMutation.mutate({ reviewId: rep._id, action: 'remove' })}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      Remove Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create / Edit Movie Modal */}
      <Modal
        open={movieModalOpen}
        onClose={() => setMovieModalOpen(false)}
        title={editingMovieId ? 'Edit Film' : 'Add Film to Catalog'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveMovie} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="m-title" className="mb-1 block text-xs font-medium text-zinc-400">Title</label>
              <input
                id="m-title"
                required
                value={movieForm.title}
                onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label htmlFor="m-director" className="mb-1 block text-xs font-medium text-zinc-400">Director</label>
              <input
                id="m-director"
                required
                value={movieForm.director}
                onChange={(e) => setMovieForm({ ...movieForm, director: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="m-industry" className="mb-1 block text-xs font-medium text-zinc-400">Industry</label>
              <select
                id="m-industry"
                value={movieForm.industry}
                onChange={(e) => setMovieForm({ ...movieForm, industry: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              >
                {INDUSTRIES.filter((i) => i !== 'All').map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="m-language" className="mb-1 block text-xs font-medium text-zinc-400">Language</label>
              <input
                id="m-language"
                required
                value={movieForm.language}
                onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label htmlFor="m-runtime" className="mb-1 block text-xs font-medium text-zinc-400">Runtime (min)</label>
              <input
                id="m-runtime"
                type="number"
                value={movieForm.runtime}
                onChange={(e) => setMovieForm({ ...movieForm, runtime: e.target.value })}
                className="font-mono-tabular w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="m-date" className="mb-1 block text-xs font-medium text-zinc-400">Release Date</label>
              <input
                id="m-date"
                type="date"
                required
                value={movieForm.releaseDate}
                onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                className="font-mono-tabular w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label htmlFor="m-genres" className="mb-1 block text-xs font-medium text-zinc-400">Genres (comma-separated)</label>
              <input
                id="m-genres"
                value={movieForm.genres}
                onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="m-overview" className="mb-1 block text-xs font-medium text-zinc-400">Overview</label>
            <textarea
              id="m-overview"
              rows={3}
              required
              value={movieForm.overview}
              onChange={(e) => setMovieForm({ ...movieForm, overview: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="m-poster" className="mb-1 block text-xs font-medium text-zinc-400">Poster URL</label>
              <input
                id="m-poster"
                value={movieForm.posterUrl}
                onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label htmlFor="m-trailer" className="mb-1 block text-xs font-medium text-zinc-400">YouTube Trailer URL</label>
              <input
                id="m-trailer"
                value={movieForm.trailerUrl}
                onChange={(e) => setMovieForm({ ...movieForm, trailerUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={movieForm.featured}
              onChange={(e) => setMovieForm({ ...movieForm, featured: e.target.checked })}
              className="h-4 w-4 accent-amber-500"
            />
            Feature in Home Hero Spotlight
          </label>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setMovieModalOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMovieMutation.isPending}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {saveMovieMutation.isPending ? 'Saving...' : 'Save Film'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
