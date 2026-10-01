import { colors, surfaces, radius, shadow } from '../../src/theme';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { api } from '../../src/services/api';

interface TileConfig {
  title: string;
  copy: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
}

const tiles: TileConfig[] = [
  { title: 'Attendance',  copy: 'Marked days and percentage',       path: '/student/attendance', icon: 'checkbox-outline',       color: '#34d399', tint: 'rgba(52,211,153,0.12)'  },
  { title: 'Timetable',  copy: 'Today and weekly schedule',         path: '/student/timetable',  icon: 'time-outline',           color: '#818cf8', tint: 'rgba(99,102,241,0.12)'  },
  { title: 'Calendar',   copy: 'Monthly holidays and school dates', path: '/student/calendar',   icon: 'calendar-outline',       color: '#38bdf8', tint: 'rgba(56,189,248,0.12)'  },
  { title: 'Results',    copy: 'Published academic results',        path: '/student/results',    icon: 'ribbon-outline',         color: '#fbbf24', tint: 'rgba(251,191,36,0.12)'  },
  { title: 'Fees',       copy: 'Outstanding and payment history',   path: '/student/fees',       icon: 'card-outline',           color: '#f87171', tint: 'rgba(248,113,113,0.12)' },
  { title: 'Notices',    copy: 'School and class updates',          path: '/student/notices',    icon: 'megaphone-outline',      color: '#c4b5fd', tint: 'rgba(167,139,250,0.12)' },
];

export default function Screen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: timetable, isLoading } = useQuery({
    queryKey: ['student-auto-timetable-dashboard'],
    queryFn: async () => (await api.get('/timetable')).data,
  });

  return (
    <View style={s.page}>
      {/* Ambient glow */}
      <View style={s.glowOrb} pointerEvents="none" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero Welcome ── */}
        <View style={s.hero}>
          <View style={s.heroGlow} pointerEvents="none" />
          <View style={s.heroPill}>
            <Ionicons name="school-outline" size={11} color={colors.blueLight} />
            <Text style={s.eyebrow}>MY SCHOOL SPACE</Text>
          </View>
          <Text style={s.heroName}>Hello, {user?.name || 'Student'} 👋</Text>
          <Text style={s.heroId}>
            {user?.studentId ? `${user.studentId} · ` : ''}
            Academic information is read-only and private to you.
          </Text>
          <View style={s.heroBadge}>
            <View style={s.onlineDot} />
            <Text style={s.heroBadgeText}>Student Portal · Active</Text>
          </View>
        </View>

        {/* ── Today's Timetable ── */}
        <View style={s.scheduleCard}>
          <View style={s.scheduleGlow} pointerEvents="none" />
          <View style={s.scheduleHeader}>
            <View>
              <Text style={s.eyebrow}>TODAY'S CLASS SCHEDULE</Text>
              <Text style={s.scheduleTitle}>
                {timetable?.dayName ? `${timetable.dayName}, ${timetable.date}` : "Today's Schedule"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/student/timetable' as any)}
              style={s.viewAllBtn}
              activeOpacity={0.8}
            >
              <Text style={s.viewAllText}>View full</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.blueLight} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.blueLight} style={{ marginTop: 16 }} />
          ) : (timetable?.periods || []).length === 0 ? (
            <View style={s.emptyRow}>
              <Ionicons name="calendar-outline" size={22} color="rgba(255,255,255,0.20)" />
              <Text style={s.emptyText}>No periods scheduled for today.</Text>
            </View>
          ) : (
            (timetable?.periods || []).slice(0, 6).map((period: any) => (
              <View key={period.id || period.periodNumber} style={s.periodRow}>
                <View style={s.periodTimeBadge}>
                  <Text style={s.periodTime}>{period.startTime}</Text>
                </View>
                <View style={s.periodInfo}>
                  <Text style={s.periodSubject}>
                    {period.entryType === 'BREAK' ? 'Recess / Break' : (period.subject?.name || 'Period')}
                  </Text>
                  <Text style={s.periodTeacher}>
                    {period.entryType === 'BREAK'
                      ? 'Interval'
                      : (period.teacher?.name ? `Teacher: ${period.teacher.name}` : 'Teacher not assigned')}
                    {period.status === 'CLASS_WORK' ? ' · Class Work' : ''}
                  </Text>
                </View>
                <View style={s.periodDot} />
              </View>
            ))
          )}
        </View>

        {/* ── Quick Access Grid ── */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Quick Access</Text>
          <Text style={s.sectionSub}>All your academic services.</Text>
        </View>

        <View style={s.grid}>
          {tiles.map(tile => (
            <TouchableOpacity
              key={tile.path}
              accessibilityRole="button"
              style={s.card}
              onPress={() => router.push(tile.path as any)}
              activeOpacity={0.80}
            >
              <View style={[s.cardAccent, { backgroundColor: tile.color }]} />
              <View style={[s.iconWrap, { backgroundColor: tile.tint }]}>
                <Ionicons name={tile.icon} size={22} color={tile.color} />
              </View>
              <Text style={s.cardTitle}>{tile.title}</Text>
              <Text style={s.cardCopy}>{tile.copy}</Text>
              <View style={s.cardFooter}>
                <Text style={[s.openText, { color: tile.color }]}>Open</Text>
                <Ionicons name="arrow-forward" size={13} color={tile.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { ...surfaces.content, gap: 20 },

  // ── Orb ──────────────────────────────────────────────────────
  glowOrb: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -80,
    right: -100,
    backgroundColor: 'rgba(139,92,246,0.10)',
  },

  // ── Hero ─────────────────────────────────────────────────────
  hero: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    ...shadow.md,
  },
  heroGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -50,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.30)',
  },
  eyebrow: { fontSize: 10, color: colors.blueLight, letterSpacing: 1.5, fontWeight: '800' },
  heroName: { fontSize: 26, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.3 },
  heroId: { fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.45)', marginTop: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  heroBadgeText: { fontSize: 12, color: colors.success, fontWeight: '700' },

  // ── Schedule Card ─────────────────────────────────────────────
  scheduleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    ...shadow.sm,
  },
  scheduleGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -40,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  scheduleTitle: { color: '#f0f6ff', fontSize: 18, fontWeight: '800', marginTop: 5, letterSpacing: -0.2 },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  viewAllText: { color: colors.blueLight, fontSize: 12, fontWeight: '700' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  emptyText: { color: 'rgba(255,255,255,0.30)', fontSize: 13 },
  periodRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  periodTimeBadge: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 52,
    alignItems: 'center',
  },
  periodTime: { color: colors.blueLight, fontSize: 11, fontWeight: '700' },
  periodInfo: { flex: 1 },
  periodSubject: { color: '#f0f6ff', fontSize: 14, fontWeight: '700' },
  periodTeacher: { color: 'rgba(255,255,255,0.40)', fontSize: 12, marginTop: 2 },
  periodDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },

  // ── Section Head ─────────────────────────────────────────────
  sectionHead: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#f0f6ff', letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: 'rgba(255,255,255,0.40)' },

  // ── Grid ─────────────────────────────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    flex: 1,
    minWidth: 200,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#f0f6ff', letterSpacing: -0.2 },
  cardCopy: { color: 'rgba(255,255,255,0.40)', fontSize: 12, marginTop: 6, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 18 },
  openText: { fontWeight: '800', fontSize: 12 },
});
