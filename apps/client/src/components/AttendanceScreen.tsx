import { colors, surfaces } from '../theme';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

type AttendanceMode = 'STUDENT' | 'EMPLOYEE';
type Status = 'NONE' | 'PRESENT' | 'ABSENT' | 'LATE';
type Option = { label: string; value: string };
type StatusOption = { label: string; short: 'P' | 'A' | 'L'; value: Exclude<Status, 'NONE'>; color: string; background: string; border: string };

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const today = getTodayStr();

function addDays(dateStr: string, days: number): string {
  try {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3) {
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      dt.setDate(dt.getDate() + days);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {}
  return dateStr;
}

const statusOptions: StatusOption[] = [
  { label: 'Present', short: 'P', value: 'PRESENT', color: '#34d399', background: 'rgba(52,211,153,0.18)', border: 'rgba(52,211,153,0.40)' },
  { label: 'Absent', short: 'A', value: 'ABSENT', color: '#f87171', background: 'rgba(248,113,113,0.18)', border: 'rgba(248,113,113,0.40)' },
  { label: 'Late', short: 'L', value: 'LATE', color: '#fbbf24', background: 'rgba(251,191,36,0.18)', border: 'rgba(251,191,36,0.40)' },
];

function errorText(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('\n') : message || 'Please verify the details and try again.';
}

function notify(title: string, message: string) {
  const browserAlert = (globalThis as any).alert;
  if (Platform.OS === 'web' && typeof browserAlert === 'function') browserAlert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function Dropdown({ label, value, placeholder, options, onChange, disabled = false }: { label?: string; value?: string; placeholder: string; options: Option[]; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={styles.field}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TouchableOpacity accessibilityRole="button" disabled={disabled} style={[styles.dropdown, disabled && styles.disabled]} onPress={() => setOpen(true)}>
      <Text style={selected ? styles.dropdownText : styles.placeholder}>{selected?.label || placeholder}</Text>
      <Text style={styles.chevron}>⌄</Text>
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity accessibilityLabel="Close options" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={styles.dropdownSheet}>
          {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
          {options.map((option) => <TouchableOpacity key={option.value} accessibilityRole="button" style={[styles.dropdownOption, value === option.value && styles.dropdownOptionSelected]} onPress={() => { onChange(option.value); setOpen(false); }}>
            <Text style={[styles.dropdownOptionText, value === option.value && styles.dropdownOptionTextSelected]}>{option.label}</Text>
            {value === option.value ? <Text style={styles.check}>✓</Text> : null}
          </TouchableOpacity>)}
        </View>
      </View>
    </Modal>
  </View>;
}

function StatusButtons({ value, onChange, personName }: { value: Status; onChange: (value: Status) => void; personName: string }) {
  return <View style={styles.statusButtons}>
    {statusOptions.map((option) => {
      const selected = value === option.value;
      return <TouchableOpacity
        key={option.value}
        accessibilityRole="radio"
        accessibilityLabel={`${option.label} for ${personName}`}
        accessibilityState={{ selected }}
        style={[styles.statusButton, { borderColor: selected ? option.color : 'rgba(255,255,255,0.12)', backgroundColor: selected ? option.background : 'rgba(255,255,255,0.04)' }]}
        onPress={() => onChange(option.value)}
      >
        <Text style={[styles.statusButtonText, { color: option.color }]}>{option.short}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

function DateField({ value, onChange, maxDate }: { value: string; onChange: (value: string) => void; maxDate: string }) {
  const isToday = value === maxDate;
  const canGoNext = value < maxDate;

  const handlePrev = () => {
    onChange(addDays(value, -1));
  };

  const handleNext = () => {
    if (canGoNext) {
      const next = addDays(value, 1);
      if (next <= maxDate) onChange(next);
    }
  };

  const handleToday = () => {
    onChange(maxDate);
  };

  const handleChangeText = (text: string) => {
    if (text > maxDate && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
      onChange(maxDate);
    } else {
      onChange(text);
    }
  };

  return (
    <View style={styles.field}>
      <View style={styles.dateLabelRow}>
        <Text style={styles.label}>Attendance date</Text>
        {isToday ? <Text style={styles.todayBadge}>TODAY</Text> : null}
      </View>
      <View style={styles.dateControlsRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          style={styles.dateNavBtn}
          onPress={handlePrev}
        >
          <Text style={styles.dateNavText}>◀ Prev</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, styles.dateInput]}
          value={value}
          onChangeText={handleChangeText}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="rgba(255,255,255,0.25)"
          maxLength={10}
        />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Next day"
          disabled={!canGoNext}
          style={[styles.dateNavBtn, !canGoNext && styles.disabled]}
          onPress={handleNext}
        >
          <Text style={[styles.dateNavText, !canGoNext && styles.mutedText]}>Next ▶</Text>
        </TouchableOpacity>

        {!isToday && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go to Today"
            style={styles.todayBtn}
            onPress={handleToday}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>
      {value > maxDate ? (
        <Text style={styles.futureDateWarning}>⚠️ Future dates are not allowed</Text>
      ) : null}
    </View>
  );
}

type AttendanceScreenProps = { allowedModes?: AttendanceMode[]; defaultMode?: AttendanceMode };

export function AttendanceScreen({ allowedModes = ['STUDENT', 'EMPLOYEE'], defaultMode }: AttendanceScreenProps = {}) {
  const client = useQueryClient();
  const [mode, setMode] = useState<AttendanceMode>(defaultMode || allowedModes[0] || 'STUDENT');
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const academics = useQuery<any>({ queryKey: ['academics'], queryFn: async () => (await api.get('/academics')).data });
  const classes = academics.data?.classes || [];
  const classTeacherAssignments = academics.data?.classTeacherAssignments || [];

  const isGlobalStudentAttendance = user?.role === 'ADMIN' || Boolean((user as any)?.hasGlobalStudentAttendance);

  const myClassTeacherAssignments = useMemo(() => {
    if (user?.role !== 'EMPLOYEE') return [];
    return classTeacherAssignments.filter((cta: any) =>
      (user.employeeId && cta.employee?.employeeId === user.employeeId) ||
      cta.employeeId === (user as any).employeeDbId ||
      cta.employeeId === user.id
    );
  }, [classTeacherAssignments, user]);

  const availableClasses = useMemo(() => {
    if (isGlobalStudentAttendance || !myClassTeacherAssignments.length) {
      return classes;
    }
    const mySectionIds = myClassTeacherAssignments.map((cta: any) => cta.sectionId);
    return classes
      .map((c: any) => ({
        ...c,
        sections: (c.sections || []).filter((s: any) => mySectionIds.includes(s.id)),
      }))
      .filter((c: any) => c.sections.length > 0);
  }, [classes, isGlobalStudentAttendance, myClassTeacherAssignments]);
  const sections = useMemo(() => availableClasses.find((item: any) => item.id === classId)?.sections || [], [availableClasses, classId]);

  useEffect(() => {
    if (!availableClasses.some((item: any) => item.id === classId)) setClassId(availableClasses[0]?.id || '');
  }, [availableClasses, classId]);

  useEffect(() => {
    if (sections.length && !sections.some((section: any) => section.id === sectionId)) setSectionId(sections[0].id);
    if (!sections.length) setSectionId('');
  }, [sections, sectionId]);

  const students = useQuery<any>({
    queryKey: ['attendance-student-roster', sectionId, date],
    queryFn: async () => (await api.get('/attendance/students', { params: { sectionId, date } })).data,
    enabled: mode === 'STUDENT' && !!sectionId && !!date && date <= today,
  });
  const employees = useQuery<any>({
    queryKey: ['attendance-employee-roster', date],
    queryFn: async () => (await api.get('/attendance/employees', { params: { date } })).data,
    enabled: mode === 'EMPLOYEE' && !!date && date <= today,
  });

  const people = mode === 'STUDENT' ? (students.data?.students || []) : (employees.data?.employees || []);
  const loading = academics.isLoading || (mode === 'STUDENT' ? students.isLoading : employees.isLoading);
  const rosterError = mode === 'STUDENT' ? students.error : employees.error;

  useEffect(() => {
    const next: Record<string, Status> = {};
    people.forEach((person: any) => {
      next[person.id] = statusOptions.some((option) => option.value === person.status) ? person.status : 'NONE';
    });
    setStatuses(next);
  }, [mode, date, sectionId, students.data, employees.data]);

  const counts = useMemo(() => statusOptions.map((option) => ({ ...option, count: people.filter((person: any) => statuses[person.id] === option.value).length })), [people, statuses]);

  const selectClass = (value: string) => {
    setClassId(value);
    setSectionId('');
  };

  const markAll = (status: Exclude<Status, 'NONE'> | 'NONE') => {
    const next: Record<string, Status> = {};
    people.forEach((person: any) => {
      next[person.id] = status;
    });
    setStatuses((old) => ({ ...old, ...next }));
  };

  const saveAttendance = async () => {
    setFormError('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setFormError('Date must be in YYYY-MM-DD format.'); return; }
    if (date > today) { setFormError('Future attendance is not allowed. Please choose today or a past date.'); return; }
    if (mode === 'STUDENT' && !sectionId) { setFormError('Please select a class section first.'); return; }
    const records = people.filter((person: any) => statuses[person.id] && statuses[person.id] !== 'NONE').map((person: any) => ({ id: person.id, status: statuses[person.id] }));
    if (!records.length) { setFormError('Please choose P, A or L for at least one person.'); return; }
    setSaving(true);
    try {
      await api.post(`/attendance/${mode === 'STUDENT' ? 'students' : 'employees'}`, { date, sectionId: mode === 'STUDENT' ? sectionId : undefined, records });
      await client.invalidateQueries({ queryKey: ['attendance-student-roster'] });
      await client.invalidateQueries({ queryKey: ['attendance-employee-roster'] });
      notify('Attendance saved', `${records.length} ${mode === 'STUDENT' ? 'student' : 'employee'} attendance record(s) saved for ${date}.`);
    } catch (error: any) {
      setFormError(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  return <View style={styles.page}>
    
    
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}><View style={styles.heroText}><Text style={styles.eyebrow}>DAILY REGISTER</Text><Text style={styles.title}>Attendance</Text><Text style={styles.description}>Select a class and section, then mark every student with one of the three attendance options.</Text></View></View>
      <View style={styles.modeTabs}>
        {([{ value: 'STUDENT', label: 'Student Attendance', icon: '👨‍🎓' }, { value: 'EMPLOYEE', label: 'Employee Attendance', icon: '👩‍🏫' }] as const).filter((tab) => allowedModes.includes(tab.value)).map((tab) => <TouchableOpacity key={tab.value} accessibilityRole="tab" accessibilityState={{ selected: mode === tab.value }} style={[styles.modeTab, mode === tab.value && styles.modeTabActive]} onPress={() => { setMode(tab.value); setFormError(''); }}><Text style={styles.tabIcon}>{tab.icon}</Text><Text style={[styles.modeTabText, mode === tab.value && styles.modeTabTextActive]}>{tab.label}</Text></TouchableOpacity>)}
      </View>
      <View style={styles.filters}>
        <DateField value={date} onChange={setDate} maxDate={today} />
        {mode === 'STUDENT' ? <><Dropdown label="Class" value={classId} placeholder="Choose class" options={availableClasses.map((item: any) => ({ value: item.id, label: item.name }))} onChange={selectClass} /><Dropdown label="Section" value={sectionId} placeholder="Choose section" options={sections.map((item: any) => ({ value: item.id, label: item.name }))} onChange={setSectionId} disabled={!classId || !sections.length} /></> : null}
      </View>
      <View style={styles.listHeader}><View><Text style={styles.listTitle}>{mode === 'STUDENT' ? 'Student list' : 'Employee list'}</Text><Text style={styles.muted}>{mode === 'STUDENT' ? `${classes.find((item: any) => item.id === classId)?.name || 'Class'} · Section ${sections.find((item: any) => item.id === sectionId)?.name || '—'}` : 'All active employees'} · {date}</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => mode === 'STUDENT' ? students.refetch() : employees.refetch()}><Text style={styles.refresh}>↻ Refresh</Text></TouchableOpacity></View>
      {people.length ? (
        <View style={styles.bulkRow}>
          <Text style={styles.bulkLabel}>Quick Fill:</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.bulkBtn, styles.bulkBtnPresent]}
            onPress={() => markAll('PRESENT')}
          >
            <Text style={styles.bulkBtnTextPresent}>✓ All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.bulkBtn, styles.bulkBtnAbsent]}
            onPress={() => markAll('ABSENT')}
          >
            <Text style={styles.bulkBtnTextAbsent}>✗ All Absent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.bulkBtn, styles.bulkBtnReset]}
            onPress={() => markAll('NONE')}
          >
            <Text style={styles.bulkBtnTextReset}>↺ Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {people.length ? <View style={styles.summary}>{counts.map((item) => <View key={item.value} style={styles.summaryItem}><Text style={[styles.summaryCount, { color: item.color }]}>{item.count}</Text><Text style={styles.summaryLabel}>{item.short} · {item.label}</Text></View>)}</View> : null}
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {loading ? <ActivityIndicator color="#c88728" size="large" /> : rosterError ? <View style={styles.empty}><Text style={styles.emptyTitle}>Could not load attendance list</Text><Text style={styles.errorText}>{errorText(rosterError)}</Text></View> : !people.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>{mode === 'STUDENT' && !sectionId ? 'Choose a section' : 'No people found'}</Text><Text style={styles.muted}>{mode === 'STUDENT' ? 'Select a class and section to load the complete student list.' : 'There are no active employees for this date.'}</Text></View> : <View style={styles.roster}>{people.map((person: any, index: number) => <View key={person.id} style={styles.personRow}><View style={styles.personInfo}><Text style={styles.roll} numberOfLines={1} adjustsFontSizeToFit>{mode === 'STUDENT' ? (person.rollNumber || index + 1) : index + 1}</Text><View><Text style={styles.personName}>{person.name}</Text><Text style={styles.personMeta}>{mode === 'STUDENT' ? person.studentId : `${person.employeeId} · ${person.designation}`}</Text></View></View><View style={styles.statusControl}><StatusButtons value={statuses[person.id] || 'NONE'} personName={person.name} onChange={(value) => setStatuses((old) => ({ ...old, [person.id]: value }))} /></View></View>)}</View>}
      {people.length ? <TouchableOpacity accessibilityRole="button" disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={saveAttendance}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={styles.saveText}>Save {mode === 'STUDENT' ? 'student' : 'employee'} attendance</Text>}</TouchableOpacity> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  
  content: { ...surfaces.content, gap: 16 },
  
  hero: {
    ...surfaces.card,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexWrap: 'wrap',
  },
  
  heroText: { maxWidth: 800 },
  
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.4, color: colors.blueLight },
  
  title: { marginTop: 5, fontSize: 28, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.3 },
  
  description: { marginTop: 5, lineHeight: 21, color: 'rgba(255, 255, 255, 0.45)' },
  
  modeTabs: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 6,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  modeTab: { flex: 1, minHeight: 52, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10, minWidth: 120 },
  
  modeTabActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  
  tabIcon: { fontSize: 17 },
  
  modeTabText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, fontWeight: '700' },
  
  modeTabTextActive: { color: '#fff', fontWeight: '800' },
  
  filters: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 18,
    gap: 12,
    borderRadius: 14,
  },
  
  field: { gap: 6, flex: 1, minWidth: 0, flexShrink: 1 },
  
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
  
  dropdown: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  dropdownText: { color: '#f0f6ff', fontSize: 14 },
  
  placeholder: { color: 'rgba(255, 255, 255, 0.30)', fontSize: 14 },
  
  chevron: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 18 },
  
  disabled: { opacity: .55 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(4, 8, 18, 0.80)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  
  dropdownSheet: {
    width: '92%',
    maxWidth: 520,
    backgroundColor: '#0e1525',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  
  sheetTitle: { color: '#f0f6ff', fontSize: 16, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 8 },
  
  dropdownOption: { minHeight: 44, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  dropdownOptionSelected: { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
  
  dropdownOptionText: { color: 'rgba(255, 255, 255, 0.60)', fontSize: 14 },
  
  dropdownOptionTextSelected: { color: '#f0f6ff', fontWeight: '800' },
  
  check: { color: colors.success, fontWeight: '800' },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  
  listTitle: { color: '#f0f6ff', fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  
  refresh: { color: colors.blueLight, fontWeight: '700' },
  
  muted: { color: 'rgba(255, 255, 255, 0.40)', marginTop: 4 },
  
  summary: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    flexWrap: 'wrap',
  },
  
  summaryItem: { minWidth: 75 },
  
  summaryCount: { color: '#f0f6ff', fontSize: 20, fontWeight: '800' },
  
  summaryLabel: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 11, marginTop: 2 },
  
  error: {
    color: colors.danger,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    borderRadius: 10,
    padding: 12,
    fontWeight: '700',
  },
  
  errorText: { color: colors.danger, marginTop: 8, textAlign: 'center' },
  
  roster: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    overflow: 'hidden',
    borderRadius: 14,
  },
  
  personRow: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  personInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 160 },
  
  roll: {
    minWidth: 82,
    maxWidth: 100,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    color: colors.blueLight,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    fontWeight: '800',
    fontSize: 11,
    flexShrink: 0,
  },
  
  personName: { color: '#f0f6ff', fontWeight: '800', fontSize: 14 },
  
  personMeta: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 11, marginTop: 3 },
  
  statusControl: { width: 190 },
  
  statusButtons: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  
  statusButton: { width: 52, height: 42, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  statusButtonText: { fontSize: 16, fontWeight: '900' },
  
  empty: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
  },
  
  emptyTitle: { color: '#f0f6ff', fontWeight: '800', fontSize: 16 },
  
  save: { borderRadius: 11, padding: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, minHeight: 44 },
  
  saveText: { fontWeight: '800', color: '#FFFFFF' },

  dateLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayBadge: { backgroundColor: 'rgba(52, 211, 153, 0.18)', color: '#34d399', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, letterSpacing: 0.5 },
  dateControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, minWidth: 110, textAlign: 'center', fontWeight: '700' },
  dateNavBtn: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  dateNavText: { color: '#f0f6ff', fontSize: 12, fontWeight: '700' },
  mutedText: { color: 'rgba(255, 255, 255, 0.25)' },
  todayBtn: { backgroundColor: 'rgba(147, 155, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(147, 155, 255, 0.35)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  todayBtnText: { color: colors.blueLight, fontSize: 12, fontWeight: '800' },
  futureDateWarning: { color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 4 },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bulkLabel: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 12, fontWeight: '700' },
  bulkBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  bulkBtnPresent: { backgroundColor: 'rgba(52, 211, 153, 0.12)', borderColor: 'rgba(52, 211, 153, 0.35)' },
  bulkBtnTextPresent: { color: '#34d399', fontSize: 12, fontWeight: '800' },
  bulkBtnAbsent: { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderColor: 'rgba(248, 113, 113, 0.35)' },
  bulkBtnTextAbsent: { color: '#f87171', fontSize: 12, fontWeight: '800' },
  bulkBtnReset: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.12)' },
  bulkBtnTextReset: { color: 'rgba(255, 255, 255, 0.60)', fontSize: 12, fontWeight: '700' },
});
