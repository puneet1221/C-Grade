import { z } from 'zod';

const safeImageUrl = z
  .string()
  .trim()
  .refine(
    (val) =>
      val === '' ||
      val.startsWith('https://') ||
      val.startsWith('http://') ||
      val.startsWith('/src/assets/') ||
      val.startsWith('/posters/'),
    'Must be a valid http(s) or local asset URL'
  );

export const registerSchema = z.object({
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
  avatarUrl: safeImageUrl.optional().default(''),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be a 6-digit number'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(2, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});
