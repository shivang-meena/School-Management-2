import { z } from 'zod';

// Attendance
export const AttendanceStatusEnum = z.enum(['present', 'absent', 'late', 'half-day']);
export const MarkAttendanceSchema = z.object({
  date: z.string(),
  records: z.array(
    z.object({
      id: z.string(), // studentId or staffId
      status: AttendanceStatusEnum,
      remarks: z.string().optional(),
    })
  ),
});
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceSchema>;

// Fees
export const PaymentMethodEnum = z.enum(['Cash', 'Online', 'Bank', 'Cheque']);
export const RecordPaymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.number().positive(),
  method: PaymentMethodEnum,
  date: z.string().optional(),
  remarks: z.string().optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

// Exams
export const CreateExamSchema = z.object({
  name: z.string().min(2),
  class: z.string().min(1),
  section: z.string().min(1),
  subject: z.string().min(1),
  date: z.string(),
  totalMarks: z.number().positive(),
  published: z.boolean().default(false),
});
export type CreateExamInput = z.infer<typeof CreateExamSchema>;

export const EnterMarksSchema = z.object({
  examId: z.string(),
  marks: z.array(
    z.object({
      studentId: z.string(),
      obtained: z.number().min(0),
    })
  ),
});
export type EnterMarksInput = z.infer<typeof EnterMarksSchema>;

// Notices
export const NoticeAudienceEnum = z.enum(['All Users', 'All Students', 'Staff', 'Specific Class']);
export const CreateNoticeSchema = z.object({
  title: z.string().min(2),
  message: z.string().min(5),
  audience: NoticeAudienceEnum,
  specificClass: z.string().optional().nullable(),
  published: z.boolean().optional().default(true),
  date: z.string().optional(),
});
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;

// Accounts
export const TransactionTypeEnum = z.enum(['EXPENSE', 'INCOME']);
export const CreateTransactionSchema = z.object({
  type: TransactionTypeEnum,
  title: z.string().min(2),
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().optional(),
});
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
