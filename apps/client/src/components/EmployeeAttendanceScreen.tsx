import { colors, surfaces } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
type Props = { employeeId?: string };
type CalendarStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'NONE';
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function displayDate(value?: string) { return value ? value.slice(0, 10) : ''; }
function statusFor(value: string): CalendarStatus { if (value === 'PRESENT') return 'PRESENT'; if (value === 'LATE') return 'LATE'; if (value === 'ABSENT' || value === 'LEAVE' || value === 'PAID_LEAVE' || value === 'UNPAID_LEAVE') return 'ABSENT'; if (value === 'HALF_DAY') return 'HALF_DAY'; return 'NONE'; }

function YearCalendar({ startDate, endDate, records }: { startDate: string; endDate: string; records: any[] }) {
  const { isDark } = useTheme();
  const styles = getThemedStyles(isDark);
  const recordMap = useMemo(() => new Map(records.map((record) => [displayDate(record.date), statusFor(record.status)])), [records]);
  const months = useMemo(() => {
    const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`), end = new Date(`${endDate.slice(0, 10)}T00:00:00Z`);
    const result: { year: number; month: number; days: Date[] }[] = [];
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cursor <= end) {
      const days: Date[] = [], lastDay = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
      for (let day = 1; day <= lastDay; day += 1) { const current = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), day)); if (current >= start && current <= end) days.push(current); }
      result.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth(), days });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return result;
  }, [startDate, endDate]);
  return <View style={styles.calendarGrid}>{months.map((month) => { const firstDay = month.days[0]?.getUTCDay() || 0; return <View style={styles.monthCard} key={`${month.year}-${month.month}`}><Text style={styles.monthTitle}>{monthNames[month.month]} {month.year}</Text><View style={styles.weekRow}>{weekDays.map((day, index) => <Text style={styles.weekDay} key={`${day}-${index}`}>{day}</Text>)}</View><View style={styles.daysGrid}>{Array.from({ length: firstDay }).map((_, index) => <View style={styles.emptyDay} key={`empty-${index}`} />)}{month.days.map((day) => { const status = recordMap.get(dateKey(day)) || 'NONE'; return <View key={dateKey(day)} style={[styles.dayCell, styles[`day${status}`]]}><Text style={[styles.dayText, status !== 'NONE' && styles.coloredDayText]}>{day.getUTCDate()}</Text></View>; })}</View></View>; })}</View>;
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const { isDark } = useTheme();
  const styles = getThemedStyles(isDark);
  return <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}
function Legend({ color, label }: { color: string; label: string }) {
  const { isDark } = useTheme();
  const styles = getThemedStyles(isDark);
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

export function EmployeeAttendanceScreen({ employeeId }: Props) {
  const { isDark, colors: tc } = useTheme();
  const styles = getThemedStyles(isDark);
  const attendance = useQuery<any>({ queryKey: ['employee-attendance-year', employeeId], queryFn: async () => (await api.get(`/attendance/employees/${employeeId}`)).data, enabled: !!employeeId });
  const data = attendance.data;
  const summary = data?.summary || { marked: 0, present: 0, late: 0, absent: 0, percentage: null };
  const year = data?.academicYear;
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YEARLY ATTENDANCE</Text>
          <Text style={styles.title}>My Attendance</Text>
          <Text style={styles.description}>
            {data?.employee?.name ? `${data.employee.name} · ${data.employee.designation || ''}` : 'Your attendance calendar and yearly summary.'}
          </Text>
        </View>

        {attendance.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Loading your attendance…</Text>
          </View>
        ) : attendance.isError ? (
          <View style={styles.state}>
            <Text style={styles.error}>Attendance could not be loaded.</Text>
            <TouchableOpacity onPress={() => attendance.refetch()}>
              <Text style={styles.retry}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : !year ? (
          <View style={styles.state}>
            <Text style={styles.emptyTitle}>Academic year not available</Text>
            <Text style={styles.muted}>The current academic year has not been configured yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard label="Present Days" value={summary.present} color="#34d399" />
              <SummaryCard label="Absent Days" value={summary.absent} color="#f87171" />
              <SummaryCard label="Late Days" value={summary.late} color="#fbbf24" />
              <SummaryCard label="Attendance %" value={summary.percentage == null ? '—' : `${summary.percentage}%`} color="#939bff" />
            </View>

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Calendar legend</Text>
              <Legend color="rgba(52,211,153,0.30)" label="Present (P)" />
              <Legend color="rgba(248,113,113,0.30)" label="Absent (A)" />
              <Legend color="rgba(251,191,36,0.30)" label="Late (L)" />
              <Legend color="rgba(255,255,255,0.06)" label="Unmarked" />
            </View>

            <View style={styles.calendarPanel}>
              <View style={styles.calendarHeader}>
                <View>
                  <Text style={styles.panelTitle}>{year.name}</Text>
                  <Text style={styles.muted}>Only saved attendance is counted. Unmarked dates remain neutral.</Text>
                </View>
                <Text style={styles.marked}>{summary.marked} marked day(s)</Text>
              </View>
              <YearCalendar startDate={year.startDate} endDate={year.endDate} records={data.records || []} />
            </View>
          </>
        )}
      </ScrollView>
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
    content: { ...surfaces.content, gap: 18 },
    hero: {
      ...surfaces.card,
      padding: 24,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tc.line,
      flexWrap: 'wrap' as const,
    },
    eyebrow: { fontWeight: '800' as const, fontSize: 10, letterSpacing: 1.4, color: tc.primary },
    title: { marginTop: 6, fontSize: 28, color: tc.text, fontWeight: '800' as const, letterSpacing: -0.3 },
    description: { fontSize: 14, marginTop: 5, lineHeight: 21, color: tc.muted },
    summaryGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
    summaryCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderRadius: 16,
      padding: 18,
      minWidth: 170,
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : tc.line,
    },
    summaryValue: { fontSize: 27, fontWeight: '800' as const },
    summaryLabel: { color: tc.muted, fontSize: 12, fontWeight: '700' as const, marginTop: 5 },
    legend: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : tc.line,
    },
    legendTitle: { color: tc.text, fontWeight: '800' as const, marginRight: 4 },
    legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    legendDot: { width: 16, height: 16, borderRadius: 5, borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : tc.line },
    legendText: { color: tc.muted, fontSize: 12 },
    calendarPanel: {
      ...surfaces.card,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      padding: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : tc.line,
      borderRadius: 14,
    },
    calendarHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 16,
      flexWrap: 'wrap' as const,
      gap: 12,
    },
    panelTitle: { fontSize: 20, fontWeight: '800' as const, color: tc.text },
    marked: { color: tc.primary, fontSize: 12, fontWeight: '800' as const },
    muted: { color: tc.muted, marginTop: 6, textAlign: 'center' as const },
    calendarGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
    monthCard: {
      minWidth: 220,
      flex: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : tc.line,
      borderRadius: 14,
      padding: 12,
    },
    monthTitle: { color: tc.text, fontWeight: '800' as const, textAlign: 'center' as const, marginBottom: 10 },
    weekRow: { flexDirection: 'row' as const, marginBottom: 5 },
    weekDay: { width: '14.2857%', textAlign: 'center' as const, color: tc.muted, fontSize: 10, fontWeight: '800' as const },
    daysGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
    emptyDay: { width: '14.2857%', aspectRatio: 1, padding: 2 },
    dayCell: {
      width: '14.2857%',
      aspectRatio: 1,
      padding: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: 6,
      marginBottom: 2,
    },
    dayNONE: { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)' },
    dayPRESENT: { backgroundColor: 'rgba(52, 211, 153, 0.20)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.35)' },
    dayABSENT: { backgroundColor: 'rgba(248, 113, 113, 0.20)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.35)' },
    dayLATE: { backgroundColor: 'rgba(251, 191, 36, 0.20)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.35)' },
    dayHALF_DAY: { backgroundColor: 'rgba(251, 191, 36, 0.20)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.35)' },
    dayText: { color: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(17, 25, 54, 0.40)', fontSize: 11, fontWeight: '700' as const },
    coloredDayText: { color: isDark ? '#f0f6ff' : '#080c14', fontWeight: '800' as const },
    state: {
      ...surfaces.card,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.panel,
      padding: 42,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : tc.line,
      borderRadius: 14,
    },
    emptyTitle: { color: tc.text, fontSize: 18, fontWeight: '800' as const },
    error: { color: colors.danger, fontWeight: '700' as const },
    retry: { color: tc.primary, fontWeight: '800' as const, marginTop: 10 },
  };
}
