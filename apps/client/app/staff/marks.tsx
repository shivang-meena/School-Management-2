import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { api } from '../../src/services/api';
import { colors, radius, shadow, surfaces } from '../../src/theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../../src/context/ThemeContext';

function displayDate(value: any) {
  if (!value) return '';
  const str = typeof value === 'string' ? value : new Date(value).toISOString();
  return str.slice(0, 10);
}

function formatTime(val: any) {
  if (!val) return '';
  if (typeof val === 'string' && val.includes('T')) {
    const time = val.split('T')[1].slice(0, 5);
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }
  return String(val).slice(0, 5);
}

interface StudentRowState {
  marks: string;
  absent: boolean;
  remarks: string;
  dirty: boolean;
}

export default function StaffMarksScreen() {
  const { isDark, colors: tc } = useTheme();
  const s = getThemedStyles(isDark);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isTeacher = user?.subRole === 'TEACHER' || !user?.subRole;
  if (!isTeacher) {
    return (
      <View style={{ flex: 1, backgroundColor: tc.canvas, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: tc.muted, fontSize: 16, textAlign: 'center' }}>Marks entry is only available for teaching faculty.</Text>
      </View>
    );
  }

  // 1. Fetch Academics Overview to find Teacher Assignments
  const academicsQuery = useQuery<any>({
    queryKey: ['academics'],
    queryFn: async () => (await api.get('/academics')).data,
    enabled: !!user,
  });

  const classes = academicsQuery.data?.classes || [];
  const classTeacherAssignments = academicsQuery.data?.classTeacherAssignments || [];
  const teacherAssignments = academicsQuery.data?.teacherAssignments || [];

  // Identify sections where current logged-in employee is Class Teacher
  const myClassTeacherSections = useMemo(() => {
    if (!user) return [];
    return classTeacherAssignments.filter((cta: any) =>
      (user.employeeId && cta.employee?.employeeId === user.employeeId) ||
      cta.employeeId === (user as any).employeeDbId ||
      cta.employeeId === user.id
    );
  }, [classTeacherAssignments, user]);

  // Identify sections where employee is Subject Teacher
  const myTeachingAssignments = useMemo(() => {
    if (!user) return [];
    return teacherAssignments.filter((ta: any) =>
      (user.employeeId && ta.employee?.employeeId === user.employeeId) ||
      ta.employeeId === (user as any).employeeDbId ||
      ta.employeeId === user.id
    );
  }, [teacherAssignments, user]);

  // Combined list of eligible sections
  const assignedSections = useMemo(() => {
    const list: Array<{
      sectionId: string;
      sectionName: string;
      className: string;
      classId: string;
      isClassTeacher: boolean;
      taughtSubjectIds: string[];
    }> = [];

    const sectionMap = new Map<string, {
      sectionId: string;
      sectionName: string;
      className: string;
      classId: string;
      isClassTeacher: boolean;
      taughtSubjectIds: Set<string>;
    }>();

    // Add Class Teacher assignments
    myClassTeacherSections.forEach((cta: any) => {
      const sec = cta.section;
      if (!sec) return;
      sectionMap.set(sec.id, {
        sectionId: sec.id,
        sectionName: sec.name,
        className: sec.schoolClass?.name || 'Class',
        classId: sec.classId,
        isClassTeacher: true,
        taughtSubjectIds: new Set<string>(),
      });
    });

    // Add Subject Teacher assignments
    myTeachingAssignments.forEach((ta: any) => {
      const sec = ta.section;
      if (!sec) return;
      const existing = sectionMap.get(sec.id);
      if (existing) {
        if (ta.subjectId) existing.taughtSubjectIds.add(ta.subjectId);
      } else {
        const subs = new Set<string>();
        if (ta.subjectId) subs.add(ta.subjectId);
        sectionMap.set(sec.id, {
          sectionId: sec.id,
          sectionName: sec.name,
          className: sec.schoolClass?.name || 'Class',
          classId: sec.classId,
          isClassTeacher: false,
          taughtSubjectIds: subs,
        });
      }
    });

    sectionMap.forEach((val) => {
      list.push({
        ...val,
        taughtSubjectIds: Array.from(val.taughtSubjectIds),
      });
    });

    return list;
  }, [myClassTeacherSections, myTeachingAssignments]);

  // Selected state
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [studentRows, setStudentRows] = useState<Record<string, StudentRowState>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-select first section
  useEffect(() => {
    if (assignedSections.length && (!selectedSectionId || !assignedSections.some(s => s.sectionId === selectedSectionId))) {
      setSelectedSectionId(assignedSections[0].sectionId);
    }
  }, [assignedSections, selectedSectionId]);

  const currentSection = assignedSections.find((s) => s.sectionId === selectedSectionId);

  // 2. Fetch Exam Timetables for selected section
  const timetablesQuery = useQuery<any[]>({
    queryKey: ['staff-exam-timetables', selectedSectionId],
    queryFn: async () => {
      if (!selectedSectionId) return [];
      const res = await api.get('/exam-timetables', { params: { sectionId: selectedSectionId } });
      return res.data;
    },
    enabled: !!selectedSectionId,
  });

  const timetables = timetablesQuery.data || [];

  // Auto-select first exam timetable
  useEffect(() => {
    if (timetables.length && (!selectedTimetableId || !timetables.some(t => t.id === selectedTimetableId))) {
      setSelectedTimetableId(timetables[0].id);
    } else if (!timetables.length) {
      setSelectedTimetableId('');
      setSelectedEntryId('');
    }
  }, [timetables, selectedTimetableId]);

  const selectedTimetable = timetables.find((t) => t.id === selectedTimetableId);

  // Filter papers for this timetable based on whether user is Class Teacher or Subject Teacher
  const papers = useMemo(() => {
    if (!selectedTimetable?.entries) return [];
    const allValid = selectedTimetable.entries.filter((e: any) => !e.isHoliday && e.subjectId);
    if (!currentSection) return [];
    if (currentSection.isClassTeacher) {
      // Class Teacher can enter marks for ALL subjects in this section!
      return allValid;
    }
    // Subject teacher can only view/enter for their assigned subjects
    return allValid.filter((e: any) => currentSection.taughtSubjectIds.includes(e.subjectId));
  }, [selectedTimetable, currentSection]);

  // Auto-select first paper
  useEffect(() => {
    if (papers.length && (!selectedEntryId || !papers.some((p: any) => p.id === selectedEntryId))) {
      setSelectedEntryId(papers[0].id);
    } else if (!papers.length) {
      setSelectedEntryId('');
    }
  }, [papers, selectedEntryId]);

  const selectedPaper = papers.find((p: any) => p.id === selectedEntryId);

  // 3. Fetch Assessments for this section to link existing results
  const assessmentsQuery = useQuery<any[]>({
    queryKey: ['staff-assessments', selectedSectionId],
    queryFn: async () => {
      if (!selectedSectionId) return [];
      const res = await api.get('/assessments', { params: { sectionId: selectedSectionId } });
      return res.data;
    },
    enabled: !!selectedSectionId,
  });

  const assessments = assessmentsQuery.data || [];

  // Match the assessment for the selected paper
  const currentAssessment = useMemo(() => {
    if (!selectedPaper || !selectedTimetable) return null;
    return assessments.find(
      (a: any) =>
        a.subjectId === selectedPaper.subjectId &&
        displayDate(a.date) === displayDate(selectedPaper.date) &&
        a.type === selectedTimetable.type
    );
  }, [assessments, selectedPaper, selectedTimetable]);

  const isLocked = currentAssessment?.published === true;

  // 4. Fetch Students in the selected section
  const studentsQuery = useQuery<any[]>({
    queryKey: ['staff-section-students', selectedSectionId],
    queryFn: async () => {
      if (!selectedSectionId) return [];
      const res = await api.get('/students', { params: { sectionId: selectedSectionId, limit: 100 } });
      return res.data;
    },
    enabled: !!selectedSectionId,
  });

  const students = useMemo(() => {
    const list = studentsQuery.data || [];
    return [...list].sort((a: any, b: any) => {
      const rollA = a.enrollments?.[0]?.rollNumber || '';
      const rollB = b.enrollments?.[0]?.rollNumber || '';
      const numA = parseInt(rollA, 10);
      const numB = parseInt(rollB, 10);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [studentsQuery.data]);

  // Synchronize studentRows state when students or currentAssessment changes
  useEffect(() => {
    if (!students.length) return;
    const existingResults = currentAssessment?.results || [];
    const resultMap = new Map<string, any>();
    existingResults.forEach((r: any) => {
      resultMap.set(r.studentId, r);
    });

    const newRows: Record<string, StudentRowState> = {};
    students.forEach((s: any) => {
      const res = resultMap.get(s.id);
      newRows[s.id] = {
        marks: res?.entryStatus === 'MARKS_ENTERED' && res.marks != null ? String(res.marks) : '',
        absent: res?.entryStatus === 'ABSENT',
        remarks: res?.remarks || '',
        dirty: false,
      };
    });
    setStudentRows(newRows);
    setSaveSuccessMsg('');
    setErrorMessage('');
  }, [students, currentAssessment, selectedEntryId]);

  // Input handlers
  const handleMarksChange = (studentId: string, val: string) => {
    if (isLocked) return;
    const maxMarks = Number(selectedPaper?.maximumMarks ?? currentAssessment?.maximumMarks ?? 100);
    // Allow numbers and decimal points
    const cleaned = val.replace(/[^0-9.]/g, '');
    const num = Number(cleaned);
    if (cleaned !== '' && Number.isFinite(num) && num > maxMarks) {
      setErrorMessage(`Marks cannot exceed maximum of ${maxMarks}`);
    } else {
      setErrorMessage('');
    }
    setStudentRows((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { marks: '', absent: false, remarks: '', dirty: false }),
        marks: cleaned,
        absent: false,
        dirty: true,
      },
    }));
  };

  const handleToggleAbsent = (studentId: string) => {
    if (isLocked) return;
    setStudentRows((prev) => {
      const current = prev[studentId] || { marks: '', absent: false, remarks: '', dirty: false };
      const nextAbsent = !current.absent;
      return {
        ...prev,
        [studentId]: {
          ...current,
          absent: nextAbsent,
          marks: nextAbsent ? '' : current.marks,
          dirty: true,
        },
      };
    });
  };

  const handleRemarksChange = (studentId: string, text: string) => {
    if (isLocked) return;
    setStudentRows((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { marks: '', absent: false, remarks: '', dirty: false }),
        remarks: text,
        dirty: true,
      },
    }));
  };

  // Quick Action: Fill All remaining as Absent or Clear
  const handleMarkAllAbsent = () => {
    if (isLocked) return;
    const next: Record<string, StudentRowState> = {};
    students.forEach((s) => {
      const cur = studentRows[s.id] || { marks: '', absent: false, remarks: '', dirty: false };
      if (!cur.marks && !cur.absent) {
        next[s.id] = { ...cur, absent: true, marks: '', dirty: true };
      } else {
        next[s.id] = cur;
      }
    });
    setStudentRows(next);
  };

  // Save Marks to Backend
  const handleSaveMarks = async () => {
    if (isLocked) {
      Alert.alert('Assessment Locked', 'This assessment has already been published by Admin and cannot be edited.');
      return;
    }
    if (!selectedTimetable || !selectedPaper) {
      setErrorMessage('Please select an exam and subject first.');
      return;
    }

    const maxMarks = Number(selectedPaper.maximumMarks ?? currentAssessment?.maximumMarks ?? 100);
    const passMarks = Number(selectedPaper.passMarks ?? currentAssessment?.passMarks ?? 33);

    // Filter students who have either marks or are marked absent
    const resultsToSave: Array<{ studentId: string; absent: boolean; marks?: number; remarks?: string }> = [];

    for (const student of students) {
      const row = studentRows[student.id];
      if (!row) continue;
      if (row.absent) {
        resultsToSave.push({
          studentId: student.id,
          absent: true,
          remarks: row.remarks || undefined,
        });
      } else if (row.marks.trim() !== '') {
        const val = Number(row.marks.trim());
        if (!Number.isFinite(val) || val < 0) {
          setErrorMessage(`Invalid marks entered for ${student.name}`);
          return;
        }
        if (val > maxMarks) {
          setErrorMessage(`Marks for ${student.name} (${val}) exceed maximum allowed (${maxMarks}).`);
          return;
        }
        resultsToSave.push({
          studentId: student.id,
          absent: false,
          marks: val,
          remarks: row.remarks || undefined,
        });
      }
    }

    if (!resultsToSave.length) {
      setErrorMessage('Please enter marks or select Absent for at least one student.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSaveSuccessMsg('');

    try {
      let assessmentId = currentAssessment?.id;

      // Create assessment record if it doesn't exist yet
      if (!assessmentId) {
        const createRes = await api.post('/assessments', {
          academicYearId: selectedTimetable.academicYearId,
          sectionId: selectedTimetable.sectionId || selectedSectionId,
          subjectId: selectedPaper.subjectId,
          type: selectedTimetable.type,
          title: `${selectedTimetable.title} · ${selectedPaper.subject?.name || 'Subject'}`,
          date: displayDate(selectedPaper.date),
          startTime: selectedPaper.startTime ? formatTime(selectedPaper.startTime) : undefined,
          durationMinutes: 180,
          maximumMarks: maxMarks,
          passMarks: passMarks,
        });
        assessmentId = createRes.data?.id;
      }

      if (!assessmentId) {
        throw new Error('Could not create or locate the assessment record.');
      }

      // Enter marks
      await api.post(`/assessments/${assessmentId}/results`, {
        results: resultsToSave,
      });

      setSaveSuccessMsg(`Successfully saved marks for ${resultsToSave.length} student(s)!`);
      if (Platform.OS !== 'web') {
        Alert.alert('Saved', `Marks saved successfully for ${resultsToSave.length} students.`);
      }

      // Refresh assessments
      await queryClient.invalidateQueries({ queryKey: ['staff-assessments', selectedSectionId] });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save marks.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  // Calculation of summary numbers
  const summary = useMemo(() => {
    let entered = 0;
    let absentCount = 0;
    students.forEach((s) => {
      const r = studentRows[s.id];
      if (r?.absent) absentCount++;
      else if (r?.marks && r.marks.trim() !== '') entered++;
    });
    return {
      total: students.length,
      entered,
      absent: absentCount,
      pending: Math.max(0, students.length - (entered + absentCount)),
    };
  }, [students, studentRows]);

  // Loading view
  if (academicsQuery.isLoading) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading assigned classes and permissions...</Text>
      </View>
    );
  }

  // Empty view if teacher is not assigned to any section
  if (!assignedSections.length) {
    return (
      <View style={s.page}>
        <View style={s.emptyCard}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="school-outline" size={48} color="#f59e0b" />
          </View>
          <Text style={s.emptyTitle}>No Class Assigned</Text>
          <Text style={s.emptyDesc}>
            You are not currently assigned as a Class Teacher or Subject Teacher for any active section.
          </Text>
          <Text style={s.emptyNote}>
            Class Teachers have authorization to enter exam marks for all subjects of their class. Please contact the School Administrator to assign your class.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Page Header ── */}
        <View style={s.headerBox}>
          <View style={s.badgePill}>
            <Ionicons name="ribbon-outline" size={13} color="#f59e0b" />
            <Text style={s.badgeText}>FACULTY MARKS PORTAL</Text>
          </View>
          <Text style={s.title}>Class Marks Entry</Text>
          <Text style={s.subtitle}>
            Enter, review and update student exam scores. As a Class Teacher, you can enter marks for all subjects of your assigned class.
          </Text>
        </View>

        {/* ── 1. Section Selector ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>1. SELECT YOUR CLASS & SECTION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow}>
            {assignedSections.map((sec) => {
              const active = sec.sectionId === selectedSectionId;
              return (
                <TouchableOpacity
                  key={sec.sectionId}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setSelectedSectionId(sec.sectionId)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipTitle, active && s.chipTitleActive]}>
                    {sec.className} - {sec.sectionName}
                  </Text>
                  <View style={[s.roleTag, sec.isClassTeacher ? s.roleTagGold : s.roleTagBlue]}>
                    <Ionicons
                      name={sec.isClassTeacher ? 'star' : 'book-outline'}
                      size={10}
                      color={sec.isClassTeacher ? '#fbbf24' : '#38bdf8'}
                    />
                    <Text style={[s.roleTagText, sec.isClassTeacher ? s.roleTagTextGold : s.roleTagTextBlue]}>
                      {sec.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {currentSection ? (
            <View style={s.roleInfoBox}>
              <Ionicons
                name={currentSection.isClassTeacher ? 'shield-checkmark-outline' : 'information-circle-outline'}
                size={16}
                color={currentSection.isClassTeacher ? '#fbbf24' : '#38bdf8'}
              />
              <Text style={s.roleInfoText}>
                {currentSection.isClassTeacher
                  ? `You are the Class Teacher for ${currentSection.className} - ${currentSection.sectionName}. You can enter marks for ALL exam subjects of this class.`
                  : `You teach specific subjects in ${currentSection.className} - ${currentSection.sectionName}. You can enter marks for your assigned subjects.`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── 2. Exam Timetable Selector ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>2. SELECT EXAM SCHEDULE</Text>
          {timetablesQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
          ) : !timetables.length ? (
            <View style={s.emptyNotice}>
              <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.4)" />
              <Text style={s.emptyNoticeText}>
                No exam schedules found for {currentSection?.className} - {currentSection?.sectionName} yet. Contact Admin to create the exam timetable.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow}>
              {timetables.map((tt: any) => {
                const active = tt.id === selectedTimetableId;
                return (
                  <TouchableOpacity
                    key={tt.id}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => setSelectedTimetableId(tt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={s.chipRowTop}>
                      <Text style={[s.chipTitle, active && s.chipTitleActive]}>{tt.title}</Text>
                      <Text style={s.examTypeBadge}>{tt.type}</Text>
                    </View>
                    <Text style={s.chipSub}>
                      {displayDate(tt.startDate)} to {displayDate(tt.endDate)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── 3. Subject / Paper Selector ── */}
        {selectedTimetable ? (
          <View style={s.card}>
            <Text style={s.cardLabel}>3. SELECT EXAM SUBJECT PAPER</Text>
            {!papers.length ? (
              <View style={s.emptyNotice}>
                <Ionicons name="document-text-outline" size={20} color="rgba(255,255,255,0.4)" />
                <Text style={s.emptyNoticeText}>
                  No papers available for your permissions in this exam.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow}>
                {papers.map((paper: any) => {
                  const active = paper.id === selectedEntryId;
                  const matchingAss = assessments.find(
                    (a: any) =>
                      a.subjectId === paper.subjectId &&
                      displayDate(a.date) === displayDate(paper.date) &&
                      a.type === selectedTimetable.type
                  );
                  const gradedCount = matchingAss?.results?.filter(
                    (r: any) => r.entryStatus === 'MARKS_ENTERED' || r.entryStatus === 'ABSENT'
                  ).length || 0;
                  const isPaperLocked = matchingAss?.published === true;

                  return (
                    <TouchableOpacity
                      key={paper.id}
                      style={[s.chip, active && s.chipActive, { minWidth: 170 }]}
                      onPress={() => setSelectedEntryId(paper.id)}
                      activeOpacity={0.8}
                    >
                      <View style={s.chipRowTop}>
                        <Text style={[s.chipTitle, active && s.chipTitleActive]}>
                          {paper.subject?.name || 'Subject'}
                        </Text>
                        {isPaperLocked ? (
                          <Ionicons name="lock-closed" size={13} color="#f87171" />
                        ) : null}
                      </View>
                      <Text style={s.chipSub}>
                        {displayDate(paper.date)} · Max: {Number(paper.maximumMarks || 100)}
                      </Text>
                      <View style={s.progressRow}>
                        <Text style={s.progressText}>
                          {isPaperLocked
                            ? 'Locked (Published)'
                            : gradedCount > 0
                            ? `Graded: ${gradedCount}/${students.length}`
                            : 'Pending'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* ── 4. Student Marks Sheet ── */}
        {selectedPaper ? (
          <View style={s.card}>
            {/* Header info bar */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.paperTitle}>
                  {selectedPaper.subject?.name || 'Subject'} Marks Sheet
                </Text>
                <Text style={s.paperMeta}>
                  Exam: {selectedTimetable?.title} · Maximum Marks: {Number(selectedPaper.maximumMarks || 100)} · Passing Marks: {Number(selectedPaper.passMarks || 33)}
                </Text>
              </View>

              {isLocked ? (
                <View style={s.lockedBadge}>
                  <Ionicons name="lock-closed" size={14} color="#f87171" />
                  <Text style={s.lockedBadgeText}>Exam Published & Locked</Text>
                </View>
              ) : null}
            </View>

            {/* Lock Banner if published */}
            {isLocked ? (
              <View style={s.lockedBanner}>
                <Ionicons name="shield-checkmark" size={18} color="#f87171" />
                <Text style={s.lockedBannerText}>
                  This exam paper has been officially published by Admin. Marks are permanently locked and cannot be edited. Please contact Admin if corrections are required.
                </Text>
              </View>
            ) : null}

            {/* Stats summary bar */}
            <View style={s.statsBar}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{summary.total}</Text>
                <Text style={s.statLabel}>Students</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: '#34d399' }]}>{summary.entered}</Text>
                <Text style={s.statLabel}>Entered</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: '#f87171' }]}>{summary.absent}</Text>
                <Text style={s.statLabel}>Absent</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: '#fbbf24' }]}>{summary.pending}</Text>
                <Text style={s.statLabel}>Pending</Text>
              </View>
            </View>

            {/* Quick Actions (if not locked) */}
            {!isLocked ? (
              <View style={s.quickBar}>
                <TouchableOpacity
                  style={s.quickBtn}
                  onPress={handleMarkAllAbsent}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={s.quickBtnText}>Mark Unentered as Absent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.saveBtn, saving && s.saveBtnDisabled]}
                  onPress={handleSaveMarks}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#080c14" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#080c14" />
                      <Text style={s.saveBtnText}>Save Marks</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Feedback Messages */}
            {errorMessage ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#f87171" />
                <Text style={s.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {saveSuccessMsg ? (
              <View style={s.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                <Text style={s.successText}>{saveSuccessMsg}</Text>
              </View>
            ) : null}

            {/* Students Table / List */}
            {studentsQuery.isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : !students.length ? (
              <Text style={s.emptyNoticeText}>No students currently enrolled in this section.</Text>
            ) : (
              <View style={s.tableShell}>
                {students.map((student: any, idx: number) => {
                  const row = studentRows[student.id] || { marks: '', absent: false, remarks: '', dirty: false };
                  const roll = student.enrollments?.[0]?.rollNumber || String(idx + 1);
                  const maxMarks = Number(selectedPaper.maximumMarks || 100);

                  return (
                    <View key={student.id} style={[s.rowCard, row.dirty && s.rowCardDirty]}>
                      {/* Left: Roll No & Student Details */}
                      <View style={s.rowLeft}>
                        <View style={s.rollBadge}>
                          <Text numberOfLines={1} adjustsFontSizeToFit style={s.rollText}>
                            {String(roll).startsWith('#') ? roll : `#${roll}`}
                          </Text>
                        </View>
                        <View style={s.studentInfo}>
                          <Text style={s.studentName}>{student.name}</Text>
                          <Text style={s.studentIdText}>{student.studentId}</Text>
                        </View>
                      </View>

                      {/* Right: Inputs */}
                      <View style={s.rowRight}>
                        {/* Absent toggle button */}
                        <TouchableOpacity
                          style={[s.absentToggle, row.absent && s.absentToggleActive, isLocked && s.inputDisabled]}
                          onPress={() => handleToggleAbsent(student.id)}
                          disabled={isLocked}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={row.absent ? 'close-circle' : 'remove-circle-outline'}
                            size={14}
                            color={row.absent ? '#f87171' : 'rgba(255,255,255,0.4)'}
                          />
                          <Text style={[s.absentToggleText, row.absent && s.absentToggleTextActive]}>
                            {row.absent ? 'Absent' : 'Present'}
                          </Text>
                        </TouchableOpacity>

                        {/* Marks Input */}
                        <View style={s.marksInputWrap}>
                          <TextInput
                            style={[
                              s.marksInput,
                              row.absent && s.marksInputAbsent,
                              isLocked && s.inputDisabled,
                            ]}
                            placeholder={`0-${maxMarks}`}
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            keyboardType="numeric"
                            value={row.absent ? 'ABS' : row.marks}
                            onChangeText={(text) => handleMarksChange(student.id, text)}
                            editable={!row.absent && !isLocked}
                          />
                          <Text style={s.maxMarksSub}>/{maxMarks}</Text>
                        </View>

                        {/* Remarks Input */}
                        <View style={s.remarksWrap}>
                          <TextInput
                            style={[s.remarksInput, isLocked && s.inputDisabled]}
                            placeholder="Remarks (optional)"
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            value={row.remarks}
                            onChangeText={(text) => handleRemarksChange(student.id, text)}
                            editable={!isLocked}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Bottom Save Button */}
            {!isLocked && students.length > 5 ? (
              <View style={s.bottomBar}>
                <TouchableOpacity
                  style={[s.saveBtn, saving && s.saveBtnDisabled, { width: '100%' }]}
                  onPress={handleSaveMarks}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#080c14" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#080c14" />
                      <Text style={s.saveBtnText}>Save All Class Marks</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

          </View>
        ) : null}

      </ScrollView>
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
  page: {
    flex: 1,
    backgroundColor: tc.canvas,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: tc.canvas,
    gap: 12,
  },
  loadingText: {
    color: tc.muted,
    fontSize: 14,
  },

  // Page Header
  headerBox: {
    marginBottom: 4,
  },
  badgePill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.35)',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fbbf24',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: tc.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: tc.muted,
    marginTop: 4,
    lineHeight: 18,
  },

  // Common Card
  card: {
    backgroundColor: tc.panel,
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: tc.muted,
    letterSpacing: 0.6,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row' as const,
  },
  chip: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F5F7FF',
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    gap: 4,
  },
  chipActive: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: tc.text,
  },
  chipTitleActive: {
    color: isDark ? '#fbbf24' : '#b45309',
  },
  chipSub: {
    fontSize: 11,
    color: tc.muted,
  },
  chipRowTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  examTypeBadge: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: isDark ? '#38bdf8' : '#0284c7',
    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  progressRow: {
    marginTop: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: tc.muted,
  },

  // Role tag
  roleTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  roleTagGold: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  roleTagBlue: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  roleTagTextGold: {
    color: isDark ? '#fbbf24' : '#b45309',
  },
  roleTagTextBlue: {
    color: isDark ? '#38bdf8' : '#0284c7',
  },

  roleInfoBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
    borderRadius: radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: tc.line,
  },
  roleInfoText: {
    fontSize: 12,
    color: tc.text,
    flex: 1,
    lineHeight: 16,
  },

  emptyNotice: {
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
    alignItems: 'center' as const,
    gap: 6,
  },
  emptyNoticeText: {
    fontSize: 12,
    color: tc.muted,
    textAlign: 'center' as const,
  },

  // Sheet Header
  sheetHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  paperTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: tc.text,
  },
  paperMeta: {
    fontSize: 12,
    color: tc.muted,
    marginTop: 2,
  },
  lockedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#f87171',
  },

  lockedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
    borderColor: 'rgba(248, 113, 113, 0.25)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  lockedBannerText: {
    fontSize: 12,
    color: isDark ? '#fca5a5' : '#dc2626',
    flex: 1,
    lineHeight: 16,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
    borderRadius: radius.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: tc.line,
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: tc.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: tc.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: tc.line,
  },

  // Quick action bar
  quickBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  quickBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: tc.text,
  },
  saveBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#080c14',
  },

  // Feedbacks
  errorBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.25)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.25)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
  },
  successText: {
    fontSize: 12,
    color: '#34d399',
    flex: 1,
  },

  // Table Shell & Rows
  tableShell: {
    gap: 8,
    marginTop: 4,
  },
  rowCard: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.line,
    padding: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  rowCardDirty: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.04)' : 'rgba(245, 158, 11, 0.08)',
  },
  rowLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    minWidth: 180,
    flex: 1,
  },
  rollBadge: {
    minWidth: 44,
    paddingHorizontal: 8,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: tc.line,
  },
  rollText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: tc.text,
    textAlign: 'center' as const,
  },
  studentInfo: {
    gap: 2,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: tc.text,
  },
  studentIdText: {
    fontSize: 11,
    color: tc.muted,
  },

  rowRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  absentToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
    borderWidth: 1,
    borderColor: tc.line,
  },
  absentToggleActive: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  absentToggleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: tc.muted,
  },
  absentToggleTextActive: {
    color: '#f87171',
    fontWeight: '700' as const,
  },

  marksInputWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
  },
  marksInput: {
    width: 50,
    height: 36,
    color: tc.text,
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  marksInputAbsent: {
    color: '#f87171',
    fontWeight: '800' as const,
  },
  maxMarksSub: {
    fontSize: 10,
    color: tc.muted,
  },

  remarksWrap: {
    width: 140,
  },
  remarksInput: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: radius.sm,
    height: 36,
    paddingHorizontal: 8,
    color: tc.text,
    fontSize: 11,
  },
  inputDisabled: {
    opacity: 0.6,
  },

  bottomBar: {
    marginTop: 8,
  },

  // Empty View
  emptyCard: {
    backgroundColor: tc.panel,
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: 'center' as const,
    textAlign: 'center' as const,
    gap: 12,
    marginVertical: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: tc.text,
  },
  emptyDesc: {
    fontSize: 13,
    color: tc.muted,
    textAlign: 'center' as const,
    lineHeight: 18,
    maxWidth: 360,
  },
  emptyNote: {
    fontSize: 12,
    color: tc.muted,
    textAlign: 'center' as const,
    lineHeight: 16,
    maxWidth: 360,
    fontStyle: 'italic' as const,
  },
});
