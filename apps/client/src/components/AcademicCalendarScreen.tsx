import { colors, surfaces } from '../theme';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface EventConfig {
  bg: string;
  border: string;
  color: string;
  label: string;
  tagBg: string;
  icon: string;
}

const eventTypeConfig: Record<string, EventConfig> = {
  HOLIDAY: {
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.32)',
    color: '#fda4af',
    label: 'Holiday',
    tagBg: 'rgba(244, 63, 94, 0.22)',
    icon: '🌴',
  },
  WEEKLY_OFF: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.32)',
    color: '#fcd34d',
    label: 'Weekly Off',
    tagBg: 'rgba(245, 158, 11, 0.22)',
    icon: '⭐',
  },
  WORKING_DAY: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.32)',
    color: '#6ee7b7',
    label: 'Academic Event',
    tagBg: 'rgba(16, 185, 129, 0.22)',
    icon: '📌',
  },
};

const defaultEventConfig: EventConfig = {
  bg: 'rgba(99, 102, 241, 0.12)',
  border: 'rgba(99, 102, 241, 0.32)',
  color: '#a5b4fc',
  label: 'Event',
  tagBg: 'rgba(99, 102, 241, 0.22)',
  icon: '📅',
};

export function AcademicCalendarScreen({ role }: { role: 'student' | 'employee' }) {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['academic-calendar'],
    queryFn: async () => (await api.get('/academics/calendar')).data,
  });

  const entries = useMemo(() => {
    return data.filter((entry: any) => {
      const date = new Date(entry.date);
      return (
        date.getFullYear() === month.getFullYear() &&
        date.getMonth() === month.getMonth()
      );
    });
  }, [data, month]);

  const calendarEntries = useMemo(() => {
    const result = new Map<number, any>(
      entries.map((entry: any) => [new Date(entry.date).getDate(), entry])
    );
    const totalDaysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    ).getDate();

    for (let day = 1; day <= totalDaysInMonth; day += 1) {
      if (new Date(month.getFullYear(), month.getMonth(), day).getDay() === 0) {
        if (!result.has(day)) {
          result.set(day, {
            id: `sunday-${month.getFullYear()}-${month.getMonth()}-${day}`,
            date: new Date(month.getFullYear(), month.getMonth(), day),
            dayType: 'WEEKLY_OFF',
            title: 'Sunday holiday',
          });
        }
      }
    }

    return Array.from(result.values()).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [entries, month]);

  const byDate = useMemo(
    () =>
      new Map<number, any>(
        calendarEntries.map((entry: any) => [new Date(entry.date).getDate(), entry])
      ),
    [calendarEntries]
  );

  const cells = useMemo(() => {
    const firstDayIndex = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array(firstDayIndex).fill(null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [month]);

  const isCurrentMonth =
    now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth();

  const handlePrevMonth = () => {
    setSelectedDay(null);
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setSelectedDay(now.getDate());
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const holidaysCount = calendarEntries.filter((e) => e.dayType === 'HOLIDAY').length;
  const weeklyOffsCount = calendarEntries.filter((e) => e.dayType === 'WEEKLY_OFF').length;

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Header Hero */}
        <View style={s.hero}>
          <View style={s.heroText}>
            <Text style={s.eyebrow}>ACADEMIC CALENDAR</Text>
            <Text style={s.title}>School Calendar</Text>
            <Text style={s.subtitle}>
              Official holidays, weekly offs and academic dates published by administration.
            </Text>
          </View>
          <View style={s.heroBadges}>
            <View style={[s.statPill, s.statPillHoliday]}>
              <View style={[s.statDot, { backgroundColor: '#f43f5e' }]} />
              <Text style={[s.statText, { color: '#fda4af' }]}>
                {holidaysCount} Holiday{holidaysCount === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={[s.statPill, s.statPillSunday]}>
              <View style={[s.statDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={[s.statText, { color: '#fcd34d' }]}>
                {weeklyOffsCount} Sunday Offs
              </Text>
            </View>
          </View>
        </View>

        {/* Main Calendar Card */}
        <View style={s.calendarCard}>
          {/* Month Bar & Controls */}
          <View style={s.monthBar}>
            <View style={s.monthTitleGroup}>
              <Text style={s.calendarIcon}>🗓️</Text>
              <Text style={s.monthTitle}>
                {monthNames[month.getMonth()]}{' '}
                <Text style={s.yearHighlight}>{month.getFullYear()}</Text>
              </Text>
            </View>

            <View style={s.navGroup}>
              {!isCurrentMonth ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={s.todayBtn}
                  onPress={handleToday}
                >
                  <Text style={s.todayText}>Today</Text>
                </TouchableOpacity>
              ) : null}
              <View style={s.arrowControls}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={s.arrowBtn}
                  onPress={handlePrevMonth}
                >
                  <Text style={s.arrowText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={s.arrowBtn}
                  onPress={handleNextMonth}
                >
                  <Text style={s.arrowText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Legend Bar */}
          <View style={s.legendStrip}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#f43f5e' }]} />
              <Text style={s.legendLabel}>Holiday</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={s.legendLabel}>Sunday / Weekly Off</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={s.legendLabel}>Academic Event</Text>
            </View>
          </View>

          {/* Weekday Strip */}
          <View style={s.weekHeader}>
            {dayNames.map((day, idx) => (
              <View key={day} style={[s.weekDayCell, idx === 0 && s.weekDaySunday]}>
                <Text style={[s.weekDayText, idx === 0 && s.weekDaySundayText]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid Loading / Error / Content */}
          {isLoading ? (
            <View style={s.state}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={s.muted}>Loading academic calendar…</Text>
            </View>
          ) : isError ? (
            <View style={s.state}>
              <Text style={s.error}>Calendar could not be loaded.</Text>
              <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.gridContainer}>
              {cells.map((day, index) => {
                if (!day) {
                  return <View key={`blank-${index}`} style={s.blankCell} />;
                }

                const entry = byDate.get(day);
                const isDaySunday = index % 7 === 0;
                const isTodayDate =
                  day === now.getDate() &&
                  month.getMonth() === now.getMonth() &&
                  month.getFullYear() === now.getFullYear();
                const isSelected = selectedDay === day;
                const eventConfig = entry
                  ? eventTypeConfig[entry.dayType] || defaultEventConfig
                  : null;

                return (
                  <TouchableOpacity
                    key={`day-${month.getMonth()}-${day}`}
                    activeOpacity={0.75}
                    style={[
                      s.dateCell,
                      isDaySunday && !entry && s.sundayCell,
                      eventConfig && {
                        backgroundColor: eventConfig.bg,
                        borderColor: eventConfig.border,
                      },
                      isTodayDate && s.todayCell,
                      isSelected && s.selectedCell,
                    ]}
                    onPress={() => setSelectedDay(isSelected ? null : day)}
                  >
                    {/* Date Number Header */}
                    <View style={s.dateNumberRow}>
                      <View
                        style={[
                          s.dateCircle,
                          isTodayDate && s.todayCircle,
                          isSelected && s.selectedCircle,
                        ]}
                      >
                        <Text
                          style={[
                            s.dateText,
                            isTodayDate && s.todayDateText,
                            isDaySunday && !isTodayDate && s.sundayDateText,
                            isSelected && s.selectedDateText,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                      {isTodayDate ? (
                        <View style={s.todayTag}>
                          <Text style={s.todayTagText}>Today</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Event Pill inside Cell */}
                    {entry && eventConfig ? (
                      <View
                        style={[
                          s.cellEventBadge,
                          {
                            backgroundColor: eventConfig.tagBg,
                            borderColor: eventConfig.border,
                          },
                        ]}
                      >
                        <Text style={s.cellEventIcon}>{eventConfig.icon}</Text>
                        <Text
                          numberOfLines={2}
                          style={[s.cellEventTitle, { color: eventConfig.color }]}
                        >
                          {entry.title || eventConfig.label}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Bottom Upcoming Events & Holidays Section */}
          <View style={s.detailsSection}>
            <View style={s.detailsHeaderRow}>
              <View>
                <Text style={s.detailsHeading}>
                  Events & Holidays · {monthNames[month.getMonth()]}{' '}
                  {month.getFullYear()}
                </Text>
                <Text style={s.detailsSub}>
                  {calendarEntries.length} scheduled date
                  {calendarEntries.length === 1 ? '' : 's'} this month
                </Text>
              </View>
              {selectedDay ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={s.clearFilterBtn}
                  onPress={() => setSelectedDay(null)}
                >
                  <Text style={s.clearFilterText}>Show all dates ✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {calendarEntries.length ? (
              <View style={s.eventsList}>
                {calendarEntries
                  .filter(
                    (entry: any) =>
                      !selectedDay || new Date(entry.date).getDate() === selectedDay
                  )
                  .map((entry: any) => {
                    const entryDate = new Date(entry.date);
                    const eventConfig =
                      eventTypeConfig[entry.dayType] || defaultEventConfig;
                    const dateNum = entryDate.getDate();
                    const dayName = dayNames[entryDate.getDay()];
                    const isSelected = selectedDay === dateNum;

                    return (
                      <View
                        key={entry.id}
                        style={[
                          s.eventCard,
                          { borderColor: eventConfig.border },
                          isSelected && s.eventCardSelected,
                        ]}
                      >
                        {/* Left: Date Box */}
                        <View
                          style={[
                            s.eventDateBox,
                            {
                              backgroundColor: eventConfig.tagBg,
                              borderColor: eventConfig.border,
                            },
                          ]}
                        >
                          <Text style={[s.eventDateNum, { color: eventConfig.color }]}>
                            {String(dateNum).padStart(2, '0')}
                          </Text>
                          <Text style={[s.eventDateDay, { color: eventConfig.color }]}>
                            {dayName}
                          </Text>
                        </View>

                        {/* Middle: Event Title & Subtitle */}
                        <View style={s.eventInfo}>
                          <Text style={s.eventTitleText}>
                            {entry.title || eventConfig.label}
                          </Text>
                          <Text style={s.eventDateFull}>
                            {entryDate.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>

                        {/* Right: Category Pill */}
                        <View
                          style={[
                            s.categoryPill,
                            {
                              backgroundColor: eventConfig.tagBg,
                              borderColor: eventConfig.border,
                            },
                          ]}
                        >
                          <Text style={s.categoryIcon}>{eventConfig.icon}</Text>
                          <Text
                            style={[s.categoryLabel, { color: eventConfig.color }]}
                          >
                            {eventConfig.label.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            ) : (
              <View style={s.emptyEventsBox}>
                <Text style={s.emptyIcon}>📅</Text>
                <Text style={s.emptyTitle}>No official dates published</Text>
                <Text style={s.muted}>
                  There are no administration-published holidays or events recorded for this month.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...surfaces.content, paddingBottom: 36 },

  hero: {
    ...surfaces.card,
    marginBottom: 16,
    padding: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  heroText: { flex: 1, minWidth: 260 },
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.4, color: colors.blueLight },
  title: { marginTop: 6, fontSize: 26, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, marginTop: 5 },

  heroBadges: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  statPillHoliday: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  statPillSunday: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statDot: { width: 7, height: 7, borderRadius: 3.5 },
  statText: { fontSize: 12, fontWeight: '800' },

  calendarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 12,
  },
  monthTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendarIcon: { fontSize: 22 },
  monthTitle: { fontSize: 22, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.2 },
  yearHighlight: { color: colors.blueLight, fontWeight: '800' },

  navGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  todayText: { color: '#38bdf8', fontSize: 12, fontWeight: '800' },

  arrowControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrowBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginTop: -2 },

  legendStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255, 255, 255, 0.65)' },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  weekDayCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekDaySunday: {},
  weekDayText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.5,
  },
  weekDaySundayText: { color: '#f87171' },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dateCell: {
    width: '13.4%',
    minHeight: 88,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    padding: 7,
    marginHorizontal: '0.44%',
    marginVertical: 3,
    justifyContent: 'flex-start',
  },
  blankCell: {
    width: '13.4%',
    minHeight: 88,
    marginHorizontal: '0.44%',
    marginVertical: 3,
    opacity: 0,
  },
  sundayCell: {
    backgroundColor: 'rgba(251, 191, 36, 0.025)',
    borderColor: 'rgba(251, 191, 36, 0.12)',
  },
  todayCell: {
    borderColor: '#38bdf8',
    borderWidth: 1.5,
    backgroundColor: 'rgba(56, 189, 248, 0.07)',
  },
  selectedCell: {
    borderColor: '#818cf8',
    borderWidth: 2,
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
  },

  dateNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: '#38bdf8',
  },
  selectedCircle: {
    backgroundColor: '#818cf8',
  },
  dateText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  todayDateText: {
    color: '#071d33',
    fontWeight: '800',
  },
  sundayDateText: {
    color: '#fb7185',
  },
  selectedDateText: {
    color: '#ffffff',
    fontWeight: '800',
  },

  todayTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayTagText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },

  cellEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginTop: 4,
  },
  cellEventIcon: { fontSize: 9.5 },
  cellEventTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    flex: 1,
    lineHeight: 12,
  },

  detailsSection: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  detailsHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  detailsSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  clearFilterBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  clearFilterText: {
    color: '#f0f6ff',
    fontSize: 11.5,
    fontWeight: '700',
  },

  eventsList: {
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  eventCardSelected: {
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
  },
  eventDateBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDateNum: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  eventDateDay: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  eventInfo: { flex: 1 },
  eventTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  eventDateFull: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryIcon: { fontSize: 10 },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  emptyEventsBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyIcon: { fontSize: 28, marginBottom: 6 },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },

  state: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    padding: 30,
    alignItems: 'center',
    borderRadius: 14,
  },
  muted: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, marginTop: 8 },
  error: { color: colors.danger, fontWeight: '700' },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  retryText: { color: '#38bdf8', fontWeight: '700', fontSize: 12 },
});
