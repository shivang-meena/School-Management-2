import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  CreateStudentInput,
  CreateStaffInput,
  RecordPaymentInput,
  CreateNoticeInput,
  CreateExamInput,
  MarkAttendanceInput,
  PendingRegistrationInput,
} from '@erp/contracts';

// Query Keys
export const QUERY_KEYS = {
  students: 'students',
  classes: 'classes',
  staff: 'staff',
  feesOverview: 'fees-overview',
  feePayments: 'fee-payments',
  studentFees: 'student-fees',
  notices: 'notices',
  exams: 'exams',
  studentReport: 'student-report',
  accountsOverview: 'accounts-overview',
  attendance: 'attendance',
  registrations: 'registrations',
};

// Students
export const useStudents = (filters?: { class?: string; section?: string; search?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.students, filters],
    queryFn: async () => {
      const { data } = await api.get('/students', { params: filters });
      return data;
    },
  });
};

export const useClasses = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.classes],
    queryFn: async () => {
      const { data } = await api.get('/students/classes');
      return data;
    },
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentInput) => {
      const { data } = await api.post('/students', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
    },
  });
};

// Staff
export const useStaff = (filters?: { designation?: string; search?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.staff, filters],
    queryFn: async () => {
      const { data } = await api.get('/staff', { params: filters });
      return data;
    },
  });
};

export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      const { data } = await api.post('/staff', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.staff] });
    },
  });
};

// Fees
export const useFeesOverview = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.feesOverview],
    queryFn: async () => {
      const { data } = await api.get('/fees/overview');
      return data;
    },
  });
};

export const useFeePayments = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.feePayments],
    queryFn: async () => {
      const { data } = await api.get('/fees/payments');
      return data;
    },
  });
};

export const useStudentFees = (studentId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.studentFees, studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data } = await api.get(`/fees/student/${studentId}`);
      return data;
    },
    enabled: !!studentId,
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      const { data } = await api.post('/fees/pay', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.feesOverview] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.feePayments] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
    },
  });
};

// Notices
export const useNotices = (role?: string, studentClass?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.notices, role, studentClass],
    queryFn: async () => {
      const { data } = await api.get('/notices', {
        params: { role, class: studentClass },
      });
      return data;
    },
  });
};

export const useCreateNotice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNoticeInput) => {
      const { data } = await api.post('/notices', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.notices] });
    },
  });
};

// Exams
export const useExams = (filters?: { class?: string; section?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.exams, filters],
    queryFn: async () => {
      const { data } = await api.get('/exams', { params: filters });
      return data;
    },
  });
};

export const useStudentReport = (studentId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.studentReport, studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data } = await api.get(`/exams/student/${studentId}`);
      return data;
    },
    enabled: !!studentId,
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExamInput) => {
      const { data } = await api.post('/exams', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.exams] });
    },
  });
};

// Accounts
export const useAccountsOverview = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.accountsOverview],
    queryFn: async () => {
      const { data } = await api.get('/accounts/overview');
      return data;
    },
  });
};

// Attendance
export const useAttendanceByDate = (targetType: 'STUDENT' | 'STAFF', date: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.attendance, targetType, date],
    queryFn: async () => {
      const { data } = await api.get(`/attendance/${targetType}/date`, {
        params: { date },
      });
      return data;
    },
  });
};

export const useIndividualAttendance = (targetType: 'STUDENT' | 'STAFF', id?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.attendance, targetType, id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/attendance/${targetType}/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      targetType,
      data,
    }: {
      targetType: 'STUDENT' | 'STAFF';
      data: MarkAttendanceInput;
    }) => {
      const response = await api.post(`/attendance/${targetType}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.attendance] });
    },
  });
};

// Admissions
export const useSubmitAdmission = () => {
  return useMutation({
    mutationFn: async (input: PendingRegistrationInput) => {
      const { data } = await api.post('/students/register-admission', input);
      return data;
    },
  });
};
