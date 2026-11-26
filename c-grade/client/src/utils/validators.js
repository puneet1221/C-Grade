import { z } from 'zod';

export const loginFormSchema = z.object({
  identifier: z.string().trim().min(2, 'Enter your email or @username'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerFormSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, '3-24 lowercase letters, numbers, or underscores'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const verifyEmailFormSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit verification code sent to your email'),
});

export const forgotPasswordFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
