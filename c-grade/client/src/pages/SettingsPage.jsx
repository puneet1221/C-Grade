import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '../api/authApi.js';
import { usersApi } from '../api/domainApis.js';
import { moviesApi } from '../api/moviesApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';

/**
 * Account Settings page allowing users to update profile details, avatar, bio,
 * Top 4 Favorite Films, and change their password.
 */
export function SettingsPage() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [favorites, setFavorites] = useState(user?.favoriteMovies || []);
  const [favQuery, setFavQuery] = useState('');
  const debouncedFavQuery = useDebounce(favQuery, 240);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      setFavorites(user.favoriteMovies || []);
    }
  }, [user]);

  const { data: moviesData } = useQuery({
    queryKey: ['settings-movie-picker', debouncedFavQuery],
    queryFn: () => moviesApi.list({ q: debouncedFavQuery, limit: 8 }),
  });

  const profileMutation = useMutation({
    mutationFn: (payload) => usersApi.updateMe(payload),
    onSuccess: (res) => {
      setUser(res.data.user);
      toast.success('Profile saved');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => authApi.changePassword(payload),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not change password'),
  });

  const pickerMovies = moviesData?.data?.movies || [];

  function addFavorite(movie) {
    if (favorites.some((f) => f._id === movie._id)) return;
    if (favorites.length >= 4) {
      toast.error('You can pin up to 4 favorite films');
      return;
    }
    setFavorites((prev) => [...prev, movie]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50">
          Account Settings
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Manage your public profile, Top 4 Favorite Films, and account security.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          profileMutation.mutate({
            name: name.trim(),
            bio: bio.trim(),
            avatarUrl: avatarUrl.trim(),
            favoriteMovies: favorites.map((f) => f._id),
          });
        }}
        className="mb-10 space-y-5 rounded-2xl border border-white/10 bg-zinc-900/50 p-6"
      >
        <h2 className="font-display text-xl font-semibold text-zinc-100">Profile & Top 4</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-name" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="settings-avatar" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Avatar URL (optional)
            </label>
            <input
              id="settings-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="settings-bio" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Bio
          </label>
          <textarea
            id="settings-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Your cinematic tastes, favorite directors, or screening habits..."
            className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium text-zinc-400">
            Top 4 Favorite Films ({favorites.length}/4)
          </span>
          <div className="mb-3 flex flex-wrap gap-2">
            {favorites.map((m) => (
              <span
                key={m._id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200"
              >
                {m.title}
                <button
                  type="button"
                  aria-label={`Remove ${m.title}`}
                  onClick={() => setFavorites((prev) => prev.filter((item) => item._id !== m._id))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>

          <input
            type="text"
            value={favQuery}
            onChange={(e) => setFavQuery(e.target.value)}
            placeholder="Search films to pin to Top 4..."
            className="mb-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          />
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 p-2">
            {pickerMovies.map((m) => {
              const selected = favorites.some((f) => f._id === m._id);
              return (
                <button
                  key={m._id}
                  type="button"
                  disabled={selected || favorites.length >= 4}
                  onClick={() => addFavorite(m)}
                  className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                >
                  <span>{m.title}</span>
                  <span className="text-amber-400">{selected ? 'Pinned' : '+ Pin'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={profileMutation.isPending}
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
          }
          passwordMutation.mutate({ currentPassword, newPassword });
        }}
        className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-6"
      >
        <h2 className="font-display text-xl font-semibold text-zinc-100">Change Password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="curr-pw" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Current Password
            </label>
            <input
              id="curr-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="new-pw" className="mb-1.5 block text-xs font-medium text-zinc-400">
              New Password (min 8 chars)
            </label>
            <input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={passwordMutation.isPending}
          className="rounded-lg border border-white/15 bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:border-amber-500/50 disabled:opacity-50"
        >
          {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
