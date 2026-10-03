import { colors, surfaces } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';
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
  const { isDark } = useTheme();
  const styles = getThemedStyles(isDark);
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
  const { isDark } = useTheme();
  const styles = getThemedStyles(isDark);
  return <View style={styles.statusButtons}>
    {statusOptions.map((option) => {
      const selected = value === option.value;
      return <TouchableOpacity
        key={option.value}
        accessibilityRole="radio"
        accessibilityLabel={`${option.label} for ${personName}`}
        accessibilityState={{ selected }}
        style={[styles.statusButton, { borderColor: selected ? option.color : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', backgroundColor: selected ? option.background : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
        onPress={() => onChange(option.value)}
      >
        <Text style={[styles.statusButtonText, { color: option.color }]}>{option.short}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

function DateField({ value, onChange, maxDate }: { value: string; onChange: (value: string) => void; maxDate: string }) {
  const { isDark, colors: tc } = useTheme();
  const styles = getThemedStyles(isDark);
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
          placeholderTextColor={tc.muted}
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
  const { isDark, colors: tc } = useTheme();
  const styles = getThemedStyles(isDark);
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

let stylesDark: any = null;
let stylesLight: any = null;

function getThemedStyles(isDark: boolean) {
  if (isDark) {
    if (!stylesDark) stylesDark = StyleSheet.create(createStyles(THEME_PALETTES.dark, true) as any);
    return stylesDark;
  } else {
    if (!stylesLight) stylesLight = StyleSheet.create(createStyles(THEME_PALETTES.light, false) as any);
    return stylesLight;
  }
}

function createStyles(tc: ThemeColors, isDark: boolean) {
  return {
    page: { flex: 1, backgroundColor: tc.canvas },
    content: { ...surfaces.content, gap: 16 },

    hero: {
      ...surfaces.card,
      padding: 24,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      flexWrap: 'wrap' as const,
    },
    heroText: { maxWidth: 800 },
    eyebrow: { fontWeight: '800' as const, fontSize: 10, letterSpacing: 1.4, color: tc.primary },
    title: { marginTop: 5, fontSize: 28, color: tc.text, fontWeight: '800' as const, letterSpacing: -0.3 },
    description: { marginTop: 5, lineHeight: 21, color: tc.muted },

    modeTabs: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
      borderRadius: 16,
      padding: 6,
      flexDirection: 'row' as const,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : tc.line,
      flexWrap: 'wrap' as const,
      gap: 12,
    },
    modeTab: { flex: 1, minHeight: 52, borderRadius: 11, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingHorizontal: 10, minWidth: 120 },
    modeTabActive: { borderColor: tc.primary, backgroundColor: tc.primary },
    tabIcon: { fontSize: 17 },
    modeTabText: { color: tc.muted, fontSize: 13, fontWeight: '700' as const },
    modeTabTextActive: { color: '#ffffff', fontWeight: '800' as const },

    filters: {
      ...surfaces.card,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      padding: 18,
      gap: 12,
      borderRadius: 14,
    },
    field: { gap: 6, flex: 1, minWidth: 0, flexShrink: 1 },
    label: { color: tc.muted, fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.3 },
    input: {
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      color: tc.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
    },
    dropdown: {
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    dropdownText: { color: tc.text, fontSize: 14 },
    placeholder: { color: tc.muted, fontSize: 14 },
    chevron: { color: tc.muted, fontSize: 18 },
    disabled: { opacity: 0.55 },
    modalOverlay: { flex: 1, backgroundColor: isDark ? 'rgba(4, 8, 18, 0.80)' : 'rgba(0, 0, 0, 0.5)', alignItems: 'center' as const, justifyContent: 'center' as const, padding: 18 },
    dropdownSheet: {
      width: '92%',
      maxWidth: 520,
      backgroundColor: isDark ? '#0e1525' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      borderRadius: 16,
      padding: 14,
      gap: 6,
    },
    sheetTitle: { color: tc.text, fontSize: 16, fontWeight: '800' as const, paddingHorizontal: 10, paddingVertical: 8 },
    dropdownOption: { minHeight: 44, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    dropdownOptionSelected: { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.12)' },
    dropdownOptionText: { color: tc.muted, fontSize: 14 },
    dropdownOptionTextSelected: { color: tc.text, fontWeight: '800' as const },
    check: { color: colors.success, fontWeight: '800' as const },

    listHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, flexWrap: 'wrap' as const, gap: 12 },
    listTitle: { color: tc.text, fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.2 },
    refresh: { color: tc.primary, fontWeight: '700' as const },
    muted: { color: tc.muted, marginTop: 4 },

    summary: {
      ...surfaces.card,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : tc.line,
      padding: 14,
      flexDirection: 'row' as const,
      gap: 12,
      borderRadius: 14,
      flexWrap: 'wrap' as const,
    },
    summaryItem: { minWidth: 75 },
    summaryCount: { color: tc.text, fontSize: 20, fontWeight: '800' as const },
    summaryLabel: { color: tc.muted, fontSize: 11, marginTop: 2 },

    error: {
      color: colors.danger,
      backgroundColor: 'rgba(248, 113, 113, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.25)',
      borderRadius: 10,
      padding: 12,
      fontWeight: '700' as const,
    },
    errorText: { color: colors.danger, marginTop: 8, textAlign: 'center' as const },

    roster: {
      ...surfaces.card,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : tc.line,
      overflow: 'hidden' as const,
      borderRadius: 14,
    },
    personRow: {
      minHeight: 72,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : tc.line,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      flexWrap: 'wrap' as const,
      gap: 12,
    },
    personInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, flex: 1, minWidth: 160 },
    roll: {
      minWidth: 82,
      maxWidth: 100,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.10)',
      color: tc.primary,
      textAlign: 'center' as const,
      textAlignVertical: 'center' as const,
      paddingHorizontal: 8,
      paddingTop: 8,
      fontWeight: '800' as const,
      fontSize: 11,
      flexShrink: 0,
    },
    personName: { color: tc.text, fontWeight: '800' as const, fontSize: 14 },
    personMeta: { color: tc.muted, fontSize: 11, marginTop: 3 },
    statusControl: { width: 190 },
    statusButtons: { flexDirection: 'row' as const, gap: 8, justifyContent: 'flex-end' as const },
    statusButton: { width: 52, height: 42, borderWidth: 1.5, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
    statusButtonText: { fontSize: 16, fontWeight: '900' as const },

    empty: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : tc.line,
      borderRadius: 15,
      padding: 30,
      alignItems: 'center' as const,
    },
    emptyTitle: { color: tc.text, fontWeight: '800' as const, fontSize: 16 },
    save: { borderRadius: 11, padding: 14, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: tc.primary, minHeight: 44 },
    saveText: { fontWeight: '800' as const, color: '#FFFFFF' },

    dateLabelRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    todayBadge: { backgroundColor: 'rgba(52, 211, 153, 0.18)', color: '#34d399', fontSize: 10, fontWeight: '800' as const, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, letterSpacing: 0.5 },
    dateControlsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    dateInput: { flex: 1, minWidth: 110, textAlign: 'center' as const, fontWeight: '700' as const },
    dateNavBtn: { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : tc.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' as const, alignItems: 'center' as const },
    dateNavText: { color: tc.text, fontSize: 12, fontWeight: '700' as const },
    mutedText: { color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)' },
    todayBtn: { backgroundColor: isDark ? 'rgba(147, 155, 255, 0.15)' : 'rgba(91, 140, 255, 0.15)', borderWidth: 1, borderColor: isDark ? 'rgba(147, 155, 255, 0.35)' : 'rgba(91, 140, 255, 0.35)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' as const, alignItems: 'center' as const },
    todayBtnText: { color: tc.primary, fontSize: 12, fontWeight: '800' as const },
    futureDateWarning: { color: colors.danger, fontSize: 11, fontWeight: '700' as const, marginTop: 4 },
    bulkRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, flexWrap: 'wrap' as const },
    bulkLabel: { color: tc.muted, fontSize: 12, fontWeight: '700' as const },
    bulkBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
    bulkBtnPresent: { backgroundColor: 'rgba(52, 211, 153, 0.12)', borderColor: 'rgba(52, 211, 153, 0.35)' },
    bulkBtnTextPresent: { color: '#34d399', fontSize: 12, fontWeight: '800' as const },
    bulkBtnAbsent: { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderColor: 'rgba(248, 113, 113, 0.35)' },
    bulkBtnTextAbsent: { color: '#f87171', fontSize: 12, fontWeight: '800' as const },
    bulkBtnReset: { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : tc.line },
    bulkBtnTextReset: { color: tc.muted, fontSize: 12, fontWeight: '700' as const },
  };
}
