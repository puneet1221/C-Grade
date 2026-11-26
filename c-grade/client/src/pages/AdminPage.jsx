import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CheckCircle,
  Clock,
  Download,
  Edit3,
  Film,
  Flag,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../api/domainApis.js';
import { moviesApi } from '../api/moviesApi.js';
import { CinemaImage } from '../components/ui/CinemaImage.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';
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

const INITIAL_ADMIN_USER_FORM = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'admin',
  bio: '',
};

const ROLE_BADGE_CLASS = {
  admin: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  critic: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  user: 'border-white/15 bg-zinc-800/80 text-zinc-300',
};

const STATUS_BADGE_CLASS = {
  active: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  blocked: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
};

/**
 * Admin Moderation, User Management & Hybrid Catalog Console:
 * KPI overview, TMDB importer, Movie CRUD, User accounts & Admin creation, and Flagged Review Moderation.
 */
export function AdminPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('catalog');

  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbError, setTmdbError] = useState('');
  const [tmdbSearching, setTmdbSearching] = useState(false);

  const [movieModalOpen, setMovieModalOpen] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movieForm, setMovieForm] = useState(INITIAL_MOVIE_FORM);

  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 250);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [adminUserForm, setAdminUserForm] = useState(INITIAL_ADMIN_USER_FORM);

  const [statusModalTarget, setStatusModalTarget] = useState(null);
  const [suspendDays, setSuspendDays] = useState('7');
  const [moderationReason, setModerationReason] = useState('');
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);

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

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', debouncedUserSearch, userRoleFilter, userStatusFilter],
    queryFn: () =>
      adminApi.users({
        q: debouncedUserSearch || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
        limit: 50,
      }),
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

  const createUserMutation = useMutation({
    mutationFn: (payload) => adminApi.createUser(payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Account created');
      setCreateUserModalOpen(false);
      setAdminUserForm(INITIAL_ADMIN_USER_FORM);
      setActiveTab('users');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not create account'),
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, payload }) => adminApi.updateUserStatus(userId, payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Account status updated');
      setStatusModalTarget(null);
      setModerationReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update account status'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => adminApi.deleteUser(userId),
    onSuccess: (res) => {
      toast.success(res.message || 'Account permanently deleted');
      setDeleteUserTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete user account'),
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

  function handleCreateAdminUser(e) {
    e.preventDefault();
    createUserMutation.mutate({
      ...adminUserForm,
      username: adminUserForm.username.trim().toLowerCase().replace(/^@/, ''),
    });
  }

  function openStatusModal(user, targetStatus) {
    setStatusModalTarget({ user, targetStatus });
    setSuspendDays('7');
    setModerationReason(user.moderationReason || '');
  }

  function handleConfirmStatusChange(e) {
    e.preventDefault();
    if (!statusModalTarget) return;
    const { user, targetStatus } = statusModalTarget;
    updateUserStatusMutation.mutate({
      userId: user._id,
      payload: {
        status: targetStatus,
        suspendDays: targetStatus === 'suspended' && suspendDays !== 'indefinite' ? Number(suspendDays) : null,
        reason: moderationReason.trim(),
      },
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
  const users = usersData?.data?.users || [];
  const usersTotal = usersData?.data?.total ?? stats.totalUsers;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Admin Console
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Manage the hybrid MongoDB + TMDB catalog, admin & member accounts, and review moderation queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAdminUserForm(INITIAL_ADMIN_USER_FORM);
              setCreateUserModalOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Create Admin
          </button>

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
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { key: 'catalog', label: `Catalog (${movies.length})` },
          { key: 'tmdb', label: 'TMDB Importer' },
          { key: 'users', label: `Users (${usersTotal})` },
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

      {/* Tab 3: Users & Admin Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, @username, or email..."
                aria-label="Search users"
                className="h-10 w-full rounded-lg border border-white/10 bg-zinc-950 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Filter by role"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-200 focus:border-amber-500/60 focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="admin">Admins</option>
                <option value="critic">Critics</option>
                <option value="user">Members</option>
              </select>

              <select
                aria-label="Filter by status"
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-200 focus:border-amber-500/60 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/40">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-950/60 text-xs font-medium text-zinc-400">
                <tr>
                  <th className="px-4 py-3.5">Member</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Account Status</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="p-6">
                      <div className="skeleton-shimmer h-20 rounded-xl" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const effectiveStatus = u.status || 'active';
                    const isSelf = currentUser?._id === u._id;
                    return (
                      <tr key={u._id} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-100">{u.name}</span>
                              {isSelf && (
                                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400">
                              <span className="text-amber-400/90">@{u.username}</span> · {u.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${
                              ROLE_BADGE_CLASS[u.role] || ROLE_BADGE_CLASS.user
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${
                                STATUS_BADGE_CLASS[effectiveStatus] || STATUS_BADGE_CLASS.active
                              }`}
                            >
                              {effectiveStatus}
                            </span>
                            {effectiveStatus === 'suspended' && (
                              <p className="mt-1 text-[11px] text-zinc-400">
                                {u.suspendedUntil
                                  ? `Until ${formatDate(u.suspendedUntil)}`
                                  : 'Indefinite'}
                              </p>
                            )}
                            {u.moderationReason && effectiveStatus !== 'active' && (
                              <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-zinc-500" title={u.moderationReason}>
                                {u.moderationReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="font-mono-tabular px-4 py-3.5 text-xs text-zinc-400">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isSelf ? (
                            <span className="text-xs text-zinc-500">Current session</span>
                          ) : (
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {effectiveStatus !== 'active' && (
                                <button
                                  type="button"
                                  disabled={updateUserStatusMutation.isPending}
                                  onClick={() =>
                                    updateUserStatusMutation.mutate({
                                      userId: u._id,
                                      payload: { status: 'active' },
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                  Activate
                                </button>
                              )}
                              {effectiveStatus !== 'suspended' && (
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(u, 'suspended')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20"
                                >
                                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                  Suspend
                                </button>
                              )}
                              {effectiveStatus !== 'blocked' && (
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(u, 'blocked')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
                                >
                                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                  Block
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteUserTarget(u)}
                                aria-label={`Delete @${u.username}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Moderation Queue */}
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

      {/* Create Admin / Privileged Account Modal */}
      <Modal
        open={createUserModalOpen}
        onClose={() => setCreateUserModalOpen(false)}
        title="Create Admin Account"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateAdminUser} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="admin-u-name" className="mb-1 block text-xs font-medium text-zinc-400">
                Full Name
              </label>
              <input
                id="admin-u-name"
                required
                minLength={2}
                value={adminUserForm.name}
                onChange={(e) => setAdminUserForm({ ...adminUserForm, name: e.target.value })}
                placeholder="Satyajit Curator"
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-u-username" className="mb-1 block text-xs font-medium text-zinc-400">
                Username
              </label>
              <input
                id="admin-u-username"
                required
                value={adminUserForm.username}
                onChange={(e) => setAdminUserForm({ ...adminUserForm, username: e.target.value })}
                placeholder="chief_curator"
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="admin-u-email" className="mb-1 block text-xs font-medium text-zinc-400">
                Email Address
              </label>
              <input
                id="admin-u-email"
                type="email"
                required
                value={adminUserForm.email}
                onChange={(e) => setAdminUserForm({ ...adminUserForm, email: e.target.value })}
                placeholder="curator@cgrade.cinema"
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-u-role" className="mb-1 block text-xs font-medium text-zinc-400">
                Account Role
              </label>
              <select
                id="admin-u-role"
                value={adminUserForm.role}
                onChange={(e) => setAdminUserForm({ ...adminUserForm, role: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="critic">Verified Critic</option>
                <option value="user">Standard Member</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="admin-u-password" className="mb-1 block text-xs font-medium text-zinc-400">
              Initial Password (min 8 chars)
            </label>
            <PasswordInput
              id="admin-u-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={adminUserForm.password}
              onChange={(e) => setAdminUserForm({ ...adminUserForm, password: e.target.value })}
              placeholder="Enter secure password"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="admin-u-bio" className="mb-1 block text-xs font-medium text-zinc-400">
              Bio (optional)
            </label>
            <input
              id="admin-u-bio"
              value={adminUserForm.bio}
              onChange={(e) => setAdminUserForm({ ...adminUserForm, bio: e.target.value })}
              placeholder="Editorial moderator & programmer"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setCreateUserModalOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Suspend / Block User Modal */}
      <Modal
        open={Boolean(statusModalTarget)}
        onClose={() => setStatusModalTarget(null)}
        title={
          statusModalTarget?.targetStatus === 'suspended'
            ? `Suspend @${statusModalTarget?.user?.username}`
            : `Block @${statusModalTarget?.user?.username}`
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmStatusChange} className="space-y-4">
          <p className="text-sm text-zinc-300">
            {statusModalTarget?.targetStatus === 'suspended'
              ? 'Suspending this account immediately signs them out and blocks authentication until the suspension expires or is lifted.'
              : 'Blocking this account immediately revokes all active sessions and prevents signing in until restored by an administrator.'}
          </p>

          {statusModalTarget?.targetStatus === 'suspended' && (
            <div>
              <label htmlFor="suspend-duration" className="mb-1 block text-xs font-medium text-zinc-400">
                Suspension Duration
              </label>
              <select
                id="suspend-duration"
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              >
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
                <option value="indefinite">Indefinite (Until manually restored)</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="mod-reason" className="mb-1 block text-xs font-medium text-zinc-400">
              Reason (optional, shown on login attempt)
            </label>
            <textarea
              id="mod-reason"
              rows={2}
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="e.g., Repeated community guideline violations"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setStatusModalTarget(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateUserStatusMutation.isPending}
              className={`rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50 ${
                statusModalTarget?.targetStatus === 'blocked'
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
              }`}
            >
              {updateUserStatusMutation.isPending
                ? 'Updating...'
                : statusModalTarget?.targetStatus === 'suspended'
                  ? 'Confirm Suspend'
                  : 'Confirm Block'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permanent Delete User Modal */}
      <Modal
        open={Boolean(deleteUserTarget)}
        onClose={() => setDeleteUserTarget(null)}
        title={`Delete @${deleteUserTarget?.username}?`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            This permanently deletes <span className="font-semibold text-zinc-100">{deleteUserTarget?.name}</span>{' '}
            (<span className="text-amber-400">@{deleteUserTarget?.username}</span>) along with their reviews,
            comments, watch diary, and curated lists. Affected movie ratings will be recalculated automatically.
          </p>
          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setDeleteUserTarget(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteUserMutation.isPending}
              onClick={() => deleteUserTarget && deleteUserMutation.mutate(deleteUserTarget._id)}
              className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>

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
