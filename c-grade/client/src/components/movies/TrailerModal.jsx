import { ExternalLink, Film } from 'lucide-react';
import { extractYouTubeEmbedUrl } from '../../utils/constants.js';
import { Modal } from '../ui/Modal.jsx';

/**
 * Embedded YouTube trailer lightbox modal with safe URL validation,
 * origin/referrerPolicy headers required by YouTube embeds, and fallback link.
 */
export function TrailerModal({ movie, open, onClose }) {
  const baseEmbedUrl = movie?.trailerUrl ? extractYouTubeEmbedUrl(movie.trailerUrl) : null;
  const originParam =
    typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  const embedUrl = baseEmbedUrl ? `${baseEmbedUrl}${originParam}` : null;
  const safeWatchUrl = baseEmbedUrl
    ? `https://www.youtube.com/watch?v=${baseEmbedUrl.split('/embed/')[1]?.split('?')[0]}`
    : null;

  return (
    <Modal
      open={open && Boolean(movie)}
      onClose={onClose}
      title={movie ? `${movie.title} — Official Trailer` : 'Trailer'}
      maxWidth="max-w-4xl"
    >
      {embedUrl ? (
        <div className="space-y-3">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
            <iframe
              src={embedUrl}
              title={`${movie.title} trailer`}
              className="h-full w-full"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {safeWatchUrl && (
            <div className="flex items-center justify-end">
              <a
                href={safeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-amber-400"
              >
                Open on YouTube
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-white/10 bg-zinc-950 p-6 text-center">
          <Film className="mb-3 h-8 w-8 text-amber-400" aria-hidden="true" />
          <p className="text-sm text-zinc-300">Trailer playback is unavailable for this film.</p>
        </div>
      )}
    </Modal>
  );
}
