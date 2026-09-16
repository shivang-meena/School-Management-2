import { z } from 'zod';

export const RoleEnum = z.enum(['ADMIN', 'STAFF', 'STUDENT']);
export type Role = z.infer<typeof RoleEnum>;

export const LoginSchema = z.object({
  userId: z.string().min(1, 'User ID / Email is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: RoleEnum.optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().nullable().optional(),
  name: z.string(),
  role: RoleEnum,
  studentId: z.string().optional(),
  staffId: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserProfileSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
