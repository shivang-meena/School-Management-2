import { colors, surfaces } from '../theme';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { ExamTimetableBuilder } from './ExamTimetableBuilder';
import { ClassSubjectManager } from './ClassSubjectManager';
import { AcademicDetailsModal } from './AcademicDetailsModal';
import { DailyTimetableBuilder } from './DailyTimetableBuilder';
import { downloadFeeReceiptPdf } from '../utils/feeReceiptPdf';
import { downloadFeeReportPdf } from '../utils/feeReportPdf';
import { ClassStudentsFeeModal } from './ClassStudentsFeeModal';

type Mode = 'academics' | 'attendance' | 'fees' | 'exams' | 'notices' | 'accounts' | 'salary' | 'timetable';
type Props = { mode: Mode; title: string; eyebrow: string; description: string };
const today = new Date().toISOString().slice(0, 10);
const currentYear = String(new Date().getFullYear());

function Field({ label, value, onChangeText, placeholder, multiline = false }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput style={[s.input, multiline && s.multiline]} value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.25)" multiline={multiline} /></View>;
}
function Choices({ label, value, values, onChange }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.choices}>{values.map((item: any) => { const key = typeof item === 'string' ? item : item.value; const text = typeof item === 'string' ? item : item.label; return <TouchableOpacity accessibilityRole="button" key={key} style={[s.choice, value === key && s.choiceOn]} onPress={() => onChange(key)}><Text style={value === key ? s.choiceTextOn : s.choiceText}>{text}</Text></TouchableOpacity>; })}</View></View>;
}
function SelectCards({ label, value, items, onChange, getLabel }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.choices}>{items.map((item: any) => <TouchableOpacity accessibilityRole="button" key={item.id || item.name || 'opt'} style={[s.choice, value === item.id && s.choiceOn]} onPress={() => onChange(item.id)}><Text style={value === item.id ? s.choiceTextOn : s.choiceText}>{getLabel(item)}</Text></TouchableOpacity>)}</View></View>;
}
function errorText(error: any) { const message = error?.response?.data?.message; return Array.isArray(message) ? message.join('\n') : message || 'Please verify the entered details and try again.'; }
function notify(title: string, message: string) { const browserAlert = (globalThis as any).alert; if (Platform.OS === 'web' && typeof browserAlert === 'function') browserAlert(`${title}\n\n${message}`); else Alert.alert(title, message); }
function displayDate(value: any) { return value ? String(value).slice(0, 10) : ''; }
function displayTime(value: any) { return value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''; }
function displayDateTime(value: any) { return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }
function formatMoney(value: any) { const amount = Number(value); return Number.isFinite(amount) ? amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : ''; }
function timetableTime(value: any) { const text = String(value || ''); return text.includes('T') ? text.slice(11, 16) : text.slice(0, 5); }
function completedExamEntry(entry: any) { if (!entry || entry.isHoliday || !entry.date) return false; const date = displayDate(entry.date); const endTime = timetableTime(entry.endTime) || '23:59'; const end = new Date(`${date}T${endTime}:00`); return Number.isFinite(end.getTime()) && end.getTime() <= Date.now(); }
function examEntryDuration(entry: any) { const start = timetableTime(entry?.startTime); const end = timetableTime(entry?.endTime); if (!start || !end) return undefined; const [startHour, startMinute] = start.split(':').map(Number); const [endHour, endMinute] = end.split(':').map(Number); const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute); return minutes > 0 ? minutes : undefined; }
function emptyMessage(mode: Mode, action?: string) {
  if (mode === 'academics') return 'Academic setup is empty. Add the required year, class, section, subject or teacher assignment.';
  if (mode === 'attendance') return 'No attendance has been recorded for the selected student or employee yet.';
  if (mode === 'fees') return 'No class fee structures have been configured yet.';
  if (mode === 'exams') return 'No assessments or student marks have been recorded yet.';
  if (mode === 'notices') return 'No school notices have been published yet.';
  if (mode === 'accounts') return 'No income or expense transactions have been recorded yet.';
  if (mode === 'salary') return 'No salary records are available for the selected employee yet.';
  return 'No timetable entries are available yet.';
}

function isSeniorSecondary(schoolClass?: { name: string; sortOrder?: number | null } | null): boolean {
  if (!schoolClass) return false;
  if (schoolClass.sortOrder != null) {
    if (schoolClass.sortOrder >= 11) return true;
    if (schoolClass.sortOrder >= 1 && schoolClass.sortOrder <= 10) return false;
  }
  const normalized = (schoolClass.name || '').trim().toLowerCase();
  return /\b(11|12|11th|12th|xi|xii)\b/i.test(normalized);
}

export function AdminOperationsScreen({ mode, title, eyebrow, description }: Props) {
  const { user } = useAuth();
  const isAccountant = user?.subRole === 'ACCOUNTANT';
  const client = useQueryClient();
  const [open, setOpen] = useState(!isAccountant);
  const [formError, setFormError] = useState('');
  const [selectedAcademic, setSelectedAcademic] = useState<any>(null);
  const [academicTab, setAcademicTab] = useState<'classes' | 'class-subjects' | 'calendar'>('classes');
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feeSection, setFeeSection] = useState<'CLASS_FEES' | 'STUDENT_FEES' | 'PAYMENTS'>(
    isAccountant && mode === 'fees' ? 'STUDENT_FEES' : 'CLASS_FEES'
  );

  useEffect(() => {
    if (isAccountant && mode === 'fees' && feeSection === 'CLASS_FEES') {
      setFeeSection('STUDENT_FEES');
      setOpen(false);
    }
  }, [isAccountant, mode]);
  const [feeStudentClassId, setFeeStudentClassId] = useState('');
  const [feeStudentSectionId, setFeeStudentSectionId] = useState('');
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [selectedFeeAccount, setSelectedFeeAccount] = useState<any>(null);
  const [editingFeeTx, setEditingFeeTx] = useState<any>(null);
  const [reversingFeeTx, setReversingFeeTx] = useState<any>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalLoading, setReversalLoading] = useState(false);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxMethod, setEditTxMethod] = useState('CASH');
  const [editTxReference, setEditTxReference] = useState('');
  const [editTxRemarks, setEditTxRemarks] = useState('');
  const [editTxReason, setEditTxReason] = useState('');
  const [editTxLoading, setEditTxLoading] = useState(false);
  const [feeActionError, setFeeActionError] = useState('');
  const [editingAccountTx, setEditingAccountTx] = useState<any>(null);
  const [reversingAccountTx, setReversingAccountTx] = useState<any>(null);
  const [reversalAccountReason, setReversalAccountReason] = useState('');
  const [reversalAccountLoading, setReversalAccountLoading] = useState(false);
  const [editAccountTitle, setEditAccountTitle] = useState('');
  const [editAccountType, setEditAccountType] = useState('EXPENSE');
  const [editAccountAmount, setEditAccountAmount] = useState('');
  const [editAccountDate, setEditAccountDate] = useState('');
  const [editAccountDescription, setEditAccountDescription] = useState('');
  const [editAccountReason, setEditAccountReason] = useState('');
  const [editAccountLoading, setEditAccountLoading] = useState(false);
  const [accountActionError, setAccountActionError] = useState('');
  const [selectedClassForStudentFees, setSelectedClassForStudentFees] = useState<any>(null);
  const [examSection, setExamSection] = useState<'TIMETABLE' | 'ASSESSMENTS'>('TIMETABLE');
  const [salarySection, setSalarySection] = useState<'SETUP' | 'HISTORY' | 'PAYMENTS'>('SETUP');
  const [salarySubRole, setSalarySubRole] = useState('');
  const [selectedSalaryAccount, setSelectedSalaryAccount] = useState<any>(null);
  const [selectedMarksStudent, setSelectedMarksStudent] = useState<any>(null);
  const [marksClassId, setMarksClassId] = useState('');
  const [marksSectionId, setMarksSectionId] = useState('');
  const [selectedMarksTimetable, setSelectedMarksTimetable] = useState<any>(null);
  const [selectedMarksEntry, setSelectedMarksEntry] = useState<any>(null);
  const [form, setForm] = useState<any>({ action: mode === 'academics' ? 'YEAR' : mode === 'fees' ? 'STRUCTURE' : mode === 'attendance' ? 'STUDENT' : mode === 'exams' ? 'CREATE' : 'CREATE', date: today, startDate: today, endDate: currentYear + '-03-31', joiningDate: today, effectiveFrom: today, type: mode === 'accounts' ? 'EXPENSE' : mode === 'exams' ? 'TEST' : 'CREATE', audience: 'ALL', published: true, status: 'PRESENT', method: 'CASH', entryType: 'LECTURE', dayOfWeek: '1', periodNumber: '1', startTime: '09:00', endTime: '09:45', month: String(new Date().getMonth() + 1), year: currentYear, maximumMarks: '100', passMarks: '33', updateExistingStudents: false, timetableEntries: [], entryDate: today, entryStartTime: '09:00', entryEndTime: '12:00', entryIsHoliday: false });
  const set = (key: string, value: any) => setForm((old: any) => ({ ...old, [key]: value }));

  const academics = useQuery<any>({ queryKey: ['academics'], queryFn: async () => (await api.get('/academics')).data });
  const students = useQuery<any>({ queryKey: ['students'], queryFn: async () => (await api.get('/students', { params: { limit: 100 } })).data, enabled: mode === 'attendance' || mode === 'exams' || mode === 'academics' });
  const employees = useQuery<any>({ queryKey: ['employees'], queryFn: async () => (await api.get('/employees')).data, enabled: mode === 'attendance' || mode === 'salary' || mode === 'timetable' || mode === 'academics' });
  const calendarRecords = useQuery<any[]>({ queryKey: ['academic-calendar-admin'], queryFn: async () => (await api.get('/academics/calendar')).data, enabled: mode === 'academics' });
  const endpoint = mode === 'fees' ? '/fees/structures' : mode === 'exams' ? (examSection === 'TIMETABLE' ? '/exam-timetables' : '/assessments') : mode === 'notices' ? '/notices' : mode === 'accounts' ? '/accounts/summary' : mode === 'timetable' ? '/timetable' : '';
  const records = useQuery<any>({ queryKey: ['admin-records', mode, mode === 'exams' ? examSection : ''], queryFn: async () => (await api.get(endpoint)).data, enabled: !!endpoint });
  const examTimetables = useQuery<any[]>({ queryKey: ['marks-exam-timetables'], queryFn: async () => (await api.get('/exam-timetables')).data, enabled: mode === 'exams' && examSection === 'ASSESSMENTS' });
  const feeAccounts = useQuery<any[]>({ queryKey: ['fee-accounts'], queryFn: async () => (await api.get('/fees/accounts')).data, enabled: mode === 'fees' });
  const salaryAccounts = useQuery<any[]>({ queryKey: ['salary-accounts'], queryFn: async () => (await api.get('/salary/accounts')).data, enabled: mode === 'salary' });
  const selectedSalaryHistory = useQuery<any[]>({ queryKey: ['salary', selectedSalaryAccount?.id], queryFn: async () => (await api.get('/salary', { params: { employeeId: selectedSalaryAccount.id } })).data, enabled: mode === 'salary' && !!selectedSalaryAccount?.id });

  const years = academics.data?.academicYears || [];
  const classes = academics.data?.classes || [];
  const sections = useMemo(() => classes.flatMap((c: any) => (c.sections || []).map((x: any) => ({ ...x, className: c.name }))), [classes]);
  const subjects = academics.data?.subjects || [];
  const yearId = form.academicYearId || years.find((y: any) => y.isCurrent)?.id || years[0]?.id;
  const sectionId = form.sectionId || sections[0]?.id;
  const classId = form.classId || classes[0]?.id;
  const selectedSubjectClassId = form.classId || classes[0]?.id;
  const currentClassSubjectsQuery = useQuery<any>({
    queryKey: ['class-subjects', selectedSubjectClassId],
    queryFn: async () => {
      if (!selectedSubjectClassId) return null;
      return (await api.get(`/academics/classes/${selectedSubjectClassId}/subjects`)).data;
    },
    enabled: mode === 'academics' && form.action === 'SUBJECT' && !!selectedSubjectClassId,
  });
  const selectedSubjectClassObj = classes.find((c: any) => c.id === selectedSubjectClassId);
  const isSubjectSeniorClass = isSeniorSecondary(selectedSubjectClassObj);

  const currentSelectedSection = sections.find((s: any) => s.id === sectionId);
  const currentSectionClassId = currentSelectedSection?.classId;
  const sectionSubjectsQuery = useQuery<any>({
    queryKey: ['class-subjects', currentSectionClassId],
    queryFn: async () => {
      if (!currentSectionClassId) return null;
      return (await api.get(`/academics/classes/${currentSectionClassId}/subjects`)).data;
    },
    enabled: ((mode === 'academics' && form.action === 'TEACHER') || (mode as any) === 'timetable') && !!currentSectionClassId,
  });

  const classWiseAssignedSubjects = useMemo(() => {
    if (!sectionSubjectsQuery.data) return [];
    if (sectionSubjectsQuery.data.isSeniorSecondary) {
      const allStreamSubs: any[] = [];
      for (const st of (sectionSubjectsQuery.data.streams || [])) {
        for (const sub of (st.subjects || [])) {
          if (sub.isActive !== false) {
            allStreamSubs.push({
              ...sub.subject,
              id: sub.subjectId || sub.subject?.id,
              streamName: st.parentSubject?.code || st.parentSubject?.name,
            });
          }
        }
      }
      return allStreamSubs;
    }
    return (sectionSubjectsQuery.data.subjects || [])
      .filter((s: any) => s.isActive !== false)
      .map((s: any) => ({
        ...s.subject,
        id: s.subjectId || s.subject?.id,
      }));
  }, [sectionSubjectsQuery.data]);

  const studentFeeClassId = feeStudentClassId;
  const currentFeeClass = classes.find((schoolClass: any) => schoolClass.id === studentFeeClassId);
  const studentFeeSections = currentFeeClass?.sections || [];
  const studentFeeSectionId = feeStudentSectionId && studentFeeSections.some((section: any) => section.id === feeStudentSectionId) ? feeStudentSectionId : '';
  const teacherEmployees = useMemo(() => (employees.data || []).filter((x: any) => x.subRole === 'TEACHER'), [employees.data]);
  const teacherSubjectId = (form.subjectId && classWiseAssignedSubjects.some((s: any) => s.id === form.subjectId))
    ? form.subjectId
    : classWiseAssignedSubjects[0]?.id || '';
  const teacherEmployeeId = (form.employeeId && teacherEmployees.some((e: any) => e.id === form.employeeId))
    ? form.employeeId
    : teacherEmployees[0]?.id || '';
  const subjectId = form.subjectId || subjects[0]?.id;
  const employeeId = form.employeeId || employees.data?.[0]?.id;
  const selectedSectionStudents = (students.data || []).filter((student: any) => student.enrollments?.some((e: any) => e.sectionId === sectionId && e.status === 'CURRENT'));
  const studentId = form.studentId || selectedSectionStudents[0]?.id;
  const marksSelectedClassId = marksClassId || classes[0]?.id || '';
  const marksSections = classes.find((schoolClass: any) => schoolClass.id === marksSelectedClassId)?.sections || [];
  const marksSelectedSectionId = marksSectionId && marksSections.some((section: any) => section.id === marksSectionId) ? marksSectionId : marksSections[0]?.id || '';
  const marksStudents = (students.data || []).filter((student: any) => student.enrollments?.some((enrollment: any) => enrollment.sectionId === marksSelectedSectionId && enrollment.status === 'CURRENT'));
  const selectedMarksEnrollment = selectedMarksStudent?.enrollments?.find((enrollment: any) => enrollment.status === 'CURRENT');
  const selectedMarksSectionId = selectedMarksEnrollment?.sectionId || marksSelectedSectionId;
  const completedMarksTimetables = (examTimetables.data || []).filter((timetable: any) => timetable.sectionId === selectedMarksSectionId && (timetable.entries || []).some((entry: any) => completedExamEntry(entry)));
  const completedMarksEntries = selectedMarksTimetable?.entries?.filter((entry: any) => completedExamEntry(entry)) || [];
  const assessmentForMarksEntry = (timetable: any, entry: any) => (records.data || []).find((assessment: any) => assessment.sectionId === timetable?.sectionId && assessment.subjectId === entry?.subjectId && displayDate(assessment.date) === displayDate(entry?.date));
  const marksResultForEntry = (timetable: any, entry: any) => { const assessment = assessmentForMarksEntry(timetable, entry); return assessment?.results?.find((result: any) => result.studentId === selectedMarksStudent?.id); };
  const teacherAssignments = academics.data?.teacherAssignments || [];
  const classTeacherAssignments = academics.data?.classTeacherAssignments || [];
  const uniqueEmployees = (assignments: any[]) => Array.from(new Map(assignments.filter((item: any) => item.employee).map((item: any) => [item.employee.id, item.employee])).values());
  const academicDetail = selectedAcademic ? (() => {
    if (selectedAcademic.sections) {
      const sectionIds = selectedAcademic.sections.map((section: any) => section.id);
      return {
        title: selectedAcademic.name,
        type: 'CLASS',
        subtitle: `${selectedAcademic.sections.length} section(s) · ${(students.data || []).filter((student: any) => student.enrollments?.some((e: any) => sectionIds.includes(e.sectionId) && e.status === 'CURRENT')).length} current student(s)`,
        sections: selectedAcademic.sections,
        students: (students.data || []).filter((student: any) => student.enrollments?.some((e: any) => sectionIds.includes(e.sectionId) && e.status === 'CURRENT')),
        teachers: teacherAssignments.filter((item: any) => sectionIds.includes(item.sectionId)),
        classTeachers: classTeacherAssignments.filter((item: any) => sectionIds.includes(item.sectionId)),
        employees: uniqueEmployees([...teacherAssignments.filter((item: any) => sectionIds.includes(item.sectionId)), ...classTeacherAssignments.filter((item: any) => sectionIds.includes(item.sectionId))]),
      };
    }
    if (selectedAcademic.code) { const teachers = teacherAssignments.filter((item: any) => item.subjectId === selectedAcademic.id); return { title: selectedAcademic.name, type: 'SUBJECT', subtitle: `Code: ${selectedAcademic.code}`, sections: [], students: [], teachers, classTeachers: [], employees: uniqueEmployees(teachers) }; }
    const yearSections = classes.map((schoolClass: any) => ({
      id: schoolClass.id,
      name: schoolClass.name,
      capacity: (schoolClass.sections || []).map((section: any) => {
        const studentCount = (students.data || []).filter((student: any) => student.enrollments?.some((enrollment: any) => enrollment.sectionId === section.id && enrollment.academicYearId === selectedAcademic.id && enrollment.status === 'CURRENT')).length;
        return `\n  • Section ${section.name}\n    • Students: ${studentCount}\n    • Student capacity: ${section.capacity || 'Not set'}`;
      }).join(''),
    }));
    const teachers = teacherAssignments.filter((item: any) => item.academicYearId === selectedAcademic.id);
    const classTeachers = classTeacherAssignments.filter((item: any) => item.academicYearId === selectedAcademic.id);
    return { title: selectedAcademic.name, type: 'ACADEMIC YEAR', subtitle: `${displayDate(selectedAcademic.startDate)} to ${displayDate(selectedAcademic.endDate)}${selectedAcademic.isCurrent ? ' · CURRENT' : ''}`, sections: yearSections, students: (students.data || []).filter((student: any) => student.enrollments?.some((e: any) => e.academicYearId === selectedAcademic.id && e.status === 'CURRENT')), teachers, classTeachers, employees: uniqueEmployees([...teachers, ...classTeachers]) };
  })() : null;

  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['admin-records', mode] }), client.invalidateQueries({ queryKey: ['marks-exam-timetables'] }), client.invalidateQueries({ queryKey: ['fee-accounts'] }), client.invalidateQueries({ queryKey: ['salary-accounts'] }), client.invalidateQueries({ queryKey: ['academic-calendar-admin'] }), client.refetchQueries({ queryKey: ['academics'], type: 'active' }), client.invalidateQueries({ queryKey: ['salary'] }), client.invalidateQueries({ queryKey: ['students'] }), client.invalidateQueries({ queryKey: ['employees'] })]); };
  const performAssignmentDelete = async (id: string, classTeacher: boolean) => { try { await api.delete(`/academics/${classTeacher ? 'class-teacher-assignments' : 'teacher-assignments'}/${id}`); await refresh(); notify('Deleted', classTeacher ? 'The class teacher was removed.' : 'The assignment was deleted.'); } catch (error: any) { Alert.alert('Could not delete', errorText(error)); } };
  const deleteAssignment = (id: string, classTeacher = false) => { const browserConfirm = (globalThis as any).confirm; const title = classTeacher ? 'Remove Class Teacher?' : 'Delete assignment?'; const msg = classTeacher ? 'Are you sure you want to remove this Class Teacher? They will no longer have auto-permission to mark attendance for this class.' : 'This will remove only this assignment record. Continue?'; if (Platform.OS === 'web' && typeof browserConfirm === 'function') { if (browserConfirm(`${title}\n\n${msg}`)) void performAssignmentDelete(id, classTeacher); return; } Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void performAssignmentDelete(id, classTeacher) }]); };
  const deleteCalendar = (id: string) => { const remove = async () => { try { await api.delete('/academics/calendar/' + id); await refresh(); } catch (error: any) { setFormError(errorText(error)); } }; const browserConfirm = (globalThis as any).confirm; if (Platform.OS === 'web' && typeof browserConfirm === 'function') { if (browserConfirm('Delete this calendar entry?')) void remove(); return; } Alert.alert('Delete calendar entry?', 'This removes only the selected admin-created calendar entry.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void remove() }]); };
  const editCalendar = (entry: any) => { setEditingCalendarId(entry.id); setForm((old: any) => ({ ...old, action: 'CALENDAR', academicYearId: entry.academicYearId, date: displayDate(entry.date), dayType: entry.dayType, name: entry.title || '' })); setOpen(true); };
  const deleteAcademicRecord = (row: any) => {
    const isClass = !!(row.sections !== undefined || (!row.code && !row.startDate && row.name));
    const type = isClass ? 'classes' : row.code ? 'subjects' : row.startDate ? 'years' : 'classes';
    if (!type || !row.id) return;
    const itemLabel = isClass ? `class "${row.name}"` : (row.name || `${type.slice(0, -1)}`);

    const performDelete = async () => {
      try {
        await api.delete(`/academics/${type}/${row.id}`);
        setSelectedAcademic(null);
        await refresh();
        notify('Deleted', `${itemLabel} was deleted successfully.`);
      } catch (error: any) {
        notify('Could not delete', errorText(error));
      }
    };

    const browserConfirm = (globalThis as any).confirm;
    if (Platform.OS === 'web' && typeof browserConfirm === 'function') {
      if (browserConfirm(`Delete ${itemLabel}?\n\nThis will remove the record. Connected student history is protected.`)) {
        void performDelete();
      }
      return;
    }

    Alert.alert(`Delete ${itemLabel}?`, 'This will remove the record. Connected student history is protected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void performDelete() },
    ]);
  };
  const post = async (url: string, payload: any) => { setFormError(''); setSaving(true); try { await api.post(url, payload); notify('Saved', 'The record was saved successfully.'); await refresh(); } catch (error: any) { setFormError(errorText(error)); } finally { setSaving(false); } };
  const patch = async (url: string, payload: any = {}) => { setSaving(true); try { await api.patch(url, payload); Alert.alert('Updated', 'The record was updated successfully.'); await refresh(); } catch (error: any) { Alert.alert('Could not update', errorText(error)); } finally { setSaving(false); } };

  const recordStudentPayment = async () => {
    const amountText = String(form.paymentAmount ?? '').trim();
    const amount = Number(amountText);
    if (!selectedFeeAccount?.id) { setFormError('Please select a student first.'); return; }
    if (!amountText || !Number.isFinite(amount) || amount <= 0) { setFormError('Please enter a valid positive payment amount.'); return; }
    if (!form.date) { setFormError('Please enter the payment date.'); return; }
    setFormError(''); setSaving(true);
    try {
      await api.post('/fees/manual-payments', { feeAccountId: selectedFeeAccount.id, amount, method: 'CASH', date: form.date, reference: form.reference || undefined, remarks: form.remarks || undefined, idempotencyKey: 'manual-' + Date.now() });
      notify('Payment saved', 'The student payment was saved successfully.');
      setSelectedFeeAccount(null);
      setForm((old: any) => ({ ...old, paymentAmount: '', reference: '', remarks: '', date: today }));
      await refresh();
    } catch (error: any) { setFormError(errorText(error)); } finally { setSaving(false); }
  };

  const formatStudentFeeRow = (account: any) => {
    const enrollment = account.student?.enrollments?.[0];
    const section = enrollment?.section;
    const adjustments = (account.adjustments || []).reduce((sum: number, adjustment: any) => sum + Number(adjustment.amount || 0), 0);
    const paidAmount = (account.transactions || []).filter((transaction: any) => transaction.status === 'SUCCESS').reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0) - (account.transactions || []).filter((transaction: any) => transaction.status === 'REVERSED' && transaction.reversalOfId).reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0);
    const totalFee = Number(account.assessedFee || 0) + adjustments;
    return {
      ...account,
      studentName: account.student?.name || account.student?.studentId || 'Unnamed student',
      studentCode: account.student?.studentId || '—',
      rollNumber: enrollment?.rollNumber ? String(enrollment.rollNumber) : (account.student?.rollNumber ? String(account.student.rollNumber) : ''),
      classId: section?.schoolClass?.id || section?.classId,
      sectionId: section?.id,
      className: section?.schoolClass?.name || 'Class not set',
      sectionName: section?.name || 'Section not set',
      totalFee,
      paidAmount,
      remainingFee: Math.max(totalFee - paidAmount, 0),
      creditBalance: Math.max(paidAmount - totalFee, 0),
    };
  };

  const refreshFeeAccount = async (targetAccountId: string) => {
    const { data: updatedAccounts } = await api.get('/fees/accounts');
    client.setQueryData(['fee-accounts'], updatedAccounts);
    const target = updatedAccounts.find((a: any) => a.id === targetAccountId);
    if (target) {
      setSelectedFeeAccount(formatStudentFeeRow(target));
    }
  };

  const openReverseFeeTx = (tx: any) => {
    setFeeActionError('');
    setReversalReason('');
    setReversingFeeTx(tx);
  };

  const handleConfirmReverseFeeTx = async () => {
    if (!reversalReason.trim()) {
      setFeeActionError('Please enter a reason for voiding/reversing this transaction.');
      return;
    }
    setFeeActionError('');
    setReversalLoading(true);
    try {
      await api.post(`/fees/transactions/${reversingFeeTx.id}/reverse`, { reason: reversalReason.trim() });
      notify('Transaction reversed', `Receipt ${reversingFeeTx.receiptNo} has been marked as cancelled/reversed.`);
      const accId = selectedFeeAccount?.id;
      setReversingFeeTx(null);
      setReversalReason('');
      if (accId) await refreshFeeAccount(accId);
      await refresh();
    } catch (err: any) {
      setFeeActionError(errorText(err));
    } finally {
      setReversalLoading(false);
    }
  };

  const openEditFeeTx = (tx: any) => {
    setFeeActionError('');
    setEditTxAmount(String(tx.amount || ''));
    setEditTxDate(tx.paymentDate ? String(tx.paymentDate).slice(0, 10) : today);
    setEditTxMethod(tx.method || 'CASH');
    setEditTxReference(tx.reference || '');
    setEditTxRemarks(tx.remarks || '');
    setEditTxReason('');
    setEditingFeeTx(tx);
  };

  const handleConfirmEditFeeTx = async () => {
    const amt = Number(editTxAmount);
    if (!editTxAmount.trim() || !Number.isFinite(amt) || amt <= 0) {
      setFeeActionError('Please enter a valid positive payment amount.');
      return;
    }
    if (!editTxDate.trim()) {
      setFeeActionError('Please enter a valid payment date.');
      return;
    }
    if (!editTxReason.trim()) {
      setFeeActionError('Please provide a reason for editing this transaction.');
      return;
    }
    setFeeActionError('');
    setEditTxLoading(true);
    try {
      await api.patch(`/fees/transactions/${editingFeeTx.id}`, {
        amount: amt,
        paymentDate: editTxDate.trim(),
        method: editTxMethod,
        reference: editTxReference.trim() || undefined,
        remarks: editTxRemarks.trim() || undefined,
        reason: editTxReason.trim(),
      });
      notify('Transaction updated', `Receipt ${editingFeeTx.receiptNo} has been corrected successfully.`);
      const accId = selectedFeeAccount?.id;
      setEditingFeeTx(null);
      setEditTxReason('');
      if (accId) await refreshFeeAccount(accId);
      await refresh();
    } catch (err: any) {
      setFeeActionError(errorText(err));
    } finally {
      setEditTxLoading(false);
    }
  };

  const openReverseAccountTx = (tx: any) => {
    setAccountActionError('');
    setReversalAccountReason('');
    setReversingAccountTx(tx);
  };

  const handleConfirmReverseAccountTx = async () => {
    if (!reversalAccountReason.trim()) {
      setAccountActionError('Please enter a reason for voiding/reversing this transaction.');
      return;
    }
    setAccountActionError('');
    setReversalAccountLoading(true);
    try {
      await api.post(`/accounts/${reversingAccountTx.id}/reverse`, { reason: reversalAccountReason.trim() });
      notify('Transaction reversed', `Transaction "${reversingAccountTx.title}" has been cancelled/reversed.`);
      setReversingAccountTx(null);
      setReversalAccountReason('');
      await refresh();
    } catch (err: any) {
      setAccountActionError(errorText(err));
    } finally {
      setReversalAccountLoading(false);
    }
  };

  const openEditAccountTx = (tx: any) => {
    setAccountActionError('');
    setEditAccountTitle(tx.title || '');
    setEditAccountType(tx.type || 'EXPENSE');
    setEditAccountAmount(String(tx.amount || ''));
    setEditAccountDate(tx.transactionDate ? String(tx.transactionDate).slice(0, 10) : today);
    setEditAccountDescription(tx.description || '');
    setEditAccountReason('');
    setEditingAccountTx(tx);
  };

  const handleConfirmEditAccountTx = async () => {
    const amt = Number(editAccountAmount);
    if (!editAccountTitle.trim()) {
      setAccountActionError('Please enter a transaction title.');
      return;
    }
    if (!editAccountAmount.trim() || !Number.isFinite(amt) || amt <= 0) {
      setAccountActionError('Please enter a valid positive amount.');
      return;
    }
    if (!editAccountDate.trim()) {
      setAccountActionError('Please enter a transaction date.');
      return;
    }
    if (!editAccountReason.trim()) {
      setAccountActionError('Please provide a reason for editing this transaction.');
      return;
    }
    setAccountActionError('');
    setEditAccountLoading(true);
    try {
      await api.patch(`/accounts/${editingAccountTx.id}`, {
        title: editAccountTitle.trim(),
        type: editAccountType,
        amount: amt,
        date: editAccountDate.trim(),
        description: editAccountDescription.trim() || undefined,
        reason: editAccountReason.trim(),
      });
      notify('Transaction updated', `Transaction "${editAccountTitle.trim()}" has been corrected successfully.`);
      setEditingAccountTx(null);
      setEditAccountReason('');
      await refresh();
    } catch (err: any) {
      setAccountActionError(errorText(err));
    } finally {
      setEditAccountLoading(false);
    }
  };

  const recordSalaryPayment = async () => {
    const salary = selectedSalaryPayment;
    const amountText = String(form.salaryPaymentAmount ?? '').trim();
    const amount = Number(amountText);
    if (!salary?.id) { setFormError('No finalized monthly salary is available for this employee.'); return; }
    if (!amountText || !Number.isFinite(amount) || amount <= 0) { setFormError('Please enter a valid positive payment amount.'); return; }
    if (!form.date) { setFormError('Please enter the payment date.'); return; }
    setFormError(''); setSaving(true);
    try {
      await api.post(`/salary/${salary.id}/payments`, { amount, paidDate: form.date, method: 'CASH', reference: form.reference || undefined, remarks: form.remarks || undefined });
      notify('Salary payment saved', 'The employee salary payment was saved successfully.');
      setSelectedSalaryAccount(null);
      setForm((old: any) => ({ ...old, salaryPaymentAmount: '', reference: '', remarks: '', date: today }));
      await refresh();
    } catch (error: any) { setFormError(errorText(error)); } finally { setSaving(false); }
  };

  const openSalaryPayment = (row: any) => { setFormError(''); setSelectedSalaryAccount(row); };

  const addExamTimetableEntry = () => {
    const isHoliday = !!form.entryIsHoliday;
    const entryDate = String(form.entryDate || '').trim();
    const entries = Array.isArray(form.timetableEntries) ? form.timetableEntries : [];
    if (!entryDate) { setFormError('Please select a date for the timetable entry.'); return; }
    if (entries.some((entry: any) => entry.date === entryDate)) { setFormError('Only one timetable entry can be added for the same date.'); return; }
    if (isHoliday) {
      setForm((old: any) => ({ ...old, timetableEntries: [...entries, { date: entryDate, isHoliday: true, holidayTitle: old.entryHolidayTitle || 'Holiday' }], entryDate: '', entrySubjectId: '', entryHolidayTitle: '' }));
      setFormError('');
      return;
    }
    if (!form.entrySubjectId) { setFormError('Please select a subject for the exam entry.'); return; }
    if (!form.entryStartTime || !form.entryEndTime) { setFormError('Please enter the start and end time.'); return; }
    if (form.entryEndTime <= form.entryStartTime) { setFormError('Exam end time must be after the start time.'); return; }
    setForm((old: any) => ({ ...old, timetableEntries: [...entries, { date: entryDate, subjectId: old.entrySubjectId, startTime: old.entryStartTime, endTime: old.entryEndTime, isHoliday: false, maximumMarks: old.entryMaximumMarks ? Number(old.entryMaximumMarks) : undefined, passMarks: old.entryPassMarks ? Number(old.entryPassMarks) : undefined }], entryDate: '', entrySubjectId: '', entryStartTime: '09:00', entryEndTime: '12:00', entryMaximumMarks: '', entryPassMarks: '' }));
    setFormError('');
  };
  const removeExamTimetableEntry = (index: number) => setForm((old: any) => ({ ...old, timetableEntries: (old.timetableEntries || []).filter((_: any, itemIndex: number) => itemIndex !== index) }));

  const submit = async () => {
    if (mode === 'academics') {
      if (form.action === 'YEAR') return post('/academics/years', { name: form.name, startDate: form.startDate, endDate: form.endDate, isCurrent: !!form.isCurrent });
      if (form.action === 'CLASS') return post('/academics/classes', { name: form.name, sortOrder: Number(form.sortOrder) });
      if (form.action === 'SECTION') return post('/academics/sections', { classId, name: form.name, capacity: form.capacity ? Number(form.capacity) : undefined });
      if (form.action === 'PARENT_SUBJECT') return post('/academics/parent-subjects', { code: form.code, name: form.name, description: form.description });
      if (form.action === 'SUBJECT') {
        const targetClassId = form.classId || classes[0]?.id;
        if (!targetClassId) { setFormError('Please select a class first.'); return; }
        const targetClass = classes.find((c: any) => c.id === targetClassId);
        const isSenior = isSeniorSecondary(targetClass);
        const activeParents = (academics.data?.parentSubjects || []).filter((p: any) => p.isActive);
        const chosenParentSubjectId = form.parentSubjectId || activeParents[0]?.id;
        if (isSenior && !chosenParentSubjectId) {
          setFormError('Please select a Parent Subject / Stream for Class 11/12.');
          return;
        }
        const trimmedName = String(form.name || '').trim();
        if (!trimmedName) {
          setFormError('Please enter a subject name.');
          return;
        }
        setSaving(true);
        setFormError('');
        try {
          await api.post(`/academics/classes/${targetClassId}/subjects`, {
            name: trimmedName,
            code: String(form.code || '').trim() || undefined,
            parentSubjectId: isSenior ? chosenParentSubjectId : undefined,
            isOptional: !!form.isOptional,
          });
          setForm((old: any) => ({ ...old, name: '', code: '' }));
          notify('Subject added', `Subject "${trimmedName}" was added successfully to ${targetClass?.name || 'the class'}.`);
          await refresh();
          await client.invalidateQueries({ queryKey: ['class-subjects'] });
        } catch (err: any) {
          setFormError(errorText(err));
        } finally {
          setSaving(false);
        }
        return;
      }
      if (form.action === 'CALENDAR') { const payload = { academicYearId: yearId, date: form.date, dayType: form.dayType || 'HOLIDAY', title: form.name }; if (editingCalendarId) { setEditingCalendarId(null); return patch('/academics/calendar/' + editingCalendarId, payload); } return post('/academics/calendar', payload); }
      if (form.action === 'TEACHER') {
        const chosenSubjectId = teacherSubjectId;
        if (!chosenSubjectId) {
          setFormError(`No subjects assigned to ${currentSelectedSection?.className || 'the selected section'}. Please assign subjects to this class first.`);
          return;
        }
        const chosenTeacherId = teacherEmployeeId || employeeId;
        if (!chosenTeacherId) {
          setFormError('Please select a teacher.');
          return;
        }
        return post('/academics/teacher-assignments', {
          employeeId: chosenTeacherId,
          academicYearId: yearId,
          sectionId,
          subjectId: chosenSubjectId,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
        });
      }
      if (form.action === 'CLASS_TEACHER') {
        const chosenTeacherId = teacherEmployeeId || employeeId;
        if (!chosenTeacherId) {
          setFormError('Please select a teacher.');
          return;
        }
        return post('/academics/class-teacher-assignments', {
          employeeId: chosenTeacherId,
          academicYearId: yearId,
          sectionId,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
        });
      }
      if (form.action === 'CURRENT') return patch('/academics/years/' + yearId + '/current');
      if (form.action === 'TRANSFER') return post('/academics/enrollments/' + (form.studentId || students.data?.[0]?.id) + '/transfer', { academicYearId: yearId, sectionId, rollNumber: Number(form.rollNumber), effectiveFrom: form.effectiveFrom });
    }
    if (mode === 'attendance') return post(form.action === 'EMPLOYEE' ? '/attendance/employees' : '/attendance/students', { date: form.date, sectionId: form.action === 'STUDENT' ? sectionId : undefined, reason: form.reason || undefined, records: [{ id: form.action === 'EMPLOYEE' ? employeeId : studentId, status: form.status, remarks: form.remarks || undefined }] });
    if (mode === 'fees') {
      if (feeSection !== 'CLASS_FEES') return;
      const amountText = String(form.amount ?? '').trim();
      const totalFee = Number(amountText);
      if (!classId) { setFormError('Please select a class first.'); return; }
      if (!yearId) { setFormError('Please configure an academic year first.'); return; }
      if (!amountText || !Number.isFinite(totalFee) || totalFee < 0) { setFormError('Please enter a valid fee amount.'); return; }
      return post('/fees/structures', { classId, academicYearId: yearId, totalFee, updateExistingStudents: !!form.updateExistingStudents });
    }
    if (mode === 'exams') {
      if (examSection === 'TIMETABLE') {
        const entries = Array.isArray(form.timetableEntries) ? form.timetableEntries : [];
        if (!yearId || !classId) { setFormError('Please select an academic year and class first.'); return; }
        if (!form.title || !form.timetableStartDate || !form.timetableEndDate) { setFormError('Please enter the timetable title, start date and end date.'); return; }
        if (!entries.length) { setFormError('Add at least one subject or holiday entry to the timetable.'); return; }
        return post('/exam-timetables', { academicYearId: yearId, classId, type: form.type, title: form.title, startDate: form.timetableStartDate, endDate: form.timetableEndDate, entries });
      }
      if (form.action === 'MARKS') return post('/assessments/' + (form.assessmentId || records.data?.[0]?.id) + '/results', { results: [{ studentId, absent: !!form.absent, marks: form.absent ? undefined : Number(form.marks), remarks: form.remarks || undefined }] });
      return post('/assessments', { academicYearId: yearId, sectionId, subjectId, type: form.type, title: form.title, date: form.date, startTime: form.startTime || undefined, durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined, maximumMarks: Number(form.maximumMarks), passMarks: Number(form.passMarks) });
    }
    if (mode === 'notices') return post('/notices', { title: form.title, message: form.message, audience: form.audience, sectionIds: form.audience === 'SELECTED_SECTIONS' ? [sectionId] : undefined, published: !!form.published, expiresAt: form.expiresAt || undefined });
    if (mode === 'accounts') return post('/accounts', { type: form.type, title: form.title, amount: Number(form.amount), date: form.date, description: form.description || undefined, idempotencyKey: 'manual-' + Date.now() });
    if (mode === 'salary') { const amount = Number(form.salaryAmount); if (!employeeId) { setFormError('Please select an employee first.'); return; } if (!Number.isFinite(amount) || amount <= 0) { setFormError('Please enter a valid positive salary.'); return; } if (!form.effectiveFrom) { setFormError('Please enter the effective date.'); return; } if (!form.salaryReason) { setFormError('Please enter the reason for this salary update.'); return; } return post(`/employees/${employeeId}/salary-revisions`, { amount, effectiveDate: form.effectiveFrom, reason: form.salaryReason }); }
    if (mode === 'timetable') return post('/timetable', { academicYearId: yearId, sectionId, employeeId: form.entryType === 'LECTURE' ? employeeId : undefined, subjectId: form.entryType === 'LECTURE' ? subjectId : undefined, entryType: form.entryType, dayOfWeek: Number(form.dayOfWeek), periodNumber: Number(form.periodNumber), startTime: form.startTime, endTime: form.endTime, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || undefined });
  };

  const publishExam = (id: string) => post('/assessments/' + id + '/publish', {});
  const saveMarksForStudent = async () => {
    const timetable = selectedMarksTimetable;
    const entry = selectedMarksEntry;
    const student = selectedMarksStudent;
    const existingAssessment = assessmentForMarksEntry(timetable, entry);
    const marksText = String(form.marks ?? '').trim();
    const marks = Number(marksText);
    const maximumMarks = Number(entry?.maximumMarks ?? existingAssessment?.maximumMarks ?? 100);
    if (!timetable?.id || !entry?.subjectId || !student?.id) { setFormError('Please select an exam, subject and student first.'); return; }
    if (!completedExamEntry(entry)) { setFormError('Marks can be entered after this paper has ended.'); return; }
    if (!form.absent && (!marksText || !Number.isFinite(marks) || marks < 0)) { setFormError('Please enter valid marks or choose Absent.'); return; }
    if (!form.absent && marks > maximumMarks) { setFormError(`Marks cannot exceed ${maximumMarks}.`); return; }
    setFormError(''); setSaving(true);
    try {
      let assessmentId = existingAssessment?.id;
      if (!assessmentId) {
        const created = await api.post('/assessments', { academicYearId: timetable.academicYearId, sectionId: timetable.sectionId, subjectId: entry.subjectId, type: timetable.type, title: `${timetable.title} · ${entry.subject?.name || 'Subject'}`, date: displayDate(entry.date), startTime: timetableTime(entry.startTime) || undefined, durationMinutes: examEntryDuration(entry), maximumMarks, passMarks: Number(entry.passMarks ?? 0) });
        assessmentId = created.data?.id;
      }
      if (!assessmentId) throw new Error('The subject assessment could not be prepared.');
      await api.post(`/assessments/${assessmentId}/results`, { results: [{ studentId: student.id, absent: !!form.absent, marks: form.absent ? undefined : marks, remarks: form.remarks || undefined }] });
      notify('Marks saved', 'The student marks were saved successfully.');
      setSelectedMarksEntry(null);
      setForm((old: any) => ({ ...old, marks: '', remarks: '', absent: false }));
      await refresh();
    } catch (error: any) { setFormError(errorText(error)); } finally { setSaving(false); }
  };

  const examTimetableForm = () => <><Choices label="Schedule type" value={form.type} values={['TEST', 'EXAM']} onChange={(v: string) => set('type', v)} /><SelectCards label="Academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /><SelectCards label="Class" value={classId} items={classes} onChange={(v: string) => set('classId', v)} getLabel={(x: any) => x.name} /><Field label="Timetable title" value={form.title} onChangeText={(v: string) => set('title', v)} placeholder="Class 3 annual exam" /><Field label="Duration start date" value={form.timetableStartDate || today} onChangeText={(v: string) => set('timetableStartDate', v)} placeholder="YYYY-MM-DD" /><Field label="Duration end date" value={form.timetableEndDate || today} onChangeText={(v: string) => set('timetableEndDate', v)} placeholder="YYYY-MM-DD" /><Choices label="Day entry" value={!!form.entryIsHoliday} values={[{ value: false, label: 'Exam day' }, { value: true, label: 'Holiday / no exam' }]} onChange={(v: boolean) => set('entryIsHoliday', v)} /><Field label="Date" value={form.entryDate} onChangeText={(v: string) => set('entryDate', v)} placeholder="YYYY-MM-DD" />{form.entryIsHoliday ? <Field label="Holiday title" value={form.entryHolidayTitle} onChangeText={(v: string) => set('entryHolidayTitle', v)} placeholder="Sunday / Holiday" /> : <><SelectCards label="Subject" value={form.entrySubjectId} items={subjects} onChange={(v: string) => set('entrySubjectId', v)} getLabel={(x: any) => x.code + ' · ' + x.name} /><Field label="Start time" value={form.entryStartTime} onChangeText={(v: string) => set('entryStartTime', v)} placeholder="09:00" /><Field label="End time" value={form.entryEndTime} onChangeText={(v: string) => set('entryEndTime', v)} placeholder="12:00" /><Field label="Maximum marks" value={form.entryMaximumMarks} onChangeText={(v: string) => set('entryMaximumMarks', v)} placeholder="100" /><Field label="Pass marks" value={form.entryPassMarks} onChangeText={(v: string) => set('entryPassMarks', v)} placeholder="33" /></>}<TouchableOpacity accessibilityRole="button" style={s.smallButton} onPress={addExamTimetableEntry}><Text style={s.smallText}>Add date to timetable</Text></TouchableOpacity>{(form.timetableEntries || []).map((entry: any, index: number) => <View style={s.card} key={entry.date + index}><View style={s.cardTop}><Text style={s.cardTitle}>{entry.date}</Text><TouchableOpacity style={s.deleteButton} onPress={() => removeExamTimetableEntry(index)}><Text style={s.deleteText}>Remove</Text></TouchableOpacity></View><Text style={s.cardBody}>{entry.isHoliday ? entry.holidayTitle : (subjects.find((subject: any) => subject.id === entry.subjectId)?.name || 'Subject') + ' · ' + entry.startTime + '–' + entry.endTime}</Text></View>)}</>;
  const formContent = () => {
    if (mode === 'exams' && examSection === 'TIMETABLE') return examTimetableForm();
    if (mode === 'academics') return <><Choices label="Configuration" value={form.action} values={['YEAR', 'CURRENT', 'CLASS', 'SECTION', 'PARENT_SUBJECT', 'SUBJECT', 'CALENDAR', 'TEACHER', 'CLASS_TEACHER', 'TRANSFER']} onChange={(v: string) => set('action', v)} />{form.action === 'YEAR' ? <><Field label="Academic year name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="2027-28" /><Field label="Start date" value={form.startDate} onChangeText={(v: string) => set('startDate', v)} placeholder="YYYY-MM-DD" /><Field label="End date" value={form.endDate} onChangeText={(v: string) => set('endDate', v)} placeholder="2027-03-31" /><Choices label="Make current" value={!!form.isCurrent} values={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} onChange={(v: boolean) => set('isCurrent', v)} /></> : null}{form.action === 'CURRENT' ? <SelectCards label="Set current academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /> : null}{form.action === 'CLASS' ? <><Field label="Class name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Class 13" /><Field label="Sort order" value={form.sortOrder} onChangeText={(v: string) => set('sortOrder', v)} placeholder="13" /></> : null}{form.action === 'SECTION' ? <><SelectCards label="Class" value={classId} items={classes} onChange={(v: string) => set('classId', v)} getLabel={(x: any) => x.name} /><Field label="Section name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="B" /><Field label="Capacity" value={form.capacity} onChangeText={(v: string) => set('capacity', v)} placeholder="40" /></> : null}{form.action === 'PARENT_SUBJECT' ? <><Field label="Stream code" value={form.code} onChangeText={(v: string) => set('code', v)} placeholder="STR_PCM" /><Field label="Stream name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="PCM (Physics, Chemistry, Mathematics)" /><Field label="Description" value={form.description} onChangeText={(v: string) => set('description', v)} placeholder="Science stream with Mathematics" multiline /></> : null}{form.action === 'SUBJECT' ? <><SelectCards label="Select Class" value={selectedSubjectClassId} items={classes} onChange={(v: string) => { set('classId', v); setFormError(''); }} getLabel={(x: any) => x.name} />{!isSubjectSeniorClass ? <><View style={{ marginVertical: 4, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 }}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>Current Assigned Subjects in {selectedSubjectClassObj?.name || 'Class'}:</Text>{(!currentClassSubjectsQuery.data?.subjects || currentClassSubjectsQuery.data.subjects.length === 0) ? <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>No subjects assigned to {selectedSubjectClassObj?.name} yet. Enter subject details below to add.</Text> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{currentClassSubjectsQuery.data.subjects.map((item: any) => <View key={item.id} style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 11 }}>{item.subject?.code}</Text><Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 12 }}>{item.subject?.name}</Text>{item.isOptional ? <Text style={{ color: '#a78bfa', fontSize: 10 }}>[Elective]</Text> : null}{item.isActive === false ? <Text style={{ color: '#f87171', fontSize: 10 }}>[Inactive]</Text> : null}</View>)}</View>}</View><Field label="Subject name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="e.g. Mathematics, Hindi, English, Drawing..." /><Field label="Subject code (Optional)" value={form.code} onChangeText={(v: string) => set('code', v)} placeholder="e.g. MATH, HIN, ENG (Auto-generated if left blank)" /><Choices label="Subject Type" value={!!form.isOptional} values={[{ value: false, label: 'Compulsory' }, { value: true, label: 'Elective / Optional' }]} onChange={(v: boolean) => set('isOptional', v)} /></> : <><SelectCards label="Select Parent Subject / Stream" value={form.parentSubjectId || ((academics.data?.parentSubjects || []).filter((p: any) => p.isActive)[0]?.id)} items={(academics.data?.parentSubjects || []).filter((p: any) => p.isActive)} onChange={(v: string) => { set('parentSubjectId', v); setFormError(''); }} getLabel={(x: any) => x.code + ' · ' + x.name} /><View style={{ marginVertical: 4, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 }}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>Subjects in {selectedSubjectClassObj?.name} under {((academics.data?.parentSubjects || []).find((p: any) => p.id === (form.parentSubjectId || ((academics.data?.parentSubjects || []).filter((p: any) => p.isActive)[0]?.id)))?.name || 'Selected Stream')}:</Text>{(() => { const streamGroup = (currentClassSubjectsQuery.data?.streams || []).find((st: any) => st.parentSubject?.id === (form.parentSubjectId || ((academics.data?.parentSubjects || []).filter((p: any) => p.isActive)[0]?.id))); const streamSubs = streamGroup?.subjects || []; if (!streamSubs.length) return <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>No child subjects under this stream yet. Enter subject details below to add.</Text>; return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{streamSubs.map((item: any) => <View key={item.id} style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', borderColor: 'rgba(167, 139, 250, 0.35)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={{ color: '#a78bfa', fontWeight: '800', fontSize: 11 }}>{item.subject?.code}</Text><Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 12 }}>{item.subject?.name}</Text>{item.isOptional ? <Text style={{ color: '#f59e0b', fontSize: 10 }}>[Elective]</Text> : null}{item.isActive === false ? <Text style={{ color: '#f87171', fontSize: 10 }}>[Inactive]</Text> : null}</View>)}</View>; })()}</View><Field label="Child Subject name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="e.g. Physics, Chemistry, Accountancy..." /><Field label="Subject code (Optional)" value={form.code} onChangeText={(v: string) => set('code', v)} placeholder="e.g. PHY, CHE, ACC (Auto-generated if left blank)" /><Choices label="Subject Type" value={!!form.isOptional} values={[{ value: false, label: 'Compulsory' }, { value: true, label: 'Elective / Optional' }]} onChange={(v: boolean) => set('isOptional', v)} /></>}</> : null}{form.action === 'CALENDAR' ? <><SelectCards label="Academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /><Field label="Date" value={form.date} onChangeText={(v: string) => set('date', v)} placeholder="YYYY-MM-DD" /><Choices label="Day type" value={form.dayType || 'HOLIDAY'} values={['WORKING_DAY', 'HOLIDAY', 'WEEKLY_OFF']} onChange={(v: string) => set('dayType', v)} /><Field label="Title" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Diwali holiday" /></> : null}{form.action === 'TEACHER' ? <>
  <SelectCards label="Academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} />
  <SelectCards label="Section (Class & Section)" value={sectionId} items={sections} onChange={(v: string) => { set('sectionId', v); set('subjectId', ''); }} getLabel={(x: any) => `${x.className} ${x.name}`} />
  {sectionSubjectsQuery.isLoading ? (
    <View style={{ padding: 12, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Loading subjects for {currentSelectedSection?.className || 'class'}...</Text>
    </View>
  ) : classWiseAssignedSubjects.length === 0 ? (
    <View style={{ marginVertical: 6, padding: 12, backgroundColor: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.25)', borderWidth: 1, borderRadius: 10 }}>
      <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '700' }}>No subjects assigned to {currentSelectedSection?.className || 'this class'} yet.</Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 }}>Please select "SUBJECT" configuration above to create and assign subjects to {currentSelectedSection?.className || 'this class'} first.</Text>
    </View>
  ) : (
    <SelectCards
      label={`Subject (${currentSelectedSection?.className || 'Class'} subjects)`}
      value={teacherSubjectId}
      items={classWiseAssignedSubjects}
      onChange={(v: string) => set('subjectId', v)}
      getLabel={(x: any) => x.streamName ? `${x.code ? x.code + ' · ' : ''}${x.name} [${x.streamName}]` : (x.code ? `${x.code} · ${x.name}` : x.name)}
    />
  )}
  <SelectCards
    label="Teacher"
    value={teacherEmployeeId}
    items={teacherEmployees}
    onChange={(v: string) => set('employeeId', v)}
    getLabel={(x: any) => `${x.name}${x.employeeId ? ` (${x.employeeId})` : ''}${x.primarySubject?.name ? ` · ${x.primarySubject.name}` : ''}`}
  />
  <Field label="Effective from" value={form.effectiveFrom} onChangeText={(v: string) => set('effectiveFrom', v)} placeholder="YYYY-MM-DD" />
</> : null}
{form.action === 'CLASS_TEACHER' ? <>
  <SelectCards label="Academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} />
  <SelectCards label="Section (Class & Section)" value={sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => `${x.className} ${x.name}`} />
  <SelectCards
    label="Class Teacher"
    value={teacherEmployeeId}
    items={teacherEmployees}
    onChange={(v: string) => set('employeeId', v)}
    getLabel={(x: any) => {
      const existing = (classTeacherAssignments || []).find((cta: any) => cta.employeeId === x.id && (!cta.effectiveTo || new Date(cta.effectiveTo) >= new Date()));
      const assignedBadge = existing ? ` [Already Class Teacher: ${existing.section?.schoolClass?.name || 'Class'} ${existing.section?.name || ''}]` : '';
      return `${x.name}${x.employeeId ? ` (${x.employeeId})` : ''}${x.primarySubject?.name ? ` · ${x.primarySubject.name}` : ''}${assignedBadge}`;
    }}
  />
  <Field label="Effective from" value={form.effectiveFrom} onChangeText={(v: string) => set('effectiveFrom', v)} placeholder="YYYY-MM-DD" />
</> : null}{form.action === 'TRANSFER' ? <><SelectCards label="Student" value={form.studentId || students.data?.[0]?.id} items={students.data || []} onChange={(v: string) => set('studentId', v)} getLabel={(x: any) => x.studentId + ' · ' + x.name} /><SelectCards label="Academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /><SelectCards label="New section" value={sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => x.className + ' ' + x.name} /><Field label="New roll number" value={form.rollNumber} onChangeText={(v: string) => set('rollNumber', v)} placeholder="25" /><Field label="Effective from" value={form.effectiveFrom} onChangeText={(v: string) => set('effectiveFrom', v)} placeholder="YYYY-MM-DD" /></> : null}</>;
    if (mode === 'attendance') { const employeeMode = form.action === 'EMPLOYEE'; return <><Choices label="Register" value={form.action} values={['STUDENT', 'EMPLOYEE']} onChange={(v: string) => { set('action', v); set('status', 'PRESENT'); }} /><Field label="Date" value={form.date} onChangeText={(v: string) => set('date', v)} placeholder="YYYY-MM-DD" />{employeeMode ? <SelectCards label="Employee" value={employeeId} items={employees.data || []} onChange={(v: string) => set('employeeId', v)} getLabel={(x: any) => x.employeeId + ' · ' + x.name} /> : <><SelectCards label="Section" value={sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => x.className + ' ' + x.name} /><SelectCards label="Student" value={studentId} items={selectedSectionStudents} onChange={(v: string) => set('studentId', v)} getLabel={(x: any) => x.studentId + ' · ' + x.name} /></>}<Choices label="Status" value={form.status} values={['PRESENT', 'ABSENT', 'LATE']} onChange={(v: string) => set('status', v)} /><Field label="Remarks" value={form.remarks} onChangeText={(v: string) => set('remarks', v)} placeholder="Optional" /><Field label="Correction reason" value={form.reason} onChangeText={(v: string) => set('reason', v)} placeholder="Required for a past date" /></>; }
    if (mode === 'fees' && feeSection === 'CLASS_FEES') return <><Text style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 19 }}>Set the annual fee amount for one student in the selected class.</Text><SelectCards label="Class" value={classId} items={classes} onChange={selectFeeClass} getLabel={(x: any) => x.name} /><Field label="Per-student class fee" value={form.amount ?? (selectedFeeRow?.hasFee ? String(selectedFeeRow.totalFee) : '')} onChangeText={(v: string) => set('amount', v)} placeholder="500000" /><Choices label="Update existing student accounts too?" value={!!form.updateExistingStudents} values={[{ value: false, label: 'No — keep current student fee' }, { value: true, label: 'Yes — update existing students' }]} onChange={(v: boolean) => set('updateExistingStudents', v)} /></>;
    if (mode === 'fees' && (feeSection === 'STUDENT_FEES' || feeSection === 'PAYMENTS')) return <><Text style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 19 }}>{feeSection === 'PAYMENTS' ? 'Filter students by class and section, then tap a student to record a payment.' : 'Filter students by class and section, or select "All Classes" to view all students. Tap any student to view the complete fee summary and payment history.'}</Text><SelectCards label="Class filter" value={studentFeeClassId} items={[{ id: '', name: 'All Classes' }, ...classes]} onChange={(id: string) => { setFeeStudentClassId(id); setFeeStudentSectionId(''); }} getLabel={(x: any) => x.name} /><SelectCards label="Section filter" value={studentFeeSectionId} items={[{ id: '', name: 'All Sections' }, ...studentFeeSections]} onChange={(id: string) => setFeeStudentSectionId(id)} getLabel={(x: any) => x.name} /></>;
    if (mode === 'exams') return <>
      <Text style={s.help}>Select a class and section to see its students. Tap a student card to enter marks for completed exam papers.</Text>
      <SelectCards label="Class filter" value={marksSelectedClassId} items={classes} onChange={(id: string) => { setMarksClassId(id); setMarksSectionId(''); setSelectedMarksStudent(null); setSelectedMarksTimetable(null); setSelectedMarksEntry(null); setFormError(''); }} getLabel={(item: any) => item.name} />
      <SelectCards label="Section filter" value={marksSelectedSectionId} items={marksSections} onChange={(id: string) => { setMarksSectionId(id); setSelectedMarksStudent(null); setSelectedMarksTimetable(null); setSelectedMarksEntry(null); setFormError(''); }} getLabel={(item: any) => item.name} />
      <Text style={s.marksCount}>{marksStudents.length} student{marksStudents.length === 1 ? '' : 's'} found in the selected section.</Text>
      <View style={s.grid}>{marksStudents.length ? marksStudents.map((student: any) => <TouchableOpacity accessibilityRole="button" key={student.id} style={[s.card, selectedMarksStudent?.id === student.id && s.cardSelected]} onPress={() => { setSelectedMarksStudent(student); setSelectedMarksTimetable(null); setSelectedMarksEntry(null); setFormError(''); }}>
        <View style={s.cardTop}><Text style={s.cardTitle}>{student.name}</Text><Text style={s.badge}>{student.studentId}</Text></View>
        <Text style={s.cardBody}>Tap to view completed exams and subject-wise marks.</Text>
      </TouchableOpacity>) : <Text style={s.muted}>No current students are assigned to this class and section.</Text>}</View>
    </>;
    if (mode === 'notices') return <><Field label="Notice title" value={form.title} onChangeText={(v: string) => set('title', v)} placeholder="Parent meeting" /><Field label="Message" value={form.message} onChangeText={(v: string) => set('message', v)} placeholder="Notice details" multiline /><Choices label="Audience" value={form.audience} values={['ALL', 'EMPLOYEES', 'STUDENTS', 'SELECTED_SECTIONS']} onChange={(v: string) => set('audience', v)} />{form.audience === 'SELECTED_SECTIONS' ? <SelectCards label="Section" value={sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => x.className + ' ' + x.name} /> : null}<Choices label="Publish now" value={!!form.published} values={[{ value: true, label: 'Published' }, { value: false, label: 'Draft' }]} onChange={(v: boolean) => set('published', v)} /><Field label="Expiry date" value={form.expiresAt} onChangeText={(v: string) => set('expiresAt', v)} placeholder="Optional YYYY-MM-DD" /></>;
    if (mode === 'accounts') return <><Choices label="Transaction type" value={form.type} values={['EXPENSE', 'INCOME']} onChange={(v: string) => { setForm((old: any) => ({ ...old, type: v, title: '', amount: '', date: '', description: '' })); setFormError(''); }} /><Field label="Title" value={form.title} onChangeText={(v: string) => set('title', v)} placeholder={form.type === 'INCOME' ? 'Tuition fee income' : 'Transport expense'} /><Field label="Amount" value={form.amount} onChangeText={(v: string) => set('amount', v)} placeholder={form.type === 'INCOME' ? '5000' : '2500'} /><Field label="Date" value={form.date} onChangeText={(v: string) => set('date', v)} placeholder="YYYY-MM-DD" /><Field label="Description" value={form.description} onChangeText={(v: string) => set('description', v)} placeholder={form.type === 'INCOME' ? 'Fee, donation or other income details' : 'Fuel, rent or other expense details'} multiline /></>;
    if (mode === 'salary') return <><SelectCards label="Employee" value={employeeId} items={employees.data || []} onChange={(v: string) => set('employeeId', v)} getLabel={(x: any) => x.employeeId + ' · ' + x.name} /><Field label="New salary amount" value={form.salaryAmount ?? ''} onChangeText={(v: string) => set('salaryAmount', v)} placeholder="35000" /><Field label="Effective from" value={form.effectiveFrom} onChangeText={(v: string) => set('effectiveFrom', v)} placeholder="YYYY-MM-DD" /><Field label="Reason" value={form.salaryReason} onChangeText={(v: string) => set('salaryReason', v)} placeholder="Annual revision" multiline /></>;
    return <><CommonSelectors years={years} sections={sections} subjects={subjects} employees={employees.data || []} values={{ yearId, sectionId, subjectId, employeeId }} set={set} /><Choices label="Entry type" value={form.entryType} values={['LECTURE', 'BREAK']} onChange={(v: string) => set('entryType', v)} /><Field label="Day of week (1-7)" value={form.dayOfWeek} onChangeText={(v: string) => set('dayOfWeek', v)} placeholder="1" /><Field label="Period number" value={form.periodNumber} onChangeText={(v: string) => set('periodNumber', v)} placeholder="1" /><Field label="Start time" value={form.startTime} onChangeText={(v: string) => set('startTime', v)} placeholder="09:00" /><Field label="End time" value={form.endTime} onChangeText={(v: string) => set('endTime', v)} placeholder="09:45" /><Field label="Effective from" value={form.effectiveFrom} onChangeText={(v: string) => set('effectiveFrom', v)} placeholder="YYYY-MM-DD" /></>;
  };

  const calendarRows = (calendarRecords.data || []).map((entry: any) => ({ ...entry, _recordType: 'CALENDAR', name: entry.title || entry.dayType, date: entry.date }));
  const academicRows = academicTab === 'classes' ? [{ _sectionHeader: 'Academic years & setup' }, ...years, { _sectionHeader: 'Classes & sections' }, ...classes] : [{ _sectionHeader: 'Holidays & calendar events' }, ...calendarRows];
  const configuredFeeStructures = mode === 'fees' && Array.isArray(records.data) ? records.data : [];
  const allStudentFeeRows = (feeAccounts.data || []).filter((account: any) => !yearId || account.academicYearId === yearId).map(formatStudentFeeRow);

  const feeRows = classes.map((schoolClass: any) => {
    const structure = configuredFeeStructures.find((item: any) => item.classId === schoolClass.id && (!yearId || item.academicYearId === yearId));
    const classAccounts = allStudentFeeRows.filter((acc: any) => acc.classId === schoolClass.id);
    const studentCount = classAccounts.length;
    const totalCollected = classAccounts.reduce((sum: number, acc: any) => sum + acc.paidAmount, 0);
    const totalPending = classAccounts.reduce((sum: number, acc: any) => sum + acc.remainingFee, 0);
    const totalAssessed = classAccounts.reduce((sum: number, acc: any) => sum + acc.totalFee, 0);
    const collectionPercentage = totalAssessed > 0 ? Math.round((totalCollected / totalAssessed) * 100) : 0;
    return {
      id: schoolClass.id,
      name: schoolClass.name,
      totalFee: structure?.totalFee,
      hasFee: !!structure,
      academicYearId: yearId,
      studentCount,
      totalCollected,
      totalPending,
      totalAssessed,
      collectionPercentage,
    };
  });
  const selectedFeeRow = feeRows.find((row: any) => row.id === classId);
  const activeClassForStudentFees = useMemo(() => {
    if (!selectedClassForStudentFees) return null;
    return feeRows.find((r: any) => r.id === selectedClassForStudentFees.id) || selectedClassForStudentFees;
  }, [selectedClassForStudentFees, feeRows]);
  const selectFeeClass = (id: string) => { const row = feeRows.find((item: any) => item.id === id); setForm((old: any) => ({ ...old, classId: id, amount: row?.hasFee ? String(row.totalFee) : '' })); };
  const selectFeeStudentClass = (id: string) => { setFeeStudentClassId(id); setFeeStudentSectionId(''); };
  const studentFeeRows = allStudentFeeRows.filter((row: any) => {
    const matchClass = !studentFeeClassId || row.classId === studentFeeClassId;
    const matchSection = !studentFeeSectionId || row.sectionId === studentFeeSectionId;
    const query = feeSearchQuery.trim().toLowerCase();
    const matchSearch = !query ||
      (row.studentName && row.studentName.toLowerCase().includes(query)) ||
      (row.studentCode && row.studentCode.toLowerCase().includes(query)) ||
      (row.rollNumber && row.rollNumber.toLowerCase().includes(query));
    return matchClass && matchSection && matchSearch;
  });

  const handleDownloadFeeReport = () => {
    const selectedClass = classes.find((c: any) => c.id === studentFeeClassId);
    const selectedSection = studentFeeSections.find((s: any) => s.id === studentFeeSectionId);
    const currentAcademicYear = years.find((y: any) => y.id === yearId)?.name || 'Current Academic Year';

    downloadFeeReportPdf({
      schoolName: 'Arihant Public School',
      filterClass: selectedClass?.name || 'All Classes',
      filterSection: selectedSection?.name ? `Section ${selectedSection.name}` : (studentFeeClassId ? 'All Sections' : 'All Sections'),
      academicYear: currentAcademicYear,
      students: studentFeeRows.map((row: any) => ({
        studentName: row.studentName,
        studentId: row.studentCode,
        rollNumber: row.rollNumber || row.student?.enrollments?.[0]?.rollNumber || row.student?.rollNumber || '',
        className: row.className,
        sectionName: row.sectionName,
        totalFee: row.totalFee,
        paidAmount: row.paidAmount,
        remainingFee: row.remainingFee,
        creditBalance: row.creditBalance,
      })),
    });
  };
  const salaryRows = (salaryAccounts.data || []).filter((employee: any) => !salarySubRole || employee.subRole === salarySubRole).map((employee: any) => {
    const monthlySalaries = employee.monthlySalaries || [];
    const latestSalary = monthlySalaries[0];
    const payableSalary = latestSalary || null;
    const paymentTotal = (salary: any) => (salary?.payments || []).filter((payment: any) => payment.status === 'SUCCESS').reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    const paidAmount = paymentTotal(payableSalary);
    const payableAmount = Number(payableSalary?.netPayable || 0);
    const previousSalaries = monthlySalaries.slice(1);
    const previousRemaining = previousSalaries.reduce((sum: number, salary: any) => sum + Math.max(Number(salary.netPayable || 0) - paymentTotal(salary), 0), 0);
    const previousCredit = previousSalaries.reduce((sum: number, salary: any) => sum + Math.max(paymentTotal(salary) - Number(salary.netPayable || 0), 0), 0);
    const currentMonthLabel = payableSalary ? new Date(2000, payableSalary.month - 1, 1).toLocaleString('en-US', { month: 'long' }) + ' ' + payableSalary.year : 'Current month';
    return { ...employee, currentSalary: Number(employee.salaryRevisions?.[0]?.amount || 0), monthlySalaries, latestSalary, payableSalary, paidAmount, payableAmount, remainingAmount: Math.max(payableAmount - paidAmount, 0), creditBalance: Math.max(paidAmount - payableAmount, 0), previousRemaining, previousCredit, totalRemaining: Math.max(payableAmount - paidAmount, 0) + previousRemaining, totalCredit: Math.max(paidAmount - payableAmount, 0) + previousCredit, currentMonthLabel, attendanceStatuses: payableSalary?.snapshot?.statuses || {} };
  });
  const selectedSalaryPayment = (selectedSalaryHistory.data || [])[0] || selectedSalaryAccount?.payableSalary || null;
  const selectedSalaryPaymentPaid = selectedSalaryPayment ? (selectedSalaryPayment.payments || []).filter((payment: any) => payment.status === 'SUCCESS').reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0) : 0;
  const selectedSalaryPaymentPayable = selectedSalaryPayment ? Number(selectedSalaryPayment.netPayable || 0) : 0;
  const selectedSalaryPaymentRemaining = Math.max(selectedSalaryPaymentPayable - selectedSalaryPaymentPaid, 0);
  const selectedSalaryPaymentCredit = Math.max(selectedSalaryPaymentPaid - selectedSalaryPaymentPayable, 0);
  const examTimetableRows = mode === 'exams' && examSection === 'TIMETABLE' && Array.isArray(records.data) ? records.data.map((timetable: any) => ({ ...timetable, title: `${timetable.schoolClass?.name || 'Class'} · ${timetable.title}`, message: `${timetable.type} · ${displayDate(timetable.startDate)} to ${displayDate(timetable.endDate)}\n${(timetable.entries || []).map((entry: any) => entry.isHoliday ? `${displayDate(entry.date)} · Holiday: ${entry.holidayTitle || 'Holiday'}` : `${displayDate(entry.date)} · ${entry.subject?.name || 'Subject'} · ${displayTime(entry.startTime)}–${displayTime(entry.endTime)}`).join('\n')}`, date: timetable.startDate, _recordType: 'EXAM_TIMETABLE' })) : [];
  const rawRows = mode === 'academics' ? academicRows : mode === 'fees' ? (feeSection === 'CLASS_FEES' ? feeRows : studentFeeRows) : mode === 'salary' ? salaryRows : mode === 'accounts' ? records.data?.transactions : mode === 'exams' && examSection === 'TIMETABLE' ? examTimetableRows : records.data;
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const hasRecords = mode === 'academics' ? years.length + classes.length + subjects.length + calendarRows.length > 0 : mode === 'fees' ? (feeSection === 'CLASS_FEES' ? classes.length > 0 : rows.length > 0) : mode === 'salary' ? rows.length > 0 : rows.length > 0;
  const salaryFilterChoices = [{ value: '', label: 'All sub-roles' }, { value: 'TEACHER', label: 'Teacher' }, { value: 'ACCOUNTANT', label: 'Accountant' }, { value: 'STAFF', label: 'Staff' }];
  const showSalarySetupForm = mode !== 'salary' || salarySection === 'SETUP';
  const formPanelTitle = editingCalendarId ? 'Edit calendar entry' : mode === 'fees' ? (feeSection === 'CLASS_FEES' ? 'Update class fees' : feeSection === 'PAYMENTS' ? 'Record student payment' : 'Student fees') : mode === 'salary' ? 'Update employee salary' : mode === 'exams' ? (examSection === 'TIMETABLE' ? 'Create exam timetable' : 'Enter marks by student') : 'Create / process record';
  const formSaveLabel = editingCalendarId ? 'Update calendar entry' : mode === 'attendance' ? 'Save attendance' : mode === 'salary' ? 'Update salary' : mode === 'fees' ? (selectedFeeRow?.hasFee ? 'Update class fee' : 'Save class fee') : mode === 'exams' && examSection === 'TIMETABLE' ? 'Save exam timetable' : 'Save record';
  return <View style={s.page}>
    
    
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <View style={s.heroText}><Text style={s.eyebrow}>{String(eyebrow)}</Text><Text style={s.title}>{String(title)}</Text><Text style={s.description}>{String(description)}</Text></View>
        {mode !== 'timetable' && !(mode === 'fees' && isAccountant) ? (
          <TouchableOpacity accessibilityRole="button" style={s.goldButton} onPress={() => setOpen(!open)}>
            <Text style={s.goldText}>{open ? 'Close form' : mode === 'fees' ? 'Open fee section' : '+ New record'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {mode === 'academics' && open && showSalarySetupForm ? <View style={s.panel}><Text style={s.panelTitle}>{formPanelTitle}</Text>{formContent()}{formError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 8, marginBottom: 8 }}>{String(formError)}</Text> : null}<TouchableOpacity accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]} onPress={submit}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>{formSaveLabel}</Text>}</TouchableOpacity></View> : null}
      {mode === 'exams' ? <View style={s.tabs}>{[['TIMETABLE', 'Exam Timetable', '🗓️'], ['ASSESSMENTS', 'Exam & Marks', '📝']].map(([key, label, icon]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: examSection === key }} key={key} style={[s.tab, examSection === key && s.tabActive]} onPress={() => { setExamSection(key as any); setOpen(true); setFormError(''); }}><Text style={s.tabIcon}>{icon}</Text><Text style={[s.tabText, examSection === key && s.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View> : null}
      {mode === 'exams' && examSection === 'TIMETABLE' ? <ExamTimetableBuilder years={years} classes={classes} teacherAssignments={teacherAssignments} classSubjects={academics.data?.classSubjects || []} subjects={subjects} onSaved={refresh} /> : null}
      {mode === 'academics' ? <View style={s.tabs}>{[['classes', 'Classes & Sections', '🏫'], ['class-subjects', 'Class Subjects', '📖'], ['calendar', 'Holidays / Calendar', '🗓️']].map(([key, label, icon]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: academicTab === key }} key={key} style={[s.tab, academicTab === key && s.tabActive]} onPress={() => { setAcademicTab(key as any); setFormError(''); }}><Text style={s.tabIcon}>{icon}</Text><Text style={[s.tabText, academicTab === key && s.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View> : null}
      {mode === 'academics' && academicTab === 'class-subjects' ? (
        <ClassSubjectManager
          classes={classes}
          subjects={subjects}
          parentSubjects={academics.data?.parentSubjects || []}
          onChanged={refresh}
        />
      ) : null}
      {mode === 'fees' ? (
        <View style={s.tabs}>
          {[
            ...(!isAccountant ? [['CLASS_FEES', 'Update Class Fees', '💳']] : []),
            ['STUDENT_FEES', 'Student Fees', '👨‍🎓'],
            ['PAYMENTS', 'Record Payment', '💰'],
          ].map(([key, label, icon]) => (
            <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: feeSection === key }} key={key} style={[s.tab, feeSection === key && s.tabActive]} onPress={() => { setFeeSection(key as any); setFormError(''); }}>
              <Text style={s.tabIcon}>{icon}</Text>
              <Text style={[s.tabText, feeSection === key && s.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {mode === 'salary' ? <View style={s.tabs}>{[['SETUP', 'Update Salary', '💼'], ['HISTORY', 'Salary History', '📜'], ['PAYMENTS', 'Pay Salary', '💰']].map(([key, label, icon]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: salarySection === key }} key={key} style={[s.tab, salarySection === key && s.tabActive]} onPress={() => { setSalarySection(key as any); setFormError(''); setSelectedSalaryAccount(null); setOpen(key === 'SETUP'); }}><Text style={s.tabIcon}>{icon}</Text><Text style={[s.tabText, salarySection === key && s.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View> : null}
      {mode === 'timetable' ? (
        <DailyTimetableBuilder
          years={years}
          classes={classes}
          employees={employees.data || []}
          onSaved={refresh}
        />
      ) : null}
      {mode === 'salary' ? <View style={s.panel}><Text style={s.panelTitle}>Filter employees by sub-role</Text><Choices value={salarySubRole} values={salaryFilterChoices} onChange={(v: string) => setSalarySubRole(v)} /></View> : null}
      {mode !== 'academics' && mode !== 'timetable' && !(mode === 'exams' && examSection === 'TIMETABLE') && open && showSalarySetupForm ? <View style={s.panel}><Text style={s.panelTitle}>{formPanelTitle}</Text>{formContent()}{formError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 8, marginBottom: 8 }}>{String(formError)}</Text> : null}{mode !== 'exams' && (mode !== 'fees' || feeSection === 'CLASS_FEES') && showSalarySetupForm ? <TouchableOpacity accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]} onPress={submit}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>{formSaveLabel}</Text>}</TouchableOpacity> : null}</View> : null}
      {mode !== 'exams' && mode !== 'timetable' && !(mode === 'academics' && academicTab === 'class-subjects') ? (
        <View style={s.listHeader}>
          <Text style={s.listTitle}>
            {mode === 'academics'
              ? `${academicTab === 'classes' ? 'Classes & Academic Years' : 'Holidays & Calendar'} records`
              : mode === 'fees'
              ? feeSection === 'CLASS_FEES'
                ? 'Class fee list'
                : feeSection === 'PAYMENTS'
                ? 'Students for payment'
                : 'Student fee list'
              : mode === 'salary'
              ? salarySection === 'SETUP'
                ? 'Employee salary list'
                : salarySection === 'HISTORY'
                ? 'Salary history list'
                : 'Employees for salary payment'
              : mode === 'accounts'
              ? 'School Income & Expense Transactions'
              : 'Database records'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {mode === 'fees' && feeSection === 'STUDENT_FEES' && studentFeeRows.length > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={s.downloadListBtn}
                onPress={handleDownloadFeeReport}
              >
                <Text style={s.downloadListText}>⬇ Download Fee List (PDF)</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity accessibilityRole="button" onPress={refresh}>
              <Text style={s.refresh}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {mode === 'fees' && feeSection !== 'CLASS_FEES' ? (
        <View style={s.feeFilterPanel}>
          {/* Live Search Bar */}
          <View style={s.feeSearchWrap}>
            <Ionicons name="search-outline" size={17} color="rgba(255, 255, 255, 0.4)" style={s.feeSearchIcon} />
            <TextInput
              style={s.feeSearchInput}
              value={feeSearchQuery}
              onChangeText={setFeeSearchQuery}
              placeholder="Search student by name, student ID (e.g. STU000001) or roll number..."
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {feeSearchQuery ? (
              <TouchableOpacity accessibilityRole="button" onPress={() => setFeeSearchQuery('')} style={s.feeSearchClear}>
                <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.55)" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Class & Section Filter Chips */}
          <View style={s.feeFilterRow}>
            <View style={s.feeFilterGroup}>
              <Text style={s.feeFilterLabel}>FILTER BY CLASS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[s.filterChip, !studentFeeClassId && s.filterChipActive]}
                  onPress={() => { setFeeStudentClassId(''); setFeeStudentSectionId(''); }}
                >
                  <Text style={[s.filterChipText, !studentFeeClassId && s.filterChipTextActive]}>All Classes</Text>
                </TouchableOpacity>
                {classes.map((c: any) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={c.id}
                    style={[s.filterChip, studentFeeClassId === c.id && s.filterChipActive]}
                    onPress={() => { setFeeStudentClassId(c.id); setFeeStudentSectionId(''); }}
                  >
                    <Text style={[s.filterChipText, studentFeeClassId === c.id && s.filterChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {studentFeeSections.length > 0 ? (
              <View style={s.feeFilterGroup}>
                <Text style={s.feeFilterLabel}>FILTER BY SECTION</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[s.filterChip, !studentFeeSectionId && s.filterChipActive]}
                    onPress={() => setFeeStudentSectionId('')}
                  >
                    <Text style={[s.filterChipText, !studentFeeSectionId && s.filterChipTextActive]}>All Sections</Text>
                  </TouchableOpacity>
                  {studentFeeSections.map((sec: any) => (
                    <TouchableOpacity
                      accessibilityRole="button"
                      key={sec.id}
                      style={[s.filterChip, studentFeeSectionId === sec.id && s.filterChipActive]}
                      onPress={() => setFeeStudentSectionId(sec.id)}
                    >
                      <Text style={[s.filterChipText, studentFeeSectionId === sec.id && s.filterChipTextActive]}>
                        Section {sec.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* Summary / Reset */}
          <View style={s.feeFilterSummary}>
            <Text style={s.feeFilterSummaryText}>
              Showing <Text style={{ color: '#fbbf24', fontWeight: '800' }}>{studentFeeRows.length}</Text> of {allStudentFeeRows.length} students
              {studentFeeClassId ? ` · ${classes.find((c: any) => c.id === studentFeeClassId)?.name || 'Class'}` : ''}
              {studentFeeSectionId ? ` · Section ${studentFeeSections.find((s: any) => s.id === studentFeeSectionId)?.name || ''}` : ''}
              {feeSearchQuery.trim() ? ` · Matching "${feeSearchQuery.trim()}"` : ''}
            </Text>
            {(studentFeeClassId || studentFeeSectionId || feeSearchQuery.trim()) ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => { setFeeStudentClassId(''); setFeeStudentSectionId(''); setFeeSearchQuery(''); }}
              >
                <Text style={s.feeFilterResetText}>Reset filters ✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
      {mode === 'accounts' && records.data && typeof records.data.income === 'number' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: 140, backgroundColor: 'rgba(52, 211, 153, 0.12)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.3)', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#34d399', fontWeight: '800' }}>TOTAL INCOME</Text>
            <Text style={{ fontSize: 18, color: '#34d399', fontWeight: '900', marginTop: 4 }}>₹{formatMoney(records.data.income)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 140, backgroundColor: 'rgba(248, 113, 113, 0.12)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#f87171', fontWeight: '800' }}>TOTAL EXPENSE</Text>
            <Text style={{ fontSize: 18, color: '#f87171', fontWeight: '900', marginTop: 4 }}>₹{formatMoney(records.data.expense)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 140, backgroundColor: 'rgba(96, 165, 250, 0.12)', borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.3)', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#93c5fd', fontWeight: '800' }}>NET BALANCE</Text>
            <Text style={{ fontSize: 18, color: '#93c5fd', fontWeight: '900', marginTop: 4 }}>₹{formatMoney(records.data.balance)}</Text>
          </View>
        </View>
      ) : null}
      {mode !== 'exams' && mode !== 'timetable' && !(mode === 'academics' && academicTab === 'class-subjects') ? (records.isLoading || feeAccounts.isLoading || academics.isLoading || calendarRecords.isLoading || salaryAccounts.isLoading ? <ActivityIndicator color="#c88728" /> : !hasRecords ? <View style={s.empty}><Text style={s.emptyTitle}>{mode === 'fees' ? (feeSection === 'CLASS_FEES' ? 'No academic classes available' : 'No student fee accounts found') : mode === 'salary' ? 'No active employees found' : 'No records available'}</Text><Text style={s.muted}>{mode === 'fees' && feeSection !== 'CLASS_FEES' ? 'No current student fee accounts match the selected filters or search query.' : mode === 'salary' ? 'No active employees match the selected sub-role.' : emptyMessage(mode, form.action)}</Text></View> : <View style={s.grid}>{(() => {
        const isStudentFee = mode === 'fees' && feeSection !== 'CLASS_FEES';
        const displayRows = isStudentFee ? (studentFeeClassId || feeStudentSectionId || feeSearchQuery.trim() ? rows : rows.slice(0, 200)) : rows.slice(0, 100);
        return displayRows.map((row: any, index: number) => {
        if (row._sectionHeader) return <View key={row._sectionHeader} style={s.sectionHeader}><Text style={s.sectionTitle}>{row._sectionHeader}</Text></View>;
        const isStudentFee = mode === 'fees' && feeSection !== 'CLASS_FEES';
        const isClassFee = mode === 'fees' && feeSection === 'CLASS_FEES';
        const isSalaryCard = mode === 'salary';
        const cardTitle = isSalaryCard ? row.name : isStudentFee ? row.studentName : mode === 'fees' ? row.name : row.title || row.name || row.student?.name || row.receiptNo || ('Record ' + (index + 1));
        const cardBadge = isSalaryCard
          ? row.subRole || 'SUB-ROLE NOT SET'
          : isStudentFee
          ? row.className + ' · ' + row.sectionName
          : isClassFee
          ? (row.studentCount > 0 ? `${row.studentCount} Students · ${row.collectionPercentage}% Paid` : (row.hasFee ? 'SET' : 'NOT SET'))
          : mode === 'accounts'
          ? (row.reversedAt ? 'CANCELLED / REVERSED' : row.type)
          : row.status || row.type || row.calculationStatus || (row.published ? 'PUBLISHED' : row._recordType === 'CALENDAR' ? row.dayType : 'ACTIVE');
        const cardBody = isSalaryCard
          ? 'Current month (' + row.currentMonthLabel + '): Gross ₹' + formatMoney(row.latestSalary?.grossAmount) + ' · Deduction ₹' + formatMoney(row.latestSalary?.deductionAmount) + ' · Payable ₹' + formatMoney(row.payableAmount) + ' · Paid ₹' + formatMoney(row.paidAmount) + ' · Remaining ₹' + formatMoney(row.remainingAmount) + ' · Present ' + (row.attendanceStatuses?.PRESENT || 0) + ' · Absent ' + (row.attendanceStatuses?.ABSENT || 0) + ' · Half-day ' + (row.attendanceStatuses?.HALF_DAY || 0) + ' · Late ' + (row.attendanceStatuses?.LATE || 0) + ' · Previous remaining ₹' + formatMoney(row.previousRemaining) + ' · Previous credit ₹' + formatMoney(row.previousCredit) + ' · Total due ₹' + formatMoney(row.totalRemaining) + ' · Total credit ₹' + formatMoney(row.totalCredit)
          : isStudentFee
          ? 'Student ID: ' + row.studentCode + ' · Fee / Remaining: ₹' + formatMoney(row.totalFee) + ' / ₹' + formatMoney(row.remainingFee) + ' · Paid: ₹' + formatMoney(row.paidAmount) + (row.creditBalance > 0 ? ' · Credit: ₹' + formatMoney(row.creditBalance) : '')
          : mode === 'fees'
          ? (row.hasFee ? 'Per-student fee: ₹' + formatMoney(row.totalFee) : 'Fee not set')
          : mode === 'accounts'
          ? 'Amount: ₹' + formatMoney(row.amount) + '\nTransaction date: ' + displayDate(row.transactionDate) + '\nAdded: ' + displayDateTime(row.createdAt) + '\nDescription: ' + (row.description || 'No description provided.') + '\nSource: ' + (row.sourceType || 'MANUAL')
          : row.message || row.description || row.schoolClass?.name || row.student?.studentId || row.subject?.name || row.employee?.name || (row._recordType === 'CALENDAR' ? 'Administration calendar entry' : 'Additional details are not available.');

        return <TouchableOpacity accessibilityRole="button" style={[s.card, selectedAcademic?.id === row.id && s.cardSelected]} key={row.id || index} onPress={() => {
          if (mode === 'academics' && row._recordType !== 'CALENDAR') setSelectedAcademic(row);
          else if (isStudentFee) setSelectedFeeAccount(row);
          else if (isClassFee) {
            selectFeeClass(row.id);
            setSelectedClassForStudentFees(row);
          }
          else if (isSalaryCard && salarySection === 'SETUP') { set('employeeId', row.id); setOpen(true); }
          else if (isSalaryCard && salarySection === 'HISTORY') { setSelectedSalaryAccount(row); }
          else if (isSalaryCard) openSalaryPayment(row);
        }}>
          <View style={s.cardTop}>
            <Text style={s.cardTitle}>{String(cardTitle)}</Text>
            {mode === 'accounts' ? (
              <View style={[
                s.paymentStatusBadge,
                row.reversedAt ? s.paymentReversedBadge : (row.type === 'INCOME' ? { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.35)' } : { backgroundColor: 'rgba(248, 113, 113, 0.15)', borderColor: 'rgba(248, 113, 113, 0.35)' })
              ]}>
                <Text style={[
                  s.paymentStatusText,
                  row.reversedAt ? s.paymentReversedText : (row.type === 'INCOME' ? { color: '#34d399' } : { color: '#f87171' })
                ]}>
                  {row.reversedAt ? 'CANCELLED / REVERSED' : row.type}
                </Text>
              </View>
            ) : (
              <Text style={s.badge}>{String(cardBadge)}</Text>
            )}
          </View>

          {isClassFee ? (
            <View style={{ marginTop: 6, gap: 6 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Text style={s.cardBody}>
                  {row.hasFee ? 'Per-student fee: ₹' + formatMoney(row.totalFee) : 'Fee not set'}
                </Text>
                <Text style={[s.cardBody, { color: colors.muted }]}>
                  • {row.studentCount} {row.studentCount === 1 ? 'Student' : 'Students'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                <View style={{ backgroundColor: 'rgba(52,211,153,0.12)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: '#34d399', fontWeight: '800' }}>FEE COLLECTED (LE LI GAYI):</Text>
                  <Text style={{ fontSize: 13, color: '#34d399', fontWeight: '800' }}>₹{formatMoney(row.totalCollected)}</Text>
                </View>
                <View style={{ backgroundColor: row.totalPending > 0 ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: row.totalPending > 0 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: row.totalPending > 0 ? '#f87171' : '#94a3b8', fontWeight: '800' }}>FEE PENDING (BAKI HAI):</Text>
                  <Text style={{ fontSize: 13, color: row.totalPending > 0 ? '#f87171' : '#94a3b8', fontWeight: '800' }}>₹{formatMoney(row.totalPending)}</Text>
                </View>
                {row.totalAssessed > 0 ? (
                  <View style={{ backgroundColor: 'rgba(147,155,255,0.10)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(147,155,255,0.25)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>TOTAL BILLED:</Text>
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '800' }}>₹{formatMoney(row.totalAssessed)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : mode === 'accounts' ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={[
                s.paymentAmount,
                { fontSize: 18 },
                row.reversedAt && { textDecorationLine: 'line-through', opacity: 0.6 }
              ]}>
                ₹{formatMoney(row.amount)}
              </Text>
              <Text style={s.cardBody}>
                Transaction date: {displayDate(row.transactionDate)} · Added: {displayDateTime(row.createdAt)}
              </Text>
              {row.description ? (
                <Text style={[s.cardBody, row.reversedAt && { color: '#fca5a5' }]}>
                  {row.description}
                </Text>
              ) : null}
              {row.sourceType && row.sourceType !== 'MANUAL' ? (
                <Text style={s.meta}>Source: {row.sourceType}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={s.cardBody}>{String(cardBody)}</Text>
          )}

          {mode === 'accounts' ? (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
              {row.reversedAt ? (
                <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: 8 }}>
                  <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '800' }}>
                    ⛔ CANCELLED / REVERSED on {displayDate(row.reversedAt)}
                  </Text>
                  <Text style={{ color: '#fca5a5', fontSize: 10.5, marginTop: 2 }}>
                    This transaction is excluded from total income/expense and balance calculations.
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.editPaymentBtn}
                    onPress={() => openEditAccountTx(row)}
                  >
                    <Text style={s.editPaymentText}>✏ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.reversePaymentBtn}
                    onPress={() => openReverseAccountTx(row)}
                  >
                    <Text style={s.reversePaymentText}>✕ Void / Reverse</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {isSalaryCard ? <><Text style={s.tap}>{salarySection === 'SETUP' ? 'Tap to update salary' : salarySection === 'HISTORY' ? 'Tap to view salary history' : 'Tap to record salary payment'}</Text>{salarySection === 'PAYMENTS' ? <TouchableOpacity accessibilityRole="button" style={s.smallButton} onPress={() => openSalaryPayment(row)}><Text style={s.smallText}>Open payment form</Text></TouchableOpacity> : null}</> : isStudentFee ? <Text style={s.tap}>{feeSection === 'PAYMENTS' ? 'Tap to record payment' : 'Tap to view payment history'}</Text> : isClassFee ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={[s.tap, { marginBottom: 0 }]}>Tap card to view students & edit fees</Text>
              <TouchableOpacity
                accessibilityRole="button"
                style={[s.smallButton, { backgroundColor: 'rgba(200,135,40,0.18)', borderColor: 'rgba(200,135,40,0.4)', borderWidth: 1 }]}
                onPress={() => setSelectedClassForStudentFees(row)}
              >
                <Text style={[s.smallText, { color: '#f59e0b', fontWeight: '700' }]}>👥 View Students & Edit Fee</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {mode !== 'accounts' && (row.date || row.transactionDate || row.createdAt) ? <Text style={s.meta}>{displayDate(row.date || row.transactionDate || row.createdAt)}</Text> : null}
          {mode === 'academics' && row._recordType === 'CALENDAR' ? <View style={s.cardActions}><TouchableOpacity style={s.smallButton} onPress={() => editCalendar(row)}><Text style={s.smallText}>Edit</Text></TouchableOpacity><TouchableOpacity style={s.deleteButton} onPress={() => deleteCalendar(row.id)}><Text style={s.deleteText}>Delete</Text></TouchableOpacity></View> : null}
        
{mode === 'academics' && row._recordType !== 'CALENDAR' ? <View style={s.cardActions}><TouchableOpacity accessibilityRole="button" style={s.smallButton} onPress={() => setSelectedAcademic(row)}><Text style={s.smallText}>View details</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={s.deleteButton} onPress={() => deleteAcademicRecord(row)}><Text style={s.deleteText}>Delete {row.sections !== undefined || (!row.code && !row.startDate) ? 'class' : 'record'}</Text></TouchableOpacity></View> : null}{(mode as string) === 'exams' && !row.published ? <TouchableOpacity style={s.smallButton} onPress={() => publishExam(row.id)}><Text style={s.smallText}>Publish result</Text></TouchableOpacity> : null}</TouchableOpacity>; }); })()}</View>) : null}
    </ScrollView>
    <Modal visible={mode === 'academics' && !!selectedAcademic} transparent animationType="fade" onRequestClose={() => setSelectedAcademic(null)}>
      <View style={s.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close academic details" style={StyleSheet.absoluteFill} onPress={() => setSelectedAcademic(null)} />
        <View style={s.modalShell}>
          {selectedAcademic ? (
            <AcademicDetailsModal
              selectedAcademic={selectedAcademic}
              classes={classes}
              classSubjects={academics.data?.classSubjects || []}
              teacherAssignments={teacherAssignments}
              classTeacherAssignments={classTeacherAssignments}
              students={students.data || []}
              onClose={() => setSelectedAcademic(null)}
              onDeleteRecord={deleteAcademicRecord}
              onDeleteAssignment={deleteAssignment}
            />
          ) : null}
        </View>
      </View>
    </Modal>
    <Modal visible={mode === 'fees' && feeSection === 'STUDENT_FEES' && !!selectedFeeAccount} transparent animationType="fade" onRequestClose={() => setSelectedFeeAccount(null)}>
      <View style={s.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close student fee details" style={StyleSheet.absoluteFill} onPress={() => setSelectedFeeAccount(null)} />
        <View style={s.modalShell}>
          <ScrollView contentContainerStyle={s.modalContent}>
            {selectedFeeAccount ? (
              <View style={s.detailPanel}>
                <View style={s.detailHeader}>
                  <View>
                    <Text style={s.eyebrow}>STUDENT FEE DETAILS</Text>
                    <Text style={s.panelTitle}>{selectedFeeAccount.studentName}</Text>
                    <Text style={s.meta}>
                      {selectedFeeAccount.studentCode}
                      {selectedFeeAccount.rollNumber ? ` · Roll No: ${selectedFeeAccount.rollNumber}` : ''}
                      {` · ${selectedFeeAccount.className} · ${selectedFeeAccount.sectionName}`}
                    </Text>
                  </View>
                  <TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setSelectedFeeAccount(null)}>
                    <Text style={s.closeText}>Close ✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.detailHeading}>Fee summary</Text>
                <Text style={s.detailRow}>Total fee: ₹{formatMoney(selectedFeeAccount.totalFee)}</Text>
                <Text style={s.detailRow}>Paid: ₹{formatMoney(selectedFeeAccount.paidAmount)}</Text>
                <Text style={s.detailRow}>Remaining: ₹{formatMoney(selectedFeeAccount.remainingFee)}</Text>
                {selectedFeeAccount.creditBalance > 0 ? (
                  <Text style={s.detailRow}>Credit balance: ₹{formatMoney(selectedFeeAccount.creditBalance)}</Text>
                ) : null}
                <Text style={s.detailHeading}>Payment history</Text>
                {selectedFeeAccount.transactions?.length ? (
                  selectedFeeAccount.transactions.map((transaction: any) => {
                    const rollNo = selectedFeeAccount.rollNumber ||
                      selectedFeeAccount.student?.enrollments?.[0]?.rollNumber ||
                      selectedFeeAccount.student?.rollNumber ||
                      '';
                    const yrName = selectedFeeAccount.academicYear?.name ||
                      years.find((y: any) => y.id === selectedFeeAccount.academicYearId)?.name ||
                      '';

                    return (
                      <View key={transaction.id} style={s.paymentHistoryCard}>
                        <View style={s.paymentHistoryHeader}>
                          <View style={{ flex: 1, minWidth: 160 }}>
                            <Text style={s.paymentAmount}>{transaction.receiptNo || 'Payment record'}</Text>
                            <Text style={s.meta}>
                              {displayDate(transaction.paymentDate)} · {displayDateTime(transaction.createdAt)}
                            </Text>
                          </View>
                          <View style={s.paymentHistoryActions}>
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={s.downloadReceiptBtn}
                              onPress={() => {
                                downloadFeeReceiptPdf({
                                  receiptNo: transaction.receiptNo || 'APS-RCP-0000000',
                                  paymentDate: transaction.paymentDate || transaction.createdAt,
                                  amount: transaction.amount,
                                  method: transaction.method || 'CASH',
                                  status: transaction.status || 'SUCCESS',
                                  reference: transaction.reference,
                                  remarks: transaction.remarks,
                                  studentName: selectedFeeAccount.studentName,
                                  studentId: selectedFeeAccount.studentCode,
                                  rollNumber: rollNo,
                                  className: selectedFeeAccount.className,
                                  sectionName: selectedFeeAccount.sectionName,
                                  academicYear: yrName,
                                  assessed: selectedFeeAccount.totalFee,
                                  netPaid: selectedFeeAccount.paidAmount,
                                  outstanding: selectedFeeAccount.remainingFee,
                                  creditBalance: selectedFeeAccount.creditBalance,
                                });
                              }}
                            >
                              <Text style={s.downloadReceiptText}>⬇ Receipt PDF</Text>
                            </TouchableOpacity>
                            {transaction.status === 'SUCCESS' && !isAccountant ? (
                              <>
                                <TouchableOpacity
                                  accessibilityRole="button"
                                  style={s.editPaymentBtn}
                                  onPress={() => openEditFeeTx(transaction)}
                                >
                                  <Text style={s.editPaymentText}>✏ Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  accessibilityRole="button"
                                  style={s.reversePaymentBtn}
                                  onPress={() => openReverseFeeTx(transaction)}
                                >
                                  <Text style={s.reversePaymentText}>✕ Void / Reverse</Text>
                                </TouchableOpacity>
                              </>
                            ) : null}
                            <View
                              style={[
                                s.paymentStatusBadge,
                                transaction.status === 'REVERSED'
                                  ? s.paymentReversedBadge
                                  : (transaction.status !== 'SUCCESS' && s.paymentPendingBadge),
                              ]}
                            >
                              <Text
                                style={[
                                  s.paymentStatusText,
                                  transaction.status === 'REVERSED'
                                    ? s.paymentReversedText
                                    : (transaction.status !== 'SUCCESS' && s.paymentPendingText),
                                ]}
                              >
                                {transaction.status === 'REVERSED'
                                  ? 'CANCELLED / REVERSED'
                                  : String(transaction.status || 'UNKNOWN').replace('_', ' ')}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={s.cardTop}>
                          <Text style={[s.paymentAmount, transaction.status === 'REVERSED' && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                            ₹{formatMoney(transaction.amount)}
                          </Text>
                          <Text style={s.paymentMethod}>{String(transaction.method || 'CASH').replace('_', ' ')}</Text>
                        </View>
                        {transaction.reference ? <Text style={s.meta}>Reference: {transaction.reference}</Text> : null}
                        {transaction.remarks ? (
                          <Text style={[s.meta, transaction.status === 'REVERSED' && { color: '#fca5a5' }]}>
                            Remarks: {transaction.remarks}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <Text style={s.muted}>No payments recorded yet.</Text>
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal visible={!!reversingFeeTx} transparent animationType="fade" onRequestClose={() => setReversingFeeTx(null)}>
      <View style={s.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close reversal dialog" style={StyleSheet.absoluteFill} onPress={() => setReversingFeeTx(null)} />
        <View style={[s.modalShell, { maxWidth: 540 }]}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.detailPanel}>
              <View style={s.detailHeader}>
                <View>
                  <Text style={[s.eyebrow, { color: '#f87171' }]}>VOID / CANCEL FEE PAYMENT</Text>
                  <Text style={s.panelTitle}>{reversingFeeTx?.receiptNo || 'Payment Record'}</Text>
                  <Text style={s.meta}>
                    {selectedFeeAccount?.studentName} ({selectedFeeAccount?.studentCode}) · {selectedFeeAccount?.className}
                  </Text>
                </View>
                <TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setReversingFeeTx(null)}>
                  <Text style={s.closeText}>Close ✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)', borderRadius: 12, padding: 12, gap: 4 }}>
                <Text style={s.detailRow}>Transaction Amount: <Text style={{ fontWeight: '800', color: '#f87171' }}>₹{formatMoney(reversingFeeTx?.amount)}</Text></Text>
                <Text style={s.detailRow}>Payment Date: {displayDate(reversingFeeTx?.paymentDate)}</Text>
                <Text style={s.detailRow}>Payment Method: {String(reversingFeeTx?.method || 'CASH').replace('_', ' ')}</Text>
                {reversingFeeTx?.reference ? <Text style={s.meta}>Reference: {reversingFeeTx.reference}</Text> : null}
                <Text style={[s.meta, { color: '#fca5a5', marginTop: 4 }]}>
                  ⚠️ Voiding will remove ₹{formatMoney(reversingFeeTx?.amount)} from student's paid balance and reverse the income in school account books. This action is permanently audited.
                </Text>
              </View>

              <Field
                label="Reason for cancellation / reversal (Required) *"
                value={reversalReason}
                onChangeText={setReversalReason}
                placeholder="e.g. Wrong student selected / duplicate entry / payment bounced"
                multiline
              />

              {feeActionError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 4 }}>{String(feeActionError)}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <TouchableOpacity accessibilityRole="button" style={[s.smallButton, { paddingVertical: 10, paddingHorizontal: 16 }]} onPress={() => setReversingFeeTx(null)}>
                  <Text style={s.smallText}>Back / Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={reversalLoading}
                  style={[s.deleteButton, { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#dc2626', borderColor: '#b91c1c' }, reversalLoading && s.disabled]}
                  onPress={handleConfirmReverseFeeTx}
                >
                  {reversalLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={[s.deleteText, { color: '#ffffff' }]}>Confirm Void / Reversal</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    <Modal visible={!!editingFeeTx} transparent animationType="fade" onRequestClose={() => setEditingFeeTx(null)}>
      <View style={s.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close edit dialog" style={StyleSheet.absoluteFill} onPress={() => setEditingFeeTx(null)} />
        <View style={[s.modalShell, { maxWidth: 560 }]}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.detailPanel}>
              <View style={s.detailHeader}>
                <View>
                  <Text style={[s.eyebrow, { color: '#fbbf24' }]}>EDIT / CORRECT FEE PAYMENT</Text>
                  <Text style={s.panelTitle}>{editingFeeTx?.receiptNo || 'Payment Record'}</Text>
                  <Text style={s.meta}>
                    {selectedFeeAccount?.studentName} ({selectedFeeAccount?.studentCode}) · {selectedFeeAccount?.className}
                  </Text>
                </View>
                <TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setEditingFeeTx(null)}>
                  <Text style={s.closeText}>Close ✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.meta, { color: '#fde68a', marginBottom: 4 }]}>
                ℹ Correcting the amount or date automatically updates student dues and school account income register.
              </Text>

              <Field
                label="Corrected payment amount (₹) *"
                value={editTxAmount}
                onChangeText={setEditTxAmount}
                placeholder="10000"
              />

              <Field
                label="Payment date (YYYY-MM-DD) *"
                value={editTxDate}
                onChangeText={setEditTxDate}
                placeholder="YYYY-MM-DD"
              />

              <Choices
                label="Payment method"
                value={editTxMethod}
                values={['CASH', 'ONLINE', 'BANK', 'CHEQUE', 'OTHER']}
                onChange={(v: string) => setEditTxMethod(v)}
              />

              <Field
                label="Reference (Optional)"
                value={editTxReference}
                onChangeText={setEditTxReference}
                placeholder="Bank ref / Cheque number / UPI UTR"
              />

              <Field
                label="Remarks (Optional)"
                value={editTxRemarks}
                onChangeText={setEditTxRemarks}
                placeholder="Additional notes"
              />

              <Field
                label="Reason for correction (Required) *"
                value={editTxReason}
                onChangeText={setEditTxReason}
                placeholder="e.g. Typo in amount, should be 10000 instead of 15000"
                multiline
              />

              {feeActionError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 4 }}>{String(feeActionError)}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <TouchableOpacity accessibilityRole="button" style={[s.smallButton, { paddingVertical: 10, paddingHorizontal: 16 }]} onPress={() => setEditingFeeTx(null)}>
                  <Text style={s.smallText}>Back / Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={editTxLoading}
                  style={[s.save, { paddingVertical: 10, paddingHorizontal: 20, marginTop: 0 }, editTxLoading && s.disabled]}
                  onPress={handleConfirmEditFeeTx}
                >
                  {editTxLoading ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>Save Correction</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    <Modal visible={!!reversingAccountTx} transparent animationType="fade" onRequestClose={() => setReversingAccountTx(null)}>
      <View style={s.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close void dialog" style={StyleSheet.absoluteFill} onPress={() => setReversingAccountTx(null)} />
        <View style={[s.modalShell, { maxWidth: 520 }]}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.detailPanel}>
              <View style={s.detailHeader}>
                <View>
                  <Text style={[s.eyebrow, { color: '#ef4444' }]}>VOID / CANCEL ACCOUNT TRANSACTION</Text>
                  <Text style={s.panelTitle}>{reversingAccountTx?.title || 'Account Record'}</Text>
                  <Text style={s.meta}>
                    Type: {reversingAccountTx?.type} · Amount: ₹{formatMoney(reversingAccountTx?.amount)}
                  </Text>
                </View>
                <TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setReversingAccountTx(null)}>
                  <Text style={s.closeText}>Close ✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: '#fca5a5', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                  ⚠ Warning: Voiding is permanent
                </Text>
                <Text style={{ color: '#fecaca', fontSize: 12, lineHeight: 18 }}>
                  This transaction will be marked as cancelled/reversed and immediately deducted from total {reversingAccountTx?.type === 'INCOME' ? 'income' : 'expense'} and net balance calculations.
                </Text>
              </View>

              <Text style={s.detailRow}>Date: {displayDate(reversingAccountTx?.transactionDate)}</Text>
              {reversingAccountTx?.description ? <Text style={s.detailRow}>Original Note: {reversingAccountTx.description}</Text> : null}

              <Field
                label="Reason for voiding / cancellation (Required) *"
                value={reversalAccountReason}
                onChangeText={setReversalAccountReason}
                placeholder="e.g. Duplicate entry / Incorrect expense entered by mistake"
                multiline
              />

              {accountActionError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 4 }}>{String(accountActionError)}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <TouchableOpacity accessibilityRole="button" style={[s.smallButton, { paddingVertical: 10, paddingHorizontal: 16 }]} onPress={() => setReversingAccountTx(null)}>
                  <Text style={s.smallText}>Back / Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={reversalAccountLoading}
                  style={[s.deleteButton, { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#dc2626', borderColor: '#b91c1c' }, reversalAccountLoading && s.disabled]}
                  onPress={handleConfirmReverseAccountTx}
                >
                  {reversalAccountLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={[s.deleteText, { color: '#ffffff' }]}>Confirm Void / Reversal</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    <Modal visible={!!editingAccountTx} transparent animationType="fade" onRequestClose={() => setEditingAccountTx(null)}>
      <View style={s.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close edit dialog" style={StyleSheet.absoluteFill} onPress={() => setEditingAccountTx(null)} />
        <View style={[s.modalShell, { maxWidth: 560 }]}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.detailPanel}>
              <View style={s.detailHeader}>
                <View>
                  <Text style={[s.eyebrow, { color: '#fbbf24' }]}>EDIT / CORRECT ACCOUNT TRANSACTION</Text>
                  <Text style={s.panelTitle}>{editingAccountTx?.title || 'Account Record'}</Text>
                  <Text style={s.meta}>
                    Current: ₹{formatMoney(editingAccountTx?.amount)} · {editingAccountTx?.type}
                  </Text>
                </View>
                <TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setEditingAccountTx(null)}>
                  <Text style={s.closeText}>Close ✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.meta, { color: '#fde68a', marginBottom: 4 }]}>
                ℹ Correcting this transaction automatically updates total income, expenses, and net balance.
              </Text>

              <Field
                label="Transaction title *"
                value={editAccountTitle}
                onChangeText={setEditAccountTitle}
                placeholder="e.g. Library Books Purchase"
              />

              <Choices
                label="Transaction type *"
                value={editAccountType}
                values={['EXPENSE', 'INCOME']}
                onChange={(v: string) => setEditAccountType(v)}
              />

              <Field
                label="Corrected amount (₹) *"
                value={editAccountAmount}
                onChangeText={setEditAccountAmount}
                placeholder="10000"
              />

              <Field
                label="Transaction date (YYYY-MM-DD) *"
                value={editAccountDate}
                onChangeText={setEditAccountDate}
                placeholder="YYYY-MM-DD"
              />

              <Field
                label="Description / Note (Optional)"
                value={editAccountDescription}
                onChangeText={setEditAccountDescription}
                placeholder="Additional notes"
                multiline
              />

              <Field
                label="Reason for correction (Required) *"
                value={editAccountReason}
                onChangeText={setEditAccountReason}
                placeholder="e.g. Typo in amount, entered ₹15,000 instead of ₹10,000"
                multiline
              />

              {accountActionError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 4 }}>{String(accountActionError)}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <TouchableOpacity accessibilityRole="button" style={[s.smallButton, { paddingVertical: 10, paddingHorizontal: 16 }]} onPress={() => setEditingAccountTx(null)}>
                  <Text style={s.smallText}>Back / Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={editAccountLoading}
                  style={[s.save, { paddingVertical: 10, paddingHorizontal: 20, marginTop: 0 }, editAccountLoading && s.disabled]}
                  onPress={handleConfirmEditAccountTx}
                >
                  {editAccountLoading ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>Save Correction</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
   <Modal visible={mode === 'fees' && feeSection === 'PAYMENTS' && !!selectedFeeAccount} transparent animationType="fade" onRequestClose={() => setSelectedFeeAccount(null)}><View style={s.overlay} accessibilityViewIsModal><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close payment form" style={StyleSheet.absoluteFill} onPress={() => setSelectedFeeAccount(null)} /><View style={s.modalShell}><ScrollView contentContainerStyle={s.modalContent}>{selectedFeeAccount ? <View style={s.detailPanel}><View style={s.detailHeader}><View><Text style={s.eyebrow}>RECORD STUDENT PAYMENT</Text><Text style={s.panelTitle}>{selectedFeeAccount.studentName}</Text><Text style={s.meta}>{selectedFeeAccount.studentCode} · {selectedFeeAccount.className} · {selectedFeeAccount.sectionName}</Text></View><TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setSelectedFeeAccount(null)}><Text style={s.closeText}>Close ✕</Text></TouchableOpacity></View><Text style={s.detailHeading}>Current fee summary</Text><Text style={s.detailRow}>Total fee: ₹{formatMoney(selectedFeeAccount.totalFee)}</Text><Text style={s.detailRow}>Paid: ₹{formatMoney(selectedFeeAccount.paidAmount)}</Text><Text style={s.detailRow}>Remaining: ₹{formatMoney(selectedFeeAccount.remainingFee)}</Text>{selectedFeeAccount.creditBalance > 0 ? <Text style={s.detailRow}>Credit balance: ₹{formatMoney(selectedFeeAccount.creditBalance)}</Text> : null}<Text style={s.detailHeading}>Payment details</Text><Field label="Payment amount" value={form.paymentAmount} onChangeText={(value: string) => set('paymentAmount', value)} placeholder="5000" /><Field label="Payment date" value={form.date} onChangeText={(value: string) => set('date', value)} placeholder="YYYY-MM-DD" /><Field label="Reference" value={form.reference} onChangeText={(value: string) => set('reference', value)} placeholder="Optional receipt/reference number" /><Field label="Remarks" value={form.remarks} onChangeText={(value: string) => set('remarks', value)} placeholder="Optional remarks" multiline />{formError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 8 }}>{String(formError)}</Text> : null}<TouchableOpacity accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]} onPress={recordStudentPayment}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>Save payment</Text>}</TouchableOpacity></View> : null}</ScrollView></View></View></Modal>
    <Modal visible={mode === 'salary' && salarySection === 'HISTORY' && !!selectedSalaryAccount} transparent animationType="fade" onRequestClose={() => setSelectedSalaryAccount(null)}><View style={s.overlay} accessibilityViewIsModal><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close salary history" style={StyleSheet.absoluteFill} onPress={() => setSelectedSalaryAccount(null)} /><View style={s.modalShell}><ScrollView contentContainerStyle={s.modalContent}>{selectedSalaryAccount ? <View style={s.detailPanel}><View style={s.detailHeader}><View><Text style={s.eyebrow}>EMPLOYEE SALARY HISTORY</Text><Text style={s.panelTitle}>{selectedSalaryAccount.name}</Text><Text style={s.meta}>{selectedSalaryAccount.employeeId} · {selectedSalaryAccount.subRole}</Text></View><TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setSelectedSalaryAccount(null)}><Text style={s.closeText}>Close ✕</Text></TouchableOpacity></View><Text style={s.detailHeading}>Salary summary</Text><Text style={s.detailRow}>Current salary: ₹{formatMoney(selectedSalaryAccount.currentSalary)}</Text><Text style={s.detailHeading}>Monthly salary history</Text>{selectedSalaryAccount.monthlySalaries?.length ? selectedSalaryAccount.monthlySalaries.map((salary: any) => { const paid = (salary.payments || []).filter((payment: any) => payment.status === 'SUCCESS').reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0); const payable = Number(salary.netPayable || 0); return <View style={s.card} key={salary.id}><Text style={s.detailRow}>{salary.month}/{salary.year} · Auto calculated</Text><Text style={s.detailRow}>Payable: ₹{formatMoney(payable)} · Paid: ₹{formatMoney(paid)} · Remaining: ₹{formatMoney(Math.max(payable - paid, 0))}</Text>{salary.payments?.length ? salary.payments.map((payment: any) => <Text style={s.meta} key={payment.id}>{displayDate(payment.paidDate)} · {displayDateTime(payment.createdAt)} · ₹{formatMoney(payment.amount)} · {payment.status}{payment.reference ? ' · ' + payment.reference : ''}</Text>) : <Text style={s.muted}>No payments recorded for this month.</Text>}</View>; }) : <Text style={s.muted}>No monthly salary records found.</Text>}</View> : null}</ScrollView></View></View></Modal>
    <Modal visible={mode === 'salary' && salarySection === 'PAYMENTS' && !!selectedSalaryAccount} transparent animationType="fade" onRequestClose={() => setSelectedSalaryAccount(null)}><View style={s.overlay} accessibilityViewIsModal><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close salary payment form" style={StyleSheet.absoluteFill} onPress={() => setSelectedSalaryAccount(null)} /><View style={s.modalShell}><ScrollView contentContainerStyle={s.modalContent}>{selectedSalaryAccount ? <View style={s.detailPanel}><View style={s.detailHeader}><View><Text style={s.eyebrow}>RECORD EMPLOYEE PAYMENT</Text><Text style={s.panelTitle}>{selectedSalaryAccount.name}</Text><Text style={s.meta}>{selectedSalaryAccount.employeeId} · {selectedSalaryAccount.subRole}</Text></View><TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setSelectedSalaryAccount(null)}><Text style={s.closeText}>Close ✕</Text></TouchableOpacity></View>{selectedSalaryHistory.isLoading ? <ActivityIndicator color="#c88728" /> : selectedSalaryPayment ? <><Text style={s.detailHeading}>Current salary summary</Text><Text style={s.detailRow}>Salary month: {selectedSalaryPayment.month}/{selectedSalaryPayment.year}</Text><Text style={s.detailRow}>Gross salary: ₹{formatMoney(selectedSalaryPayment.grossAmount)}</Text><Text style={s.detailRow}>Attendance deduction: ₹{formatMoney(selectedSalaryPayment.deductionAmount)}</Text><Text style={s.detailRow}>Payable: ₹{formatMoney(selectedSalaryPaymentPayable)}</Text><Text style={s.detailRow}>Paid: ₹{formatMoney(selectedSalaryPaymentPaid)}</Text><Text style={s.detailRow}>Remaining: ₹{formatMoney(selectedSalaryPaymentRemaining)}</Text>{selectedSalaryPaymentCredit > 0 ? <Text style={s.detailRow}>Current month credit: ₹{formatMoney(selectedSalaryPaymentCredit)}</Text> : null}<Text style={s.detailRow}>Previous remaining: ₹{formatMoney(selectedSalaryAccount?.previousRemaining || 0)}</Text><Text style={s.detailRow}>Previous credit: ₹{formatMoney(selectedSalaryAccount?.previousCredit || 0)}</Text><Text style={s.detailRow}>Attendance: Present {selectedSalaryAccount?.attendanceStatuses?.PRESENT || 0} · Absent {selectedSalaryAccount?.attendanceStatuses?.ABSENT || 0} · Half-day {selectedSalaryAccount?.attendanceStatuses?.HALF_DAY || 0} · Late {selectedSalaryAccount?.attendanceStatuses?.LATE || 0}</Text><Text style={s.detailHeading}>Payment details</Text><Field label="Payment amount" value={form.salaryPaymentAmount} onChangeText={(value: string) => set('salaryPaymentAmount', value)} placeholder="35000" /><Field label="Payment date" value={form.date} onChangeText={(value: string) => set('date', value)} placeholder="YYYY-MM-DD" /><Field label="Reference" value={form.reference} onChangeText={(value: string) => set('reference', value)} placeholder="Optional receipt/reference number" /><Field label="Remarks" value={form.remarks} onChangeText={(value: string) => set('remarks', value)} placeholder="Optional remarks" multiline />{formError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 8 }}>{String(formError)}</Text> : null}<TouchableOpacity accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]} onPress={recordSalaryPayment}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>Save salary payment</Text>}</TouchableOpacity></> : <Text style={s.muted}>No calculated salary is available for this employee yet. Update the employee salary first.</Text>}</View> : null}</ScrollView></View></View></Modal>
    <Modal visible={mode === 'exams' && examSection === 'ASSESSMENTS' && !!selectedMarksStudent} transparent animationType="fade" onRequestClose={() => { setSelectedMarksStudent(null); setSelectedMarksTimetable(null); setSelectedMarksEntry(null); }}>
      <View style={s.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close marks details" style={StyleSheet.absoluteFill} onPress={() => { setSelectedMarksStudent(null); setSelectedMarksTimetable(null); setSelectedMarksEntry(null); }} />
        <View style={s.modalShell}>
          <ScrollView contentContainerStyle={s.modalContent}>
            {selectedMarksStudent ? <View style={s.detailPanel}>
              <View style={s.detailHeader}>
                <View><Text style={s.eyebrow}>STUDENT MARKS</Text><Text style={s.panelTitle}>{selectedMarksStudent.name}</Text><Text style={s.meta}>{selectedMarksStudent.studentId} · Select a completed exam</Text></View>
                <TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => { setSelectedMarksStudent(null); setSelectedMarksTimetable(null); setSelectedMarksEntry(null); }}><Text style={s.closeText}>Close ✕</Text></TouchableOpacity>
              </View>
              <Text style={s.detailHeading}>Completed exams</Text>
              {completedMarksTimetables.length ? completedMarksTimetables.map((timetable: any) => <TouchableOpacity accessibilityRole="button" key={timetable.id} style={[s.marksExamCard, selectedMarksTimetable?.id === timetable.id && s.marksExamSelected]} onPress={() => { setSelectedMarksTimetable(timetable); setSelectedMarksEntry(null); setFormError(''); }}>
                <View style={s.cardTop}><Text style={s.cardTitle}>{timetable.title}</Text><Text style={s.badge}>{timetable.type}</Text></View>
                <Text style={s.cardBody}>{displayDate(timetable.startDate)} to {displayDate(timetable.endDate)} · {(timetable.entries || []).filter((entry: any) => completedExamEntry(entry)).length} completed paper(s)</Text>
              </TouchableOpacity>) : <Text style={s.muted}>No completed exam timetable is available for this student's class and section yet.</Text>}
              {selectedMarksTimetable ? <><Text style={s.detailHeading}>Subjects in {selectedMarksTimetable.title}</Text>{completedMarksEntries.length ? completedMarksEntries.map((entry: any) => { const result = marksResultForEntry(selectedMarksTimetable, entry); const status = result?.entryStatus === 'ABSENT' ? 'Absent' : result?.entryStatus === 'MARKS_ENTERED' ? 'Marks: ' + result.marks : 'Not assigned'; return <TouchableOpacity accessibilityRole="button" key={entry.id} style={[s.marksSubjectCard, selectedMarksEntry?.id === entry.id && s.marksSubjectSelected]} onPress={() => { setSelectedMarksEntry(entry); set('marks', result?.marks == null ? '' : String(result.marks)); set('absent', result?.entryStatus === 'ABSENT'); set('remarks', result?.remarks || ''); setFormError(''); }}>
                <View style={s.cardTop}><Text style={s.cardTitle}>{entry.subject?.name || 'Subject'}</Text><Text style={status === 'Not assigned' ? s.marksNotAssigned : s.marksEntered}>{status}</Text></View>
                <Text style={s.cardBody}>{displayDate(entry.date)} · {timetableTime(entry.startTime)}–{timetableTime(entry.endTime)} · Maximum marks: {entry.maximumMarks || '—'}</Text>
              </TouchableOpacity>; }) : <Text style={s.muted}>No completed subject papers are available in this exam.</Text>}</> : null}
              {selectedMarksEntry ? <View style={s.marksEditor}>
                <Text style={s.detailHeading}>Enter marks for {selectedMarksEntry.subject?.name || 'Subject'}</Text>
                <Text style={s.detailRow}>Paper date: {displayDate(selectedMarksEntry.date)} · Maximum marks: {selectedMarksEntry.maximumMarks || assessmentForMarksEntry(selectedMarksTimetable, selectedMarksEntry)?.maximumMarks || 100}</Text>
                <Choices label="Entry" value={!!form.absent} values={[{ value: false, label: 'Marks' }, { value: true, label: 'Absent' }]} onChange={(value: boolean) => set('absent', value)} />
                {!form.absent ? <Field label="Marks" value={form.marks} onChangeText={(value: string) => set('marks', value)} placeholder="78" /> : null}
                <Field label="Remarks" value={form.remarks} onChangeText={(value: string) => set('remarks', value)} placeholder="Optional remarks" multiline />
                {formError ? <Text style={s.error}>{String(formError)}</Text> : null}
                <TouchableOpacity accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]} onPress={saveMarksForStudent}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>Save marks</Text>}</TouchableOpacity>
              </View> : null}
            </View> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <ClassStudentsFeeModal
      visible={mode === 'fees' && feeSection === 'CLASS_FEES' && !!activeClassForStudentFees}
      selectedClass={activeClassForStudentFees}
      allStudentFeeAccounts={allStudentFeeRows}
      classSections={activeClassForStudentFees ? (classes.find((c: any) => c.id === activeClassForStudentFees.id)?.sections || []) : []}
      onClose={() => setSelectedClassForStudentFees(null)}
      onSaved={async () => {
        await refresh();
        await client.invalidateQueries({ queryKey: ['fee-accounts'] });
      }}
    />
  </View>;
}

function CommonSelectors({ years, sections, subjects, employees, values, set }: any) { return <><SelectCards label="Academic year" value={values.yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /><SelectCards label="Section" value={values.sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => x.className + ' ' + x.name} />{subjects.length ? <SelectCards label="Subject" value={values.subjectId} items={subjects} onChange={(v: string) => set('subjectId', v)} getLabel={(x: any) => x.name} /> : null}{employees.length ? <SelectCards label="Employee" value={values.employeeId} items={employees} onChange={(v: string) => set('employeeId', v)} getLabel={(x: any) => x.name + ' · ' + (x.primarySubject?.name || x.teachingAssignments?.[0]?.subject?.name || subjects.find((subject: any) => subject.id === x.primarySubjectId)?.name || 'Subject not set')} /> : null}</>; }

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background },
  
  content: { ...surfaces.content, gap: 16 },
  
  hero: {
    ...surfaces.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexWrap: 'wrap',
  },
  
  heroText: { flex: 1 },
  
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.4, color: colors.blueLight },
  
  title: { marginTop: 5, fontSize: 28, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.3 },
  
  description: { marginTop: 5, maxWidth: 700, lineHeight: 21, color: 'rgba(255, 255, 255, 0.45)' },
  
  goldButton: { borderRadius: 11, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', backgroundColor: colors.primary, minHeight: 44 },
  
  goldText: { fontWeight: '800', color: '#FFFFFF' },
  
  tabs: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 6,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  tab: { flex: 1, minHeight: 48, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, minWidth: 120 },
  
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  
  tabIcon: { fontSize: 16 },
  
  tabText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, fontWeight: '700' },
  
  tabTextActive: { color: '#fff', fontWeight: '800' },
  
  panel: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 20,
    gap: 12,
    borderRadius: 14,
  },
  
  panelTitle: { fontSize: 21, fontWeight: '800', color: '#f0f6ff', letterSpacing: -0.2 },
  
  field: { gap: 6, minWidth: 0, flexShrink: 1 },
  
  label: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: '#f0f6ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  
  multiline: { minHeight: 85, textAlignVertical: 'top' },
  
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  
  choice: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  
  choiceText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 12, fontWeight: '600' },
  
  choiceTextOn: { color: '#fff', fontWeight: '800', fontSize: 12 },
  
  save: { borderRadius: 11, padding: 14, alignItems: 'center', marginTop: 4, justifyContent: 'center', backgroundColor: colors.primary, minHeight: 44 },
  
  disabled: { opacity: 0.65 },
  
  saveText: { fontWeight: '800', color: '#FFFFFF' },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  
  listTitle: { color: '#f0f6ff', fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  
  refresh: { color: colors.blueLight, fontWeight: '700' },
  
  grid: { gap: 10 },
  
  sectionHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  
  sectionTitle: { color: '#f0f6ff', fontSize: 15, fontWeight: '800' },
  
  card: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 17,
    gap: 6,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  
  cardSelected: { borderWidth: 2, borderColor: colors.primary },
  
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  
  cardTitle: { color: '#f0f6ff', fontSize: 16, fontWeight: '800', flex: 1 },
  
  badge: { color: colors.success, fontSize: 10, fontWeight: '800' },
  
  cardBody: { color: 'rgba(255, 255, 255, 0.45)' },

  marksCount: { color: colors.blueLight, fontSize: 13, fontWeight: '800', marginTop: 4 },

  marksExamCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', borderRadius: 12, padding: 14, gap: 6 },

  marksExamSelected: { borderColor: colors.primary, borderWidth: 2 },

  marksSubjectCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', borderRadius: 12, padding: 14, gap: 6, marginTop: 8 },

  marksSubjectSelected: { borderColor: colors.primary, borderWidth: 2 },

  marksNotAssigned: { color: colors.danger, fontSize: 11, fontWeight: '800' },

  marksEntered: { color: colors.success, fontSize: 11, fontWeight: '800' },

  marksEditor: { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.20)', borderRadius: 14, padding: 15, marginTop: 8 },

  meta: { color: 'rgba(255, 255, 255, 0.35)', fontSize: 11 },
  
  tap: { color: colors.blueLight, fontSize: 11, fontWeight: '700', marginTop: 4 },
  
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  
  smallButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 5,
  },
  
  smallText: { color: '#f0f6ff', fontWeight: '800', fontSize: 12 },
  
  deleteButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 5,
  },
  
  deleteText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  
  empty: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
  },
  
  emptyTitle: { color: '#f0f6ff', fontWeight: '800' },
  
  muted: { color: 'rgba(255, 255, 255, 0.40)', marginTop: 5 },
  
  overlay: { flex: 1, backgroundColor: 'rgba(4, 8, 18, 0.80)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  
  modalShell: {
    width: '92%',
    maxWidth: 780,
    maxHeight: '90%',
    backgroundColor: '#0e1525',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  modalContent: { padding: 0 },
  
  detailPanel: { backgroundColor: '#0e1525', padding: 22, gap: 10 },
  
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  
  close: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  
  closeText: { color: '#f0f6ff', fontWeight: '700' },
  
  detailHeading: { color: '#f0f6ff', fontSize: 15, fontWeight: '800', marginTop: 5 },
  detailRow: { color: 'rgba(255, 255, 255, 0.60)', lineHeight: 20 },
  help: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, marginBottom: 12, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
  paymentHistoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 6,
  },
  paymentHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentHistoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  downloadReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  downloadReceiptText: {
    color: '#93c5fd',
    fontSize: 10.5,
    fontWeight: '800',
  },
  paymentStatusBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.30)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  paymentStatusText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  paymentPendingBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.30)',
  },
  paymentPendingText: {
    color: colors.warning,
  },
  paymentAmount: {
    color: '#f0f6ff',
    fontSize: 18,
    fontWeight: '800',
  },
  paymentMethod: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '700',
  },
  downloadListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  downloadListText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
  editPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  editPaymentText: {
    color: '#fbbf24',
    fontSize: 10.5,
    fontWeight: '800',
  },
  reversePaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  reversePaymentText: {
    color: '#f87171',
    fontSize: 10.5,
    fontWeight: '800',
  },
  paymentReversedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  paymentReversedText: {
    color: '#f87171',
  },
  feeFilterPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  feeSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  feeSearchIcon: {
    marginRight: 8,
  },
  feeSearchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13.5,
    paddingVertical: 0,
  },
  feeSearchClear: {
    padding: 4,
  },
  feeFilterRow: {
    gap: 10,
  },
  feeFilterGroup: {
    gap: 6,
  },
  feeFilterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
  },
  chipScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderColor: '#fbbf24',
  },
  filterChipText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fbbf24',
    fontWeight: '800',
  },
  feeFilterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    flexWrap: 'wrap',
    gap: 8,
  },
  feeFilterSummaryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  feeFilterResetText: {
    fontSize: 12,
    color: '#f87171',
    fontWeight: '700',
  },
});
