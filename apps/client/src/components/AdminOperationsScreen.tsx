import { colors, surfaces } from '../theme';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ExamTimetableBuilder } from './ExamTimetableBuilder';

type Mode = 'academics' | 'attendance' | 'fees' | 'exams' | 'notices' | 'accounts' | 'salary' | 'timetable';
type Props = { mode: Mode; title: string; eyebrow: string; description: string };
const today = new Date().toISOString().slice(0, 10);
const currentYear = String(new Date().getFullYear());

function Field({ label, value, onChangeText, placeholder, multiline = false }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput style={[s.input, multiline && s.multiline]} value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8a96a5" multiline={multiline} /></View>;
}
function Choices({ label, value, values, onChange }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.choices}>{values.map((item: any) => { const key = typeof item === 'string' ? item : item.value; const text = typeof item === 'string' ? item : item.label; return <TouchableOpacity accessibilityRole="button" key={key} style={[s.choice, value === key && s.choiceOn]} onPress={() => onChange(key)}><Text style={value === key ? s.choiceTextOn : s.choiceText}>{text}</Text></TouchableOpacity>; })}</View></View>;
}
function SelectCards({ label, value, items, onChange, getLabel }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.choices}>{items.map((item: any) => <TouchableOpacity accessibilityRole="button" key={item.id} style={[s.choice, value === item.id && s.choiceOn]} onPress={() => onChange(item.id)}><Text style={value === item.id ? s.choiceTextOn : s.choiceText}>{getLabel(item)}</Text></TouchableOpacity>)}</View></View>;
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

export function AdminOperationsScreen({ mode, title, eyebrow, description }: Props) {
  const client = useQueryClient();
  const [open, setOpen] = useState(true);
  const [formError, setFormError] = useState('');
  const [selectedAcademic, setSelectedAcademic] = useState<any>(null);
  const [academicTab, setAcademicTab] = useState<'classes' | 'subjects' | 'calendar'>('classes');
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feeSection, setFeeSection] = useState<'CLASS_FEES' | 'STUDENT_FEES' | 'PAYMENTS'>('CLASS_FEES');
  const [feeStudentClassId, setFeeStudentClassId] = useState('');
  const [feeStudentSectionId, setFeeStudentSectionId] = useState('');
  const [selectedFeeAccount, setSelectedFeeAccount] = useState<any>(null);
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
  const feeAccounts = useQuery<any[]>({ queryKey: ['fee-accounts'], queryFn: async () => (await api.get('/fees/accounts')).data, enabled: mode === 'fees' && feeSection === 'STUDENT_FEES' });
  const salaryAccounts = useQuery<any[]>({ queryKey: ['salary-accounts'], queryFn: async () => (await api.get('/salary/accounts')).data, enabled: mode === 'salary' });
  const selectedSalaryHistory = useQuery<any[]>({ queryKey: ['salary', selectedSalaryAccount?.id], queryFn: async () => (await api.get('/salary', { params: { employeeId: selectedSalaryAccount.id } })).data, enabled: mode === 'salary' && !!selectedSalaryAccount?.id });

  const years = academics.data?.academicYears || [];
  const classes = academics.data?.classes || [];
  const sections = useMemo(() => classes.flatMap((c: any) => (c.sections || []).map((x: any) => ({ ...x, className: c.name }))), [classes]);
  const subjects = academics.data?.subjects || [];
  const yearId = form.academicYearId || years.find((y: any) => y.isCurrent)?.id || years[0]?.id;
  const sectionId = form.sectionId || sections[0]?.id;
  const classId = form.classId || classes[0]?.id;
  const studentFeeClassId = feeStudentClassId || classes[0]?.id || '';
  const studentFeeSections = classes.find((schoolClass: any) => schoolClass.id === studentFeeClassId)?.sections || [];
  const studentFeeSectionId = feeStudentSectionId && studentFeeSections.some((section: any) => section.id === feeStudentSectionId) ? feeStudentSectionId : '';
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
  const performAssignmentDelete = async (id: string, classTeacher: boolean) => { try { await api.delete(`/academics/${classTeacher ? 'class-teacher-assignments' : 'teacher-assignments'}/${id}`); await refresh(); Alert.alert('Deleted', 'The assignment was deleted.'); } catch (error: any) { Alert.alert('Could not delete', errorText(error)); } };
  const deleteAssignment = (id: string, classTeacher = false) => { const browserConfirm = (globalThis as any).confirm; if (Platform.OS === 'web' && typeof browserConfirm === 'function') { if (browserConfirm('Delete this assignment? This removes only this assignment record.')) void performAssignmentDelete(id, classTeacher); return; } Alert.alert('Delete assignment?', 'This will remove only this assignment record. Continue?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void performAssignmentDelete(id, classTeacher) }]); };
  const deleteCalendar = (id: string) => { const remove = async () => { try { await api.delete('/academics/calendar/' + id); await refresh(); } catch (error: any) { setFormError(errorText(error)); } }; const browserConfirm = (globalThis as any).confirm; if (Platform.OS === 'web' && typeof browserConfirm === 'function') { if (browserConfirm('Delete this calendar entry?')) void remove(); return; } Alert.alert('Delete calendar entry?', 'This removes only the selected admin-created calendar entry.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void remove() }]); };
  const editCalendar = (entry: any) => { setEditingCalendarId(entry.id); setForm((old: any) => ({ ...old, action: 'CALENDAR', academicYearId: entry.academicYearId, date: displayDate(entry.date), dayType: entry.dayType, name: entry.title || '' })); setOpen(true); };
  const deleteAcademicRecord = (row: any) => { const type = row.sections ? 'classes' : row.code ? 'subjects' : row.startDate ? 'years' : null; if (!type || !row.id) return; Alert.alert(`Delete ${type.slice(0, -1)}?`, 'Related removable academic assignments will also be deleted. Student history is protected.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/academics/${type}/${row.id}`); setSelectedAcademic(null); await refresh(); Alert.alert('Deleted', 'The academic record was deleted.'); } catch (error: any) { Alert.alert('Could not delete', errorText(error)); } } }]); };
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
      if (form.action === 'SUBJECT') return post('/academics/subjects', { code: form.code, name: form.name });
      if (form.action === 'CALENDAR') { const payload = { academicYearId: yearId, date: form.date, dayType: form.dayType || 'HOLIDAY', title: form.name }; if (editingCalendarId) { setEditingCalendarId(null); return patch('/academics/calendar/' + editingCalendarId, payload); } return post('/academics/calendar', payload); }
      if (form.action === 'TEACHER') return post('/academics/teacher-assignments', { employeeId, academicYearId: yearId, sectionId, subjectId, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || undefined });
      if (form.action === 'CLASS_TEACHER') return post('/academics/class-teacher-assignments', { employeeId, academicYearId: yearId, sectionId, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || undefined });
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
    if (mode === 'academics') return <><Choices label="Configuration" value={form.action} values={['YEAR', 'CURRENT', 'CLASS', 'SECTION', 'SUBJECT', 'CALENDAR', 'TEACHER', 'CLASS_TEACHER', 'TRANSFER']} onChange={(v: string) => set('action', v)} />{form.action === 'YEAR' ? <><Field label="Academic year name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="2027-28" /><Field label="Start date" value={form.startDate} onChangeText={(v: string) => set('startDate', v)} placeholder="YYYY-MM-DD" /><Field label="End date" value={form.endDate} onChangeText={(v: string) => set('endDate', v)} placeholder="2027-03-31" /><Choices label="Make current" value={!!form.isCurrent} values={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} onChange={(v: boolean) => set('isCurrent', v)} /></> : null}{form.action === 'CURRENT' ? <SelectCards label="Set current academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /> : null}{form.action === 'CLASS' ? <><Field label="Class name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Class 13" /><Field label="Sort order" value={form.sortOrder} onChangeText={(v: string) => set('sortOrder', v)} placeholder="13" /></> : null}{form.action === 'SECTION' ? <><SelectCards label="Class" value={classId} items={classes} onChange={(v: string) => set('classId', v)} getLabel={(x: any) => x.name} /><Field label="Section name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="B" /><Field label="Capacity" value={form.capacity} onChangeText={(v: string) => set('capacity', v)} placeholder="40" /></> : null}{form.action === 'SUBJECT' ? <><Field label="Subject code" value={form.code} onChangeText={(v: string) => set('code', v)} placeholder="MATH" /><Field label="Subject name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Mathematics" /></> : null}{form.action === 'CALENDAR' ? <><SelectCards label="Academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /><Field label="Date" value={form.date} onChangeText={(v: string) => set('date', v)} placeholder="YYYY-MM-DD" /><Choices label="Day type" value={form.dayType || 'HOLIDAY'} values={['WORKING_DAY', 'HOLIDAY', 'WEEKLY_OFF']} onChange={(v: string) => set('dayType', v)} /><Field label="Title" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Diwali holiday" /></> : null}{form.action === 'TEACHER' || form.action === 'CLASS_TEACHER' ? <><CommonSelectors years={years} sections={sections} subjects={form.action === 'TEACHER' ? subjects : []} employees={(employees.data || []).filter((x: any) => x.subRole === 'TEACHER')} values={{ yearId, sectionId, subjectId, employeeId }} set={set} /><Field label="Effective from" value={form.effectiveFrom} onChangeText={(v: string) => set('effectiveFrom', v)} placeholder="YYYY-MM-DD" /></> : null}{form.action === 'TRANSFER' ? <><SelectCards label="Student" value={form.studentId || students.data?.[0]?.id} items={students.data || []} onChange={(v: string) => set('studentId', v)} getLabel={(x: any) => x.studentId + ' · ' + x.name} /><SelectCards label="Academic year" value={yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /><SelectCards label="New section" value={sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => x.className + ' ' + x.name} /><Field label="New roll number" value={form.rollNumber} onChangeText={(v: string) => set('rollNumber', v)} placeholder="25" /><Field label="Effective from" value={form.effectiveFrom} onChangeText={(v: string) => set('effectiveFrom', v)} placeholder="YYYY-MM-DD" /></> : null}</>;
    if (mode === 'attendance') { const employeeMode = form.action === 'EMPLOYEE'; return <><Choices label="Register" value={form.action} values={['STUDENT', 'EMPLOYEE']} onChange={(v: string) => { set('action', v); set('status', 'PRESENT'); }} /><Field label="Date" value={form.date} onChangeText={(v: string) => set('date', v)} placeholder="YYYY-MM-DD" />{employeeMode ? <SelectCards label="Employee" value={employeeId} items={employees.data || []} onChange={(v: string) => set('employeeId', v)} getLabel={(x: any) => x.employeeId + ' · ' + x.name} /> : <><SelectCards label="Section" value={sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => x.className + ' ' + x.name} /><SelectCards label="Student" value={studentId} items={selectedSectionStudents} onChange={(v: string) => set('studentId', v)} getLabel={(x: any) => x.studentId + ' · ' + x.name} /></>}<Choices label="Status" value={form.status} values={['PRESENT', 'ABSENT', 'LATE']} onChange={(v: string) => set('status', v)} /><Field label="Remarks" value={form.remarks} onChangeText={(v: string) => set('remarks', v)} placeholder="Optional" /><Field label="Correction reason" value={form.reason} onChangeText={(v: string) => set('reason', v)} placeholder="Required for a past date" /></>; }
    if (mode === 'fees' && feeSection === 'CLASS_FEES') return <><Text style={{ color: '#5d6d80', lineHeight: 19 }}>Set the annual fee amount for one student in the selected class.</Text><SelectCards label="Class" value={classId} items={classes} onChange={selectFeeClass} getLabel={(x: any) => x.name} /><Field label="Per-student class fee" value={form.amount ?? (selectedFeeRow?.hasFee ? String(selectedFeeRow.totalFee) : '')} onChangeText={(v: string) => set('amount', v)} placeholder="500000" /><Choices label="Update existing student accounts too?" value={!!form.updateExistingStudents} values={[{ value: false, label: 'No — keep current student fee' }, { value: true, label: 'Yes — update existing students' }]} onChange={(v: boolean) => set('updateExistingStudents', v)} /></>;
    if (mode === 'fees' && (feeSection === 'STUDENT_FEES' || feeSection === 'PAYMENTS')) return <><Text style={{ color: '#5d6d80', lineHeight: 19 }}>{feeSection === 'PAYMENTS' ? 'Filter students by class and section, then tap a student to record a payment.' : 'Filter students by the class and section configured in Academics. Tap any student to view the complete fee summary and payment history.'}</Text><SelectCards label="Class filter" value={studentFeeClassId} items={classes} onChange={(id: string) => { setFeeStudentClassId(id); setFeeStudentSectionId(''); }} getLabel={(x: any) => x.name} /><SelectCards label="Section filter" value={studentFeeSectionId} items={studentFeeSections} onChange={(id: string) => setFeeStudentSectionId(id)} getLabel={(x: any) => x.name} /></>;
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
  const academicRows = academicTab === 'classes' ? [{ _sectionHeader: 'Academic years & setup' }, ...years, { _sectionHeader: 'Classes & sections' }, ...classes] : academicTab === 'subjects' ? [{ _sectionHeader: 'Subjects' }, ...subjects] : [{ _sectionHeader: 'Holidays & calendar events' }, ...calendarRows];
  const configuredFeeStructures = mode === 'fees' && Array.isArray(records.data) ? records.data : [];
  const feeRows = classes.map((schoolClass: any) => { const structure = configuredFeeStructures.find((item: any) => item.classId === schoolClass.id && (!yearId || item.academicYearId === yearId)); return { id: schoolClass.id, name: schoolClass.name, totalFee: structure?.totalFee, hasFee: !!structure, academicYearId: yearId }; });
  const selectedFeeRow = feeRows.find((row: any) => row.id === classId);
  const selectFeeClass = (id: string) => { const row = feeRows.find((item: any) => item.id === id); setForm((old: any) => ({ ...old, classId: id, amount: row?.hasFee ? String(row.totalFee) : '' })); };
  const selectFeeStudentClass = (id: string) => { setFeeStudentClassId(id); setFeeStudentSectionId(''); };
  const studentFeeRows = (feeAccounts.data || []).filter((account: any) => !yearId || account.academicYearId === yearId).map((account: any) => {
    const enrollment = account.student?.enrollments?.[0];
    const section = enrollment?.section;
    const adjustments = (account.adjustments || []).reduce((sum: number, adjustment: any) => sum + Number(adjustment.amount || 0), 0);
    const paidAmount = (account.transactions || []).filter((transaction: any) => transaction.status === 'SUCCESS').reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0) - (account.transactions || []).filter((transaction: any) => transaction.status === 'REVERSED').reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0);
    const totalFee = Number(account.assessedFee || 0) + adjustments;
    return { ...account, studentName: account.student?.name || account.student?.studentId || 'Unnamed student', studentCode: account.student?.studentId || '—', classId: section?.schoolClass?.id || section?.classId, sectionId: section?.id, className: section?.schoolClass?.name || 'Class not set', sectionName: section?.name || 'Section not set', totalFee, paidAmount, remainingFee: Math.max(totalFee - paidAmount, 0), creditBalance: Math.max(paidAmount - totalFee, 0) };
  }).filter((row: any) => (!studentFeeClassId || row.classId === studentFeeClassId) && (!studentFeeSectionId || row.sectionId === studentFeeSectionId));
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
  const salaryFilterChoices = [{ value: '', label: 'All sub-roles' }, { value: 'TEACHER', label: 'Teacher' }, { value: 'ACCOUNTANT', label: 'Accountant' }, { value: 'RECEPTIONIST', label: 'Receptionist' }, { value: 'LIBRARIAN', label: 'Librarian' }, { value: 'OTHER', label: 'Other' }];
  const showSalarySetupForm = mode !== 'salary' || salarySection === 'SETUP';
  const formPanelTitle = editingCalendarId ? 'Edit calendar entry' : mode === 'fees' ? (feeSection === 'CLASS_FEES' ? 'Update class fees' : feeSection === 'PAYMENTS' ? 'Record student payment' : 'Student fees') : mode === 'salary' ? 'Update employee salary' : mode === 'exams' ? (examSection === 'TIMETABLE' ? 'Create exam timetable' : 'Enter marks by student') : 'Create / process record';
  const formSaveLabel = editingCalendarId ? 'Update calendar entry' : mode === 'attendance' ? 'Save attendance' : mode === 'salary' ? 'Update salary' : mode === 'fees' ? (selectedFeeRow?.hasFee ? 'Update class fee' : 'Save class fee') : mode === 'exams' && examSection === 'TIMETABLE' ? 'Save exam timetable' : 'Save record';
  return <View style={s.page}>
    
    
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <View style={s.heroText}><Text style={s.eyebrow}>{String(eyebrow)}</Text><Text style={s.title}>{String(title)}</Text><Text style={s.description}>{String(description)}</Text></View>
        <TouchableOpacity accessibilityRole="button" style={s.goldButton} onPress={() => setOpen(!open)}><Text style={s.goldText}>{open ? 'Close form' : mode === 'fees' ? 'Open fee section' : '+ New record'}</Text></TouchableOpacity>
      </View>
      {mode === 'exams' ? <View style={s.tabs}>{[['TIMETABLE', 'Exam Timetable', '🗓️'], ['ASSESSMENTS', 'Exam & Marks', '📝']].map(([key, label, icon]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: examSection === key }} key={key} style={[s.tab, examSection === key && s.tabActive]} onPress={() => { setExamSection(key as any); setOpen(true); setFormError(''); }}><Text style={s.tabIcon}>{icon}</Text><Text style={[s.tabText, examSection === key && s.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View> : null}
      {mode === 'exams' && examSection === 'TIMETABLE' ? <ExamTimetableBuilder years={years} classes={classes} teacherAssignments={teacherAssignments} onSaved={refresh} /> : null}
      {mode === 'academics' ? <View style={s.tabs}>{[['classes', 'Classes', '🏫'], ['subjects', 'Subjects', '📚'], ['calendar', 'Holidays / Calendar', '🗓️']].map(([key, label, icon]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: academicTab === key }} key={key} style={[s.tab, academicTab === key && s.tabActive]} onPress={() => setAcademicTab(key as any)}><Text style={s.tabIcon}>{icon}</Text><Text style={[s.tabText, academicTab === key && s.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View> : null}
      {mode === 'fees' ? <View style={s.tabs}>{[['CLASS_FEES', 'Update Class Fees', '💳'], ['STUDENT_FEES', 'Student Fees', '👨‍🎓'], ['PAYMENTS', 'Record Payment', '💰']].map(([key, label, icon]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: feeSection === key }} key={key} style={[s.tab, feeSection === key && s.tabActive]} onPress={() => { setFeeSection(key as any); setFormError(''); }}><Text style={s.tabIcon}>{icon}</Text><Text style={[s.tabText, feeSection === key && s.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View> : null}
      {mode === 'salary' ? <View style={s.tabs}>{[['SETUP', 'Update Salary', '💼'], ['HISTORY', 'Salary History', '📜'], ['PAYMENTS', 'Pay Salary', '💰']].map(([key, label, icon]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: salarySection === key }} key={key} style={[s.tab, salarySection === key && s.tabActive]} onPress={() => { setSalarySection(key as any); setFormError(''); setSelectedSalaryAccount(null); setOpen(key === 'SETUP'); }}><Text style={s.tabIcon}>{icon}</Text><Text style={[s.tabText, salarySection === key && s.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View> : null}
      {mode === 'salary' ? <View style={s.panel}><Text style={s.panelTitle}>Filter employees by sub-role</Text><Choices value={salarySubRole} values={salaryFilterChoices} onChange={(v: string) => setSalarySubRole(v)} /></View> : null}
      {!(mode === 'exams' && examSection === 'TIMETABLE') && open && showSalarySetupForm ? <View style={s.panel}><Text style={s.panelTitle}>{formPanelTitle}</Text>{formContent()}{formError ? <Text style={{ color: '#b42318', fontWeight: '700', marginTop: 8, marginBottom: 8 }}>{String(formError)}</Text> : null}{mode !== 'exams' && (mode !== 'fees' || feeSection === 'CLASS_FEES') && showSalarySetupForm ? <TouchableOpacity accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]} onPress={submit}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveText}>{formSaveLabel}</Text>}</TouchableOpacity> : null}</View> : null}
      {mode !== 'exams' ? <View style={s.listHeader}><Text style={s.listTitle}>{mode === 'academics' ? `${academicTab === 'classes' ? 'Classes' : academicTab === 'subjects' ? 'Subjects' : 'Holidays & Calendar'} records` : mode === 'fees' ? (feeSection === 'CLASS_FEES' ? 'Class fee list' : feeSection === 'PAYMENTS' ? 'Students for payment' : 'Student fee list') : mode === 'salary' ? (salarySection === 'SETUP' ? 'Employee salary list' : salarySection === 'HISTORY' ? 'Salary history list' : 'Employees for salary payment') : 'Database records'}</Text><TouchableOpacity accessibilityRole="button" onPress={refresh}><Text style={s.refresh}>↻ Refresh</Text></TouchableOpacity></View> : null}
      {mode !== 'exams' ? (records.isLoading || feeAccounts.isLoading || academics.isLoading || calendarRecords.isLoading || salaryAccounts.isLoading ? <ActivityIndicator color="#c88728" /> : !hasRecords ? <View style={s.empty}><Text style={s.emptyTitle}>{mode === 'fees' ? (feeSection === 'CLASS_FEES' ? 'No academic classes available' : 'No student fee accounts found') : mode === 'salary' ? 'No active employees found' : 'No records available'}</Text><Text style={s.muted}>{mode === 'fees' && feeSection !== 'CLASS_FEES' ? 'No current student fee accounts are available for the selected filters.' : mode === 'salary' ? 'No active employees match the selected sub-role.' : emptyMessage(mode, form.action)}</Text></View> : <View style={s.grid}>{rows.slice(0, 100).map((row: any, index: number) => { if (row._sectionHeader) return <View key={row._sectionHeader} style={s.sectionHeader}><Text style={s.sectionTitle}>{row._sectionHeader}</Text></View>; const isStudentFee = mode === 'fees' && feeSection !== 'CLASS_FEES'; const isSalaryCard = mode === 'salary'; const cardTitle = isSalaryCard ? row.name : isStudentFee ? row.studentName : mode === 'fees' ? row.name : row.title || row.name || row.student?.name || row.receiptNo || ('Record ' + (index + 1)); const cardBadge = isSalaryCard ? row.subRole || 'SUB-ROLE NOT SET' : isStudentFee ? row.className + ' · ' + row.sectionName : mode === 'fees' ? (row.hasFee ? 'SET' : 'NOT SET') : row.status || row.type || row.calculationStatus || (row.published ? 'PUBLISHED' : row._recordType === 'CALENDAR' ? row.dayType : 'ACTIVE'); const cardBody = isSalaryCard ? 'Current month (' + row.currentMonthLabel + '): Gross ₹' + formatMoney(row.latestSalary?.grossAmount) + ' · Deduction ₹' + formatMoney(row.latestSalary?.deductionAmount) + ' · Payable ₹' + formatMoney(row.payableAmount) + ' · Paid ₹' + formatMoney(row.paidAmount) + ' · Remaining ₹' + formatMoney(row.remainingAmount) + ' · Present ' + (row.attendanceStatuses?.PRESENT || 0) + ' · Absent ' + (row.attendanceStatuses?.ABSENT || 0) + ' · Half-day ' + (row.attendanceStatuses?.HALF_DAY || 0) + ' · Late ' + (row.attendanceStatuses?.LATE || 0) + ' · Previous remaining ₹' + formatMoney(row.previousRemaining) + ' · Previous credit ₹' + formatMoney(row.previousCredit) + ' · Total due ₹' + formatMoney(row.totalRemaining) + ' · Total credit ₹' + formatMoney(row.totalCredit) : isStudentFee ? 'Student ID: ' + row.studentCode + ' · Fee / Remaining: ₹' + formatMoney(row.totalFee) + ' / ₹' + formatMoney(row.remainingFee) + ' · Paid: ₹' + formatMoney(row.paidAmount) + (row.creditBalance > 0 ? ' · Credit: ₹' + formatMoney(row.creditBalance) : '') : mode === 'fees' ? (row.hasFee ? 'Per-student fee: ₹' + formatMoney(row.totalFee) : 'Fee not set') : mode === 'accounts' ? 'Amount: ₹' + formatMoney(row.amount) + '\nTransaction date: ' + displayDate(row.transactionDate) + '\nAdded: ' + displayDateTime(row.createdAt) + '\nDescription: ' + (row.description || 'No description provided.') + '\nSource: ' + (row.sourceType || 'MANUAL') : row.message || row.description || row.schoolClass?.name || row.student?.studentId || row.subject?.name || row.employee?.name || (row._recordType === 'CALENDAR' ? 'Administration calendar entry' : 'Additional details are not available.'); return <TouchableOpacity accessibilityRole="button" style={[s.card, selectedAcademic?.id === row.id && s.cardSelected]} key={row.id || index} onPress={() => { if (mode === 'academics' && row._recordType !== 'CALENDAR') setSelectedAcademic(row); else if (isStudentFee) setSelectedFeeAccount(row); else if (isSalaryCard && salarySection === 'SETUP') { set('employeeId', row.id); setOpen(true); } else if (isSalaryCard && salarySection === 'HISTORY') { setSelectedSalaryAccount(row); } else if (isSalaryCard) openSalaryPayment(row); }}><View style={s.cardTop}><Text style={s.cardTitle}>{String(cardTitle)}</Text><Text style={s.badge}>{String(cardBadge)}</Text></View><Text style={s.cardBody}>{String(cardBody)}</Text>{isSalaryCard ? <><Text style={s.tap}>{salarySection === 'SETUP' ? 'Tap to update salary' : salarySection === 'HISTORY' ? 'Tap to view salary history' : 'Tap to record salary payment'}</Text>{salarySection === 'PAYMENTS' ? <TouchableOpacity accessibilityRole="button" style={s.smallButton} onPress={() => openSalaryPayment(row)}><Text style={s.smallText}>Open payment form</Text></TouchableOpacity> : null}</> : isStudentFee ? <Text style={s.tap}>{feeSection === 'PAYMENTS' ? 'Tap to record payment' : 'Tap to view payment history'}</Text> : null}{row.date || row.transactionDate || row.createdAt ? <Text style={s.meta}>{displayDate(row.date || row.transactionDate || row.createdAt)}</Text> : null}{mode === 'academics' && row._recordType === 'CALENDAR' ? <View style={s.cardActions}><TouchableOpacity style={s.smallButton} onPress={() => editCalendar(row)}><Text style={s.smallText}>Edit</Text></TouchableOpacity><TouchableOpacity style={s.deleteButton} onPress={() => deleteCalendar(row.id)}><Text style={s.deleteText}>Delete</Text></TouchableOpacity></View> : null}{mode === 'academics' && row._recordType !== 'CALENDAR' ? <Text style={s.tap}>Tap to view connected details</Text> : null}{mode === 'exams' && !row.published ? <TouchableOpacity style={s.smallButton} onPress={() => publishExam(row.id)}><Text style={s.smallText}>Publish result</Text></TouchableOpacity> : null}</TouchableOpacity>; })}</View>) : null}
    </ScrollView>
    <Modal visible={mode === 'academics' && !!selectedAcademic} transparent animationType="fade" onRequestClose={() => setSelectedAcademic(null)}><View style={s.overlay} accessibilityViewIsModal><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close academic details" style={StyleSheet.absoluteFill} onPress={() => setSelectedAcademic(null)} /><View style={s.modalShell}><ScrollView contentContainerStyle={s.modalContent}>{academicDetail ? <View style={s.detailPanel}><View style={s.detailHeader}><View><Text style={s.eyebrow}>{academicDetail.type} DETAILS</Text><Text style={s.panelTitle}>{academicDetail.title}</Text><Text style={s.meta}>{academicDetail.subtitle}</Text></View><View style={s.cardTop}><TouchableOpacity accessibilityRole="button" style={s.smallButton} onPress={() => deleteAcademicRecord(selectedAcademic)}><Text style={s.smallText}>Delete record</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setSelectedAcademic(null)}><Text style={s.closeText}>Close ✕</Text></TouchableOpacity></View></View>{academicDetail.sections.length ? <><Text style={s.detailHeading}>Classes and sections</Text>{academicDetail.sections.map((section: any) => <Text style={s.detailRow} key={section.id}>{section.name} · {section.capacity || 'No section details'}</Text>)}</> : null}<Text style={s.detailHeading}>Employees / assigned staff ({academicDetail.employees?.length || 0})</Text>{academicDetail.employees?.length ? academicDetail.employees.map((employee: any) => <Text style={s.detailRow} key={employee.id}>{employee.employeeId} · {employee.name} · Designation: {employee.designation} · Sub-role: {employee.subRole}</Text>) : <Text style={s.muted}>No assigned employees found.</Text>}<Text style={s.detailHeading}>Subject teachers</Text>{academicDetail.teachers.length ? academicDetail.teachers.map((item: any) => <View style={s.cardTop} key={item.id}><Text style={s.detailRow}>{item.employee?.name} → {item.subject?.name} · {item.section?.schoolClass?.name} {item.section?.name} · {item.academicYear?.name}</Text><TouchableOpacity accessibilityRole="button" style={s.smallButton} onPress={() => deleteAssignment(item.id)}><Text style={s.smallText}>Delete</Text></TouchableOpacity></View>) : <Text style={s.muted}>No subject-teacher assignments found.</Text>}<Text style={s.detailHeading}>Class teachers</Text>{academicDetail.classTeachers.length ? academicDetail.classTeachers.map((item: any) => <View style={s.cardTop} key={item.id}><Text style={s.detailRow}>{item.employee?.name} → {item.section?.schoolClass?.name} {item.section?.name} · {item.academicYear?.name}</Text><TouchableOpacity accessibilityRole="button" style={s.smallButton} onPress={() => deleteAssignment(item.id, true)}><Text style={s.smallText}>Delete</Text></TouchableOpacity></View>) : <Text style={s.muted}>No class-teacher assignments found.</Text>}<Text style={s.detailHeading}>Current students ({academicDetail.students.length})</Text>{academicDetail.students.length ? academicDetail.students.map((student: any) => { const enrollment = student.enrollments?.find((item: any) => item.status === 'CURRENT'); return <Text style={s.detailRow} key={student.id}>{student.studentId} · {student.name} · {enrollment?.section?.schoolClass?.name} {enrollment?.section?.name} · Roll {enrollment?.rollNumber || '—'}</Text>; }) : <Text style={s.muted}>No current students assigned.</Text>}</View> : null}</ScrollView></View></View></Modal>
   <Modal visible={mode === 'fees' && feeSection === 'STUDENT_FEES' && !!selectedFeeAccount} transparent animationType="fade" onRequestClose={() => setSelectedFeeAccount(null)}><View style={s.overlay} accessibilityViewIsModal><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close student fee details" style={StyleSheet.absoluteFill} onPress={() => setSelectedFeeAccount(null)} /><View style={s.modalShell}><ScrollView contentContainerStyle={s.modalContent}>{selectedFeeAccount ? <View style={s.detailPanel}><View style={s.detailHeader}><View><Text style={s.eyebrow}>STUDENT FEE DETAILS</Text><Text style={s.panelTitle}>{selectedFeeAccount.studentName}</Text><Text style={s.meta}>{selectedFeeAccount.studentCode} · {selectedFeeAccount.className} · {selectedFeeAccount.sectionName}</Text></View><TouchableOpacity accessibilityRole="button" style={s.close} onPress={() => setSelectedFeeAccount(null)}><Text style={s.closeText}>Close ✕</Text></TouchableOpacity></View><Text style={s.detailHeading}>Fee summary</Text><Text style={s.detailRow}>Total fee: ₹{formatMoney(selectedFeeAccount.totalFee)}</Text><Text style={s.detailRow}>Paid: ₹{formatMoney(selectedFeeAccount.paidAmount)}</Text><Text style={s.detailRow}>Remaining: ₹{formatMoney(selectedFeeAccount.remainingFee)}</Text><Text style={s.detailHeading}>Payment history</Text>{selectedFeeAccount.transactions?.length ? selectedFeeAccount.transactions.map((transaction: any) => <View style={s.cardTop} key={transaction.id}><Text style={s.detailRow}>{displayDate(transaction.paymentDate)} · {displayDateTime(transaction.createdAt)} · {transaction.status}</Text><Text style={s.detailRow}>₹{formatMoney(transaction.amount)}</Text></View>) : <Text style={s.muted}>No payments recorded yet.</Text>}</View> : null}</ScrollView></View></View></Modal>
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
  </View>;
}

function CommonSelectors({ years, sections, subjects, employees, values, set }: any) { return <><SelectCards label="Academic year" value={values.yearId} items={years} onChange={(v: string) => set('academicYearId', v)} getLabel={(x: any) => x.name} /><SelectCards label="Section" value={values.sectionId} items={sections} onChange={(v: string) => set('sectionId', v)} getLabel={(x: any) => x.className + ' ' + x.name} />{subjects.length ? <SelectCards label="Subject" value={values.subjectId} items={subjects} onChange={(v: string) => set('subjectId', v)} getLabel={(x: any) => x.name} /> : null}{employees.length ? <SelectCards label="Employee" value={values.employeeId} items={employees} onChange={(v: string) => set('employeeId', v)} getLabel={(x: any) => x.name + ' · ' + (x.primarySubject?.name || x.teachingAssignments?.[0]?.subject?.name || subjects.find((subject: any) => subject.id === x.primarySubjectId)?.name || 'Subject not set')} /> : null}</>; }

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background },
  
  content: { ...surfaces.content, gap: 16 },
  
  hero: { ...surfaces.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', flexWrap: 'wrap' },
  
  heroText: { flex: 1 },
  
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.4, color: colors.blue },
  
  title: { marginTop: 5, fontSize: 28, color: colors.ink, fontWeight: '700' },
  
  description: { marginTop: 5, maxWidth: 700, lineHeight: 21, color: colors.muted },
  
  goldButton: { borderRadius: 11, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', backgroundColor: colors.blue, minHeight: 44 },
  
  goldText: { fontWeight: '800', color: '#FFFFFF' },
  
  tabs: { backgroundColor: '#fff', borderRadius: 16, padding: 6, flexDirection: 'row', borderWidth: 1, borderColor: '#e1e6ec', flexWrap: 'wrap', gap: 12 },
  
  tab: { flex: 1, minHeight: 48, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, minWidth: 120 },
  
  tabActive: { borderColor: colors.blue, backgroundColor: colors.blue },
  
  tabIcon: { fontSize: 16 },
  
  tabText: { color: '#607187', fontSize: 13, fontWeight: '700' },
  
  tabTextActive: { color: '#fff' },
  
  panel: { ...surfaces.card, backgroundColor: '#fff', padding: 20, gap: 12, borderRadius: 14 },
  
  panelTitle: { fontSize: 21, fontWeight: '700', color: colors.ink },
  
  field: { gap: 6, minWidth: 0, flexShrink: 1 },
  
  label: { color: '#506176', fontSize: 12, fontWeight: '700' },
  
  input: { ...surfaces.input, borderWidth: 1, borderColor: '#d9e0e8', backgroundColor: '#fbfcfd', color: '#172b42', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  
  multiline: { minHeight: 85, textAlignVertical: 'top' },
  
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  
  choice: { borderWidth: 1, borderColor: '#d4dce5', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9 },
  
  choiceOn: { borderColor: colors.blue, backgroundColor: colors.blue },
  
  choiceText: { color: '#506176', fontSize: 12 },
  
  choiceTextOn: { color: '#fff', fontWeight: '700', fontSize: 12 },
  
  save: { borderRadius: 11, padding: 14, alignItems: 'center', marginTop: 4, justifyContent: 'center', backgroundColor: colors.blue, minHeight: 44 },
  
  disabled: { opacity: .65 },
  
  saveText: { fontWeight: '800', color: '#FFFFFF' },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  
  listTitle: { color: '#203451', fontSize: 20, fontWeight: '800' },
  
  refresh: { color: '#3563E9', fontWeight: '700' },
  
  grid: { gap: 10 },
  
  sectionHeader: { backgroundColor: '#eaf0f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  
  sectionTitle: { color: '#203451', fontSize: 15, fontWeight: '800' },
  
  card: { ...surfaces.card, backgroundColor: '#fff', padding: 17, gap: 6, minWidth: 0, borderWidth: 1, borderRadius: 14, borderColor: colors.border },
  
  cardSelected: { borderWidth: 2, borderColor: '#3563E9' },
  
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  
  cardTitle: { color: '#203451', fontSize: 16, fontWeight: '800', flex: 1 },
  
  badge: { color: '#18734a', fontSize: 10, fontWeight: '800' },
  
  cardBody: { color: '#5d6d80' },

  marksCount: { color: '#3563E9', fontSize: 13, fontWeight: '800', marginTop: 4 },

  marksExamCard: { backgroundColor: '#F7FAFF', borderWidth: 1, borderColor: '#D7E2F4', borderRadius: 12, padding: 14, gap: 6 },

  marksExamSelected: { borderColor: '#3563E9', borderWidth: 2 },

  marksSubjectCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D7E2F4', borderRadius: 12, padding: 14, gap: 6, marginTop: 8 },

  marksSubjectSelected: { borderColor: '#3563E9', borderWidth: 2 },

  marksNotAssigned: { color: '#B42318', fontSize: 11, fontWeight: '800' },

  marksEntered: { color: '#18734A', fontSize: 11, fontWeight: '800' },

  marksEditor: { backgroundColor: '#F2F6FF', borderRadius: 14, padding: 15, marginTop: 8 },

  meta: { color: '#8a96a5', fontSize: 11 },
  
  tap: { color: '#3563E9', fontSize: 11, fontWeight: '700', marginTop: 4 },
  
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  
  smallButton: { alignSelf: 'flex-start', backgroundColor: '#eaf0f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 5 },
  
  smallText: { color: '#203451', fontWeight: '800', fontSize: 12 },
  
  deleteButton: { alignSelf: 'flex-start', backgroundColor: '#fff0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 5 },
  
  deleteText: { color: '#b42318', fontWeight: '800', fontSize: 12 },
  
  empty: { backgroundColor: '#fff', borderRadius: 15, padding: 30, alignItems: 'center' },
  
  emptyTitle: { color: '#203451', fontWeight: '800' },
  
  muted: { color: '#758396', marginTop: 5 },
  
  overlay: { flex: 1, backgroundColor: 'rgba(4, 17, 30, 0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  
  modalShell: { width: '92%', maxWidth: 780, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 16 },
  
  modalContent: { padding: 0 },
  
  detailPanel: { backgroundColor: '#fff', padding: 22, gap: 10 },
  
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  
  close: { backgroundColor: '#edf1f5', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  
  closeText: { color: '#243a52', fontWeight: '700' },
  
  detailHeading: { color: '#203451', fontSize: 15, fontWeight: '800', marginTop: 5 },
  
  detailRow: { color: '#506176', lineHeight: 20 } });
