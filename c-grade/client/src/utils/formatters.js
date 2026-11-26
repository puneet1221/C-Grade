/**
 * Formats minutes into editorial runtime (e.g., 166 -> "2h 46m").
 * @param {number} minutes
 * @returns {string}
 */
export function formatRuntime(minutes) {
  const num = Number(minutes);
  if (!Number.isFinite(num) || num <= 0) return '—';
  const hrs = Math.floor(num / 60);
  const mins = num % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Extracts a 4-digit release year from an ISO date string or Date.
 * @param {string | Date} dateInput
 * @returns {string}
 */
export function formatYear(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '—';
  return String(d.getUTCFullYear());
}

/**
 * Formats an ISO date into readable editorial month-day-year string.
 * @param {string | Date} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a rating value cleanly with 1 decimal place when rated.
 * @param {number} rating
 * @returns {string}
 */
export function formatRating(rating) {
  const num = Number(rating);
  if (!Number.isFinite(num) || num <= 0) return 'NR';
  return num.toFixed(1);
}

/**
 * Formats a film release date using UTC calendar day to avoid timezone off-by-one shifts.
 * @param {string | Date | null | undefined} dateInput
 * @returns {string}
 */
export function formatReleaseDate(dateInput) {
  if (!dateInput) return 'TBA';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'TBA';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Returns true only if a film has an official release date on or before today (UTC).
 * @param {{ releaseDate?: string | Date | null, releaseStatus?: string } | null | undefined} movie
 * @param {Date | string} [referenceDate]
 * @returns {boolean}
 */
export function isMovieReleased(movie, referenceDate = new Date()) {
  if (!movie || !movie.releaseDate) return false;

  const status = String(movie.releaseStatus || '').trim().toLowerCase();
  if (status === 'canceled') return false;

  const release = new Date(movie.releaseDate);
  const now = new Date(referenceDate);
  if (Number.isNaN(release.getTime()) || Number.isNaN(now.getTime())) return false;

  const releaseDay = release.toISOString().slice(0, 10);
  const todayDay = now.toISOString().slice(0, 10);

  if (releaseDay > todayDay) return false;
  if (
    ['rumored', 'planned', 'in production', 'post production'].includes(status) &&
    releaseDay >= todayDay
  ) {
    return false;
  }

  return true;
}
