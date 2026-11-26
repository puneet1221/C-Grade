import { z } from 'zod';

const safeAvatarUrl = z
  .string()
  .trim()
  .refine(
    (val) =>
      val === '' ||
      val.startsWith('https://') ||
      val.startsWith('http://') ||
      val.startsWith('/src/assets/'),
    'Avatar URL must start with https://, http://, or a valid local asset path'
  );

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
  bio: z.string().trim().max(300).optional(),
  avatarUrl: safeAvatarUrl.optional(),
  favoriteMovies: z
    .array(z.string().trim().min(1))
    .max(4, 'You can select up to 4 favorite films')
    .optional(),
});
