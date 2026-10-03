import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, surfaces } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';
import { downloadMarksheetPdf, MarksheetPdfData } from '../utils/marksheetPdf';

interface SubjectResult {
  subjectId: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  date?: string;
  marks: number | null;
  maximumMarks: number;
  entryStatus: 'MARKS_ENTERED' | 'ABSENT' | 'NOT_ENTERED';
  remarks?: string | null;
  complete: boolean;
}

interface ExamResultItem {
  id: string;
  timetableId: string;
  title: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  totalMarks: number;
  maximumMarks: number;
  percentage: number;
  student?: {
    name?: string;
    studentId?: string;
    rollNumber?: number;
    className?: string;
    sectionName?: string;
    academicYear?: string;
  };
  subjects: SubjectResult[];
  message?: string;
}

function getGradeLetter(percent: number): string {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B+';
  if (percent >= 60) return 'B';
  if (percent >= 50) return 'C';
  if (percent >= 33) return 'D';
  return 'E';
}

function getDivisionText(percent: number): string {
  if (percent >= 75) return 'Distinction (1st Div)';
  if (percent >= 60) return 'First Division';
  if (percent >= 45) return 'Second Division';
  if (percent >= 33) return 'Third Division';
  return 'Needs Improvement';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

export function StudentResultsScreen() {
  const { user } = useAuth();
  const { isDark, colors: tc } = useTheme();
  const s = getThemedStyles(isDark);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [selectedExam, setSelectedExam] = useState<ExamResultItem | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<ExamResultItem[]>({
    queryKey: ['student-results'],
    queryFn: async () => (await api.get('/assessments/student-results')).data,
  });

  const results: ExamResultItem[] = Array.isArray(data) ? data : [];

  const handleDownloadPdf = (exam: ExamResultItem) => {
    try {
      setDownloading(true);
      const pdfPayload: MarksheetPdfData = {
        title: exam.title,
        type: exam.type,
        startDate: exam.startDate,
        endDate: exam.endDate,
        totalMarks: exam.totalMarks,
        maximumMarks: exam.maximumMarks,
        percentage: exam.percentage,
        student: {
          name: exam.student?.name || user?.name || 'Student',
          studentId: exam.student?.studentId || user?.studentId || '—',
          rollNumber: exam.student?.rollNumber,
          className: exam.student?.className,
          sectionName: exam.student?.sectionName,
          academicYear: exam.student?.academicYear,
        },
        subjects: exam.subjects || [],
      };
      downloadMarksheetPdf(pdfPayload);
    } catch (err) {
      console.error('Failed to generate marksheet PDF', err);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Top Header ── */}
        <View style={s.hero}>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>ACADEMIC PERFORMANCE</Text>
            <Text style={s.title}>My Results</Text>
            <Text style={s.description}>
              An exam result appears after all subjects for that exam have marks or absent status assigned.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            style={s.refreshBtn}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color={tc.primary} />
            <Text style={s.refreshBtnText}>Refresh data</Text>
          </TouchableOpacity>
        </View>

        {/* ── Loading State ── */}
        {isLoading && (
          <View style={s.stateBox}>
            <ActivityIndicator size="large" color={tc.primary} />
            <Text style={s.stateText}>Loading examination results…</Text>
          </View>
        )}

        {/* ── Error State ── */}
        {!isLoading && isError && (
          <View style={s.stateBox}>
            <Ionicons name="alert-circle-outline" size={40} color={tc.danger} />
            <Text style={s.stateTitle}>Unable to load results</Text>
            <Text style={s.stateText}>There was an issue fetching your records. Please try again.</Text>
            <TouchableOpacity style={s.primaryActionBtn} onPress={() => refetch()}>
              <Text style={s.primaryActionBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty State ── */}
        {!isLoading && !isError && results.length === 0 && (
          <View style={s.stateBox}>
            <Text style={s.emptyIcon}>◇</Text>
            <Text style={s.stateTitle}>No results published yet</Text>
            <Text style={s.stateText}>
              Your marksheet will appear here once all subjects are evaluated and published.
            </Text>
          </View>
        )}

        {/* ── Results Cards List ── */}
        {!isLoading && !isError && results.length > 0 && (
          <View style={s.cardGrid}>
            {results.map((exam, index) => {
              const grade = getGradeLetter(exam.percentage);
              const isPass = exam.percentage >= 33;

              return (
                <TouchableOpacity
                  key={exam.id || index}
                  style={s.examCard}
                  activeOpacity={0.85}
                  onPress={() => setSelectedExam(exam)}
                >
                  <View style={s.examCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.examCardTitle}>{exam.title}</Text>
                      <Text style={s.examCardMeta}>
                        Total marks: {exam.totalMarks}/{exam.maximumMarks} · Percentage: {exam.percentage}% · Grade: {grade}
                      </Text>
                    </View>
                    <View style={s.resultAvailableBadge}>
                      <Text style={s.resultAvailableText}>RESULT AVAILABLE</Text>
                    </View>
                  </View>

                  {/* Subject List Summary */}
                  {exam.subjects && exam.subjects.length > 0 && (
                    <View style={s.subjectsListRow}>
                      {exam.subjects.map((sub, sIdx) => {
                        const isAbsent = sub.entryStatus === 'ABSENT';
                        const score = isAbsent ? 'Absent' : `${sub.marks ?? 0}`;
                        return (
                          <Text key={sub.subjectId || sIdx} style={s.subjectListText}>
                            {sub.subject?.name || 'Subject'}: <Text style={{ fontWeight: '700', color: isAbsent ? tc.danger : tc.text }}>{score}</Text>
                            {sIdx < exam.subjects.length - 1 ? '  ·  ' : ''}
                          </Text>
                        );
                      })}
                    </View>
                  )}

                  <View style={s.examCardBottom}>
                    <Text style={s.openHintText}>Official marksheet available</Text>
                    <View style={s.cardActionsGroup}>
                      <TouchableOpacity
                        style={s.cardDownloadPdfBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleDownloadPdf(exam);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="download-outline" size={15} color="#080c14" />
                        <Text style={s.cardDownloadPdfBtnText}>Download PDF</Text>
                      </TouchableOpacity>

                      <View style={s.viewDetailsBtn}>
                        <Text style={s.viewDetailsText}>View Marksheet</Text>
                        <Ionicons name="arrow-forward-outline" size={14} color={tc.primary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── NORMAL, CLEAN MARKSHEET MODAL (POPUP) ── */}
      <Modal
        visible={!!selectedExam}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedExam(null)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedExam(null)}
          />

          <View style={[s.modalDialog, { maxWidth: isDesktop ? 780 : '96%' }]}>
            {/* Modal Header Bar */}
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.schoolTitle}>ARIHANT PUBLIC SCHOOL</Text>
                <Text style={s.marksheetSubtitle}>STUDENT EXAMINATION MARKSHEET</Text>
              </View>

              <View style={s.modalHeaderRight}>
                <TouchableOpacity
                  style={s.headerDownloadBtn}
                  disabled={downloading}
                  onPress={() => selectedExam && handleDownloadPdf(selectedExam)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={15} color="#080c14" />
                  <Text style={s.headerDownloadBtnText}>Download PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityLabel="Close"
                  style={s.closeIconBtn}
                  onPress={() => setSelectedExam(null)}
                >
                  <Ionicons name="close" size={20} color={tc.text} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedExam && (
              <ScrollView
                style={s.modalScroll}
                contentContainerStyle={s.modalContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Examination Title */}
                <View style={s.examHeaderBox}>
                  <Text style={s.examHeading}>{selectedExam.title.toUpperCase()}</Text>
                  {selectedExam.startDate && (
                    <Text style={s.examDatesText}>
                      Examination Date: {formatDate(selectedExam.startDate)}
                      {selectedExam.endDate && selectedExam.endDate !== selectedExam.startDate ? ` - ${formatDate(selectedExam.endDate)}` : ''}
                    </Text>
                  )}
                </View>

                {/* Normal Student Details Grid */}
                <View style={s.studentInfoTable}>
                  <View style={s.studentInfoRow}>
                    <View style={s.infoCol}>
                      <Text style={s.infoLabel}>Student Name:</Text>
                      <Text style={s.infoValue}>{selectedExam.student?.name || user?.name || 'Student'}</Text>
                    </View>
                    <View style={s.infoCol}>
                      <Text style={s.infoLabel}>Roll Number:</Text>
                      <Text style={s.infoValue}>{selectedExam.student?.rollNumber != null ? `#${selectedExam.student.rollNumber}` : '—'}</Text>
                    </View>
                  </View>

                  <View style={s.studentInfoRow}>
                    <View style={s.infoCol}>
                      <Text style={s.infoLabel}>Student ID:</Text>
                      <Text style={s.infoValue}>{selectedExam.student?.studentId || user?.studentId || '—'}</Text>
                    </View>
                    <View style={s.infoCol}>
                      <Text style={s.infoLabel}>Class & Section:</Text>
                      <Text style={s.infoValue}>
                        {selectedExam.student?.className
                          ? `${selectedExam.student.className} - ${selectedExam.student.sectionName || 'A'}`
                          : 'Class 1 - A'}
                      </Text>
                    </View>
                  </View>

                  <View style={[s.studentInfoRow, { borderBottomWidth: 0 }]}>
                    <View style={s.infoCol}>
                      <Text style={s.infoLabel}>Academic Session:</Text>
                      <Text style={s.infoValue}>{selectedExam.student?.academicYear || '2026-2027'}</Text>
                    </View>
                    <View style={s.infoCol}>
                      <Text style={s.infoLabel}>Result Status:</Text>
                      <Text style={[s.infoValue, { color: selectedExam.percentage >= 33 ? tc.success : tc.danger, fontWeight: '700' }]}>
                        {selectedExam.percentage >= 33 ? 'Passed' : 'Needs Improvement'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Clean, Normal Marks Table */}
                <View style={s.tableWrap}>
                  {/* Table Header */}
                  <View style={s.tableHeadRow}>
                    <Text style={[s.th, { flex: 0.6 }]}>#</Text>
                    <Text style={[s.th, { flex: 2.8, textAlign: 'left' }]}>SUBJECT</Text>
                    <Text style={[s.th, { flex: 1.2 }]}>MAX</Text>
                    <Text style={[s.th, { flex: 1.2 }]}>PASS</Text>
                    <Text style={[s.th, { flex: 1.4 }]}>OBTAINED</Text>
                    <Text style={[s.th, { flex: 1.2 }]}>GRADE</Text>
                    <Text style={[s.th, { flex: 1.2 }]}>STATUS</Text>
                  </View>

                  {/* Table Body */}
                  {selectedExam.subjects?.map((sub, idx) => {
                    const isAbsent = sub.entryStatus === 'ABSENT';
                    const marks = isAbsent ? null : (sub.marks ?? 0);
                    const max = sub.maximumMarks || 100;
                    const passMarks = Math.round(max * 0.33);
                    const percent = isAbsent ? 0 : Math.round(((marks || 0) / max) * 100);
                    const grade = isAbsent ? '—' : getGradeLetter(percent);
                    const isPass = !isAbsent && (marks || 0) >= passMarks;

                    return (
                      <View key={sub.subjectId || idx} style={[s.tableRow, idx % 2 === 1 && s.tableRowAlt]}>
                        <Text style={[s.td, { flex: 0.6, color: tc.muted }]}>
                          {String(idx + 1).padStart(2, '0')}
                        </Text>
                        <View style={{ flex: 2.8 }}>
                          <Text style={s.tdSubjectName}>{sub.subject?.name || 'Subject'}</Text>
                          {sub.subject?.code ? <Text style={s.tdSubjectCode}>{sub.subject.code}</Text> : null}
                        </View>
                        <Text style={[s.td, { flex: 1.2 }]}>{max}</Text>
                        <Text style={[s.td, { flex: 1.2, color: tc.muted }]}>{passMarks}</Text>
                        <Text style={[s.td, { flex: 1.4, fontWeight: '700', color: isAbsent ? tc.danger : tc.text }]}>
                          {isAbsent ? 'Absent' : marks}
                        </Text>
                        <Text style={[s.td, { flex: 1.2, fontWeight: '700' }]}>{grade}</Text>
                        <View style={{ flex: 1.2, alignItems: 'center' }}>
                          <Text
                            style={[
                              s.statusText,
                              { color: isAbsent ? tc.danger : isPass ? tc.success : tc.danger },
                            ]}
                          >
                            {isAbsent ? 'ABSENT' : isPass ? 'PASS' : 'FAIL'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Grand Total Row */}
                  <View style={s.tableFooterRow}>
                    <Text style={[s.tdTotal, { flex: 3.4, textAlign: 'left', fontWeight: '800' }]}>
                      GRAND TOTAL
                    </Text>
                    <Text style={[s.tdTotal, { flex: 1.2 }]}>
                      {selectedExam.maximumMarks}
                    </Text>
                    <Text style={[s.tdTotal, { flex: 1.2, color: tc.muted }]}>
                      {Math.round(selectedExam.maximumMarks * 0.33)}
                    </Text>
                    <Text style={[s.tdTotal, { flex: 1.4, color: tc.primary, fontSize: 14 }]}>
                      {selectedExam.totalMarks}
                    </Text>
                    <Text style={[s.tdTotal, { flex: 1.2 }]}>
                      {getGradeLetter(selectedExam.percentage)}
                    </Text>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <Text
                        style={[
                          s.statusText,
                          {
                            color: selectedExam.percentage >= 33 ? tc.success : tc.danger,
                            fontWeight: '800',
                          },
                        ]}
                      >
                        {selectedExam.percentage >= 33 ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Normal Summary Strip */}
                <View style={s.summaryBox}>
                  <View style={s.summaryCol}>
                    <Text style={s.summaryLabel}>Total Marks</Text>
                    <Text style={s.summaryValue}>{selectedExam.totalMarks} / {selectedExam.maximumMarks}</Text>
                  </View>
                  <View style={s.summaryCol}>
                    <Text style={s.summaryLabel}>Percentage</Text>
                    <Text style={s.summaryValue}>{selectedExam.percentage}%</Text>
                  </View>
                  <View style={s.summaryCol}>
                    <Text style={s.summaryLabel}>Grade</Text>
                    <Text style={s.summaryValue}>{getGradeLetter(selectedExam.percentage)}</Text>
                  </View>
                  <View style={s.summaryCol}>
                    <Text style={s.summaryLabel}>Result</Text>
                    <Text style={[s.summaryValue, { color: selectedExam.percentage >= 33 ? tc.success : tc.danger }]}>
                      {getDivisionText(selectedExam.percentage)}
                    </Text>
                  </View>
                </View>

                {/* Grading Key Note */}
                <View style={s.noteBox}>
                  <Text style={s.noteText}>
                    Grading Scale: A+ (90-100%) · A (80-89%) · B+ (70-79%) · B (60-69%) · C (50-59%) · D (33-49%) · E (&lt;33%)
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* Modal Actions Footer */}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.downloadPdfBtn}
                disabled={downloading}
                onPress={() => selectedExam && handleDownloadPdf(selectedExam)}
                activeOpacity={0.8}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#080c14" />
                ) : (
                  <Ionicons name="download-outline" size={17} color="#080c14" />
                )}
                <Text style={s.downloadPdfBtnText}>
                  {downloading ? 'Downloading PDF…' : 'Download Marksheet PDF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setSelectedExam(null)}
                activeOpacity={0.8}
              >
                <Text style={s.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
    content: { ...surfaces.content, paddingBottom: 40 },

    // Hero
    hero: {
      ...surfaces.card,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      gap: 16,
      marginBottom: 20,
      padding: 24,
      borderRadius: radius.md,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      flexWrap: 'wrap' as const,
    },
    heroCopy: { flex: 1, minWidth: 260 },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: tc.primary,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      marginBottom: 6,
    },
    title: { fontSize: 24, fontWeight: '800' as const, color: tc.text, marginBottom: 6 },
    description: { fontSize: 13, color: tc.muted, lineHeight: 19 },
    refreshBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      backgroundColor: isDark ? 'rgba(147,155,255,0.12)' : 'rgba(91, 140, 255, 0.1)',
      borderWidth: 1,
      borderColor: isDark ? colors.glowBorderSm : tc.line,
    },
    refreshBtnText: { color: tc.primary, fontSize: 13, fontWeight: '600' as const },

    // States
    stateBox: {
      padding: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : tc.line,
      marginVertical: 20,
    },
    emptyIcon: { fontSize: 24, color: tc.muted, marginBottom: 10 },
    stateTitle: { fontSize: 16, fontWeight: '700' as const, color: tc.text, marginTop: 10, marginBottom: 4 },
    stateText: { fontSize: 13, color: tc.muted, textAlign: 'center' as const, maxWidth: 400 },
    primaryActionBtn: {
      marginTop: 14,
      paddingHorizontal: 18,
      paddingVertical: 8,
      backgroundColor: tc.primary,
      borderRadius: radius.sm,
    },
    primaryActionBtnText: { color: isDark ? '#080c14' : '#ffffff', fontWeight: '700' as const, fontSize: 13 },

    // Exam List Cards
    cardGrid: { gap: 14 },
    examCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : tc.line,
      padding: 18,
      gap: 12,
    },
    examCardHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      gap: 12,
    },
    examCardTitle: { fontSize: 17, fontWeight: '700' as const, color: tc.text },
    examCardMeta: { fontSize: 12, color: tc.muted, marginTop: 4 },
    resultAvailableBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(52, 211, 153, 0.15)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : 'rgba(52, 211, 153, 0.4)',
    },
    resultAvailableText: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: isDark ? '#34d399' : '#059669',
      letterSpacing: 0.5,
    },
    subjectsListRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      backgroundColor: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.03)',
      padding: 10,
      borderRadius: radius.sm,
    },
    subjectListText: { fontSize: 12, color: tc.muted },
    examCardBottom: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : tc.line,
      paddingTop: 10,
      flexWrap: 'wrap' as const,
      gap: 8,
    },
    cardActionsGroup: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    cardDownloadPdfBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: radius.sm,
      backgroundColor: tc.primary,
    },
    cardDownloadPdfBtnText: {
      fontSize: 12,
      fontWeight: '800' as const,
      color: isDark ? '#080c14' : '#ffffff',
    },
    openHintText: { fontSize: 12, color: tc.muted },
    viewDetailsBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
    viewDetailsText: { fontSize: 13, fontWeight: '600' as const, color: tc.primary },

    // ── Modal Styles ──
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 16,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalDialog: {
      width: '100%',
      maxHeight: '88%',
      backgroundColor: isDark ? '#0c121e' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : tc.line,
      overflow: 'hidden' as const,
      display: 'flex' as const,
      flexDirection: 'column' as const,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0,0,0,0.02)',
      flexShrink: 0,
      gap: 12,
    },
    modalHeaderRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    headerDownloadBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
      backgroundColor: tc.primary,
    },
    headerDownloadBtnText: {
      fontSize: 12,
      fontWeight: '800' as const,
      color: isDark ? '#080c14' : '#ffffff',
    },
    schoolTitle: { fontSize: 16, fontWeight: '800' as const, color: tc.text, letterSpacing: 0.5 },
    marksheetSubtitle: { fontSize: 11, color: tc.muted, letterSpacing: 0.5, marginTop: 2 },
    closeIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    modalScroll: { flex: 1, flexShrink: 1 },
    modalContent: { padding: 20, gap: 16 },

    examHeaderBox: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: isDark ? 'rgba(147,155,255,0.06)' : 'rgba(91, 140, 255, 0.08)',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(147,155,255,0.15)' : tc.line,
    },
    examHeading: { fontSize: 15, fontWeight: '800' as const, color: tc.text },
    examDatesText: { fontSize: 11, color: tc.muted, marginTop: 2 },

    // Student Info Table
    studentInfoTable: {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      borderRadius: radius.sm,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0,0,0,0.02)',
    },
    studentInfoRow: {
      flexDirection: 'row' as const,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : tc.line,
    },
    infoCol: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 14,
      flexDirection: 'row' as const,
      gap: 8,
    },
    infoLabel: { fontSize: 12, color: tc.muted, width: 120 },
    infoValue: { fontSize: 12, fontWeight: '600' as const, color: tc.text, flex: 1 },

    // Table
    tableWrap: {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : tc.line,
      borderRadius: radius.sm,
      overflow: 'hidden' as const,
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'transparent',
    },
    tableHeadRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.12)' : tc.line,
    },
    th: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: tc.muted,
      textAlign: 'center' as const,
    },
    tableRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : tc.line,
    },
    tableRowAlt: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    },
    td: {
      fontSize: 12,
      color: tc.text,
      textAlign: 'center' as const,
    },
    tdSubjectName: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: tc.text,
    },
    tdSubjectCode: {
      fontSize: 10,
      color: tc.primary,
      marginTop: 1,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700' as const,
    },
    tableFooterRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    tdTotal: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: tc.text,
      textAlign: 'center' as const,
    },

    // Summary Box
    summaryBox: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      borderRadius: radius.sm,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0,0,0,0.02)',
      padding: 12,
    },
    summaryCol: {
      flex: 1,
      minWidth: 110,
      alignItems: 'center' as const,
    },
    summaryLabel: { fontSize: 11, color: tc.muted, marginBottom: 2 },
    summaryValue: { fontSize: 14, fontWeight: '700' as const, color: tc.text },

    noteBox: {
      paddingVertical: 6,
    },
    noteText: { fontSize: 11, color: tc.muted, fontStyle: 'italic' as const },

    // Modal Actions
    modalActions: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0,0,0,0.02)',
    },
    downloadPdfBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 7,
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: radius.sm,
      backgroundColor: tc.primary,
    },
    downloadPdfBtnText: { color: isDark ? '#080c14' : '#ffffff', fontSize: 13, fontWeight: '700' as const },
    closeBtn: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: radius.sm,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    closeBtnText: { color: tc.text, fontSize: 13, fontWeight: '600' as const },
  };
}
