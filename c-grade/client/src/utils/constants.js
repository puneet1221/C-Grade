export const INDUSTRIES = [
  'All',
  'Hollywood',
  'Bollywood',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Korean',
  'Japanese',
  'World Cinema',
];

export const GENRES = [
  'All',
  'Drama',
  'Thriller',
  'Action',
  'Crime',
  'Sci-Fi',
  'Mystery',
  'Horror',
  'Comedy',
  'Adventure',
  'Fantasy',
  'Romance',
  'Animation',
  'History',
  'Music',
];

export const MOOD_TAGS = [
  'Slow Burn',
  'Plot Twist',
  'Masterclass Cinematography',
  'Mass Entertainer',
  'Emotional Wreck',
  'Soundtrack Gem',
];

export const VERDICT_LABELS = {
  0.5: 'Unwatchable',
  1.0: 'Deeply Flawed',
  1.5: 'Forgettable',
  2.0: 'Underwhelming',
  2.5: 'Mixed Bag',
  3.0: 'Solid Watch',
  3.5: 'Very Good',
  4.0: 'Must Watch',
  4.5: 'Essential',
  5.0: 'Masterpiece',
};

/**
 * Returns the editorial verdict string for a half-star rating between 0.5 and 5.0.
 * @param {number} rating
 * @returns {string}
 */
export function getVerdictLabel(rating) {
  if (!rating || rating < 0.5) return 'Select Rating';
  const snapped = Math.min(5, Math.max(0.5, Math.round(Number(rating) * 2) / 2));
  return VERDICT_LABELS[snapped] || 'Rated';
}

/**
 * Safely parses a YouTube watch/share/embed URL and returns an allowlisted embed URL.
 * Rejects non-YouTube URLs and non-http(s) schemes.
 * @param {string} url
 * @returns {string | null}
 */
export function extractYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0];
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
    }

    if (!/^[a-zA-Z0-9_-]{6,16}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  } catch {
    return null;
  }
}

/**
 * Evaluates password strength for the real-time Sign Up strength meter.
 * @param {string} password
 * @returns {{ score: number, label: string }}
 */
export function evaluatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score += 1;

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Cinema-Grade'];
  return { score, label: labels[score] || 'Weak' };
}
