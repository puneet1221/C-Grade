export const LANGUAGE_TO_INDUSTRY = {
  en: { language: 'English', industry: 'Hollywood' },
  hi: { language: 'Hindi', industry: 'Bollywood' },
  ta: { language: 'Tamil', industry: 'Tamil' },
  te: { language: 'Telugu', industry: 'Telugu' },
  ml: { language: 'Malayalam', industry: 'Malayalam' },
  ko: { language: 'Korean', industry: 'Korean' },
  ja: { language: 'Japanese', industry: 'Japanese' },
};

export const TMDB_GENRE_ID_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'Drama',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

/**
 * Resolves TMDB original_language code into C-Grade's normalized language and industry labels.
 * @param {string} originalLanguage
 */
export function resolveIndustryFromLanguage(originalLanguage) {
  const code = String(originalLanguage || '').toLowerCase().trim();
  if (LANGUAGE_TO_INDUSTRY[code]) {
    return LANGUAGE_TO_INDUSTRY[code];
  }
  return {
    language: code ? code.toUpperCase() : 'International',
    industry: 'World Cinema',
  };
}

/**
 * Maps an array of TMDB numeric genre_ids into C-Grade genre labels.
 * @param {number[]} genreIds
 * @returns {string[]}
 */
export function mapTmdbGenreIds(genreIds = []) {
  if (!Array.isArray(genreIds)) return [];
  const seen = new Set();
  const mapped = [];
  for (const id of genreIds) {
    const label = TMDB_GENRE_ID_MAP[Number(id)];
    if (label && !seen.has(label)) {
      seen.add(label);
      mapped.push(label);
    }
  }
  return mapped;
}

/**
 * Parses a synthetic TMDB slug or ID (`tmdb-27205`) into a positive integer TMDB ID.
 * @param {string} value
 * @returns {number | null}
 */
export function parseTmdbSlug(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.trim().match(/^tmdb-(\d+)$/i);
  if (!match) return null;
  const numericId = Number(match[1]);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

/**
 * Builds a normalized deduplication key from title + optional 4-digit release year.
 * @param {string} title
 * @param {string | Date} releaseDate
 */
function buildTitleYearKey(title, releaseDate) {
  const normalizedTitle = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  let year = '';
  if (releaseDate) {
    const d = new Date(releaseDate);
    if (!Number.isNaN(d.getTime())) {
      year = String(d.getUTCFullYear());
    }
  }
  return `${normalizedTitle}|${year}`;
}

/**
 * Converts a normalized TMDB search result item into a C-Grade catalog stub.
 * @param {object} item
 */
export function mapTmdbSearchResultToMovieStub(item) {
  const { language, industry } = resolveIndustryFromLanguage(item.originalLanguage);
  return {
    _id: `tmdb-${item.tmdbId}`,
    slug: `tmdb-${item.tmdbId}`,
    tmdbId: item.tmdbId,
    title: item.title,
    tagline: '',
    overview: item.overview || '',
    posterUrl: item.posterUrl || '',
    backdropUrl: item.backdropUrl || '',
    trailerUrl: '',
    releaseDate: item.releaseDate || '',
    runtime: 0,
    genres: Array.isArray(item.genres) ? item.genres : mapTmdbGenreIds(item.genreIds),
    language: item.language || language,
    industry: item.industry || industry,
    director: '',
    cast: [],
    averageRating: 0,
    ratingsCount: 0,
    isExternalTmdb: true,
  };
}

/**
 * Deduplicates TMDB global search hits against existing MongoDB records and applies active filters.
 * @param {any[]} [tmdbItems]
 * @param {any[]} [existingMovies]
 * @param {Record<string, any>} [query]
 */
export function dedupeAndFilterTmdbResults(tmdbItems = [], existingMovies = [], query = {}) {
  const existingTmdbIds = new Set();
  const existingKeys = new Set();

  for (const movie of existingMovies) {
    if (movie?.tmdbId) existingTmdbIds.add(Number(movie.tmdbId));
    if (movie?.title) existingKeys.add(buildTitleYearKey(movie.title, movie.releaseDate));
  }

  const industryFilter = query.industry && query.industry !== 'All' ? String(query.industry) : null;
  const languageFilter = query.language && query.language !== 'All' ? String(query.language) : null;
  const genreFilter = query.genre && query.genre !== 'All' ? String(query.genre) : null;
  const yearFrom = Number(query.yearFrom);
  const yearTo = Number(query.yearTo);

  const stubs = [];
  for (const item of tmdbItems) {
    if (!item?.tmdbId || !item?.title) continue;
    if (existingTmdbIds.has(Number(item.tmdbId))) continue;

    const stub = mapTmdbSearchResultToMovieStub(item);
    const titleKey = buildTitleYearKey(stub.title, stub.releaseDate);
    if (existingKeys.has(titleKey)) continue;

    if (industryFilter && stub.industry !== industryFilter) continue;
    if (languageFilter && stub.language !== languageFilter) continue;
    if (genreFilter && !stub.genres.includes(genreFilter)) continue;

    if (Number.isFinite(yearFrom) && yearFrom > 1880) {
      const year = stub.releaseDate ? new Date(stub.releaseDate).getUTCFullYear() : NaN;
      if (!Number.isFinite(year) || year < yearFrom) continue;
    }
    if (Number.isFinite(yearTo) && yearTo <= 2100 && query.yearTo !== '' && query.yearTo !== undefined) {
      const year = stub.releaseDate ? new Date(stub.releaseDate).getUTCFullYear() : NaN;
      if (!Number.isFinite(year) || year > yearTo) continue;
    }

    existingTmdbIds.add(Number(item.tmdbId));
    existingKeys.add(titleKey);
    stubs.push(stub);
  }

  if (query.sort === 'newest') {
    stubs.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
  } else if (query.sort === 'oldest') {
    stubs.sort((a, b) => (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999'));
  }

  return stubs;
}

/**
 * Merges a paginated MongoDB result page with global TMDB stubs without gaps or overlaps.
 * Local catalog films always appear first, followed by global TMDB films.
 * @param {{ localMovies?: any[], localTotal?: number, tmdbStubs?: any[], page?: number, limit?: number }} params
 */
export function mergePaginatedCatalog({ localMovies = [], localTotal = 0, tmdbStubs = [], page = 1, limit = 12 }) {
  const total = localTotal + tmdbStubs.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (localMovies.length >= limit || tmdbStubs.length === 0) {
    return {
      movies: localMovies.slice(0, limit),
      total,
      totalPages,
    };
  }

  const remainingSlots = limit - localMovies.length;
  const globalIndexStart = (page - 1) * limit;
  const tmdbOffset = Math.max(0, globalIndexStart - localTotal);
  const appendedTmdb = tmdbStubs.slice(tmdbOffset, tmdbOffset + remainingSlots);

  return {
    movies: [...localMovies, ...appendedTmdb],
    total,
    totalPages,
  };
}
