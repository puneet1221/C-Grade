import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeAndFilterTmdbResults,
  mapTmdbGenreIds,
  mergePaginatedCatalog,
  parseTmdbSlug,
  resolveIndustryFromLanguage,
} from './hybridSearch.js';

test('parseTmdbSlug extracts valid positive TMDB IDs and rejects invalid values', () => {
  assert.equal(parseTmdbSlug('tmdb-27205'), 27205);
  assert.equal(parseTmdbSlug('TMDB-550'), 550);
  assert.equal(parseTmdbSlug('interstellar-2014'), null);
  assert.equal(parseTmdbSlug('tmdb-0'), null);
  assert.equal(parseTmdbSlug('tmdb-abc'), null);
});

test('resolveIndustryFromLanguage and mapTmdbGenreIds normalize TMDB metadata', () => {
  assert.deepEqual(resolveIndustryFromLanguage('ta'), { language: 'Tamil', industry: 'Tamil' });
  assert.deepEqual(resolveIndustryFromLanguage('fr'), { language: 'FR', industry: 'World Cinema' });
  assert.deepEqual(mapTmdbGenreIds([28, 878, 12, 878]), ['Action', 'Sci-Fi', 'Adventure']);
});

test('dedupeAndFilterTmdbResults removes local duplicates and enforces filters', () => {
  const existing = [
    { tmdbId: 157336, title: 'Interstellar', releaseDate: '2014-11-05' },
    { title: 'Maharaja', releaseDate: '2024-06-14' },
  ];

  const tmdbHits = [
    {
      tmdbId: 157336,
      title: 'Interstellar',
      releaseDate: '2014-11-05',
      originalLanguage: 'en',
      genreIds: [12, 18, 878],
    },
    {
      tmdbId: 999111,
      title: 'Maharaja',
      releaseDate: '2024-06-14',
      originalLanguage: 'ta',
      genreIds: [53, 80],
    },
    {
      tmdbId: 27205,
      title: 'Inception',
      releaseDate: '2010-07-15',
      originalLanguage: 'en',
      genreIds: [28, 878, 12],
    },
    {
      tmdbId: 550,
      title: 'Fight Club',
      releaseDate: '1999-10-15',
      originalLanguage: 'en',
      genreIds: [18],
    },
  ];

  const unfiltered = dedupeAndFilterTmdbResults(tmdbHits, existing, {});
  assert.deepEqual(
    unfiltered.map((m) => m.title),
    ['Inception', 'Fight Club']
  );
  assert.equal(unfiltered[0].slug, 'tmdb-27205');
  assert.equal(unfiltered[0].industry, 'Hollywood');

  const sciFiOnly = dedupeAndFilterTmdbResults(tmdbHits, existing, { genre: 'Sci-Fi', yearFrom: '2005' });
  assert.deepEqual(
    sciFiOnly.map((m) => m.title),
    ['Inception']
  );
});

test('mergePaginatedCatalog fills partial local pages with TMDB stubs seamlessly across pages', () => {
  const stubs = Array.from({ length: 15 }, (_, i) => ({ _id: `tmdb-${i + 1}`, title: `TMDB ${i + 1}` }));

  const page1 = mergePaginatedCatalog({
    localMovies: [{ _id: 'local-1', title: 'Local 1' }],
    localTotal: 1,
    tmdbStubs: stubs,
    page: 1,
    limit: 12,
  });
  assert.equal(page1.total, 16);
  assert.equal(page1.totalPages, 2);
  assert.equal(page1.movies.length, 12);
  assert.equal(page1.movies[0]._id, 'local-1');
  assert.equal(page1.movies[1]._id, 'tmdb-1');
  assert.equal(page1.movies[11]._id, 'tmdb-11');

  const page2 = mergePaginatedCatalog({
    localMovies: [],
    localTotal: 1,
    tmdbStubs: stubs,
    page: 2,
    limit: 12,
  });
  assert.equal(page2.movies.length, 4);
  assert.equal(page2.movies[0]._id, 'tmdb-12');
  assert.equal(page2.movies[3]._id, 'tmdb-15');
});
