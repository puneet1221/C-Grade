import { z } from 'zod';

export const createListSchema = z.object({
  title: z.string().trim().min(2, 'List title must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().default(''),
  movies: z.array(z.string().trim().min(1)).optional().default([]),
  isPublic: z.boolean().optional().default(true),
});

export const updateListSchema = createListSchema.partial();
