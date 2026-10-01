import { colors, surfaces } from '../../src/theme';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/services/api';

type TimetableTab = 'DAILY' | 'EXAMS';

const DAYS = [
  { id: 0, label: 'Today' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

function displayDate(value: any) { return String(value || '').slice(0, 10); }
function displayTime(value: any) { const text = String(value || ''); return text.includes('T') ? text.slice(11, 16) : text.slice(0, 5); }
function duration(start: any, end: any) {
  const startText = displayTime(start); const endText = displayTime(end);
  const [startHour, startMinute] = startText.split(':').map(Number); const [endHour, endMinute] = endText.split(':').map(Number);
  const total = Math.max((endHour * 60 + endMinute) - (startHour * 60 + startMinute), 0);
  const hours = Math.floor(total / 60); const minutes = total % 60;
  return `${hours ? `${hours} hr ` : ''}${minutes ? `${minutes} min` : ''}`.trim() || '—';
}

export default function Screen() {
  const [tab, setTab] = useState<TimetableTab>('DAILY');
  const [selectedDay, setSelectedDay] = useState<number>(0);

  const daily = useQuery({
    queryKey: ['student-timetable', selectedDay],
    queryFn: async () => (await api.get('/timetable', {
      params: selectedDay > 0 ? { dayOfWeek: selectedDay } : {},
    })).data,
    enabled: tab === 'DAILY',
  });

  const exams = useQuery<any[]>({
    queryKey: ['student-exam-timetable'],
    queryFn: async () => (await api.get('/exam-timetables')).data,
    enabled: tab === 'EXAMS',
  });

  const data = daily.data;

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Text style={s.eyebrow}>
            {tab === 'DAILY' ? 'ACADEMIC CLASS SCHEDULE' : 'ADMIN-PUBLISHED EXAM TIMETABLE'}
          </Text>
          <Text style={s.title}>
            {tab === 'DAILY' ? (selectedDay === 0 ? "Today’s Schedule" : `${data?.dayName || 'Day'} Schedule`) : 'Exam Timetable'}
          </Text>
          <Text style={s.date}>
            {tab === 'DAILY'
              ? (data?.dayName ? `${data.dayName}${selectedDay === 0 ? `, ${data.date}` : ''}` : 'Class Schedule')
              : 'Your section-wise examination schedule'}
          </Text>
          <Text style={s.meta}>
            {data?.className ? `Class ${data.className} • Section ${data.sectionName}` : 'Your academic schedule'}
          </Text>
        </View>

        <View style={s.tabs}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'DAILY' }}
            style={[s.tab, tab === 'DAILY' && s.tabActive]}
            onPress={() => setTab('DAILY')}
          >
            <Text style={[s.tabText, tab === 'DAILY' && s.tabTextActive]}>Daily schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'EXAMS' }}
            style={[s.tab, tab === 'EXAMS' && s.tabActive]}
            onPress={() => setTab('EXAMS')}
          >
            <Text style={[s.tabText, tab === 'EXAMS' && s.tabTextActive]}>Exam timetable</Text>
          </TouchableOpacity>
        </View>

        {tab === 'DAILY' ? (
          <>
            {/* Day Selector Strip */}
            <View style={s.dayStrip}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[s.dayBtn, selectedDay === d.id && s.dayBtnActive]}
                  onPress={() => setSelectedDay(d.id)}
                >
                  <Text style={[s.dayBtnText, selectedDay === d.id && s.dayBtnTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {daily.isLoading ? (
              <View style={s.state}>
                <ActivityIndicator color={colors.primary} />
                <Text style={s.stateText}>Loading your academic timetable…</Text>
              </View>
            ) : daily.isError ? (
              <View style={s.state}>
                <Text style={s.error}>Timetable could not be loaded.</Text>
              </View>
            ) : (
              <>
                {/* Holiday notice if applicable */}
                {data?.isHoliday ? (
                  <View style={s.holidayBanner}>
                    <Text style={s.holidayEmoji}>🎉</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.holidayTitle}>{data.holidayTitle || 'Holiday / Day Off'}</Text>
                      <Text style={s.holidaySubtitle}>No regular teaching periods scheduled for this day.</Text>
                    </View>
                  </View>
                ) : null}

                {/* Period Cards */}
                <View style={s.list}>
                  {(data?.periods || []).map((period: any, idx: number) => {
                    const isBreak = period.entryType === 'BREAK';
                    return (
                      <View
                        key={period.id || idx}
                        style={[s.period, isBreak && s.periodBreak]}
                      >
                        <View style={s.time}>
                          <Text style={[s.periodNo, isBreak && s.periodNoBreak]}>
                            {isBreak ? 'BREAK' : `P${period.periodNumber}`}
                          </Text>
                          <Text style={s.timeText}>
                            {period.startTime}–{period.endTime}
                          </Text>
                        </View>
                        <View style={s.subject}>
                          <Text style={[s.subjectName, isBreak && s.subjectNameBreak]}>
                            {period.subject?.name || (isBreak ? 'Recess / Break' : 'Period')}
                          </Text>
                          <Text style={s.teacher}>
                            {isBreak
                              ? 'Interval / Break time'
                              : (period.teacher?.name ? `Teacher: ${period.teacher.name}` : 'Teacher not assigned')}
                          </Text>
                        </View>
                        <View style={[
                          s.badge,
                          isBreak && s.breakBadge,
                          period.status === 'CLASS_WORK' && s.workBadge
                        ]}>
                          <Text style={[
                            s.badgeText,
                            isBreak && s.breakText,
                            period.status === 'CLASS_WORK' && s.workText
                          ]}>
                            {isBreak ? 'RECESS' : (period.status === 'CLASS_WORK' ? 'CLASS WORK' : 'SCHEDULED')}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {!daily.isLoading && !daily.isError && !(data?.periods || []).length && !data?.isHoliday ? (
                  <View style={s.state}>
                    <Text style={s.stateText}>No class periods have been scheduled by administration for this day.</Text>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : exams.isLoading ? (
          <View style={s.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.stateText}>Loading your exam timetable…</Text>
          </View>
        ) : exams.isError ? (
          <View style={s.state}>
            <Text style={s.error}>Exam timetable could not be loaded.</Text>
          </View>
        ) : exams.data?.length ? (
          <View style={s.examList}>
            {exams.data.map((timetable: any) => (
              <View style={s.examCard} key={timetable.id}>
                <Text style={s.examTitle}>{timetable.title}</Text>
                <Text style={s.examMeta}>
                  {timetable.type} · {timetable.schoolClass?.name || 'Class'} · Section {timetable.section?.name || '—'}
                </Text>
                <Text style={s.examMeta}>
                  {displayDate(timetable.startDate)} to {displayDate(timetable.endDate)}
                </Text>
                {(timetable.entries || []).map((entry: any) => (
                  <View style={s.examRow} key={entry.id}>
                    <View style={s.examDate}>
                      <Text style={s.examDateText}>{displayDate(entry.date)}</Text>
                      <Text style={s.examDuration}>
                        {entry.isHoliday ? 'Holiday' : duration(entry.startTime, entry.endTime)}
                      </Text>
                    </View>
                    <View style={s.examSubject}>
                      <Text style={s.subjectName}>{entry.subject?.name || entry.holidayTitle || 'Holiday'}</Text>
                      {entry.isHoliday ? null : (
                        <Text style={s.teacher}>
                          {displayTime(entry.startTime)}–{displayTime(entry.endTime)} · Max {entry.maximumMarks || '—'} · Pass {entry.passMarks || '—'}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={s.state}>
            <Text style={s.stateText}>No exam timetable has been published for your section yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...surfaces.content },
  hero: {
    ...surfaces.card,
    marginBottom: 18,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexWrap: 'wrap',
  },
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.4, color: colors.blueLight },
  title: { marginTop: 8, fontSize: 28, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.3 },
  date: { color: '#f0f6ff', fontSize: 18, fontWeight: '700', marginTop: 10 },
  meta: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, marginTop: 6 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tab: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: 'rgba(255, 255, 255, 0.50)', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  dayStrip: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  dayBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  dayBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayBtnText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 12, fontWeight: '700' },
  dayBtnTextActive: { color: '#FFFFFF', fontWeight: '800' },
  holidayBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  holidayEmoji: { fontSize: 24 },
  holidayTitle: { color: colors.warning, fontWeight: '800', fontSize: 15 },
  holidaySubtitle: { color: 'rgba(255, 255, 255, 0.60)', fontSize: 12, marginTop: 2 },
  list: { gap: 10 },
  period: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  periodBreak: {
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    borderColor: 'rgba(251, 191, 36, 0.20)',
  },
  time: { width: 125 },
  periodNo: { color: colors.blueLight, fontSize: 11, fontWeight: '800' },
  periodNoBreak: { color: colors.warning },
  timeText: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 12, marginTop: 4 },
  subject: { flex: 1 },
  subjectName: { color: '#f0f6ff', fontSize: 16, fontWeight: '800' },
  subjectNameBreak: { color: colors.warning },
  teacher: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, marginTop: 5 },
  badge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.30)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: colors.success, fontSize: 10, fontWeight: '800' },
  workBadge: {
    backgroundColor: 'rgba(147, 155, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147, 155, 255, 0.30)',
  },
  workText: { color: colors.blueLight },
  breakBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.30)',
  },
  breakText: { color: colors.warning, fontSize: 10, fontWeight: '800' },
  examList: { gap: 14 },
  examCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  examTitle: { color: '#f0f6ff', fontSize: 18, fontWeight: '800' },
  examMeta: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 12, marginTop: 5 },
  examRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 14,
    paddingTop: 13,
  },
  examDate: { width: 95 },
  examDateText: { color: colors.blueLight, fontSize: 12, fontWeight: '800' },
  examDuration: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 11, marginTop: 4 },
  examSubject: { flex: 1 },
  state: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    padding: 40,
    alignItems: 'center',
    borderRadius: 14,
  },
  stateText: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 13, marginTop: 10, textAlign: 'center' },
  error: { color: colors.danger, fontWeight: '700' },
});
