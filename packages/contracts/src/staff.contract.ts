import { z } from 'zod';

export const EmployeeSubRoleEnum = z.enum(['TEACHER', 'ACCOUNTANT', 'STAFF']);
export const CreateStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  subRole: EmployeeSubRoleEnum,
  designation: z.string().min(2, 'Designation is required'),
  primarySubjectId: z.string().uuid().optional().nullable(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits').optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  baseSalary: z.number().positive('Base salary must be greater than 0'),
  canMarkStudentAttendance: z.boolean().default(false),
  canMarkEmployeeAttendance: z.boolean().default(false),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
});
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export const UpdateStaffSchema = CreateStaffSchema.omit({ baseSalary: true, password: true }).partial();
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
