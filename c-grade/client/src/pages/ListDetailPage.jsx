import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, Lock, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { listsApi } from '../api/domainApis.js';
import { MovieCard } from '../components/movies/MovieCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { MovieGridSkeleton } from '../components/ui/Skeletons.jsx';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Curated list detail page displaying owner notes, like toggle, and film grid.
 */
export function ListDetailPage() {
  const { slug } = useParams();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['list-detail', slug],
    queryFn: () => listsApi.detail(slug),
  });

  const list = data?.data?.list;

  const likeMutation = useMutation({
    mutationFn: () => listsApi.toggleLike(list._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['list-detail', slug] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => listsApi.remove(list._id),
    onSuccess: () => {
      toast.success('List deleted');
      navigate('/lists');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <MovieGridSkeleton count={6} />
      </div>
    );
  }

  if (isError || !list) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="List unavailable"
          description="This list could not be found or is set to private."
          actionLabel="Back to Lists"
          actionTo="/lists"
        />
      </div>
    );
  }

  const isOwner = Boolean(user && list.owner?._id === user._id);
  const liked = Boolean(user && list.likes?.includes(user._id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/lists" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All Curated Lists
      </Link>

      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
            <span>Curated by</span>
            <Link to={`/u/${list.owner?.username}`} className="font-semibold text-amber-400 hover:text-amber-300">
              {list.owner?.name} (@{list.owner?.username})
            </Link>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{list.movies?.length || 0} films</span>
            {!list.isPublic && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-zinc-300">
                  <Lock className="h-3 w-3" /> Private
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            {list.title}
          </h1>
          {list.description && <p className="mt-3 text-sm leading-relaxed text-zinc-300">{list.description}</p>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) return navigate('/login');
              likeMutation.mutate();
            }}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
              liked
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                : 'border-white/15 bg-zinc-900 text-zinc-200 hover:border-amber-500/40'
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span className="font-mono-tabular">{list.likesCount || 0}</span>
          </button>

          {(isOwner || isAdmin) && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-zinc-900 px-4 text-sm text-rose-400 hover:border-rose-500/40"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete List
            </button>
          )}
        </div>
      </div>

      {list.movies?.length === 0 ? (
        <EmptyState title="Empty list" description="No films have been added to this collection yet." />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {list.movies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
