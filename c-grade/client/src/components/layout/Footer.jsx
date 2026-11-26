import { Link } from 'react-router-dom';

/**
 * Clean editorial footer with site links and world cinema navigation.
 */
export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-[#09090B]">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center">
        <div>
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-zinc-100">
            C-Grade
          </Link>
          <p className="mt-1.5 text-sm text-zinc-400">
            Editorial film discovery, half-star reviews, and personal watch diaries across world cinema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-400">
          <Link to="/explore" className="transition-colors hover:text-zinc-100">
            Explore Catalog
          </Link>
          <Link to="/explore?industry=Hollywood" className="transition-colors hover:text-zinc-100">
            Hollywood
          </Link>
          <Link to="/explore?industry=Bollywood" className="transition-colors hover:text-zinc-100">
            Bollywood
          </Link>
          <Link to="/explore?industry=Tamil" className="transition-colors hover:text-zinc-100">
            South Indian
          </Link>
          <Link to="/explore?industry=Korean" className="transition-colors hover:text-zinc-100">
            Korean & Japanese
          </Link>
          <Link to="/lists" className="transition-colors hover:text-zinc-100">
            Curated Lists
          </Link>
        </div>
      </div>
    </footer>
  );
}
