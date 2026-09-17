import { z } from 'zod';

export const RoleEnum = z.enum(['ADMIN', 'EMPLOYEE', 'STUDENT']);
export type Role = z.infer<typeof RoleEnum>;

export const LoginSchema = z.object({
  userId: z.string().min(1, 'User ID / Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: RoleEnum.optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  loginId: z.string(),
  email: z.string().nullable().optional(),
  name: z.string(),
  role: RoleEnum,
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  mustChangePassword: z.boolean(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserProfileSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
