import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Settings, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { usersApi } from '../api/domainApis.js';
import { MovieCard } from '../components/movies/MovieCard.jsx';
import { CinemaImage } from '../components/ui/CinemaImage.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { HalfStarRating } from '../components/ui/HalfStarRating.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { formatDate } from '../utils/formatters.js';

/**
 * Public Cinephile Profile page displaying Top 4 Favorite Films,
 * Recharts Genre Analytics, Watch Diary, Watchlist, Reviews, and Curated Lists.
 */
export function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reviews');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.profile(username),
  });

  const followMutation = useMutation({
    mutationFn: (targetId) => usersApi.toggleFollow(targetId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6">
        <div className="skeleton-shimmer h-48 rounded-2xl" />
        <div className="skeleton-shimmer h-72 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data?.data?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="Member not found" description="No cinephile profile matches this handle." actionLabel="Go Home" actionTo="/" />
      </div>
    );
  }

  const { user, stats, reviews, watched, watchlist, lists } = data.data;
  const isOwnProfile = Boolean(currentUser && currentUser._id === user._id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Profile Header */}
      <section className="mb-10 flex flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-500/40 bg-zinc-800 text-2xl font-bold text-amber-400">
            {user.avatarUrl ? (
              <CinemaImage src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user.name?.charAt(0)?.toUpperCase()
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold text-zinc-50 sm:text-3xl">{user.name}</h1>
              {user.role !== 'user' && (
                <span className="text-xs font-medium capitalize text-amber-400">· {user.role}</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-400">@{user.username}</p>
            {user.bio && <p className="mt-2.5 max-w-xl text-sm text-zinc-300">{user.bio}</p>}
            <p className="mt-3 text-xs text-zinc-400">
              <span className="font-mono-tabular font-semibold text-zinc-100">{user.followersCount}</span> followers
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono-tabular font-semibold text-zinc-100">{user.followingCount}</span> following
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isOwnProfile ? (
            <Link
              to="/settings"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-zinc-950 px-4 text-sm font-medium text-zinc-200 hover:border-amber-500/50"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Edit Profile
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) return navigate('/login');
                followMutation.mutate(user._id);
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${
                user.isFollowing
                  ? 'border border-white/15 bg-zinc-950 text-zinc-200 hover:border-rose-500/40'
                  : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
              }`}
            >
              {user.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {user.isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </section>

      {/* Top 4 Favorites + Viewing Analytics */}
      <div className="mb-12 grid gap-10 border-t border-white/10 pt-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-xl font-semibold text-zinc-100">Top 4 Favorite Films</h2>
            {isOwnProfile && (
              <Link to="/settings" className="text-xs font-medium text-amber-400 hover:text-amber-300">
                Customize
              </Link>
            )}
          </div>
          {user.favoriteMovies?.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {user.favoriteMovies.slice(0, 4).map((movie) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-400">No favorite films pinned yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 lg:col-span-5">
          <h2 className="font-display mb-4 border-b border-white/10 pb-3 text-xl font-semibold text-zinc-100">
            Viewing Analytics
          </h2>
          <div className="mb-6 grid grid-cols-3 gap-4 border-b border-white/10 pb-4 text-center">
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-zinc-50">{stats.totalWatched}</p>
              <p className="text-xs text-zinc-400">Watched</p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-amber-400">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-zinc-400">Avg Rating</p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-zinc-50">{stats.totalReviews}</p>
              <p className="text-xs text-zinc-400">Reviews</p>
            </div>
          </div>

          {stats.genreDistribution?.length > 0 ? (
            <div className="h-44 w-full" aria-label="Watched genres breakdown">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.genreDistribution} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="genre"
                    tick={{ fill: '#D4D4D8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={78}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#F59E0B" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-400">Log watched films to reveal genre taste analytics.</p>
          )}
        </section>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-3">
        {[
          { key: 'reviews', label: `Reviews (${reviews.length})` },
          { key: 'diary', label: `Watch Diary (${watched.length})` },
          { key: 'watchlist', label: `Watchlist (${watchlist.length})` },
          { key: 'lists', label: `Lists (${lists.length})` },
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

      {activeTab === 'reviews' && (
        reviews.length === 0 ? (
          <EmptyState title="No reviews published yet" description="Reviews written by this member will appear here." />
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev._id} className="flex gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
                <Link to={`/movies/${rev.movie?.slug}`} className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
                  <CinemaImage src={rev.movie?.posterUrl} alt={rev.movie?.title} title={rev.movie?.title} className="h-full w-full object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to={`/movies/${rev.movie?.slug}`} className="font-display text-lg font-semibold text-zinc-100 hover:text-amber-400">
                      {rev.movie?.title}
                    </Link>
                    <HalfStarRating value={rev.rating} readOnly size="sm" showVerdict />
                  </div>
                  {rev.title && <p className="mt-1 text-sm font-semibold text-zinc-200">{rev.title}</p>}
                  <p className="mt-1.5 text-sm text-zinc-300">
                    {rev.containsSpoilers ? 'Spoiler-tagged review — open film page to reveal.' : rev.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'diary' && (
        watched.length === 0 ? (
          <EmptyState title="Watch Diary is empty" description="Logged screenings and rewatches appear chronologically here." />
        ) : (
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-zinc-900/40">
            {watched.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-10 overflow-hidden rounded border border-white/10">
                    <CinemaImage src={entry.movie?.posterUrl} alt={entry.movie?.title} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <Link to={`/movies/${entry.movie?.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                      {entry.movie?.title}
                    </Link>
                    <p className="text-xs text-zinc-400">
                      {entry.movie?.director} · {entry.movie?.industry}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  {entry.rewatchCount > 0 && (
                    <span className="font-mono-tabular text-amber-400">{entry.rewatchCount}x rewatch</span>
                  )}
                  <span className="inline-flex items-center gap-1 font-mono-tabular">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(entry.watchedAt || entry.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'watchlist' && (
        watchlist.length === 0 ? (
          <EmptyState title="Watchlist is empty" description="Films saved for future screenings will appear here." />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {watchlist.map((entry) => (
              <MovieCard key={entry._id} movie={entry.movie} />
            ))}
          </div>
        )
      )}

      {activeTab === 'lists' && (
        lists.length === 0 ? (
          <EmptyState title="No lists yet" description="Curated lists assembled by this member appear here." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((l) => (
              <Link
                key={l._id}
                to={`/lists/${l.slug}`}
                className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-colors hover:border-amber-500/40"
              >
                <h3 className="font-display text-lg font-semibold text-zinc-100">{l.title}</h3>
                <p className="mt-1 text-xs text-zinc-400">{l.movies?.length || 0} films</p>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
