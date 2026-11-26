import { z } from 'zod';

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, 'Username must be 3-24 lowercase letters, numbers, or underscores'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters'),
  role: z.enum(['admin', 'critic', 'user']).optional().default('admin'),
  bio: z.string().trim().max(300).optional().default(''),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'blocked']),
  suspendDays: z.number().int().min(1).max(365).nullable().optional().default(null),
  reason: z.string().trim().max(300).optional().default(''),
});
