/**
 * Pure rating statistics calculation decoupled from database persistence
 * so it can be unit tested deterministically and reused across services.
 * @param {number[]} ratings - Array of numeric ratings between 0.5 and 5.0
 * @returns {{ averageRating: number, ratingsCount: number, ratingDistribution: { 1: number, 2: number, 3: number, 4: number, 5: number } }}
 */
export function computeRatingStats(ratings) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (!Array.isArray(ratings) || ratings.length === 0) {
    return {
      averageRating: 0,
      ratingsCount: 0,
      ratingDistribution: distribution,
    };
  }

  let sum = 0;
  let validCount = 0;

  for (const raw of ratings) {
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0.5 || num > 5) {
      continue;
    }
    sum += num;
    validCount += 1;

    // Bucket half-stars into nearest 1..5 integer histogram bin (e.g. 4.5 -> 5, 3.5 -> 4, 0.5 -> 1)
    const bucket = Math.min(5, Math.max(1, Math.round(num)));
    distribution[bucket] += 1;
  }

  if (validCount === 0) {
    return {
      averageRating: 0,
      ratingsCount: 0,
      ratingDistribution: distribution,
    };
  }

  const averageRating = Math.round((sum / validCount) * 10) / 10;
  return {
    averageRating,
    ratingsCount: validCount,
    ratingDistribution: distribution,
  };
}

/**
 * Generates a URL-safe slug from a film or list title.
 * @param {string} title
 * @returns {string}
 */
export function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Determines whether a film has been officially released on or before the reference date.
 * Unscheduled (missing releaseDate), future-dated, or pre-release films return false.
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
