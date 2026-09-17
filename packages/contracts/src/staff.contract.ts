import { z } from 'zod';

export const EmployeeSubRoleEnum = z.enum(['TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'OTHER']);
export const CreateStaffSchema = z.object({
  name: z.string().min(2),
  subRole: EmployeeSubRoleEnum,
  designation: z.string().min(2),
  primarySubjectId: z.string().uuid().optional().nullable(),
  joiningDate: z.string(),
  mobile: z.string().min(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1),
  baseSalary: z.number().positive(),
  canMarkStudentAttendance: z.boolean().default(false),
  canMarkEmployeeAttendance: z.boolean().default(false),
  password: z.string().min(8).optional(),
});
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export const UpdateStaffSchema = CreateStaffSchema.omit({ baseSalary: true, password: true }).partial();
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
