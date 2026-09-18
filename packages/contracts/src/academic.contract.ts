import { z } from 'zod';

export const StudentAttendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'HALF_DAY']);
export const EmployeeAttendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'PAID_LEAVE', 'UNPAID_LEAVE', 'HOLIDAY', 'WEEKLY_OFF']);
export const AttendanceEntryStatusEnum = z.enum(['NONE', 'PRESENT', 'ABSENT', 'HALF_DAY']);
export const MarkAttendanceSchema = z.object({
  date: z.string(),
  sectionId: z.string().uuid().optional(),
  reason: z.string().optional(),
  records: z.array(z.object({ id: z.string(), status: AttendanceEntryStatusEnum, remarks: z.string().optional() })).min(1),
});
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceSchema>;

export const PaymentMethodEnum = z.enum(['CASH', 'ONLINE', 'BANK', 'CHEQUE', 'OTHER']);
export const RecordPaymentSchema = z.object({
  feeAccountId: z.string().uuid(),
  amount: z.number().positive(),
  method: PaymentMethodEnum,
  date: z.string(),
  reference: z.string().optional(),
  remarks: z.string().optional(),
  idempotencyKey: z.string().min(8),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

export const CreateExamSchema = z.object({
  academicYearId: z.string().uuid(), sectionId: z.string().uuid(), subjectId: z.string().uuid(),
  type: z.enum(['TEST', 'EXAM', 'ASSIGNMENT']), title: z.string().min(2), date: z.string(),
  startTime: z.string().optional(), durationMinutes: z.number().int().positive().optional(),
  maximumMarks: z.number().positive(), passMarks: z.number().min(0),
});
export type CreateExamInput = z.infer<typeof CreateExamSchema>;
export const EnterMarksSchema = z.object({
  assessmentId: z.string().uuid(),
  results: z.array(z.object({ studentId: z.string(), absent: z.boolean().default(false), marks: z.number().min(0).optional(), remarks: z.string().optional() })),
});
export type EnterMarksInput = z.infer<typeof EnterMarksSchema>;

export const NoticeAudienceEnum = z.enum(['ALL', 'EMPLOYEES', 'STUDENTS', 'SELECTED_SECTIONS']);
export const CreateNoticeSchema = z.object({
  title: z.string().min(2), message: z.string().min(5), audience: NoticeAudienceEnum,
  sectionIds: z.array(z.string().uuid()).optional(), published: z.boolean().default(false), expiresAt: z.string().optional(),
});
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;

export const TransactionTypeEnum = z.enum(['EXPENSE', 'INCOME']);
export const CreateTransactionSchema = z.object({
  type: TransactionTypeEnum, title: z.string().min(2), amount: z.number().positive(),
  date: z.string(), description: z.string().optional(), idempotencyKey: z.string().min(8),
});
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
