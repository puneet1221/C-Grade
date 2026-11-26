import { z } from 'zod';

const safeAssetOrHttpUrl = z
  .string()
  .trim()
  .refine(
    (val) =>
      val === '' ||
      val.startsWith('https://') ||
      val.startsWith('http://') ||
      val.startsWith('/src/assets/') ||
      val.startsWith('/posters/'),
    'URL must start with https://, http://, or a valid local asset path'
  );

const INDUSTRIES = [
  'Hollywood',
  'Bollywood',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Korean',
  'Japanese',
  'World Cinema',
];

export const createMovieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(180),
  tagline: z.string().trim().max(240).optional().default(''),
  overview: z.string().trim().min(10, 'Overview must be at least 10 characters').max(4000),
  posterUrl: safeAssetOrHttpUrl.optional().default(''),
  backdropUrl: safeAssetOrHttpUrl.optional().default(''),
  trailerUrl: safeAssetOrHttpUrl.optional().default(''),
  releaseDate: z.string().min(4, 'Release date is required'),
  runtime: z.coerce.number().int().min(1).max(600).default(120),
  genres: z.array(z.string().trim().min(1)).min(1, 'At least one genre is required'),
  language: z.string().trim().min(2).max(60).default('English'),
  industry: z.enum(INDUSTRIES).default('Hollywood'),
  director: z.string().trim().min(2, 'Director is required').max(120),
  cast: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        character: z.string().trim().optional().default(''),
        profileUrl: safeAssetOrHttpUrl.optional().default(''),
      })
    )
    .optional()
    .default([]),
  featured: z.boolean().optional().default(false),
});

export const updateMovieSchema = createMovieSchema.partial();
