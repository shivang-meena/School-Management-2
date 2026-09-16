import { z } from 'zod';

export const GenderEnum = z.enum(['Male', 'Female', 'Other']);

export const CreateStudentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  name: z.string().min(2, 'Name is required'),
  dob: z.string(),
  gender: GenderEnum,
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  previousSchool: z.string().optional().nullable(),
  class: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  rollNo: z.number().int().positive(),
  parentName: z.string().min(2, 'Parent name is required'),
  parentMobile: z.string().min(10, 'Parent mobile is required'),
  password: z.string().min(6).optional(),
});
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = CreateStudentSchema.partial().omit({ studentId: true });
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

export const PendingRegistrationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  dob: z.string(),
  gender: GenderEnum,
  mobile: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(1),
  previousSchool: z.string().optional().nullable(),
  applyingClass: z.string().min(1),
  parentName: z.string().min(2),
  parentMobile: z.string().min(10),
});
export type PendingRegistrationInput = z.infer<typeof PendingRegistrationSchema>;
