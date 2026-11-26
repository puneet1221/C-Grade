import { ChevronDown, LogOut, Menu, Search, Settings, Shield, User as UserIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth.js';

/**
 * Editorial 3-zone top navigation bar following the single-row contract:
 * Brand wordmark — Concise single-line links — Search trigger & primary account action.
 */
export function Navbar({ onOpenSearch }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    toast.success('Signed out');
    navigate('/');
  }

  const navLinkClass = ({ isActive }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors pb-0.5 border-b ${
      isActive
        ? 'border-amber-400 text-zinc-50'
        : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:border-white/25'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090B]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Single-element brand wordmark */}
        <Link
          to="/"
          className="font-display shrink-0 whitespace-nowrap text-2xl font-bold tracking-tight text-zinc-50 transition-colors hover:text-amber-400"
        >
          C-Grade
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/explore" className={navLinkClass}>
            Explore
          </NavLink>
          <NavLink to="/lists" className={navLinkClass}>
            Lists
          </NavLink>
          <NavLink to="/feed" className={navLinkClass}>
            Feed
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Zone 3: Search trigger + Primary account action */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Open search palette"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/70 px-3 text-sm text-zinc-300 transition-colors hover:border-amber-500/40 hover:text-zinc-50 whitespace-nowrap shrink-0"
          >
            <Search className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="font-mono-tabular hidden rounded border border-white/10 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-400 lg:inline">
              ⌘K
            </kbd>
          </button>

          {!isAuthenticated ? (
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-label="Open account menu"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 text-sm font-medium text-zinc-100 transition-colors hover:border-amber-500/40 whitespace-nowrap shrink-0"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-400">
                  {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                </span>
                <span className="hidden max-w-[110px] truncate sm:inline">@{user?.username}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              </button>

              {menuOpen && (
                <div className="glass-surface absolute right-0 mt-2 w-56 rounded-xl p-1.5 shadow-2xl">
                  <div className="border-b border-white/10 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-zinc-100">{user?.name}</p>
                    <p className="truncate text-xs text-zinc-400">@{user?.username}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to={`/u/${user?.username}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
                    >
                      <UserIcon className="h-4 w-4 text-amber-400" aria-hidden="true" />
                      Profile & Diary
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
                    >
                      <Settings className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      Account Settings
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
                      >
                        <Shield className="h-4 w-4 text-amber-400" aria-hidden="true" />
                        Admin Console
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-white/10 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="border-t border-white/10 bg-[#09090B] px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <Link to="/" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/5">
              Home
            </Link>
            <Link to="/explore" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/5">
              Explore
            </Link>
            <Link to="/lists" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/5">
              Lists
            </Link>
            <Link to="/feed" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/5">
              Feed
            </Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-amber-400 hover:bg-white/5">
                Admin
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
