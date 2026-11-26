/**
 * Layout-matched shimmering skeletons for async sections across C-Grade.
 */
export function HeroSkeleton() {
  return (
    <div className="relative h-[540px] w-full overflow-hidden border-b border-white/10 bg-zinc-950 md:h-[600px]">
      <div className="skeleton-shimmer h-full w-full opacity-40" />
      <div className="absolute inset-0 mx-auto flex max-w-7xl flex-col justify-end px-6 pb-16">
        <div className="skeleton-shimmer mb-4 h-4 w-40 rounded" />
        <div className="skeleton-shimmer mb-4 h-12 w-3/4 max-w-xl rounded" />
        <div className="skeleton-shimmer mb-6 h-5 w-2/3 max-w-lg rounded" />
        <div className="flex gap-4">
          <div className="skeleton-shimmer h-11 w-40 rounded-lg" />
          <div className="skeleton-shimmer h-11 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="skeleton-shimmer aspect-[2/3] w-full rounded-xl border border-white/5" />
      <div className="skeleton-shimmer mt-3 h-4 w-4/5 rounded" />
      <div className="skeleton-shimmer mt-2 h-3 w-1/2 rounded" />
    </div>
  );
}

export function MovieGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, idx) => (
        <MovieCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="skeleton-shimmer h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton-shimmer h-4 w-32 rounded" />
          <div className="skeleton-shimmer h-3 w-24 rounded" />
        </div>
      </div>
      <div className="skeleton-shimmer mb-2 h-5 w-2/3 rounded" />
      <div className="skeleton-shimmer h-16 w-full rounded" />
    </div>
  );
}
