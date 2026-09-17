import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

const query = (key: string, url: string, params?: unknown, enabled = true) => useQuery<any>({ queryKey: [key, params], queryFn: async () => (await api.get(url, { params })).data, enabled });
const mutation = (url: string, invalidate: string[]) => { const client = useQueryClient(); return useMutation({ mutationFn: async (input: any) => (await api.post(url, input)).data, onSuccess: () => invalidate.forEach((key) => client.invalidateQueries({ queryKey: [key] })) }); };

export const useStudents = (filters?: any) => query('students', '/students', filters);
export const useClasses = () => query('academics', '/academics');
export const useCreateStudent = () => mutation('/students', ['students']);
export const useStaff = (filters?: any) => query('employees', '/employees', filters);
export const useCreateStaff = () => mutation('/employees', ['employees']);
export const useFeesOverview = () => query('fee-structures', '/fees/structures');
export const useFeePayments = () => query('fee-structures', '/fees/structures');
export const useStudentFees = (feeAccountId?: string) => query('student-fees', `/fees/accounts/${feeAccountId}`, undefined, !!feeAccountId);
export const useRecordPayment = () => mutation('/fees/manual-payments', ['student-fees', 'accounts']);
export const useNotices = (isPublic?: string) => query('notices', isPublic === 'PUBLIC' ? '/notices/public' : '/notices');
export const useCreateNotice = () => mutation('/notices', ['notices']);
export const useExams = (filters?: any) => query('assessments', '/assessments', filters);
export const useStudentReport = () => query('assessments', '/assessments');
export const useCreateExam = () => mutation('/assessments', ['assessments']);
export const useAccountsOverview = () => query('accounts', '/accounts/summary');
export const useAttendanceByDate = (_targetType: string, date: string) => query('attendance', '/attendance/students', { date }, false);
export const useIndividualAttendance = (targetType: 'STUDENT' | 'EMPLOYEE' | 'STAFF', id?: string) => query('attendance', `/attendance/${targetType === 'STUDENT' ? 'students' : 'employees'}/${id}`, undefined, !!id);
export const useMarkAttendance = () => { const client = useQueryClient(); return useMutation({ mutationFn: async ({ targetType, data }: any) => (await api.post(`/attendance/${targetType === 'STUDENT' ? 'students' : 'employees'}`, data)).data, onSuccess: () => client.invalidateQueries({ queryKey: ['attendance'] }) }); };
export const useSubmitAdmission = () => mutation('/students/register-admission', []);
export const useAcademics = () => query('academics', '/academics');
export const useTimetable = (params?: any) => query('timetable', '/timetable', params);
export const useSalary = (employeeId?: string) => query('salary', '/salary', { employeeId }, !!employeeId);
