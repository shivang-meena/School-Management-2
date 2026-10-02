import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { api } from '../../src/services/api';
import { colors, surfaces } from '../../src/theme';

type Period = {
  id: string;
  dayOfWeek: number;
  periodNumber: number;
  entryType: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  subject?: { name: string; code?: string } | null;
  employee?: { id: string; name: string } | null;
  section?: { id: string; name: string; schoolClass?: { id: string; name: string } } | null;
};

type TabMode = 'MY_SCHEDULE' | 'CLASS_TIMETABLE';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function displayTime(value: string) {
  const match = value?.match(/(?:T|^)(\d{2}):(\d{2})/);
  if (!match) return 'Time not set';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function displayDate(value: string) {
  const date = value?.slice(0, 10);
  return date ? date.split('-').reverse().join('/') : 'Not set';
}

export default function Screen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabMode>('MY_SCHEDULE');

  const isTeacher = user?.subRole === 'TEACHER' || !user?.subRole;
  if (!isTeacher) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090d16', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#94a3b8', fontSize: 16, textAlign: 'center' }}>Teaching timetable is only available for teaching faculty.</Text>
      </View>
    );
  }

  // Tab 1 (My Schedule) filter: 0 = All days, 1-7 = Mon-Sun
  const [selectedDay, setSelectedDay] = useState(0);

  // Tab 2 (Class Timetable) filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [classViewDay, setClassViewDay] = useState(0);

  // 1. Query for Logged-in Teacher's Personal Teaching Timetable
  const myTimetableQuery = useQuery<Period[]>({
    queryKey: ['employee-teaching-timetable', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/timetable');
      if (!Array.isArray(data)) throw new Error('Invalid timetable response');
      return data;
    },
    enabled: user?.role === 'EMPLOYEE',
  });

  // 2. Query Academics classes for Tab 2
  const academicsQuery = useQuery<any>({
    queryKey: ['academics-overview-for-staff'],
    queryFn: async () => (await api.get('/academics')).data,
    enabled: user?.role === 'EMPLOYEE' && tab === 'CLASS_TIMETABLE',
  });

  const classes = academicsQuery.data?.classes || [];
  const currentClassId = selectedClassId || classes[0]?.id || '';
  const currentClass = classes.find((c: any) => c.id === currentClassId);
  const sections = currentClass?.sections || [];
  const currentSectionId = selectedSectionId && sections.some((s: any) => s.id === selectedSectionId)
    ? selectedSectionId
    : sections[0]?.id || '';

  // 3. Query Selected Class's Complete Timetable for Tab 2
  const classTimetableQuery = useQuery<Period[]>({
    queryKey: ['staff-class-timetable', currentSectionId, classViewDay],
    queryFn: async () => {
      if (!currentSectionId) return [];
      const { data } = await api.get('/timetable', {
        params: {
          sectionId: currentSectionId,
          dayOfWeek: classViewDay > 0 ? classViewDay : undefined,
        },
      });
      if (!Array.isArray(data)) return [];
      return data;
    },
    enabled: user?.role === 'EMPLOYEE' && tab === 'CLASS_TIMETABLE' && !!currentSectionId,
  });

  // Data processing for Tab 1 (Personal Schedule)
  const myPeriods = myTimetableQuery.data || [];
  const myDayGroups = days.map((name, index) => ({
    name,
    day: index + 1,
    periods: myPeriods
      .filter((period) => period.dayOfWeek === index + 1)
      .sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime)),
  })).filter((group) => selectedDay === 0 ? group.periods.length > 0 : group.day === selectedDay);

  // Data processing for Tab 2 (Class Timetable)
  const classPeriods = classTimetableQuery.data || [];
  const classDayGroups = days.map((name, index) => ({
    name,
    day: index + 1,
    periods: classPeriods
      .filter((period) => period.dayOfWeek === index + 1)
      .sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime)),
  })).filter((group) => classViewDay === 0 ? group.periods.length > 0 : group.day === classViewDay);

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.content}>
        {/* ── Hero Section ── */}
        <View style={s.hero}>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>
              {tab === 'MY_SCHEDULE' ? 'MY TEACHING SCHEDULE' : 'ALL CLASSES TIMETABLE'}
            </Text>
            <Text style={s.title}>
              {tab === 'MY_SCHEDULE' ? 'Teaching Timetable' : 'School Class Schedule'}
            </Text>
            <Text style={s.description}>
              {tab === 'MY_SCHEDULE'
                ? `${user?.name ? `${user.name} · ` : ''}Your currently active teaching periods across all assigned classes.`
                : 'Browse the complete daily timetable of any class and section in the school.'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh timetable"
            disabled={myTimetableQuery.isFetching || classTimetableQuery.isFetching}
            style={s.refresh}
            onPress={() => {
              if (tab === 'MY_SCHEDULE') void myTimetableQuery.refetch();
              else void classTimetableQuery.refetch();
            }}
          >
            <Text style={s.refreshText}>
              {myTimetableQuery.isFetching || classTimetableQuery.isFetching ? 'Refreshing…' : '↻ Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Main Navigation Tabs ── */}
        <View style={s.mainTabs}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'MY_SCHEDULE' }}
            style={[s.mainTab, tab === 'MY_SCHEDULE' && s.mainTabActive]}
            onPress={() => setTab('MY_SCHEDULE')}
          >
            <Text style={s.mainTabIcon}>👤</Text>
            <Text style={[s.mainTabText, tab === 'MY_SCHEDULE' && s.mainTabTextActive]}>
              My Schedule
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'CLASS_TIMETABLE' }}
            style={[s.mainTab, tab === 'CLASS_TIMETABLE' && s.mainTabActive]}
            onPress={() => setTab('CLASS_TIMETABLE')}
          >
            <Text style={s.mainTabIcon}>🏫</Text>
            <Text style={[s.mainTabText, tab === 'CLASS_TIMETABLE' && s.mainTabTextActive]}>
              All Classes Timetable
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════ TAB 1: MY PERSONAL SCHEDULE ════════ */}
        {tab === 'MY_SCHEDULE' ? (
          <>
            {myTimetableQuery.isLoading ? (
              <View style={s.state}><ActivityIndicator color={colors.blue} /><Text style={s.description}>Loading your timetable…</Text></View>
            ) : myTimetableQuery.isError ? (
              <View style={s.state}><Text style={s.error}>Could not load your timetable.</Text><Text style={s.description}>Use Refresh to try again.</Text></View>
            ) : !myPeriods.length ? (
              <View style={s.state}>
                <Text style={s.stateTitle}>No active teaching periods</Text>
                <Text style={s.description}>Your timetable will appear here once an administrator schedules teaching periods for you.</Text>
              </View>
            ) : (
              <>
                {/* Day Filters */}
                <View style={s.dayFilters}>
                  {['All days', ...days].map((name, index) => (
                    <TouchableOpacity
                      key={name}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: selectedDay === index }}
                      style={[s.dayFilter, selectedDay === index && s.selectedDay]}
                      onPress={() => setSelectedDay(index)}
                    >
                      <Text style={[s.dayFilterText, selectedDay === index && s.selectedDayText]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {myDayGroups.map((group) => (
                  <View key={group.day} style={s.dayGroup}>
                    <View style={s.dayHeading}>
                      <Text style={s.dayTitle}>{group.name}</Text>
                      <Text style={s.count}>{group.periods.length} teaching period(s)</Text>
                    </View>

                    {!group.periods.length ? (
                      <View style={s.state}><Text style={s.description}>No teaching periods scheduled for {group.name}.</Text></View>
                    ) : (
                      group.periods.map((period) => (
                        <View key={period.id} style={s.period}>
                          <View style={s.periodTop}>
                            <Text style={s.periodNumber}>Period {period.periodNumber}</Text>
                            <Text style={s.time}>{displayTime(period.startTime)} – {displayTime(period.endTime)}</Text>
                          </View>
                          <Text style={s.subject}>
                            {period.entryType === 'BREAK' ? 'Break' : period.subject?.name || 'Subject not set'}
                          </Text>
                          <Text style={s.className}>
                            {period.section?.schoolClass?.name || 'Class not set'} · Section {period.section?.name || '—'}
                          </Text>
                          <Text style={s.validity}>
                            Effective: {displayDate(period.effectiveFrom)}
                            {period.effectiveTo ? ` to ${displayDate(period.effectiveTo)}` : ' onwards'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ))}
              </>
            )}
          </>
        ) : null}

        {/* ════════ TAB 2: ALL CLASSES TIMETABLE ════════ */}
        {tab === 'CLASS_TIMETABLE' ? (
          <View style={s.classViewShell}>
            {/* Filter Card: Class & Section */}
            <View style={s.filterCard}>
              <Text style={s.filterCardTitle}>Select Class & Section to View</Text>

              {/* Class Chips */}
              <Text style={s.filterLabel}>Class</Text>
              {academicsQuery.isLoading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : classes.length === 0 ? (
                <Text style={s.emptyHint}>No academic classes available.</Text>
              ) : (
                <View style={s.chipsRow}>
                  {classes.map((c: any) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.chip, currentClassId === c.id && s.chipActive]}
                      onPress={() => {
                        setSelectedClassId(c.id);
                        setSelectedSectionId('');
                      }}
                    >
                      <Text style={currentClassId === c.id ? s.chipTextActive : s.chipText}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Section Chips */}
              <Text style={[s.filterLabel, { marginTop: 10 }]}>
                Section for {currentClass?.name || 'Class'}
              </Text>
              {sections.length === 0 ? (
                <Text style={s.emptyHint}>No sections configured for this class.</Text>
              ) : (
                <View style={s.chipsRow}>
                  {sections.map((sec: any) => (
                    <TouchableOpacity
                      key={sec.id}
                      style={[s.chip, currentSectionId === sec.id && s.chipActive]}
                      onPress={() => setSelectedSectionId(sec.id)}
                    >
                      <Text style={currentSectionId === sec.id ? s.chipTextActive : s.chipText}>
                        Section {sec.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Day Filter */}
              <Text style={[s.filterLabel, { marginTop: 10 }]}>Day of Week</Text>
              <View style={s.chipsRow}>
                {['All days', ...days].map((name, index) => (
                  <TouchableOpacity
                    key={name}
                    style={[s.chip, classViewDay === index && s.chipActive]}
                    onPress={() => setClassViewDay(index)}
                  >
                    <Text style={classViewDay === index ? s.chipTextActive : s.chipText}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Display Class Schedule */}
            {classTimetableQuery.isLoading ? (
              <View style={s.state}>
                <ActivityIndicator color={colors.blue} />
                <Text style={s.description}>
                  Loading timetable for {currentClass?.name} - Section {sections.find((s: any) => s.id === currentSectionId)?.name}…
                </Text>
              </View>
            ) : classTimetableQuery.isError ? (
              <View style={s.state}>
                <Text style={s.error}>Could not load class timetable.</Text>
              </View>
            ) : !classPeriods.length ? (
              <View style={s.state}>
                <Text style={s.stateTitle}>No schedule published</Text>
                <Text style={s.description}>
                  No periods have been scheduled for {currentClass?.name || 'this class'} - Section {sections.find((s: any) => s.id === currentSectionId)?.name || ''} yet.
                </Text>
              </View>
            ) : (
              classDayGroups.map((group) => (
                <View key={group.day} style={s.dayGroup}>
                  <View style={s.dayHeading}>
                    <Text style={s.dayTitle}>{group.name}</Text>
                    <Text style={s.count}>{group.periods.length} period(s)</Text>
                  </View>

                  <View style={{ gap: 10 }}>
                    {group.periods.map((period) => {
                      const isBreak = period.entryType === 'BREAK';
                      const isMyPeriod = period.employee?.id === user?.id;

                      return (
                        <View
                          key={period.id}
                          style={[s.period, isBreak && s.periodBreak, isMyPeriod && s.myPeriodHighlight]}
                        >
                          <View style={s.periodTop}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[s.periodNumber, isBreak && s.periodNumberBreak]}>
                                {isBreak ? 'Recess / Break' : `Period ${period.periodNumber}`}
                              </Text>
                              {isMyPeriod ? (
                                <View style={s.myTag}>
                                  <Text style={s.myTagText}>★ Your Class</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={s.time}>
                              {displayTime(period.startTime)} – {displayTime(period.endTime)}
                            </Text>
                          </View>

                          <Text style={[s.subject, isBreak && s.subjectBreak]}>
                            {isBreak ? 'Recess / Lunch Interval' : (period.subject?.name || 'Subject not set')}
                          </Text>

                          {!isBreak ? (
                            <Text style={s.teacherName}>
                              Teacher: {period.employee?.name || 'Teacher not assigned'}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...surfaces.content, gap: 18 },
  hero: { ...surfaces.card, backgroundColor: colors.surface, padding: 24, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  heroCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0 },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: 8 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  refresh: { backgroundColor: colors.paleBlue, borderRadius: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  refreshText: { color: colors.blue, fontWeight: '700' },

  mainTabs: { flexDirection: 'row', gap: 10 },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  mainTabActive: {
    backgroundColor: 'rgba(147, 155, 255, 0.20)',
    borderColor: colors.primary,
  },
  mainTabIcon: { fontSize: 18 },
  mainTabText: { color: 'rgba(255, 255, 255, 0.60)', fontSize: 14, fontWeight: '700' },
  mainTabTextActive: { color: '#fff', fontWeight: '800' },

  dayFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayFilter: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  selectedDay: { backgroundColor: colors.blue, borderColor: colors.blue },
  dayFilterText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  selectedDayText: { color: '#fff' },

  dayGroup: { gap: 12 },
  dayHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  dayTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
  count: { fontSize: 12, color: colors.muted },

  period: { ...surfaces.card, backgroundColor: colors.surface, borderRadius: 14, padding: 20, gap: 8 },
  periodBreak: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  myPeriodHighlight: {
    borderColor: 'rgba(147, 155, 255, 0.40)',
    backgroundColor: 'rgba(147, 155, 255, 0.08)',
  },
  periodTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  periodNumber: { color: colors.blue, backgroundColor: colors.paleBlue, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontWeight: '700', fontSize: 12 },
  periodNumberBreak: { color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.20)' },
  myTag: {
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  myTagText: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  time: { color: colors.ink, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  subject: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  subjectBreak: { color: '#fbbf24' },
  className: { color: colors.ink, fontSize: 14 },
  teacherName: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 13, fontWeight: '600' },
  validity: { color: colors.muted, fontSize: 12 },

  classViewShell: { gap: 18 },
  filterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  filterCardTitle: { color: '#f0f6ff', fontSize: 16, fontWeight: '800' },
  filterLabel: { color: 'rgba(255, 255, 255, 0.60)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#071d33', fontSize: 13, fontWeight: '800' },
  emptyHint: { color: 'rgba(255, 255, 255, 0.35)', fontSize: 12, fontStyle: 'italic', marginVertical: 4 },

  state: { ...surfaces.card, backgroundColor: colors.surface, padding: 24, borderRadius: 14, alignItems: 'center' },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  error: { color: '#B42318', fontWeight: '700' },
});
