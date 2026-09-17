import { z } from 'zod';

export const GenderEnum = z.enum(['Male', 'Female', 'Other']);

export const CreateStudentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  dob: z.string(),
  gender: GenderEnum,
  mobile: z.string().min(10, 'Mobile must be at least 10 digits').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  guardianName: z.string().min(2, 'Guardian name is required'),
  guardianContact: z.string().min(10, 'Guardian contact is required'),
  admissionDate: z.string(),
  academicYearId: z.string().uuid(),
  sectionId: z.string().uuid(),
  rollNumber: z.number().int().positive(),
  password: z.string().min(8).optional(),
});
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = CreateStudentSchema.omit({ password: true }).partial();
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

export const PendingRegistrationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  dob: z.string(),
  gender: GenderEnum,
  mobile: z.string().min(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1),
  previousSchool: z.string().optional().nullable(),
  applyingClass: z.string().min(1),
  guardianName: z.string().min(2),
  guardianContact: z.string().min(10),
});
export type PendingRegistrationInput = z.infer<typeof PendingRegistrationSchema>;
