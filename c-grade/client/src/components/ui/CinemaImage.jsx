import { Film } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Resilient image component enforcing Zero-Broken-Image policy with
 * referrerPolicy="no-referrer" and a styled obsidian editorial fallback.
 */
export function CinemaImage({ src, alt, title, className = '', fallbackClassName = '' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950/30 p-4 text-center ${fallbackClassName} ${className}`}
        role="img"
        aria-label={alt || title || 'Film artwork'}
      >
        <Film className="mb-2 h-7 w-7 text-amber-400/60" aria-hidden="true" />
        {title && (
          <span className="font-display line-clamp-2 text-sm font-medium text-zinc-200">{title}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || title || 'Cinema artwork'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
}
