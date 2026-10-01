import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { colors, surfaces } from '../theme';

type Props = {
  years: any[];
  classes: any[];
  teacherAssignments: any[];
  classSubjects?: any[];
  subjects?: any[];
  onSaved?: () => Promise<void> | void;
};

const today = new Date().toISOString().slice(0, 10);

function normalizedTime(value: string) {
  const [hoursText, minutesText = '0'] = String(value || '').trim().split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeMinutes(value: string) {
  const [hours, minutes] = normalizedTime(value).split(':').map(Number);
  return hours * 60 + minutes;
}

function normalizedEndTime(startTime: string, endTime: string) {
  const normalizedStart = normalizedTime(startTime);
  const normalizedEnd = normalizedTime(endTime);
  const startMinutes = timeMinutes(normalizedStart);
  const endMinutes = timeMinutes(normalizedEnd);
  const endHour = Number(normalizedEnd.slice(0, 2));
  if (endMinutes <= startMinutes && endHour < 12) return `${String(endHour + 12).padStart(2, '0')}:${normalizedEnd.slice(3, 5)}`;
  return normalizedEnd;
}

function timeLabel(value: any) {
  const text = String(value || '');
  return text.includes('T') ? text.slice(11, 16) : text.slice(0, 5);
}

function dateLabel(value: any) {
  return String(value || '').slice(0, 10);
}

function durationLabel(startTime: string, endTime: string) {
  const effectiveEndTime = normalizedEndTime(startTime, endTime);
  const minutes = Math.max(timeMinutes(effectiveEndTime) - timeMinutes(startTime), 0);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours ? `${hours} hr ` : ''}${remaining ? `${remaining} min` : ''}`.trim() || '—';
}

function ChoiceField({ label, value, items, onChange, getLabel }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.choices}>{items.map((item: any) => <TouchableOpacity accessibilityRole="button" key={item.id} style={[s.choice, value === item.id && s.choiceOn]} onPress={() => onChange(item.id)}><Text style={value === item.id ? s.choiceTextOn : s.choiceText}>{getLabel(item)}</Text></TouchableOpacity>)}</View></View>;
}

function InputField({ label, value, onChangeText, placeholder }: any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.25)" /></View>;
}

export function ExamTimetableBuilder({ years, classes, teacherAssignments, classSubjects = [], subjects = [], onSaved }: Props) {
  const client = useQueryClient();
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('EXAM');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [entryDate, setEntryDate] = useState(today);
  const [entrySubjectId, setEntrySubjectId] = useState('');
  const [entryStartTime, setEntryStartTime] = useState('09:00');
  const [entryEndTime, setEntryEndTime] = useState('12:00');
  const [entryMaximumMarks, setEntryMaximumMarks] = useState('100');
  const [entryPassMarks, setEntryPassMarks] = useState('33');
  const [entries, setEntries] = useState<any[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedYearId = academicYearId || years.find((year: any) => year.isCurrent)?.id || years[0]?.id || '';
  const selectedClassId = classId || classes[0]?.id || '';
  const sectionItems = classes.find((schoolClass: any) => schoolClass.id === selectedClassId)?.sections || [];
  const selectedSectionId = sectionId && sectionItems.some((section: any) => section.id === sectionId) ? sectionId : sectionItems[0]?.id || '';

  const classSubjectsQuery = useQuery<any>({
    queryKey: ['class-subjects', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return null;
      return (await api.get(`/academics/classes/${selectedClassId}/subjects`)).data;
    },
    enabled: !!selectedClassId,
  });

  const subjectItems = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];

    const addSubject = (sub: any, streamName?: string) => {
      if (!sub || !sub.id || seen.has(sub.id)) return;
      seen.add(sub.id);
      result.push({
        ...sub,
        streamName: streamName || sub.streamName,
      });
    };

    // 1. From classSubjectsQuery (direct class endpoint)
    if (classSubjectsQuery.data) {
      if (classSubjectsQuery.data.isSeniorSecondary) {
        for (const stream of (classSubjectsQuery.data.streams || [])) {
          for (const item of (stream.subjects || [])) {
            if (item.isActive !== false && item.subject) {
              addSubject(item.subject, stream.parentSubject?.code || stream.parentSubject?.name);
            }
          }
        }
      } else {
        for (const item of (classSubjectsQuery.data.subjects || [])) {
          if (item.isActive !== false && item.subject) {
            addSubject(item.subject);
          }
        }
      }
    }

    // 2. From classSubjects prop (Academics cache)
    for (const cs of (classSubjects || [])) {
      if (cs.classId === selectedClassId && cs.isActive !== false) {
        const subId = cs.subjectId || cs.subject?.id;
        const subObj = cs.subject || (subjects || []).find((s: any) => s.id === subId);
        if (subObj) {
          addSubject(subObj, cs.parentSubject?.code || cs.parentSubject?.name);
        }
      }
    }

    // 3. From teacherAssignments
    for (const assignment of (teacherAssignments || [])) {
      if (assignment.academicYearId === selectedYearId && assignment.sectionId === selectedSectionId && assignment.subject) {
        addSubject(assignment.subject);
      }
    }

    return result;
  }, [classSubjectsQuery.data, classSubjects, selectedClassId, subjects, teacherAssignments, selectedYearId, selectedSectionId]);

  const timetableQuery = useQuery<any[]>({
    queryKey: ['exam-timetable-builder', selectedYearId, selectedClassId, selectedSectionId],
    queryFn: async () => (await api.get('/exam-timetables', { params: { academicYearId: selectedYearId, classId: selectedClassId, sectionId: selectedSectionId } })).data,
    enabled: !!selectedYearId && !!selectedClassId && !!selectedSectionId,
  });

  const resetEntries = () => {
    setEntries([]);
    setEntrySubjectId('');
    setFormError('');
  };

  const handleClassChange = (value: string) => {
    setClassId(value);
    setSectionId('');
    resetEntries();
  };

  const handleSectionChange = (value: string) => {
    setSectionId(value);
    resetEntries();
  };

  const addEntry = () => {
    setFormError('');
    const effectiveEndTime = normalizedEndTime(entryStartTime, entryEndTime);
    if (!entryDate || entryDate < startDate || entryDate > endDate) { setFormError('Paper date must be inside the selected timetable dates.'); return; }
    if (!entrySubjectId) { setFormError('Select a subject for this paper.'); return; }
    if (!entryStartTime || !entryEndTime || timeMinutes(effectiveEndTime) <= timeMinutes(entryStartTime)) { setFormError('End time must be after start time.'); return; }
    if (entries.some((entry) => entry.subjectId === entrySubjectId)) { setFormError('This subject is already added to the timetable.'); return; }
    if (entries.some((entry) => entry.date === entryDate && timeMinutes(entryStartTime) < timeMinutes(entry.endTime) && timeMinutes(effectiveEndTime) > timeMinutes(entry.startTime))) { setFormError('This paper overlaps another paper on the same date. Choose a different time.'); return; }
    setEntries((current) => [...current, { date: entryDate, subjectId: entrySubjectId, startTime: normalizedTime(entryStartTime), endTime: effectiveEndTime, maximumMarks: entryMaximumMarks ? Number(entryMaximumMarks) : undefined, passMarks: entryPassMarks ? Number(entryPassMarks) : undefined }]);
    setEntryEndTime(effectiveEndTime);
    setEntrySubjectId('');
  };

  const saveTimetable = async () => {
    setFormError('');
    if (!selectedYearId || !selectedClassId || !selectedSectionId) { setFormError('Select academic year, class and section first.'); return; }
    if (!title.trim()) { setFormError('Enter a timetable title.'); return; }
    if (!startDate || !endDate || startDate > endDate) { setFormError('Timetable end date must be on or after the start date.'); return; }
    const missing = subjectItems.filter((subject: any) => !entries.some((entry) => entry.subjectId === subject.id));
    if (!subjectItems.length) { setFormError('No subjects are assigned to this section for the selected academic year.'); return; }
    if (missing.length) { setFormError(`Add every subject before saving: ${missing.map((subject: any) => subject.name).join(', ')}`); return; }
    setSaving(true);
    try {
      await api.post('/exam-timetables', { academicYearId: selectedYearId, classId: selectedClassId, sectionId: selectedSectionId, type, title: title.trim(), startDate, endDate, entries });
      setEntries([]);
      setTitle('');
      await client.invalidateQueries({ queryKey: ['exam-timetable-builder', selectedYearId, selectedClassId, selectedSectionId] });
      await onSaved?.();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      setFormError(Array.isArray(message) ? message.join('\n') : message || 'The exam timetable could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteTimetable = (id: string, timetableTitle: string) => {
    const doDelete = async () => {
      setDeletingId(id);
      try {
        await api.delete(`/exam-timetables/${id}`);
        await timetableQuery.refetch();
        await client.invalidateQueries({ queryKey: ['admin-records'] });
        await client.invalidateQueries({ queryKey: ['marks-exam-timetables'] });
        await onSaved?.();
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Could not delete exam timetable.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to delete the exam timetable "${timetableTitle}"? This will remove all scheduled papers in this timetable.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete exam timetable',
        `Are you sure you want to delete "${timetableTitle}"? This will remove all scheduled papers in this timetable.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const selectedClass = classes.find((schoolClass: any) => schoolClass.id === selectedClassId);
  const selectedSection = sectionItems.find((section: any) => section.id === selectedSectionId);

  return <View style={s.wrapper}>
    <View style={s.scopePanel}>
      <Text style={s.eyebrow}>TIMETABLE SCOPE</Text>
      <Text style={s.panelTitle}>Choose one class and section</Text>
      <Text style={s.help}>All subjects assigned to this section will be scheduled inside one complete timetable.</Text>
      <ChoiceField label="Academic year" value={selectedYearId} items={years} onChange={(value: string) => { setAcademicYearId(value); resetEntries(); }} getLabel={(item: any) => item.name} />
      <ChoiceField label="Class" value={selectedClassId} items={classes} onChange={handleClassChange} getLabel={(item: any) => item.name} />
      {sectionItems.length ? <ChoiceField label="Section" value={selectedSectionId} items={sectionItems} onChange={handleSectionChange} getLabel={(item: any) => item.name} /> : <Text style={s.warning}>No sections are configured for this class yet.</Text>}
      {selectedClass && selectedSection ? <Text style={s.scopeText}>Current timetable: {selectedClass.name} · Section {selectedSection.name}</Text> : null}
    </View>

    <View style={s.panel}>
      <Text style={s.panelTitle}>Build complete exam timetable</Text>
      <Text style={s.help}>Add each subject once. Multiple papers on the same date are allowed when their times do not overlap.</Text>
      <View style={s.choices}>{['EXAM', 'TEST'].map((item) => <TouchableOpacity accessibilityRole="button" key={item} style={[s.choice, type === item && s.choiceOn]} onPress={() => setType(item)}><Text style={type === item ? s.choiceTextOn : s.choiceText}>{item}</Text></TouchableOpacity>)}</View>
      <InputField label="Timetable title" value={title} onChangeText={setTitle} placeholder="Class 1 A annual exam" />
      <View style={s.row}><View style={s.half}><InputField label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" /></View><View style={s.half}><InputField label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" /></View></View>
      <View style={s.subjectProgress}><Text style={s.progressTitle}>Subjects scheduled</Text><Text style={s.progressValue}>{entries.length} / {subjectItems.length}</Text></View>
      {subjectItems.length ? <Text style={s.subjectList}>{subjectItems.map((subject: any) => `${subject.code} · ${subject.name}`).join('  |  ')}</Text> : <Text style={s.warning}>No assigned subjects found for this section and academic year.</Text>}
      <View style={s.entryBox}>
        <Text style={s.entryTitle}>Add paper</Text>
        <ChoiceField label="Subject" value={entrySubjectId} items={subjectItems.filter((subject: any) => !entries.some((entry) => entry.subjectId === subject.id))} onChange={setEntrySubjectId} getLabel={(item: any) => `${item.code} · ${item.name}`} />
        <InputField label="Paper date" value={entryDate} onChangeText={setEntryDate} placeholder="YYYY-MM-DD" />
        <View style={s.row}><View style={s.half}><InputField label="Start time" value={entryStartTime} onChangeText={setEntryStartTime} placeholder="09:00" /></View><View style={s.half}><InputField label="End time" value={entryEndTime} onChangeText={setEntryEndTime} placeholder="12:00" /></View></View>
        <Text style={s.duration}>Duration: {entryStartTime && entryEndTime ? durationLabel(entryStartTime, entryEndTime) : '—'}</Text>
        <View style={s.row}><View style={s.half}><InputField label="Maximum marks" value={entryMaximumMarks} onChangeText={setEntryMaximumMarks} placeholder="100" /></View><View style={s.half}><InputField label="Pass marks" value={entryPassMarks} onChangeText={setEntryPassMarks} placeholder="33" /></View></View>
        <TouchableOpacity accessibilityRole="button" style={s.secondaryButton} onPress={addEntry}><Text style={s.secondaryText}>Add subject paper</Text></TouchableOpacity>
      </View>
      {entries.map((entry, index) => <View style={s.entryRow} key={`${entry.subjectId}-${entry.date}`}><View style={s.entryCopy}><Text style={s.entrySubject}>{subjectItems.find((subject: any) => subject.id === entry.subjectId)?.name || 'Subject'}</Text><Text style={s.entryMeta}>{entry.date} · {entry.startTime}–{entry.endTime} · {durationLabel(entry.startTime, entry.endTime)} · Max {entry.maximumMarks || '—'} · Pass {entry.passMarks || '—'}</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => setEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Text style={s.remove}>Remove</Text></TouchableOpacity></View>)}
      {formError ? <Text style={s.error}>{formError}</Text> : null}
      <TouchableOpacity accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]} onPress={saveTimetable}>{saving ? <ActivityIndicator color="#071D33" /> : <Text style={s.saveText}>Save complete timetable</Text>}</TouchableOpacity>
    </View>

    <View style={s.existingPanel}><View style={s.listHeader}><View><Text style={s.panelTitle}>Saved timetables</Text><Text style={s.help}>{selectedClass?.name || 'Class'} · Section {selectedSection?.name || '—'}</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => timetableQuery.refetch()}><Text style={s.refresh}>↻ Refresh</Text></TouchableOpacity></View>
      {timetableQuery.isLoading ? <ActivityIndicator color={colors.blue} /> : timetableQuery.isError ? <Text style={s.error}>Saved timetables could not be loaded.</Text> : timetableQuery.data?.length ? timetableQuery.data.map((timetable: any) => <View style={s.savedCard} key={timetable.id}><View style={s.savedHeader}><View style={{ flex: 1, minWidth: 180 }}><Text style={s.savedTitle}>{timetable.title}</Text><Text style={s.savedMeta}>{timetable.type} · {dateLabel(timetable.startDate)} to {dateLabel(timetable.endDate)} · {timetable.section?.name ? `Section ${timetable.section.name}` : 'Legacy class timetable'}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={s.badge}>SAVED</Text><TouchableOpacity accessibilityRole="button" style={s.deleteBtn} onPress={() => deleteTimetable(timetable.id, timetable.title)} disabled={deletingId === timetable.id}>{deletingId === timetable.id ? <ActivityIndicator size="small" color="#fca5a5" /> : <Text style={s.deleteBtnText}>Delete ✕</Text>}</TouchableOpacity></View></View>{(timetable.entries || []).map((entry: any) => <View style={s.savedEntry} key={entry.id}><Text style={s.savedSubject}>{entry.subject?.name || entry.holidayTitle || 'Holiday'}</Text><Text style={s.savedMeta}>{dateLabel(entry.date)} · {entry.isHoliday ? 'Holiday' : `${timeLabel(entry.startTime)}–${timeLabel(entry.endTime)} · ${durationLabel(timeLabel(entry.startTime), timeLabel(entry.endTime))}`}</Text></View>)}</View>) : <Text style={s.help}>No timetable has been saved for this class and section yet.</Text>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  wrapper: { gap: 18 },
  scopePanel: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    borderColor: 'rgba(99, 102, 241, 0.20)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    ...surfaces.card,
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 18,
    padding: 20,
    ...surfaces.card,
  },
  existingPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 18,
    padding: 20,
    ...surfaces.card,
  },
  eyebrow: { color: colors.blueLight, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  panelTitle: { color: '#f0f6ff', fontSize: 19, fontWeight: '800', marginTop: 5 },
  help: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, lineHeight: 20, marginTop: 6 },
  label: { color: 'rgba(255, 255, 255, 0.60)', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  field: { marginTop: 16 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: 'rgba(255, 255, 255, 0.50)', fontSize: 13, fontWeight: '600' },
  choiceTextOn: { color: '#fff', fontSize: 13, fontWeight: '800' },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: '#f0f6ff',
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, minWidth: 0 },
  scopeText: { color: colors.blueLight, fontWeight: '800', fontSize: 13, marginTop: 16 },
  warning: {
    color: colors.warning,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    lineHeight: 19,
  },
  subjectProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 13,
    marginTop: 18,
  },
  progressTitle: { color: '#f0f6ff', fontWeight: '800' },
  progressValue: { color: colors.blueLight, fontWeight: '800' },
  subjectList: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 12, lineHeight: 19, marginTop: 10 },
  entryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 15,
    marginTop: 16,
  },
  entryTitle: { color: '#f0f6ff', fontWeight: '800', fontSize: 15 },
  duration: { color: colors.blueLight, fontSize: 12, fontWeight: '700', marginTop: 10 },
  secondaryButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.30)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryText: { color: colors.blueLight, fontWeight: '800' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  entryCopy: { flex: 1, minWidth: 0 },
  entrySubject: { color: '#f0f6ff', fontWeight: '800', fontSize: 14 },
  entryMeta: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  remove: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  error: {
    color: colors.danger,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    lineHeight: 19,
  },
  save: {
    backgroundColor: colors.primary,
    borderRadius: 11,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  disabled: { opacity: 0.65 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  refresh: { color: colors.blueLight, fontWeight: '800' },
  savedCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 15,
    marginTop: 14,
  },
  savedHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  savedTitle: { color: '#f0f6ff', fontWeight: '800', fontSize: 15 },
  savedMeta: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  badge: {
    color: colors.success,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.30)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  savedEntry: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingTop: 10, marginTop: 10 },
  savedSubject: { color: '#f0f6ff', fontWeight: '700', fontSize: 13 },
  deleteBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#fca5a5',
    fontWeight: '800',
    fontSize: 11,
  },
});
