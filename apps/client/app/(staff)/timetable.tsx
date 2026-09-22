import React, { useState } from 'react';
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
  section?: { name: string; schoolClass?: { name: string } } | null;
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function displayTime(value: string) {
  // API stores timetable wall-clock times on a UTC reference date.
  // Keep the saved hour rather than shifting it to the device timezone.
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
  const [selectedDay, setSelectedDay] = useState(0);
  const timetable = useQuery<Period[]>({
    queryKey: ['employee-teaching-timetable', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/timetable');
      if (!Array.isArray(data)) throw new Error('Invalid timetable response');
      return data;
    },
    enabled: user?.role === 'EMPLOYEE',
  });
  const periods = timetable.data || [];
  const dayGroups = days.map((name, index) => ({
    name,
    day: index + 1,
    periods: periods.filter((period) => period.dayOfWeek === index + 1)
      .sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime)),
  })).filter((group) => selectedDay === 0 ? group.periods.length > 0 : group.day === selectedDay);

  return <View style={s.page}>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <View style={s.heroCopy}>
          <Text style={s.eyebrow}>MY TEACHING SCHEDULE</Text>
          <Text style={s.title}>Teaching Timetable</Text>
          <Text style={s.description}>{user?.name ? `${user.name} · ` : ''}Your currently active teaching periods across all assigned classes and sections.</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh teaching timetable" disabled={timetable.isFetching} style={s.refresh} onPress={() => { void timetable.refetch(); }}>
          <Text style={s.refreshText}>{timetable.isFetching ? 'Refreshing…' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {timetable.isLoading ? <View style={s.state}><ActivityIndicator color={colors.blue} /><Text style={s.description}>Loading your timetable…</Text></View>
        : timetable.isError ? <View style={s.state}><Text style={s.error}>Could not load your timetable.</Text><Text style={s.description}>Use Refresh to try again.</Text></View>
        : !periods.length ? <View style={s.state}><Text style={s.stateTitle}>No active teaching periods</Text><Text style={s.description}>Your timetable will appear here once an administrator schedules teaching periods for you.</Text></View>
        : <>
          <View style={s.dayFilters}>
            {['All days', ...days].map((name, index) => <TouchableOpacity key={name} accessibilityRole="tab" accessibilityState={{ selected: selectedDay === index }} style={[s.dayFilter, selectedDay === index && s.selectedDay]} onPress={() => setSelectedDay(index)}>
              <Text style={[s.dayFilterText, selectedDay === index && s.selectedDayText]}>{name}</Text>
            </TouchableOpacity>)}
          </View>
          {dayGroups.map((group) => <View key={group.day} style={s.dayGroup}>
            <View style={s.dayHeading}><Text style={s.dayTitle}>{group.name}</Text><Text style={s.count}>{group.periods.length} period(s)</Text></View>
            {!group.periods.length ? <View style={s.state}><Text style={s.description}>No teaching periods scheduled for {group.name}.</Text></View> : group.periods.map((period) => <View key={period.id} style={s.period}>
              <View style={s.periodTop}>
                <Text style={s.periodNumber}>Period {period.periodNumber}</Text>
                <Text style={s.time}>{displayTime(period.startTime)} – {displayTime(period.endTime)}</Text>
              </View>
              <Text style={s.subject}>{period.entryType === 'BREAK' ? 'Break' : period.subject?.name || 'Subject not set'}</Text>
              <Text style={s.className}>{period.section?.schoolClass?.name || 'Class not set'} · Section {period.section?.name || '—'}</Text>
              <Text style={s.validity}>Effective: {displayDate(period.effectiveFrom)}{period.effectiveTo ? ` to ${displayDate(period.effectiveTo)}` : ' onwards'}</Text>
            </View>)}
          </View>)}
        </>}
    </ScrollView>
  </View>;
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
  periodTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  periodNumber: { color: colors.blue, backgroundColor: colors.paleBlue, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontWeight: '700', fontSize: 12 },
  time: { color: colors.ink, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  subject: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  className: { color: colors.ink, fontSize: 14 },
  validity: { color: colors.muted, fontSize: 12 },
  state: { ...surfaces.card, backgroundColor: colors.surface, padding: 24, borderRadius: 14 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  error: { color: '#B42318', fontWeight: '700' },
});
