import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { colors } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';

type Props = {
  years: any[];
  classes: any[];
  employees: any[];
  onSaved?: () => Promise<void> | void;
};

type PeriodDraft = {
  id?: string;
  entryType: 'LECTURE' | 'BREAK';
  subjectId?: string;
  employeeId?: string;
  startTime: string;
  endTime: string;
  breakTitle?: string;
};

const DAYS = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 7, label: 'Sun', full: 'Sunday' },
];

function notify(title: string, message: string) {
  const browserAlert = (globalThis as any).alert;
  if (Platform.OS === 'web' && typeof browserAlert === 'function') {
    browserAlert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function errorText(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('\n') : message || 'Please verify the timetable details and try again.';
}

function timeLabel(val: any) {
  const text = String(val || '');
  return text.includes('T') ? text.slice(11, 16) : text.slice(0, 5);
}

function normalizeTime(val: any): string {
  const clean = String(val || '').trim();
  if (!clean) return '';
  const parts = clean.split(':');
  const h = Number(parts[0]);
  const m = parts[1] != null && parts[1] !== '' ? Number(parts[1]) : 0;
  if (!Number.isFinite(h) || !Number.isFinite(m)) return clean;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeMinutes(val: any): number {
  const norm = normalizeTime(val);
  const [h, m] = norm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

export function DailyTimetableBuilder({ years, classes, employees, onSaved }: Props) {
  const { isDark } = useTheme();
  const s = getThemedStyles(isDark);
  const client = useQueryClient();

  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // Target apply mode: 'ALL' (Mon-Sat standard) or specific day number (1-7)
  const [targetDay, setTargetDay] = useState<number | 'ALL'>('ALL');

  // Filter for viewing saved timetable in database: defaults to Today (e.g. Thursday)
  const [savedViewDay, setSavedViewDay] = useState<number | 'ALL'>(() => {
    const d = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    return d === 0 ? 7 : d;
  });

  const todayId = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  // Period Form Draft inputs
  const [entryType, setEntryType] = useState<'LECTURE' | 'BREAK'>('LECTURE');
  const [entrySubjectId, setEntrySubjectId] = useState('');
  const [entryEmployeeId, setEntryEmployeeId] = useState('');
  const [entryStartTime, setEntryStartTime] = useState('08:00');
  const [entryEndTime, setEntryEndTime] = useState('08:45');
  const [entryBreakTitle, setEntryBreakTitle] = useState('Recess / Lunch Break');

  const [periods, setPeriods] = useState<PeriodDraft[]>([]);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedYearId = academicYearId || years.find((y: any) => y.isCurrent)?.id || years[0]?.id || '';
  const selectedClassId = classId || classes[0]?.id || '';
  const currentClass = classes.find((c: any) => c.id === selectedClassId);
  const sectionItems = currentClass?.sections || [];
  const selectedSectionId = sectionId && sectionItems.some((s: any) => s.id === sectionId)
    ? sectionId
    : sectionItems[0]?.id || '';

  // Teachers (Filter employees with subRole TEACHER or all employees)
  const teacherList = useMemo(() => {
    const teachers = employees.filter((e: any) => e.subRole === 'TEACHER' || !e.subRole);
    return teachers.length ? teachers : employees;
  }, [employees]);

  // Fetch subjects for selected class
  const classSubjectsQuery = useQuery<any>({
    queryKey: ['class-subjects-for-timetable', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return null;
      return (await api.get(`/academics/classes/${selectedClassId}/subjects`)).data;
    },
    enabled: !!selectedClassId,
  });

  const availableClassSubjects = useMemo(() => {
    if (!classSubjectsQuery.data) return [];
    if (classSubjectsQuery.data.isSeniorSecondary) {
      const all: any[] = [];
      for (const st of (classSubjectsQuery.data.streams || [])) {
        for (const sub of (st.subjects || [])) {
          if (sub.isActive !== false) {
            all.push({
              ...sub.subject,
              id: sub.subjectId || sub.subject?.id,
              streamName: st.parentSubject?.code || st.parentSubject?.name,
            });
          }
        }
      }
      return all;
    }
    return (classSubjectsQuery.data.subjects || [])
      .filter((s: any) => s.isActive !== false)
      .map((s: any) => ({
        ...s.subject,
        id: s.subjectId || s.subject?.id,
      }));
  }, [classSubjectsQuery.data]);

  // Set default subject and teacher if not selected
  useEffect(() => {
    if (availableClassSubjects.length && (!entrySubjectId || !availableClassSubjects.some((s: any) => s.id === entrySubjectId))) {
      setEntrySubjectId(availableClassSubjects[0].id);
    }
  }, [availableClassSubjects, entrySubjectId]);

  useEffect(() => {
    if (teacherList.length && (!entryEmployeeId || !teacherList.some((t: any) => t.id === entryEmployeeId))) {
      setEntryEmployeeId(teacherList[0].id);
    }
  }, [teacherList, entryEmployeeId]);

  // Fetch existing timetable for this section
  const sectionTimetableQuery = useQuery<any[]>({
    queryKey: ['section-timetable-query', selectedYearId, selectedSectionId],
    queryFn: async () => {
      if (!selectedYearId || !selectedSectionId) return [];
      return (await api.get('/timetable', {
        params: {
          academicYearId: selectedYearId,
          sectionId: selectedSectionId,
        },
      })).data;
    },
    enabled: !!selectedYearId && !!selectedSectionId,
  });

  // When section changes, pre-populate draft periods from existing Monday (day 1) or targetDay
  useEffect(() => {
    if (sectionTimetableQuery.data && Array.isArray(sectionTimetableQuery.data)) {
      const dayToLoad = targetDay === 'ALL' ? 1 : targetDay;
      const dayEntries = sectionTimetableQuery.data.filter((e: any) => e.dayOfWeek === dayToLoad);
      if (dayEntries.length) {
        const loaded: PeriodDraft[] = dayEntries
          .sort((a: any, b: any) => timeLabel(a.startTime).localeCompare(timeLabel(b.startTime)))
          .map((e: any) => ({
            id: e.id,
            entryType: e.entryType,
            subjectId: e.subjectId,
            employeeId: e.employeeId,
            startTime: timeLabel(e.startTime),
            endTime: timeLabel(e.endTime),
            breakTitle: e.entryType === 'BREAK' ? 'Recess / Break' : undefined,
          }));
        setPeriods(loaded);
      } else {
        setPeriods([]);
      }
    }
  }, [sectionTimetableQuery.data, selectedSectionId, targetDay]);

  // Auto-sort periods by start time whenever periods change
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime));
  }, [periods]);

  // Add a new period or break to the draft
  const handleAddPeriod = () => {
    setFormError('');
    setSuccessMsg('');

    const normStart = normalizeTime(entryStartTime);
    const normEnd = normalizeTime(entryEndTime);
    const startMin = timeMinutes(normStart);
    const endMin = timeMinutes(normEnd);

    if (!normStart || !normEnd || isNaN(startMin) || isNaN(endMin)) {
      setFormError('Please enter valid start and end times (e.g. 08:45, 09:00).');
      return;
    }
    if (endMin <= startMin) {
      setFormError(`End time (${normEnd}) must be after start time (${normStart}).`);
      return;
    }

    if (entryType === 'LECTURE' && !entrySubjectId) {
      setFormError('Please select a subject for the lecture.');
      return;
    }

    // Check overlap with existing periods in the draft using minute-based calculations
    const hasOverlap = sortedPeriods.some((p) => {
      const pStartMin = timeMinutes(p.startTime);
      const pEndMin = timeMinutes(p.endTime);
      return startMin < pEndMin && endMin > pStartMin;
    });

    if (hasOverlap) {
      setFormError(`This time slot (${normStart}–${normEnd}) overlaps with another period in your draft.`);
      return;
    }

    const newPeriod: PeriodDraft = {
      entryType,
      subjectId: entryType === 'LECTURE' ? entrySubjectId : undefined,
      employeeId: entryType === 'LECTURE' ? entryEmployeeId || undefined : undefined,
      startTime: normStart,
      endTime: normEnd,
      breakTitle: entryType === 'BREAK' ? (entryBreakTitle || 'Break') : undefined,
    };

    const next = [...periods, newPeriod].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime));
    setPeriods(next);

    // Auto-advance next start time to this end time for user convenience!
    setEntryStartTime(normEnd);
    const nextMin = endMin + 45;
    const nextH = Math.floor(nextMin / 60) % 24;
    const nextM = nextMin % 60;
    setEntryEndTime(`${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
  };

  const handleRemovePeriod = (index: number) => {
    setPeriods((old) => old.filter((_, i) => i !== index));
    setFormError('');
  };

  // Save the entire schedule
  const handleSaveSchedule = async () => {
    setFormError('');
    setSuccessMsg('');

    if (!selectedYearId || !selectedSectionId) {
      setFormError('Please select an academic year, class, and section.');
      return;
    }
    if (!periods.length) {
      setFormError('Please add at least one lecture or break before saving.');
      return;
    }

    const applyDays = targetDay === 'ALL' ? [1, 2, 3, 4, 5, 6] : [Number(targetDay)];

    setSaving(true);
    try {
      await api.post('/timetable/section-schedule', {
        academicYearId: selectedYearId,
        sectionId: selectedSectionId,
        applyDays,
        periods: sortedPeriods.map((p) => ({
          entryType: p.entryType,
          subjectId: p.entryType === 'LECTURE' ? p.subjectId : undefined,
          employeeId: p.entryType === 'LECTURE' ? p.employeeId || undefined : undefined,
          startTime: p.startTime,
          endTime: p.endTime,
        })),
      });

      const daySummary = targetDay === 'ALL' ? 'Monday–Saturday (All working days)' : DAYS.find((d) => d.id === targetDay)?.full;
      setSuccessMsg(`Daily timetable for ${currentClass?.name || 'Class'} - ${sectionItems.find((s: any) => s.id === selectedSectionId)?.name || 'Section'} saved successfully for ${daySummary}!`);
      notify('Timetable Saved', `Daily timetable saved successfully for ${daySummary}!`);

      await client.invalidateQueries({ queryKey: ['section-timetable-query'] });
      await client.invalidateQueries({ queryKey: ['admin-records', 'timetable'] });
      await client.invalidateQueries({ queryKey: ['employee-teaching-timetable'] });
      await client.invalidateQueries({ queryKey: ['student-timetable'] });
      await client.invalidateQueries({ queryKey: ['student-auto-timetable-dashboard'] });
      if (onSaved) await onSaved();
    } catch (err: any) {
      setFormError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  // Quick delete single saved period from DB
  const handleDeleteSavedEntry = async (id: string) => {
    try {
      await api.delete(`/timetable/${id}`);
      notify('Deleted', 'Period deleted from timetable.');
      await client.invalidateQueries({ queryKey: ['section-timetable-query'] });
      await client.invalidateQueries({ queryKey: ['admin-records', 'timetable'] });
      await client.invalidateQueries({ queryKey: ['employee-teaching-timetable'] });
      if (onSaved) await onSaved();
    } catch (err: any) {
      notify('Could not delete', errorText(err));
    }
  };

  let lectureCount = 0;

  return (
    <View style={s.shell}>
      {/* ── 1. Selectors: Year, Class, Section ── */}
      <View style={s.box}>
        <Text style={s.boxTitle}>1. Select Class & Section</Text>
        <Text style={s.subText}>Configure the master daily schedule for each section independently.</Text>

        {/* Academic Year */}
        <Text style={s.label}>Academic Year</Text>
        <View style={s.chipsWrap}>
          {years.map((y: any) => (
            <TouchableOpacity
              key={y.id}
              style={[s.chip, selectedYearId === y.id && s.chipActive]}
              onPress={() => { setAcademicYearId(y.id); setFormError(''); setSuccessMsg(''); }}
            >
              <Text style={selectedYearId === y.id ? s.chipTextActive : s.chipText}>{y.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Class Selector */}
        <Text style={[s.label, { marginTop: 12 }]}>Class</Text>
        <View style={s.chipsWrap}>
          {classes.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={[s.chip, selectedClassId === c.id && s.chipActive]}
              onPress={() => {
                setClassId(c.id);
                setSectionId('');
                setFormError('');
                setSuccessMsg('');
              }}
            >
              <Text style={selectedClassId === c.id ? s.chipTextActive : s.chipText}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section Selector */}
        <Text style={[s.label, { marginTop: 12 }]}>Section for {currentClass?.name || 'Class'}</Text>
        {sectionItems.length === 0 ? (
          <Text style={s.emptyHint}>No sections created for this class yet. Please add a section in Academics first.</Text>
        ) : (
          <View style={s.chipsWrap}>
            {sectionItems.map((sec: any) => (
              <TouchableOpacity
                key={sec.id}
                style={[s.chip, selectedSectionId === sec.id && s.chipActive]}
                onPress={() => { setSectionId(sec.id); setFormError(''); setSuccessMsg(''); }}
              >
                <Text style={selectedSectionId === sec.id ? s.chipTextActive : s.chipText}>Section {sec.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Available Class Subjects Badges */}
        <View style={s.subjectOverview}>
          <Text style={s.subjectOverviewTitle}>
            Class Subjects in {currentClass?.name || 'this Class'} ({availableClassSubjects.length}):
          </Text>
          {classSubjectsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : availableClassSubjects.length === 0 ? (
            <Text style={s.emptyHint}>No subjects assigned to {currentClass?.name} yet. Assign subjects in Academics &gt; Class Subjects.</Text>
          ) : (
            <View style={s.subjectBadges}>
              {availableClassSubjects.map((sub: any) => (
                <View key={sub.id} style={s.subjectBadge}>
                  <Text style={s.subjectBadgeCode}>{sub.code || 'SUB'}</Text>
                  <Text style={s.subjectBadgeName}>{sub.name}</Text>
                  {sub.streamName ? <Text style={s.subjectBadgeStream}>[{sub.streamName}]</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── 2. Apply Target Days (Daily Routine vs Single Day) ── */}
      <View style={s.box}>
        <Text style={s.boxTitle}>2. Schedule Target Days</Text>
        <Text style={s.subText}>Apply as standard daily routine for the entire week (Mon–Sat) or customize a specific day.</Text>

        <View style={s.chipsWrap}>
          <TouchableOpacity
            style={[s.chip, targetDay === 'ALL' && s.chipGold]}
            onPress={() => { setTargetDay('ALL'); setFormError(''); setSuccessMsg(''); }}
          >
            <Text style={targetDay === 'ALL' ? s.chipGoldTextActive : s.chipText}>⚡ Monday–Saturday (Daily Routine)</Text>
          </TouchableOpacity>

          {DAYS.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[s.chip, targetDay === d.id && s.chipActive]}
              onPress={() => { setTargetDay(d.id); setFormError(''); setSuccessMsg(''); }}
            >
              <Text style={targetDay === d.id ? s.chipTextActive : s.chipText}>{d.label} ({d.full})</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── 3. Add Period Form ── */}
      <View style={s.box}>
        <Text style={s.boxTitle}>3. Add Period / Break to Schedule</Text>
        <Text style={s.subText}>Assign teacher, subject, and timings. Periods automatically sort by start time.</Text>

        {/* Period Type: LECTURE or BREAK */}
        <View style={s.typeToggle}>
          <TouchableOpacity
            style={[s.toggleBtn, entryType === 'LECTURE' && s.toggleBtnActive]}
            onPress={() => setEntryType('LECTURE')}
          >
            <Text style={entryType === 'LECTURE' ? s.toggleTextActive : s.toggleText}>📚 Subject Lecture</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, entryType === 'BREAK' && s.toggleBtnActive]}
            onPress={() => setEntryType('BREAK')}
          >
            <Text style={entryType === 'BREAK' ? s.toggleTextActive : s.toggleText}>☕ Recess / Break</Text>
          </TouchableOpacity>
        </View>

        {entryType === 'LECTURE' ? (
          <>
            {/* Subject Selector */}
            <Text style={s.label}>Subject</Text>
            {availableClassSubjects.length === 0 ? (
              <Text style={s.emptyHint}>No subjects available for this class.</Text>
            ) : (
              <View style={s.chipsWrap}>
                {availableClassSubjects.map((sub: any) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[s.chip, entrySubjectId === sub.id && s.chipActive]}
                    onPress={() => setEntrySubjectId(sub.id)}
                  >
                    <Text style={entrySubjectId === sub.id ? s.chipTextActive : s.chipText}>
                      {sub.code ? `${sub.code} · ` : ''}{sub.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Teacher Selector (Flexible - any active teacher!) */}
            <Text style={[s.label, { marginTop: 12 }]}>Assigned Teacher (Flexible)</Text>
            <View style={s.chipsWrap}>
              {teacherList.map((t: any) => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.chip, entryEmployeeId === t.id && s.chipActive]}
                  onPress={() => setEntryEmployeeId(t.id)}
                >
                  <Text style={entryEmployeeId === t.id ? s.chipTextActive : s.chipText}>
                    {t.name} {t.employeeId ? `(${t.employeeId})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={{ marginTop: 8 }}>
            <Text style={s.label}>Break Title</Text>
            <TextInput
              style={s.input}
              value={entryBreakTitle}
              onChangeText={setEntryBreakTitle}
              placeholder="e.g. Lunch Break, Morning Recess"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(17,25,54,0.35)"}
            />
          </View>
        )}

        {/* Timings */}
        <View style={s.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Start Time (HH:MM)</Text>
            <TextInput
              style={s.input}
              value={entryStartTime}
              onChangeText={setEntryStartTime}
              placeholder="08:00"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(17,25,54,0.35)"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>End Time (HH:MM)</Text>
            <TextInput
              style={s.input}
              value={entryEndTime}
              onChangeText={setEntryEndTime}
              placeholder="08:45"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(17,25,54,0.35)"}
            />
          </View>
        </View>

        <TouchableOpacity style={s.addBtn} onPress={handleAddPeriod}>
          <Text style={s.addBtnText}>+ Add {entryType === 'LECTURE' ? 'Period' : 'Break'} to Draft Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. Draft Timeline / Period Sequence ── */}
      <View style={s.box}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.boxTitle}>
              4. Daily Schedule Sequence ({sortedPeriods.length} items)
            </Text>
            <Text style={s.subText}>
              Class {currentClass?.name || ''} - Section {sectionItems.find((s: any) => s.id === selectedSectionId)?.name || ''}
            </Text>
          </View>
          {sortedPeriods.length > 0 ? (
            <TouchableOpacity onPress={() => setPeriods([])} style={s.clearBtn}>
              <Text style={s.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {sortedPeriods.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyStateTitle}>No periods added yet</Text>
            <Text style={s.emptyStateText}>
              Use the form above to add lectures and breaks. They will appear here in chronological order.
            </Text>
          </View>
        ) : (
          <View style={s.timeline}>
            {sortedPeriods.map((p, idx) => {
              const isBreak = p.entryType === 'BREAK';
              const pNo = isBreak ? 'Break' : `Period ${++lectureCount}`;
              const subObj = availableClassSubjects.find((s: any) => s.id === p.subjectId);
              const teacherObj = teacherList.find((t: any) => t.id === p.employeeId);

              return (
                <View key={`${p.startTime}-${idx}`} style={[s.periodCard, isBreak && s.breakCard]}>
                  <View style={s.periodCardLeft}>
                    <View style={[s.badgeNumber, isBreak && s.badgeBreak]}>
                      <Text style={[s.badgeNumberText, isBreak && s.badgeBreakText]}>{pNo}</Text>
                    </View>
                    <View>
                      <Text style={s.periodTime}>{p.startTime} – {p.endTime}</Text>
                      <Text style={s.periodTitle}>
                        {isBreak ? (p.breakTitle || 'Recess / Break') : (subObj?.name || 'Subject')}
                      </Text>
                      {!isBreak ? (
                        <Text style={s.periodTeacher}>
                          Teacher: {teacherObj?.name || 'Unassigned'}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.removeBtn}
                    onPress={() => handleRemovePeriod(idx)}
                  >
                    <Text style={s.removeBtnText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Error / Success messages */}
        {formError ? <Text style={s.error}>{formError}</Text> : null}
        {successMsg ? <Text style={s.success}>{successMsg}</Text> : null}

        {/* Final Save Action Button */}
        <TouchableOpacity
          disabled={saving || sortedPeriods.length === 0}
          style={[s.saveBtn, (saving || sortedPeriods.length === 0) && s.btnDisabled]}
          onPress={handleSaveSchedule}
        >
          {saving ? (
            <ActivityIndicator color="#071d33" />
          ) : (
            <Text style={s.saveBtnText}>
              💾 Save Schedule for {currentClass?.name || 'Class'} ({targetDay === 'ALL' ? 'Mon–Sat Daily Routine' : DAYS.find((d) => d.id === targetDay)?.full})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── 5. Saved Timetable in Database ── */}
      <View style={s.box}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.boxTitle}>Currently Saved Timetable in Database</Text>
            <Text style={s.subText}>Filter by day to view Sunday, Monday, or any specific day's routine.</Text>
          </View>
          <TouchableOpacity onPress={() => void sectionTimetableQuery.refetch()}>
            <Text style={s.refreshText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Day-wise Filter Tabs */}
        <View style={s.savedFilterRow}>
          <TouchableOpacity
            style={[s.savedFilterBtn, savedViewDay === 'ALL' && s.savedFilterBtnActive]}
            onPress={() => setSavedViewDay('ALL')}
          >
            <Text style={savedViewDay === 'ALL' ? s.savedFilterTextActive : s.savedFilterText}>All Days</Text>
          </TouchableOpacity>
          {DAYS.map((d) => {
            const isSun = d.id === 7;
            const isAct = savedViewDay === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                style={[
                  s.savedFilterBtn,
                  isAct && s.savedFilterBtnActive,
                  isSun && !isAct && s.savedFilterBtnSunday,
                  isSun && isAct && s.savedFilterBtnSundayActive,
                ]}
                onPress={() => setSavedViewDay(d.id)}
              >
                <Text
                  style={[
                    isAct ? s.savedFilterTextActive : s.savedFilterText,
                    isSun && !isAct && { color: '#f87171' },
                    isSun && isAct && { color: '#ffffff' },
                  ]}
                >
                  {d.label} ({d.full}){d.id === todayId ? ' • Today' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {sectionTimetableQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : !sectionTimetableQuery.data || sectionTimetableQuery.data.length === 0 ? (
          <Text style={s.emptyHint}>No saved timetable entries in database for this section yet.</Text>
        ) : (
          (() => {
            const allEntries = sectionTimetableQuery.data || [];
            const daysToDisplay = DAYS.filter((d) => savedViewDay === 'ALL' || d.id === savedViewDay);
            const matchingEntries = allEntries.filter((e: any) => savedViewDay === 'ALL' || e.dayOfWeek === savedViewDay);

            if (matchingEntries.length === 0) {
              const selectedDayObj = DAYS.find((d) => d.id === savedViewDay);
              return (
                <View style={s.emptyState}>
                  <Text style={s.emptyStateTitle}>
                    No periods scheduled for {selectedDayObj ? selectedDayObj.full : 'this day'}.
                  </Text>
                  <Text style={s.emptyStateText}>
                    {selectedDayObj ? `You can select "${selectedDayObj.label}" in Section 2 above to add and save a schedule for ${selectedDayObj.full}.` : 'Add periods above and click save.'}
                  </Text>
                </View>
              );
            }

            return (
              <View style={{ gap: 12, marginTop: 10 }}>
                {daysToDisplay.map((day) => {
                  const dayEntries = allEntries.filter((e: any) => e.dayOfWeek === day.id);
                  if (!dayEntries.length) return null;

                  return (
                    <View key={day.id} style={s.savedDayGroup}>
                      <View style={s.savedDayHeaderRow}>
                        <Text style={s.savedDayHeading}>{day.full} ({dayEntries.length} periods)</Text>
                        {day.id === 7 ? <Text style={s.sundayBadge}>Sunday Schedule</Text> : null}
                      </View>
                      <View style={{ gap: 8 }}>
                        {dayEntries.map((e: any) => (
                          <View key={e.id} style={s.savedRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.savedRowTime}>
                                {timeLabel(e.startTime)}–{timeLabel(e.endTime)} · P{e.periodNumber}
                              </Text>
                              <Text style={s.savedRowTitle}>
                                {e.entryType === 'BREAK' ? 'Break / Recess' : (e.subject?.name || 'Subject')}
                              </Text>
                              {e.entryType === 'LECTURE' ? (
                                <Text style={s.savedRowTeacher}>{e.employee?.name || 'Teacher not assigned'}</Text>
                              ) : null}
                            </View>
                            <TouchableOpacity
                              style={s.deleteSavedBtn}
                              onPress={() => handleDeleteSavedEntry(e.id)}
                            >
                              <Text style={s.deleteSavedBtnText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()
        )}
      </View>
    </View>
  );
}

let stylesDark: any = null;
let stylesLight: any = null;

function getThemedStyles(isDark: boolean) {
  if (isDark) {
    if (!stylesDark) stylesDark = StyleSheet.create(createStyles(THEME_PALETTES.dark, true));
    return stylesDark;
  } else {
    if (!stylesLight) stylesLight = StyleSheet.create(createStyles(THEME_PALETTES.light, false));
    return stylesLight;
  }
}

const createStyles = (tc: ThemeColors, isDark: boolean) => ({
  shell: { gap: 16 },
  box: {
    backgroundColor: tc.panel,
    borderColor: tc.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  boxTitle: { color: tc.text, fontSize: 17, fontWeight: '800' as const },
  subText: { color: tc.muted, fontSize: 13, marginBottom: 4 },
  label: { color: tc.muted, fontSize: 12, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  chipsWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F7FF',
    borderColor: tc.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipGold: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  chipGoldTextActive: { color: '#071d33', fontWeight: '800' as const, fontSize: 13 },
  chipText: { color: isDark ? 'rgba(255, 255, 255, 0.75)' : tc.text, fontSize: 13, fontWeight: '600' as const },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '800' as const },
  emptyHint: { color: tc.muted, fontSize: 12, fontStyle: 'italic' as const, marginVertical: 4 },
  subjectOverview: {
    marginTop: 10,
    padding: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line,
    gap: 6,
  },
  subjectOverviewTitle: { color: tc.text, fontSize: 12, fontWeight: '700' as const },
  subjectBadges: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  subjectBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.10)',
    borderColor: isDark ? 'rgba(56, 189, 248, 0.30)' : 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subjectBadgeCode: { color: isDark ? '#38bdf8' : '#0284c7', fontWeight: '800' as const, fontSize: 11 },
  subjectBadgeName: { color: tc.text, fontWeight: '600' as const, fontSize: 12 },
  subjectBadgeStream: { color: isDark ? '#a78bfa' : '#7c3aed', fontSize: 10, fontWeight: '700' as const },
  typeToggle: { flexDirection: 'row' as const, gap: 10, marginVertical: 6 },
  toggleBtn: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F5F7FF',
    borderColor: tc.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center' as const,
  },
  toggleBtnActive: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.20)' : 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
  },
  toggleText: { color: tc.muted, fontSize: 13, fontWeight: '700' as const },
  toggleTextActive: { color: isDark ? '#fff' : colors.primary, fontSize: 13, fontWeight: '800' as const },
  timeRow: { flexDirection: 'row' as const, gap: 12, marginTop: 10 },
  input: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F8FAFC',
    borderColor: tc.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: tc.text,
    fontSize: 14,
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.18)' : 'rgba(99, 102, 241, 0.12)',
    borderColor: isDark ? 'rgba(147, 155, 255, 0.35)' : 'rgba(99, 102, 241, 0.30)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center' as const,
    marginTop: 10,
  },
  addBtnText: { color: isDark ? colors.blueLight : colors.primary, fontWeight: '800' as const, fontSize: 13 },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  clearBtnText: { color: colors.danger, fontSize: 12, fontWeight: '700' as const },
  timeline: { gap: 10, marginTop: 10 },
  periodCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    borderColor: tc.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  breakCard: {
    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(251, 191, 36, 0.12)',
    borderColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(251, 191, 36, 0.35)',
  },
  periodCardLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, flex: 1 },
  badgeNumber: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.20)' : 'rgba(99, 102, 241, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeBreak: { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.20)' : 'rgba(251, 191, 36, 0.25)' },
  badgeNumberText: { color: isDark ? colors.blueLight : colors.primary, fontWeight: '800' as const, fontSize: 12 },
  badgeBreakText: { color: isDark ? '#fbbf24' : '#b45309', fontWeight: '800' as const, fontSize: 12 },
  periodTime: { color: tc.muted, fontSize: 11, fontWeight: '700' as const },
  periodTitle: { color: tc.text, fontSize: 15, fontWeight: '800' as const, marginTop: 2 },
  periodTeacher: { color: tc.muted, fontSize: 12, marginTop: 2 },
  removeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  removeBtnText: { color: colors.danger, fontSize: 12, fontWeight: '700' as const },
  emptyState: { padding: 24, alignItems: 'center' as const, gap: 6 },
  emptyStateTitle: { color: tc.muted, fontWeight: '700' as const, fontSize: 14 },
  emptyStateText: { color: tc.muted, fontSize: 12, textAlign: 'center' as const },
  error: {
    color: colors.danger,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontWeight: '700' as const,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  success: {
    color: colors.success,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontWeight: '700' as const,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#071d33', fontWeight: '800' as const, fontSize: 14 },
  refreshText: { color: isDark ? colors.blueLight : colors.primary, fontWeight: '700' as const, fontSize: 13 },
  savedDayGroup: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: tc.line,
    gap: 8,
  },
  savedDayHeading: { color: tc.text, fontSize: 13, fontWeight: '800' as const, borderBottomWidth: 1, borderBottomColor: tc.line, paddingBottom: 6 },
  savedRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: tc.line,
  },
  savedRowTime: { color: tc.muted, fontSize: 11, fontWeight: '700' as const },
  savedRowTitle: { color: tc.text, fontSize: 13, fontWeight: '700' as const, marginTop: 2 },
  savedRowTeacher: { color: tc.muted, fontSize: 11, marginTop: 1 },
  deleteSavedBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  deleteSavedBtnText: { color: colors.danger, fontSize: 11, fontWeight: '700' as const },
  savedFilterRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 8, marginBottom: 8 },
  savedFilterBtn: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F5F7FF',
    borderColor: tc.line,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  savedFilterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  savedFilterBtnSunday: {
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  savedFilterBtnSundayActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  savedFilterText: { color: tc.muted, fontSize: 12, fontWeight: '700' as const },
  savedFilterTextActive: { color: '#071d33', fontSize: 12, fontWeight: '800' as const },
  savedDayHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderBottomWidth: 1,
    borderBottomColor: tc.line,
    paddingBottom: 6,
  },
  sundayBadge: {
    color: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '800' as const,
  },
});
