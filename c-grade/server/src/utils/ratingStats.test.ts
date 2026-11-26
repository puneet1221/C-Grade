import assert from 'node:assert/strict';
import test from 'node:test';
import { computeRatingStats, isMovieReleased, slugify } from './ratingStats.js';
import { evaluatePasswordStrength, extractYouTubeEmbedUrl, getVerdictLabel } from '../../../../c-grade/client/src/utils/constants.js';
import {
  formatReleaseDate,
  formatRuntime,
  formatYear,
  isMovieReleased as isClientMovieReleased,
} from '../../../../c-grade/client/src/utils/formatters.js';

test('computeRatingStats calculates accurate average and 1..5 distribution', () => {
  const empty = computeRatingStats([]);
  assert.equal(empty.averageRating, 0);
  assert.equal(empty.ratingsCount, 0);

  const stats = computeRatingStats([5.0, 4.5, 4.0, 2.5, 1.0]);
  assert.equal(stats.ratingsCount, 5);
  assert.equal(stats.averageRating, 3.4);
  assert.deepEqual(stats.ratingDistribution, { 1: 1, 2: 0, 3: 1, 4: 1, 5: 2 });
});

test('computeRatingStats ignores out-of-range or NaN ratings', () => {
  const stats = computeRatingStats([5, -1, 6, NaN, 4]);
  assert.equal(stats.ratingsCount, 2);
  assert.equal(stats.averageRating, 4.5);
});

test('slugify generates clean URL slugs', () => {
  assert.equal(slugify('Dune: Part Two (2024)'), 'dune-part-two-2024');
  assert.equal(slugify('  3 Idiots  '), '3-idiots');
});

test('getVerdictLabel maps half-star increments accurately', () => {
  assert.equal(getVerdictLabel(5.0), 'Masterpiece');
  assert.equal(getVerdictLabel(4.5), 'Essential');
  assert.equal(getVerdictLabel(2.5), 'Mixed Bag');
  assert.equal(getVerdictLabel(0), 'Select Rating');
});

test('extractYouTubeEmbedUrl parses valid YouTube links and rejects unsafe schemes', () => {
  assert.equal(
    extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=Way9Dexny3w'),
    'https://www.youtube.com/embed/Way9Dexny3w?autoplay=1&rel=0'
  );
  assert.equal(
    extractYouTubeEmbedUrl('https://youtu.be/UsW95hX8GTQ'),
    'https://www.youtube.com/embed/UsW95hX8GTQ?autoplay=1&rel=0'
  );
  assert.equal(extractYouTubeEmbedUrl('javascript:alert(1)'), null);
  assert.equal(extractYouTubeEmbedUrl('https://evil.example.com/watch?v=123456'), null);
});

test('evaluatePasswordStrength and formatters produce expected output', () => {
  assert.equal(evaluatePasswordStrength('abc').score, 0);
  assert.equal(evaluatePasswordStrength('Cinema123!').score, 4);
  assert.equal(formatRuntime(166), '2h 46m');
  assert.equal(formatYear('2024-06-14T00:00:00.000Z'), '2024');
  assert.equal(formatReleaseDate('2026-12-18T00:00:00.000Z'), 'Dec 18, 2026');
  assert.equal(formatReleaseDate(null), 'TBA');
});

test('isMovieReleased blocks future, missing, canceled, and pre-release films', () => {
  const ref = new Date('2026-11-26T13:00:00.000Z');
  for (const fn of [isMovieReleased, isClientMovieReleased]) {
    assert.equal(fn({ releaseDate: '2024-06-14', releaseStatus: 'Released' }, ref), true);
    assert.equal(fn({ releaseDate: '2026-11-26', releaseStatus: 'Released' }, ref), true);
    assert.equal(fn({ releaseDate: '2026-12-18', releaseStatus: 'Post Production' }, ref), false);
    assert.equal(fn({ releaseDate: '2027-05-07', releaseStatus: 'Released' }, ref), false);
    assert.equal(fn({ releaseDate: '2026-11-26', releaseStatus: 'In Production' }, ref), false);
    assert.equal(fn({ releaseDate: null, releaseStatus: 'Planned' }, ref), false);
    assert.equal(fn({ releaseDate: '2020-01-01', releaseStatus: 'Canceled' }, ref), false);
  }
});
