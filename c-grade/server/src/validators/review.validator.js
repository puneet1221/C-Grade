import { z } from 'zod';

const halfStarSchema = z
  .number()
  .min(0.5, 'Minimum rating is 0.5 stars')
  .max(5.0, 'Maximum rating is 5.0 stars')
  .refine((val) => Math.round(val * 2) === val * 2, 'Rating must be in 0.5 increments');

export const createReviewSchema = z.object({
  rating: halfStarSchema,
  title: z.string().trim().max(140).optional().default(''),
  body: z.string().trim().min(10, 'Review must be at least 10 characters').max(5000),
  tags: z.array(z.string().trim().min(1).max(40)).max(6).optional().default([]),
  containsSpoilers: z.boolean().optional().default(false),
  watchedDate: z.string().optional(),
  isRewatch: z.boolean().optional().default(false),
});

export const updateReviewSchema = createReviewSchema.partial();

export const reportReviewSchema = z.object({
  reason: z.string().trim().min(4, 'Please provide a brief reason').max(300),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(2, 'Comment cannot be empty').max(1200),
  parentComment: z.string().trim().nullable().optional().default(null),
});

export const moderateReviewSchema = z.object({
  action: z.enum(['dismiss', 'remove']),
});
