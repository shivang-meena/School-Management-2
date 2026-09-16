import { z } from 'zod';

export const CreateStaffSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  name: z.string().min(2, 'Name is required'),
  designation: z.string().min(1, 'Designation is required'),
  joiningDate: z.string(),
  baseSalary: z.number().positive('Base salary must be greater than 0'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  assignedClass: z.string().optional().nullable(),
  assignedSection: z.string().optional().nullable(),
  assignedSubject: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
});
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffSchema = CreateStaffSchema.partial().omit({ staffId: true });
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
