import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';

interface AcademicDetailsModalProps {
  selectedAcademic: any;
  classes: any[];
  classSubjects: any[];
  teacherAssignments: any[];
  classTeacherAssignments: any[];
  students: any[];
  onClose: () => void;
  onDeleteRecord: (row: any) => void;
  onDeleteAssignment: (id: string, classTeacher?: boolean) => void;
}

function displayDate(value: any) {
  return value ? String(value).slice(0, 10) : '';
}

export function AcademicDetailsModal({
  selectedAcademic,
  classes = [],
  classSubjects = [],
  teacherAssignments = [],
  classTeacherAssignments = [],
  students = [],
  onClose,
  onDeleteRecord,
  onDeleteAssignment,
}: AcademicDetailsModalProps) {
  const { isDark, colors: tc } = useTheme();
  const styles = getThemedStyles(isDark);

  // Determine record type
  const isClassRecord = !!(selectedAcademic?.sections !== undefined || (!selectedAcademic?.code && !selectedAcademic?.startDate && selectedAcademic?.name));
  const isSubjectRecord = !!selectedAcademic?.code;
  const isYearRecord = !isClassRecord && !isSubjectRecord;

  // Filter & Search states (for Academic Year view)
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const normalizedSearch = searchQuery.trim().toLowerCase();

  // Active class when viewing class record or when specific class is selected in Year view
  const activeClassId = isClassRecord ? selectedAcademic.id : selectedClassId;
  const activeClass = classes.find((c) => c.id === activeClassId);

  // Sections of active class
  const classSections = useMemo(() => {
    if (isClassRecord) return selectedAcademic.sections || [];
    if (activeClass) return activeClass.sections || [];
    return [];
  }, [isClassRecord, selectedAcademic, activeClass]);

  // Section IDs to filter on
  const relevantSectionIds = useMemo(() => {
    if (isClassRecord) {
      return (selectedAcademic.sections || []).map((s: any) => s.id);
    }
    if (selectedClassId !== 'ALL' && activeClass) {
      if (selectedSectionId !== 'ALL') {
        return [selectedSectionId];
      }
      return (activeClass.sections || []).map((s: any) => s.id);
    }
    // ALL classes
    return classes.flatMap((c) => (c.sections || []).map((s: any) => s.id));
  }, [isClassRecord, selectedAcademic, selectedClassId, selectedSectionId, activeClass, classes]);

  // Subjects assigned to the class
  const filteredClassSubjects = useMemo(() => {
    let list = classSubjects || [];
    if (isClassRecord || selectedClassId !== 'ALL') {
      const cId = isClassRecord ? selectedAcademic.id : selectedClassId;
      list = list.filter((cs: any) => cs.classId === cId && cs.isActive !== false);
    }
    if (normalizedSearch) {
      list = list.filter((cs: any) => {
        const subName = (cs.subject?.name || '').toLowerCase();
        const subCode = (cs.subject?.code || '').toLowerCase();
        const stream = (cs.parentSubject?.name || cs.parentSubject?.code || '').toLowerCase();
        return subName.includes(normalizedSearch) || subCode.includes(normalizedSearch) || stream.includes(normalizedSearch);
      });
    }
    return list;
  }, [classSubjects, isClassRecord, selectedAcademic, selectedClassId, normalizedSearch]);

  // Subject Teachers
  const filteredTeacherAssignments = useMemo(() => {
    let list = teacherAssignments || [];
    if (isYearRecord) {
      list = list.filter((item: any) => item.academicYearId === selectedAcademic.id);
    }
    if (isClassRecord || selectedClassId !== 'ALL') {
      list = list.filter((item: any) => relevantSectionIds.includes(item.sectionId));
    }
    if (normalizedSearch) {
      list = list.filter((item: any) => {
        const empName = (item.employee?.name || '').toLowerCase();
        const empId = (item.employee?.employeeId || '').toLowerCase();
        const subName = (item.subject?.name || '').toLowerCase();
        const secName = (item.section?.name || '').toLowerCase();
        const clsName = (item.section?.schoolClass?.name || '').toLowerCase();
        return empName.includes(normalizedSearch) || empId.includes(normalizedSearch) || subName.includes(normalizedSearch) || secName.includes(normalizedSearch) || clsName.includes(normalizedSearch);
      });
    }
    return list;
  }, [teacherAssignments, isYearRecord, isClassRecord, selectedAcademic, selectedClassId, relevantSectionIds, normalizedSearch]);

  // Class Teachers
  const filteredClassTeacherAssignments = useMemo(() => {
    let list = classTeacherAssignments || [];
    if (isYearRecord) {
      list = list.filter((item: any) => item.academicYearId === selectedAcademic.id);
    }
    if (isClassRecord || selectedClassId !== 'ALL') {
      list = list.filter((item: any) => relevantSectionIds.includes(item.sectionId));
    }
    if (normalizedSearch) {
      list = list.filter((item: any) => {
        const empName = (item.employee?.name || '').toLowerCase();
        const empId = (item.employee?.employeeId || '').toLowerCase();
        const secName = (item.section?.name || '').toLowerCase();
        const clsName = (item.section?.schoolClass?.name || '').toLowerCase();
        return empName.includes(normalizedSearch) || empId.includes(normalizedSearch) || secName.includes(normalizedSearch) || clsName.includes(normalizedSearch);
      });
    }
    return list;
  }, [classTeacherAssignments, isYearRecord, isClassRecord, selectedAcademic, selectedClassId, relevantSectionIds, normalizedSearch]);

  // Current Enrolled Students
  const filteredStudents = useMemo(() => {
    const list = (students || []).filter((student: any) => {
      const enrollment = (student.enrollments || []).find((e: any) => {
        if (e.status !== 'CURRENT') return false;
        if (isYearRecord && e.academicYearId !== selectedAcademic.id) return false;
        if (isClassRecord || selectedClassId !== 'ALL') {
          return relevantSectionIds.includes(e.sectionId);
        }
        return true;
      });
      if (!enrollment) return false;

      if (normalizedSearch) {
        const name = (student.name || '').toLowerCase();
        const sid = (student.studentId || '').toLowerCase();
        const roll = String(enrollment.rollNumber || '').toLowerCase();
        const sec = (enrollment.section?.name || '').toLowerCase();
        const cls = (enrollment.section?.schoolClass?.name || '').toLowerCase();
        return name.includes(normalizedSearch) || sid.includes(normalizedSearch) || roll.includes(normalizedSearch) || sec.includes(normalizedSearch) || cls.includes(normalizedSearch);
      }
      return true;
    });
    return list;
  }, [students, isYearRecord, isClassRecord, selectedAcademic, selectedClassId, relevantSectionIds, normalizedSearch]);

  // Unique employees in the filtered scope
  const uniqueEmployees = useMemo(() => {
    const all = [...filteredTeacherAssignments, ...filteredClassTeacherAssignments];
    const map = new Map();
    for (const item of all) {
      if (item.employee?.id) {
        map.set(item.employee.id, item.employee);
      }
    }
    return Array.from(map.values());
  }, [filteredTeacherAssignments, filteredClassTeacherAssignments]);

  // Overall counts for "All Classes" mode in Year
  const yearStats = useMemo(() => {
    const totalClassesCount = classes.length;
    const totalSectionsCount = classes.reduce((sum, c) => sum + (c.sections?.length || 0), 0);
    const yearStudentsCount = (students || []).filter((st: any) =>
      st.enrollments?.some((e: any) => e.academicYearId === selectedAcademic.id && e.status === 'CURRENT')
    ).length;
    const yearTeachers = teacherAssignments.filter((t: any) => t.academicYearId === selectedAcademic.id);
    const yearClassTeachers = classTeacherAssignments.filter((t: any) => t.academicYearId === selectedAcademic.id);
    const empMap = new Map();
    [...yearTeachers, ...yearClassTeachers].forEach((t) => {
      if (t.employee?.id) empMap.set(t.employee.id, t.employee);
    });
    return {
      classesCount: totalClassesCount,
      sectionsCount: totalSectionsCount,
      studentsCount: yearStudentsCount,
      teachersCount: empMap.size,
    };
  }, [classes, students, selectedAcademic, teacherAssignments, classTeacherAssignments]);

  // Header Title and Subtitle
  const eyebrowText = isClassRecord ? 'CLASS DETAILS' : isSubjectRecord ? 'SUBJECT DETAILS' : 'ACADEMIC YEAR DETAILS';
  const titleText = selectedAcademic?.name || 'Academic Record';
  const subtitleText = isClassRecord
    ? `${selectedAcademic.sections?.length || 0} section(s)`
    : isSubjectRecord
    ? `Code: ${selectedAcademic.code}`
    : `${displayDate(selectedAcademic.startDate)} to ${displayDate(selectedAcademic.endDate)}${selectedAcademic.isCurrent ? ' · CURRENT' : ''}`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.eyebrow}>{eyebrowText}</Text>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.deleteButton}
            onPress={() => onDeleteRecord(selectedAcademic)}
          >
            <Text style={styles.deleteText}>Delete {isClassRecord ? 'class' : 'record'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close ✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SUBJECT RECORD VIEW ── */}
      {isSubjectRecord ? (
        <View style={styles.panel}>
          <Text style={styles.sectionHeading}>Assigned Teachers</Text>
          {filteredTeacherAssignments.length ? (
            filteredTeacherAssignments.map((item: any) => (
              <View style={styles.assignmentRow} key={item.id}>
                <Text style={styles.rowText}>
                  {item.employee?.name} ({item.employee?.employeeId}) · {item.section?.schoolClass?.name} {item.section?.name} · {item.academicYear?.name}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.smallDeleteButton}
                  onPress={() => onDeleteAssignment(item.id, false)}
                >
                  <Text style={styles.smallDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>No teachers assigned to this subject.</Text>
          )}
        </View>
      ) : null}

      {/* ── ACADEMIC YEAR FILTERS & CONTROLS ── */}
      {isYearRecord ? (
        <View style={styles.filterCard}>
          {/* Search Input */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search student, teacher, subject or section..."
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(17, 25, 54, 0.4)'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Class Filter Pills */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Filter by Class:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.pill, selectedClassId === 'ALL' && styles.pillActive]}
                onPress={() => {
                  setSelectedClassId('ALL');
                  setSelectedSectionId('ALL');
                }}
              >
                <Text style={[styles.pillText, selectedClassId === 'ALL' && styles.pillTextActive]}>
                  🌟 All Classes (Full Data)
                </Text>
              </TouchableOpacity>

              {classes.map((cls) => {
                const isSelected = selectedClassId === cls.id;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={cls.id}
                    style={[styles.pill, isSelected && styles.pillActive]}
                    onPress={() => {
                      setSelectedClassId(cls.id);
                      setSelectedSectionId('ALL');
                    }}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{cls.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Section Filter Pills (Only visible when a class is selected) */}
          {selectedClassId !== 'ALL' && classSections.length > 0 ? (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Filter by Section:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.pill, selectedSectionId === 'ALL' && styles.pillActive]}
                  onPress={() => setSelectedSectionId('ALL')}
                >
                  <Text style={[styles.pillText, selectedSectionId === 'ALL' && styles.pillTextActive]}>
                    All Sections
                  </Text>
                </TouchableOpacity>

                {classSections.map((sec: any) => {
                  const isSelected = selectedSectionId === sec.id;
                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      key={sec.id}
                      style={[styles.pill, isSelected && styles.pillActive]}
                      onPress={() => setSelectedSectionId(sec.id)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                        Section {sec.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── VIEW 1: "ALL CLASSES" SELECTED (OVERVIEW OF WHOLE YEAR) ── */}
      {isYearRecord && selectedClassId === 'ALL' ? (
        <View style={styles.contentWrap}>
          {/* Top KPI Cards */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{yearStats.classesCount}</Text>
              <Text style={styles.kpiLabel}>Total Classes</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{yearStats.sectionsCount}</Text>
              <Text style={styles.kpiLabel}>Sections</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{yearStats.studentsCount}</Text>
              <Text style={styles.kpiLabel}>Current Students</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{yearStats.teachersCount}</Text>
              <Text style={styles.kpiLabel}>Assigned Staff</Text>
            </View>
          </View>

          {/* Class-wise Quick Cards */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>Classes Breakdown</Text>
            <Text style={styles.helperText}>Tap any class below to see its assigned subjects, teachers, and student list.</Text>

            <View style={styles.classList}>
              {classes
                .filter((c) => {
                  if (!normalizedSearch) return true;
                  return (
                    c.name.toLowerCase().includes(normalizedSearch) ||
                    (c.sections || []).some((s: any) => s.name.toLowerCase().includes(normalizedSearch))
                  );
                })
                .map((cls) => {
                  const clsSections = cls.sections || [];
                  const clsSectionIds = clsSections.map((s: any) => s.id);
                  const clsStudentCount = (students || []).filter((st: any) =>
                    st.enrollments?.some(
                      (e: any) =>
                        e.status === 'CURRENT' &&
                        e.academicYearId === selectedAcademic.id &&
                        clsSectionIds.includes(e.sectionId)
                    )
                  ).length;
                  const clsSubjectCount = (classSubjects || []).filter(
                    (cs: any) => cs.classId === cls.id && cs.isActive !== false
                  ).length;
                  const clsTeacherCount = new Set([
                    ...teacherAssignments
                      .filter((t: any) => t.academicYearId === selectedAcademic.id && clsSectionIds.includes(t.sectionId))
                      .map((t: any) => t.employeeId),
                    ...classTeacherAssignments
                      .filter((ct: any) => ct.academicYearId === selectedAcademic.id && clsSectionIds.includes(ct.sectionId))
                      .map((ct: any) => ct.employeeId),
                  ]).size;

                  return (
                    <View key={cls.id} style={styles.classCard}>
                      <View style={styles.classCardHeader}>
                        <Text style={styles.classCardTitle}>{cls.name}</Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={styles.viewClassBtn}
                          onPress={() => {
                            setSelectedClassId(cls.id);
                            setSelectedSectionId('ALL');
                          }}
                        >
                          <Text style={styles.viewClassBtnText}>View Class Details →</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Sections with capacities */}
                      <View style={styles.classMetaRow}>
                        {clsSections.map((sec: any) => {
                          const secStudents = (students || []).filter((st: any) =>
                            st.enrollments?.some(
                              (e: any) =>
                                e.status === 'CURRENT' &&
                                e.academicYearId === selectedAcademic.id &&
                                e.sectionId === sec.id
                            )
                          ).length;
                          return (
                            <View key={sec.id} style={styles.sectionBadge}>
                              <Text style={styles.sectionBadgeText}>
                                Section {sec.name}: {secStudents}/{sec.capacity || '∞'} students
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      <View style={styles.classSummaryStats}>
                        <Text style={styles.metaStat}>👨‍🎓 {clsStudentCount} student{clsStudentCount === 1 ? '' : 's'}</Text>
                        <Text style={styles.metaStat}>📚 {clsSubjectCount} subject{clsSubjectCount === 1 ? '' : 's'}</Text>
                        <Text style={styles.metaStat}>👨‍🏫 {clsTeacherCount} teacher{clsTeacherCount === 1 ? '' : 's'}</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>

          {/* All Subject Teachers in this Year */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>
              All Subject Teachers in Academic Year ({filteredTeacherAssignments.length})
            </Text>
            {filteredTeacherAssignments.length ? (
              filteredTeacherAssignments.map((item: any) => (
                <View style={styles.assignmentRow} key={item.id}>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentTeacher}>
                      {item.employee?.name} <Text style={styles.badgeId}>({item.employee?.employeeId || 'ID'})</Text>
                    </Text>
                    <Text style={styles.assignmentSub}>
                      → {item.subject?.name} · {item.section?.schoolClass?.name} {item.section?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.smallDeleteButton}
                    onPress={() => onDeleteAssignment(item.id, false)}
                  >
                    <Text style={styles.smallDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No subject teachers found for this search filter.</Text>
            )}
          </View>

          {/* All Class Teachers in this Year */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>
              All Class Teachers in Academic Year ({filteredClassTeacherAssignments.length})
            </Text>
            {filteredClassTeacherAssignments.length ? (
              filteredClassTeacherAssignments.map((item: any) => (
                <View style={styles.assignmentRow} key={item.id}>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentTeacher}>
                      {item.section?.schoolClass?.name} {item.section?.name}
                    </Text>
                    <Text style={styles.assignmentSub}>
                      Class Teacher: {item.employee?.name} <Text style={styles.badgeId}>({item.employee?.employeeId || 'ID'})</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.smallDeleteButton}
                    onPress={() => onDeleteAssignment(item.id, true)}
                  >
                    <Text style={styles.smallDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No class teachers found for this search filter.</Text>
            )}
          </View>

          {/* All Current Students in this Year */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>
              All Current Students ({filteredStudents.length})
            </Text>
            {filteredStudents.length ? (
              filteredStudents.map((student: any) => {
                const enrollment = student.enrollments?.find(
                  (item: any) => item.status === 'CURRENT' && item.academicYearId === selectedAcademic.id
                );
                return (
                  <View key={student.id} style={styles.studentRow}>
                    <View style={styles.studentIdBadge}>
                      <Text style={styles.studentIdText}>{student.studentId}</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentMeta}>
                        {enrollment?.section?.schoolClass?.name} {enrollment?.section?.name} · Roll {enrollment?.rollNumber || '—'}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.mutedText}>No students found matching current filter.</Text>
            )}
          </View>
        </View>
      ) : null}

      {/* ── VIEW 2: SPECIFIC CLASS DETAILS (CLASS-WISE DETAILS) ── */}
      {(isClassRecord || (isYearRecord && selectedClassId !== 'ALL')) ? (
        <View style={styles.contentWrap}>
          {/* Active Class Quick KPI Strip */}
          <View style={styles.classHeaderBar}>
            <View>
              <Text style={styles.classHeaderTitle}>
                {activeClass?.name || 'Class Details'}
                {selectedSectionId !== 'ALL' ? ` · Section ${classSections.find((s: any) => s.id === selectedSectionId)?.name}` : ''}
              </Text>
              <Text style={styles.classHeaderSubtitle}>
                Detailed breakdown of assigned subjects, teachers, and enrolled students.
              </Text>
            </View>

            {isYearRecord ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.backAllBtn}
                onPress={() => setSelectedClassId('ALL')}
              >
                <Text style={styles.backAllBtnText}>← All Classes</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Class Summary Badges */}
          <View style={styles.statBadgesRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeVal}>{classSections.length}</Text>
              <Text style={styles.statBadgeLabel}>Sections</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeVal}>{filteredStudents.length}</Text>
              <Text style={styles.statBadgeLabel}>Students</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeVal}>{filteredClassSubjects.length}</Text>
              <Text style={styles.statBadgeLabel}>Assigned Subjects</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeVal}>{uniqueEmployees.length}</Text>
              <Text style={styles.statBadgeLabel}>Staff Assigned</Text>
            </View>
          </View>

          {/* 1. ASSIGNED SUBJECTS FOR THIS CLASS */}
          <View style={styles.panel}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.sectionHeading}>
                Assigned Subjects ({filteredClassSubjects.length})
              </Text>
            </View>

            {filteredClassSubjects.length ? (
              <View style={styles.subjectsGrid}>
                {filteredClassSubjects.map((cs: any) => {
                  const subjectName = cs.subject?.name || 'Unknown Subject';
                  const subjectCode = cs.subject?.code;
                  const parentStream = cs.parentSubject?.code || cs.parentSubject?.name;

                  return (
                    <View key={cs.id} style={styles.subjectCard}>
                      <View style={styles.subjectTop}>
                        <Text style={styles.subjectName}>{subjectName}</Text>
                        {subjectCode ? <Text style={styles.subjectCode}>{subjectCode}</Text> : null}
                      </View>
                      {parentStream ? (
                        <View style={styles.streamBadge}>
                          <Text style={styles.streamBadgeText}>Stream: {parentStream}</Text>
                        </View>
                      ) : null}
                      {cs.isOptional ? (
                        <Text style={styles.optionalBadge}>Optional</Text>
                      ) : (
                        <Text style={styles.compulsoryBadge}>Compulsory</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.mutedText}>
                No subjects assigned to this class yet. (You can assign subjects in the 'Class Subjects' tab)
              </Text>
            )}
          </View>

          {/* 2. SUBJECT TEACHERS ASSIGNED */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>
              Subject Teachers ({filteredTeacherAssignments.length})
            </Text>

            {filteredTeacherAssignments.length ? (
              filteredTeacherAssignments.map((item: any) => (
                <View style={styles.assignmentRow} key={item.id}>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentTeacher}>
                      {item.employee?.name} <Text style={styles.badgeId}>({item.employee?.employeeId || 'ID'})</Text>
                    </Text>
                    <Text style={styles.assignmentSub}>
                      → {item.subject?.name} · {item.section?.schoolClass?.name} {item.section?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.smallDeleteButton}
                    onPress={() => onDeleteAssignment(item.id, false)}
                  >
                    <Text style={styles.smallDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No subject teachers assigned for this class/section yet.</Text>
            )}
          </View>

          {/* 3. CLASS TEACHERS ASSIGNED */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>
              Class Teachers ({filteredClassTeacherAssignments.length})
            </Text>

            {filteredClassTeacherAssignments.length ? (
              filteredClassTeacherAssignments.map((item: any) => (
                <View style={styles.assignmentRow} key={item.id}>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentTeacher}>
                      Section {item.section?.name}
                    </Text>
                    <Text style={styles.assignmentSub}>
                      Class Teacher: {item.employee?.name} <Text style={styles.badgeId}>({item.employee?.employeeId || 'ID'})</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.smallDeleteButton}
                    onPress={() => onDeleteAssignment(item.id, true)}
                  >
                    <Text style={styles.smallDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No class teacher assigned for this class/section yet.</Text>
            )}
          </View>

          {/* 4. SECTIONS & CAPACITY BREAKDOWN */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>Sections & Student Capacity</Text>
            <View style={styles.sectionCardsGrid}>
              {classSections
                .filter((sec: any) => selectedSectionId === 'ALL' || sec.id === selectedSectionId)
                .map((section: any) => {
                  const studentCount = (students || []).filter((student: any) =>
                    student.enrollments?.some(
                      (enrollment: any) =>
                        enrollment.sectionId === section.id &&
                        (!isYearRecord || enrollment.academicYearId === selectedAcademic.id) &&
                        enrollment.status === 'CURRENT'
                    )
                  ).length;
                  const capacity = section.capacity || null;
                  const freeSeats = capacity ? Math.max(capacity - studentCount, 0) : null;

                  return (
                    <View key={section.id} style={styles.sectionDetailCard}>
                      <View style={styles.sectionDetailHeader}>
                        <Text style={styles.sectionDetailTitle}>Section {section.name}</Text>
                        <Text style={styles.sectionDetailRatio}>
                          {studentCount} / {capacity || '∞'}
                        </Text>
                      </View>
                      <Text style={styles.sectionDetailSub}>
                        {capacity
                          ? `${freeSeats} seat${freeSeats === 1 ? '' : 's'} remaining of ${capacity} capacity`
                          : `${studentCount} student${studentCount === 1 ? '' : 's'} enrolled (No capacity limit)`}
                      </Text>
                    </View>
                  );
                })}
            </View>
          </View>

          {/* 5. CURRENT ENROLLED STUDENTS */}
          <View style={styles.panel}>
            <Text style={styles.sectionHeading}>
              Current Students ({filteredStudents.length})
            </Text>

            {filteredStudents.length ? (
              filteredStudents.map((student: any) => {
                const enrollment = student.enrollments?.find(
                  (item: any) =>
                    item.status === 'CURRENT' &&
                    (!isYearRecord || item.academicYearId === selectedAcademic.id)
                );
                return (
                  <View key={student.id} style={styles.studentRow}>
                    <View style={styles.studentIdBadge}>
                      <Text style={styles.studentIdText}>{student.studentId}</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentMeta}>
                        {enrollment?.section?.schoolClass?.name} {enrollment?.section?.name} · Roll {enrollment?.rollNumber || '—'}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.mutedText}>No current students assigned to this class/section.</Text>
            )}
          </View>
        </View>
      ) : null}
    </ScrollView>
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

function createStyles(tc: ThemeColors, isDark: boolean) {
  return {
  container: {
    padding: 20,
    backgroundColor: tc.card,
    gap: 16,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
    paddingBottom: 16,
  },
  headerInfo: {
    flex: 1,
    minWidth: 240,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: tc.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: tc.text,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: tc.muted,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  closeButton: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  closeText: {
    color: tc.text,
    fontWeight: '700' as const,
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  deleteText: {
    color: tc.danger,
    fontWeight: '800' as const,
    fontSize: 12,
  },
  filterCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  searchInput: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: tc.text,
    fontSize: 13,
  },
  clearSearchBtn: {
    position: 'absolute' as const,
    right: 12,
    padding: 4,
  },
  clearSearchText: {
    color: tc.muted,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: tc.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  pillScroll: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: tc.border,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.20)' : 'rgba(14, 165, 233, 0.15)',
    borderColor: tc.primary,
  },
  pillText: {
    color: tc.muted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pillTextActive: {
    color: isDark ? '#ffffff' : tc.primary,
    fontWeight: '800' as const,
  },
  contentWrap: {
    gap: 16,
  },
  kpiRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: 110,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' as const,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: tc.primary,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: tc.muted,
    marginTop: 2,
  },
  panel: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  panelHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  sectionHeading: {
    color: tc.text,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  helperText: {
    color: tc.muted,
    fontSize: 12,
    marginTop: -4,
  },
  classList: {
    gap: 10,
    marginTop: 6,
  },
  classCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  classCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  classCardTitle: {
    color: tc.text,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  viewClassBtn: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.15)' : 'rgba(14, 165, 233, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(147, 155, 255, 0.35)' : 'rgba(14, 165, 233, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewClassBtnText: {
    color: tc.primary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  classMetaRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  sectionBadge: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sectionBadgeText: {
    color: tc.text,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  classSummaryStats: {
    flexDirection: 'row' as const,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: tc.border,
    paddingTop: 8,
  },
  metaStat: {
    color: tc.muted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  classHeaderBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    paddingBottom: 4,
  },
  classHeaderTitle: {
    color: tc.text,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  classHeaderSubtitle: {
    color: tc.muted,
    fontSize: 12,
    marginTop: 2,
  },
  backAllBtn: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: tc.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  backAllBtnText: {
    color: tc.text,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  statBadgesRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  statBadge: {
    flex: 1,
    minWidth: 85,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
  },
  statBadgeVal: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: tc.primary,
  },
  statBadgeLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: tc.muted,
    marginTop: 2,
  },
  subjectsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  subjectCard: {
    width: '48%' as any,
    minWidth: 160,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  subjectTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: 6,
  },
  subjectName: {
    color: tc.text,
    fontSize: 13,
    fontWeight: '700' as const,
    flex: 1,
  },
  subjectCode: {
    color: tc.primary,
    fontSize: 10,
    fontWeight: '800' as const,
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.12)' : 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  streamBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  streamBadgeText: {
    color: tc.purple,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  compulsoryBadge: {
    color: tc.muted,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  optionalBadge: {
    color: tc.warning,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  assignmentRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTeacher: {
    color: tc.text,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  badgeId: {
    color: tc.muted,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  assignmentSub: {
    color: tc.muted,
    fontSize: 12,
    marginTop: 2,
  },
  smallDeleteButton: {
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallDeleteText: {
    color: tc.danger,
    fontSize: 11,
    fontWeight: '800' as const,
  },
  sectionCardsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  sectionDetailCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  sectionDetailHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  sectionDetailTitle: {
    color: tc.text,
    fontSize: 14,
    fontWeight: '800' as const,
  },
  sectionDetailRatio: {
    color: tc.primary,
    fontSize: 12,
    fontWeight: '800' as const,
  },
  sectionDetailSub: {
    color: tc.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  studentRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  studentIdBadge: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.15)' : 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  studentIdText: {
    color: tc.primary,
    fontSize: 11,
    fontWeight: '800' as const,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: tc.text,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  studentMeta: {
    color: tc.muted,
    fontSize: 11,
    marginTop: 1,
  },
  rowText: {
    color: tc.text,
    fontSize: 13,
    flex: 1,
  },
  mutedText: {
    color: tc.muted,
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
  };
}
