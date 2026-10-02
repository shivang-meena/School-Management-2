import { colors, surfaces } from '../theme';
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

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) { return <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>; }
function Legend({ color, label }: { color: string; label: string }) { return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>; }

export function EmployeeAttendanceScreen({ employeeId }: Props) {
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...surfaces.content, gap: 18 },
  hero: {
    ...surfaces.card,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexWrap: 'wrap',
  },
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.4, color: colors.blueLight },
  title: { marginTop: 6, fontSize: 28, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.3 },
  description: { fontSize: 14, marginTop: 5, lineHeight: 21, color: 'rgba(255, 255, 255, 0.45)' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 18,
    minWidth: 170,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  summaryValue: { fontSize: 27, fontWeight: '800' },
  summaryLabel: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 12, fontWeight: '700', marginTop: 5 },
  legend: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  legendTitle: { color: '#f0f6ff', fontWeight: '800', marginRight: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  legendText: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12 },
  calendarPanel: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  panelTitle: { fontSize: 20, fontWeight: '800', color: '#f0f6ff' },
  marked: { color: colors.blueLight, fontSize: 12, fontWeight: '800' },
  muted: { color: 'rgba(255, 255, 255, 0.40)', marginTop: 6, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  monthCard: {
    minWidth: 220,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
  },
  monthTitle: { color: '#f0f6ff', fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  weekRow: { flexDirection: 'row', marginBottom: 5 },
  weekDay: { width: '14.2857%', textAlign: 'center', color: 'rgba(255, 255, 255, 0.40)', fontSize: 10, fontWeight: '800' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyDay: { width: '14.2857%', aspectRatio: 1, padding: 2 },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginBottom: 2,
  },
  dayNONE: { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  dayPRESENT: { backgroundColor: 'rgba(52, 211, 153, 0.20)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.35)' },
  dayABSENT: { backgroundColor: 'rgba(248, 113, 113, 0.20)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.35)' },
  dayLATE: { backgroundColor: 'rgba(251, 191, 36, 0.20)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.35)' },
  dayHALF_DAY: { backgroundColor: 'rgba(251, 191, 36, 0.20)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.35)' },
  dayText: { color: 'rgba(255, 255, 255, 0.35)', fontSize: 11, fontWeight: '700' },
  coloredDayText: { color: '#f0f6ff', fontWeight: '800' },
  state: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 42,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 14,
  },
  emptyTitle: { color: '#f0f6ff', fontSize: 18, fontWeight: '800' },
  error: { color: colors.danger, fontWeight: '700' },
  retry: { color: colors.blueLight, fontWeight: '800', marginTop: 10 },
});
