import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Styled empty state component with optional primary action link or button.
 */
export function EmptyState({
  icon: Icon = Film,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-amber-400">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl font-semibold text-zinc-100">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-zinc-400">{description}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-6 inline-flex items-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
