import axios from 'axios';
import { env } from '../config/env.js';
import { Movie } from '../models/Movie.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/ratingStats.js';
import {
  LANGUAGE_TO_INDUSTRY,
  mapTmdbGenreIds,
  resolveIndustryFromLanguage,
} from '../utils/hybridSearch.js';
import { recalculateMovieRatings } from './review.service.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

/**
 * Curated world-cinema additions fetched automatically when TMDB_API_KEY is active
 * so every industry row and Hero Spotlight feels richly populated with real cinema art.
 */
const CURATED_TMDB_ADDITIONS = [
  {
    title: 'Interstellar',
    year: 2014,
    industry: 'Hollywood',
    featured: true,
    review: {
      username: 'elena_vance',
      rating: 5.0,
      title: 'A cathedral of time, gravity, and aching human devotion',
      body: 'Hans Zimmer’s pipe organ and Hoyte van Hoytema’s 70mm IMAX frames turn cosmic relativity into the most intimate father-daughter story Nolan has ever told.',
      tags: ['Masterclass Cinematography'],
    },
  },
  {
    title: 'Blade Runner 2049',
    year: 2017,
    industry: 'Hollywood',
    featured: true,
    review: {
      username: 'elena_vance',
      rating: 5.0,
      title: 'Roger Deakins paints neon loneliness in amber and ash',
      body: 'Every silhouette inside the sea wall and Las Vegas haze feels sculpted out of memory itself. Slow-burn sci-fi of staggering visual discipline.',
      tags: ['Masterclass Cinematography', 'Slow Burn'],
    },
  },
  {
    title: 'Everything Everywhere All at Once',
    year: 2022,
    industry: 'Hollywood',
    featured: false,
    review: {
      username: 'meera_nair',
      rating: 4.5,
      title: 'Maximalist multiverse chaos with a quiet, tender center',
      body: 'Michelle Yeoh holds a whirlwind of surreal editing together with fierce vulnerability—it earns both its absurdist laughs and its laundromat tears.',
      tags: ['Mass Entertainer'],
    },
  },
  {
    title: '12th Fail',
    year: 2023,
    industry: 'Bollywood',
    featured: false,
    review: {
      username: 'arjun_mehta',
      rating: 5.0,
      title: 'Unvarnished grit and earned triumph without melodrama',
      body: 'Vikrant Massey’s restraint turns every cramped Mukherjee Nagar study room into a pressure cooker of dignity and stubborn hope.',
      tags: ['Slow Burn'],
    },
  },
  {
    title: 'Sardar Udham',
    year: 2021,
    industry: 'Bollywood',
    featured: false,
    review: {
      username: 'elena_vance',
      rating: 4.5,
      title: 'Haunting archival precision and devastating historical weight',
      body: 'Shoojit Sircar refuses easy jingoism, letting Avik Mukhopadhyay’s wintry London frames and that harrowing Jallianwala Bagh sequence linger for days.',
      tags: ['Masterclass Cinematography', 'Slow Burn'],
    },
  },
  {
    title: 'Swades',
    year: 2004,
    industry: 'Bollywood',
    featured: false,
    review: {
      username: 'arjun_mehta',
      rating: 5.0,
      title: 'A quiet, luminous homecoming that grows deeper every year',
      body: 'Ashutosh Gowariker gives Shah Rukh Khan his finest, least theatrical performance—anchored by A.R. Rahman’s timeless score.',
      tags: ['Slow Burn'],
    },
  },
  {
    title: 'Vada Chennai',
    year: 2018,
    industry: 'Tamil',
    featured: false,
    review: {
      username: 'arjun_mehta',
      rating: 5.0,
      title: 'Novelistic gangster saga spanning three decades of coastal politics',
      body: 'Vetrimaaran weaves dozens of betrayals across timelines without losing a single emotional thread. Santosh Narayanan’s score hums like an approaching storm.',
      tags: ['Plot Twist', 'Masterclass Cinematography'],
    },
  },
  {
    title: 'Kaithi',
    year: 2019,
    industry: 'Tamil',
    featured: false,
    review: {
      username: 'meera_nair',
      rating: 4.5,
      title: 'One relentless midnight siege with zero wasted frames',
      body: 'No songs, no detours—just Karthi driving a lorry through pitch-black rain with iron-clad momentum.',
      tags: ['Mass Entertainer'],
    },
  },
  {
    title: 'Super Deluxe',
    year: 2019,
    industry: 'Tamil',
    featured: false,
    review: {
      username: 'arjun_mehta',
      rating: 4.5,
      title: 'Audacious dark comedy colliding across four bizarre Chennai nights',
      body: 'Thiagarajan Kumararaja juggles moral philosophy, razor-sharp satire, and electric performances from Vijay Sethupathi and Fahadh Faasil.',
      tags: ['Plot Twist'],
    },
  },
  {
    title: 'Baahubali 2: The Conclusion',
    year: 2017,
    industry: 'Telugu',
    featured: false,
    review: {
      username: 'kenji_sato',
      rating: 4.5,
      title: 'Operatic myth-making scaled to thunderous perfection',
      body: 'Rajamouli commits completely to grand folklore stakes, delivering palace intrigue and battlefield spectacle at towering scale.',
      tags: ['Mass Entertainer'],
    },
  },
  {
    title: 'C/o Kancharapalem',
    year: 2018,
    industry: 'Telugu',
    featured: false,
    review: {
      username: 'meera_nair',
      rating: 5.0,
      title: 'Four tender love stories stitched into one unforgettable reveal',
      body: 'Non-professional actors bring astonishing warmth to every sunlit Visakhapatnam lane before the closing revelation ties everything together.',
      tags: ['Plot Twist', 'Slow Burn'],
    },
  },
  {
    title: 'Aavesham',
    year: 2024,
    industry: 'Malayalam',
    featured: false,
    review: {
      username: 'arjun_mehta',
      rating: 4.5,
      title: 'Fahadh Faasil turns wild campus comedy into electric theatre',
      body: 'A riotous crowd-pleaser powered by Sushin Shyam’s basslines and a surprisingly lonely heart underneath Ranga’s white sunglasses.',
      tags: ['Mass Entertainer'],
    },
  },
  {
    title: 'Drishyam',
    year: 2013,
    industry: 'Malayalam',
    featured: false,
    review: {
      username: 'meera_nair',
      rating: 4.5,
      title: 'A meticulous alibi puzzle anchored by ordinary family desperation',
      body: 'Jeethu Joseph builds tension patiently from mundane small-town routines until every date and bus ticket becomes a high-wire act.',
      tags: ['Plot Twist', 'Slow Burn'],
    },
  },
  {
    title: 'Memories of Murder',
    year: 2003,
    industry: 'Korean',
    featured: false,
    review: {
      username: 'kenji_sato',
      rating: 5.0,
      title: 'Bong Joon-ho’s haunting masterpiece of obsession and rain-soaked dread',
      body: 'Starts as dark procedural farce before tightening into one of the most devastating final close-ups in world cinema.',
      tags: ['Masterclass Cinematography', 'Slow Burn'],
    },
  },
  {
    title: 'Decision to Leave',
    year: 2022,
    industry: 'Korean',
    featured: false,
    review: {
      username: 'elena_vance',
      rating: 4.5,
      title: 'Hitchcockian romance cut with razor-sharp digital poetry',
      body: 'Park Chan-wook turns smartphone voice memos and mountain mist into pure yearning.',
      tags: ['Masterclass Cinematography'],
    },
  },
  {
    title: 'Your Name.',
    year: 2016,
    industry: 'Japanese',
    featured: false,
    review: {
      username: 'kenji_sato',
      rating: 5.0,
      title: 'Twilight comets, aching nostalgia, and luminous animation craft',
      body: 'Makoto Shinkai and RADWIMPS capture the bittersweet ache of searching for someone whose name is slipping from memory.',
      tags: ['Plot Twist', 'Masterclass Cinematography'],
    },
  },
  {
    title: 'Perfect Days',
    year: 2023,
    industry: 'Japanese',
    featured: false,
    review: {
      username: 'elena_vance',
      rating: 4.5,
      title: 'Koji Yakusho finds quiet transcendence in Tokyo’s morning light',
      body: 'Wim Wenders turns cassette tapes, paperback books, and dappled tree shadows into a deeply restorative meditation on presence.',
      tags: ['Slow Burn'],
    },
  },
];

let syncInFlightPromise = null;
const importInFlightByTmdbId = new Map();

/**
 * Ensures TMDB_API_KEY is configured before calling external TMDB endpoints.
 */
function assertTmdbConfigured() {
  if (!env.TMDB_API_KEY) {
    throw new AppError(
      'TMDB_API_KEY is not configured on the server. Add it to .env or use manual movie creation.',
      503
    );
  }
}

/**
 * Fetches full TMDB movie payload including credits and trailers.
 * @param {number} numericId
 */
async function fetchTmdbMovieDetails(numericId) {
  const { data } = await axios.get(`${TMDB_BASE_URL}/movie/${numericId}`, {
    params: {
      api_key: env.TMDB_API_KEY,
      append_to_response: 'credits,videos',
    },
    timeout: 10000,
  });

  const directorEntry = (data.credits?.crew || []).find((member) => member.job === 'Director');
  const trailerEntry =
    (data.videos?.results || []).find(
      (vid) => vid.site === 'YouTube' && vid.type === 'Trailer' && vid.official
    ) ||
    (data.videos?.results || []).find(
      (vid) => vid.site === 'YouTube' && (vid.type === 'Trailer' || vid.type === 'Teaser')
    );

  const langInfo = LANGUAGE_TO_INDUSTRY[data.original_language] || {
    language: (data.spoken_languages?.[0]?.english_name || data.original_language || 'International').trim(),
    industry: 'World Cinema',
  };

  return {
    data,
    directorEntry,
    trailerEntry,
    langInfo,
  };
}

/**
 * Finds the closest TMDB movie match for a given title and optional release year.
 * @param {string} title
 * @param {number | undefined} year
 */
async function findBestTmdbMatch(title, year) {
  const params = {
    api_key: env.TMDB_API_KEY,
    query: title,
    include_adult: false,
    page: 1,
  };
  if (year && Number.isFinite(year)) {
    params.primary_release_year = year;
  }

  let { data } = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
    params,
    timeout: 8000,
  });

  if ((!data?.results || data.results.length === 0) && params.primary_release_year) {
    delete params.primary_release_year;
    ({ data } = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params,
      timeout: 8000,
    }));
  }

  const results = data?.results || [];
  if (results.length === 0) return null;

  const lowerTitle = title.toLowerCase();
  const exact = results.find((r) => String(r.title || '').toLowerCase() === lowerTitle);
  return exact || results[0];
}

/**
 * Searches TMDB's global movie catalog with normalized industry, language, and genres.
 * @param {string} query
 * @param {{ page?: number }} [options]
 */
export async function searchTmdbCatalog(query, { page = 1 } = {}) {
  assertTmdbConfigured();
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    return { results: [], totalResults: 0, totalPages: 1 };
  }

  const { data } = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
    params: {
      api_key: env.TMDB_API_KEY,
      query: trimmed,
      include_adult: false,
      page: Math.max(1, Number(page) || 1),
    },
    timeout: 8000,
  });

  const results = (data.results || []).map((item) => {
    const langInfo = resolveIndustryFromLanguage(item.original_language);
    return {
      tmdbId: item.id,
      title: item.title,
      releaseDate: item.release_date || '',
      overview: item.overview || '',
      posterUrl: item.poster_path ? `${TMDB_IMG_BASE}/w500${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `${TMDB_IMG_BASE}/w1280${item.backdrop_path}` : '',
      originalLanguage: item.original_language || 'en',
      language: langInfo.language,
      industry: langInfo.industry,
      genreIds: item.genre_ids || [],
      genres: mapTmdbGenreIds(item.genre_ids || []),
      voteAverage: item.vote_average || 0,
    };
  });

  return {
    results,
    totalResults: Number(data.total_results) || results.length,
    totalPages: Number(data.total_pages) || 1,
  };
}

/**
 * Proxies movie search requests to TMDB API v3 keeping TMDB_API_KEY strictly server-side.
 * @param {string} query
 */
export async function searchTmdbMovies(query) {
  const { results } = await searchTmdbCatalog(query, { page: 1 });
  return results.slice(0, 12);
}

/**
 * Fetches full TMDB movie metadata (credits + YouTube trailer) and upserts it into MongoDB.
 * Concurrent calls for the same tmdbId coalesce cleanly onto one in-flight import.
 * @param {number | string} tmdbId
 * @param {{ industryOverride?: string, featured?: boolean }} [options]
 */
export async function importTmdbMovie(tmdbId, options = {}) {
  assertTmdbConfigured();

  const numericId = Number(tmdbId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new AppError('Invalid TMDB movie ID.', 400);
  }

  const hasCustomOptions =
    Boolean(options.industryOverride) || typeof options.featured === 'boolean';
  if (!hasCustomOptions && importInFlightByTmdbId.has(numericId)) {
    return importInFlightByTmdbId.get(numericId);
  }

  const runImport = async () => {
    let details;
    try {
      details = await fetchTmdbMovieDetails(numericId);
    } catch (err) {
      if (err?.response?.status === 404) {
        throw new AppError('Film not found.', 404);
      }
      throw err;
    }

    const { data, directorEntry, trailerEntry, langInfo } = details;
    const releaseYear = data.release_date ? data.release_date.slice(0, 4) : '';
    const baseSlug = slugify(`${data.title}${releaseYear ? `-${releaseYear}` : ''}`) || `film-${numericId}`;

    // Ensure slug uniqueness if importing a title with colliding slug
    let slug = baseSlug;
    const existingBySlug = await Movie.findOne({ slug, tmdbId: { $ne: numericId } });
    if (existingBySlug) {
      slug = `${baseSlug}-${numericId}`;
    }

    const moviePayload = {
      tmdbId: numericId,
      slug,
      title: data.title,
      tagline: data.tagline || '',
      overview: data.overview || 'Synopsis coming soon.',
      posterUrl: data.poster_path ? `${TMDB_IMG_BASE}/w500${data.poster_path}` : '',
      backdropUrl: data.backdrop_path ? `${TMDB_IMG_BASE}/w1280${data.backdrop_path}` : '',
      trailerUrl: trailerEntry ? `https://www.youtube.com/watch?v=${trailerEntry.key}` : '',
      releaseDate: data.release_date ? new Date(data.release_date) : null,
      releaseStatus: data.status || (data.release_date ? 'Released' : 'Planned'),
      runtime: data.runtime || 120,
      genres: (data.genres || []).map((g) => (g.name === 'Science Fiction' ? 'Sci-Fi' : g.name)),
      language: langInfo.language,
      industry: options.industryOverride || langInfo.industry,
      director: directorEntry?.name || 'Unknown',
      cast: (data.credits?.cast || []).slice(0, 10).map((actor) => ({
        name: actor.name,
        character: actor.character || '',
        profileUrl: actor.profile_path ? `${TMDB_IMG_BASE}/w185${actor.profile_path}` : '',
      })),
    };

    if (typeof options.featured === 'boolean') {
      moviePayload.featured = options.featured;
    }

    try {
      const movie = await Movie.findOneAndUpdate(
        { tmdbId: numericId },
        { $set: moviePayload },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return movie;
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await Movie.findOne({ tmdbId: numericId });
        if (existing) return existing;
      }
      throw err;
    }
  };

  if (hasCustomOptions) {
    return runImport();
  }

  const promise = runImport().finally(() => {
    importInFlightByTmdbId.delete(numericId);
  });
  importInFlightByTmdbId.set(numericId, promise);
  return promise;
}

/**
 * Enriches existing catalog films with high-resolution TMDB posters, backdrops,
 * cast portraits, and trailers, and imports curated world-cinema additions when TMDB_API_KEY is active.
 * @param {{ force?: boolean }} [options]
 */
export async function enrichCatalogFromTmdb({ force = false } = {}) {
  if (!env.TMDB_API_KEY) {
    return { skipped: true, enrichedCount: 0, importedCount: 0 };
  }

  if (syncInFlightPromise) {
    return syncInFlightPromise;
  }

  syncInFlightPromise = (async () => {
    let enrichedCount = 0;
    let importedCount = 0;

    // 1. Enrich seeded / existing films missing TMDB artwork or cast headshots
    const candidates = await Movie.find(
      force
        ? {}
        : {
            $or: [
              { tmdbId: null },
              { tmdbId: { $exists: false } },
              { posterUrl: { $regex: '^/src/assets/' } },
              { backdropUrl: { $regex: '^/src/assets/' } },
            ],
          }
    ).lean();

    for (let i = 0; i < candidates.length; i += 4) {
      const batch = candidates.slice(i, i + 4);
      await Promise.all(
        batch.map(async (existing) => {
          try {
            let tmdbId = existing.tmdbId;
            if (!tmdbId) {
              const year = existing.releaseDate
                ? new Date(existing.releaseDate).getUTCFullYear()
                : undefined;
              const match = await findBestTmdbMatch(existing.title, year);
              if (!match?.id) return;
              tmdbId = match.id;
            }

            const { data, trailerEntry } = await fetchTmdbMovieDetails(tmdbId);
            const updates = { tmdbId };

            if (data.poster_path) {
              updates.posterUrl = `${TMDB_IMG_BASE}/w500${data.poster_path}`;
            }
            if (data.backdrop_path) {
              updates.backdropUrl = `${TMDB_IMG_BASE}/w1280${data.backdrop_path}`;
            }
            if (data.tagline && (!existing.tagline || force)) {
              updates.tagline = data.tagline;
            }
            if (trailerEntry) {
              updates.trailerUrl = `https://www.youtube.com/watch?v=${trailerEntry.key}`;
            }
            if (Array.isArray(data.credits?.cast) && data.credits.cast.length > 0) {
              updates.cast = data.credits.cast.slice(0, 10).map((actor) => ({
                name: actor.name,
                character: actor.character || '',
                profileUrl: actor.profile_path ? `${TMDB_IMG_BASE}/w185${actor.profile_path}` : '',
              }));
            }

            await Movie.findByIdAndUpdate(existing._id, { $set: updates });
            enrichedCount += 1;
          } catch (err) {
            console.warn(`[TMDB] Failed enriching "${existing.title}":`, err.message);
          }
        })
      );
    }

    // 2. Import curated multi-industry world cinema titles if not already in catalog
    const criticUsers = await User.find({
      username: { $in: ['elena_vance', 'arjun_mehta', 'meera_nair', 'kenji_sato'] },
    })
      .select('_id username')
      .lean();
    const userByUsername = new Map(criticUsers.map((u) => [u.username, u]));

    for (let i = 0; i < CURATED_TMDB_ADDITIONS.length; i += 4) {
      const batch = CURATED_TMDB_ADDITIONS.slice(i, i + 4);
      await Promise.all(
        batch.map(async (item) => {
          try {
            const existsByTitle = await Movie.findOne({
              title: new RegExp(`^${item.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            }).lean();
            if (existsByTitle && !force) {
              return;
            }

            const match = await findBestTmdbMatch(item.title, item.year);
            if (!match?.id) return;

            const movie = await importTmdbMovie(match.id, {
              industryOverride: item.industry,
              featured: Boolean(item.featured),
            });

            if (!existsByTitle) {
              importedCount += 1;
            }

            // Seed one editorial critic review on newly added films so every card & histogram shines
            if (item.review && userByUsername.has(item.review.username)) {
              const author = userByUsername.get(item.review.username);
              const existingRevCount = await Review.countDocuments({ movie: movie._id });
              if (existingRevCount === 0) {
                await Review.create({
                  movie: movie._id,
                  author: author._id,
                  rating: item.review.rating,
                  title: item.review.title,
                  body: item.review.body,
                  tags: item.review.tags || [],
                  containsSpoilers: false,
                  likes: [],
                  likesCount: 0,
                });
                await recalculateMovieRatings(movie._id);
              }
            }
          } catch (err) {
            console.warn(`[TMDB] Failed importing "${item.title}":`, err.message);
          }
        })
      );
    }

    if (enrichedCount > 0 || importedCount > 0) {
      console.log(
        `[TMDB] Catalog sync complete — enriched ${enrichedCount} existing films, imported ${importedCount} curated titles.`
      );
    }

    return { skipped: false, enrichedCount, importedCount };
  })().finally(() => {
    syncInFlightPromise = null;
  });

  return syncInFlightPromise;
}
