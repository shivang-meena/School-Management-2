import { colors, surfaces, radius, shadow } from '../../src/theme';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotices } from '../../src/hooks/useQueries';
import { api } from '../../src/services/api';
import { useTheme, THEME_PALETTES, ThemeColors } from '../../src/context/ThemeContext';

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
  const { isDark } = useTheme();
  const s = getThemedStyles(isDark);
  const { user } = useAuth();
  const router = useRouter();
  const { data: timetable, isLoading } = useQuery({
    queryKey: ['student-auto-timetable-dashboard'],
    queryFn: async () => (await api.get('/timetable')).data,
  });
  const { data: noticesData, isLoading: noticesLoading } = useNotices();
  const notices = Array.isArray(noticesData) ? noticesData : [];

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

        {/* ── Notice Board ── */}
        <View style={s.noticeCard}>
          <View style={s.noticeGlow} pointerEvents="none" />
          <View style={s.noticeHeader}>
            <View>
              <View style={s.noticeEyebrowRow}>
                <Ionicons name="megaphone-outline" size={12} color="#c4b5fd" />
                <Text style={s.noticeEyebrow}>CAMPUS & CLASS UPDATES</Text>
              </View>
              <Text style={s.noticeTitle}>Notice Board</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/student/notices' as any)}
              style={s.noticeViewAllBtn}
              activeOpacity={0.8}
            >
              <Text style={s.noticeViewAllText}>View all</Text>
              <Ionicons name="arrow-forward" size={13} color="#c4b5fd" />
            </TouchableOpacity>
          </View>

          {noticesLoading ? (
            <ActivityIndicator color="#c4b5fd" style={{ marginTop: 16 }} />
          ) : notices.length === 0 ? (
            <View style={s.emptyRow}>
              <Ionicons name="megaphone-outline" size={22} color="rgba(255,255,255,0.20)" />
              <Text style={s.emptyText}>No active notices published for you.</Text>
            </View>
          ) : (
            notices.slice(0, 3).map((notice: any, idx: number) => {
              const formattedDate = notice.createdAt
                ? new Date(notice.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : null;
              return (
                <TouchableOpacity
                  key={notice.id || idx}
                  style={s.noticeRow}
                  activeOpacity={0.7}
                  onPress={() => router.push('/student/notices' as any)}
                >
                  <View style={s.noticeIconBadge}>
                    <Ionicons name="notifications" size={15} color="#c4b5fd" />
                  </View>
                  <View style={s.noticeInfo}>
                    <View style={s.noticeItemTitleRow}>
                      <Text style={s.noticeItemTitle} numberOfLines={1}>
                        {notice.title || 'Notice'}
                      </Text>
                      {formattedDate ? (
                        <Text style={s.noticeDate}>{formattedDate}</Text>
                      ) : null}
                    </View>
                    <Text style={s.noticeMessage} numberOfLines={2}>
                      {notice.message || 'No additional details.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
                </TouchableOpacity>
              );
            })
          )}
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
  page: { flex: 1, backgroundColor: tc.canvas },
  content: { ...surfaces.content, gap: 20 },

  // ── Orb ──────────────────────────────────────────────────────
  glowOrb: {
    position: 'absolute' as const,
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -80,
    right: -100,
    backgroundColor: isDark ? 'rgba(139,92,246,0.10)' : 'rgba(139,92,246,0.06)',
  },

  // ── Hero ─────────────────────────────────────────────────────
  hero: {
    backgroundColor: tc.panel,
    borderRadius: radius.xl,
    padding: 26,
    borderWidth: 1,
    borderColor: tc.line,
    overflow: 'hidden' as const,
    ...shadow.md,
  },
  heroGlow: {
    position: 'absolute' as const,
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -50,
    backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)',
  },
  heroPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.10)',
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.30)' : 'rgba(99,102,241,0.20)',
  },
  eyebrow: { fontSize: 10, color: isDark ? colors.blueLight : colors.primary, letterSpacing: 1.5, fontWeight: '800' as const },
  heroName: { fontSize: 26, color: tc.text, fontWeight: '800' as const, letterSpacing: -0.3 },
  heroId: { fontSize: 13, lineHeight: 20, color: tc.muted, marginTop: 8 },
  heroBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, marginTop: 14 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  heroBadgeText: { fontSize: 12, color: colors.success, fontWeight: '700' as const },

  // ── Notice Board ──────────────────────────────────────────────
  noticeCard: {
    backgroundColor: tc.panel,
    borderRadius: radius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: tc.line,
    overflow: 'hidden' as const,
    ...shadow.sm,
  },
  noticeGlow: {
    position: 'absolute' as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -40,
    backgroundColor: isDark ? 'rgba(196,181,253,0.09)' : 'rgba(196,181,253,0.05)',
  },
  noticeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  noticeEyebrowRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  noticeEyebrow: {
    fontSize: 10,
    color: isDark ? '#c4b5fd' : '#7c3aed',
    letterSpacing: 1.5,
    fontWeight: '800' as const,
  },
  noticeTitle: {
    color: tc.text,
    fontSize: 18,
    fontWeight: '800' as const,
    marginTop: 5,
    letterSpacing: -0.2,
  },
  noticeViewAllBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: isDark ? 'rgba(196,181,253,0.12)' : 'rgba(167,139,250,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(196,181,253,0.25)' : 'rgba(167,139,250,0.30)',
  },
  noticeViewAllText: {
    color: isDark ? '#c4b5fd' : '#7c3aed',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  noticeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: tc.line,
  },
  noticeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: isDark ? 'rgba(196,181,253,0.12)' : 'rgba(167,139,250,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  noticeInfo: {
    flex: 1,
    gap: 3,
  },
  noticeItemTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  noticeItemTitle: {
    color: tc.text,
    fontSize: 14,
    fontWeight: '700' as const,
    flex: 1,
  },
  noticeDate: {
    color: tc.muted,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  noticeMessage: {
    color: tc.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Schedule Card ─────────────────────────────────────────────
  scheduleCard: {
    backgroundColor: tc.panel,
    borderRadius: radius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: tc.line,
    overflow: 'hidden' as const,
    ...shadow.sm,
  },
  scheduleGlow: {
    position: 'absolute' as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -40,
    backgroundColor: isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.05)',
  },
  scheduleHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  scheduleTitle: { color: tc.text, fontSize: 18, fontWeight: '800' as const, marginTop: 5, letterSpacing: -0.2 },
  viewAllBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.20)',
  },
  viewAllText: { color: isDark ? colors.blueLight : colors.primary, fontSize: 12, fontWeight: '700' as const },
  emptyRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 16 },
  emptyText: { color: tc.muted, fontSize: 13 },
  periodRow: {
    flexDirection: 'row' as const,
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: tc.line,
    alignItems: 'center' as const,
  },
  periodTimeBadge: {
    backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.10)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 52,
    alignItems: 'center' as const,
  },
  periodTime: { color: isDark ? colors.blueLight : colors.primary, fontSize: 11, fontWeight: '700' as const },
  periodInfo: { flex: 1 },
  periodSubject: { color: tc.text, fontSize: 14, fontWeight: '700' as const },
  periodTeacher: { color: tc.muted, fontSize: 12, marginTop: 2 },
  periodDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tc.line },

  // ── Section Head ─────────────────────────────────────────────
  sectionHead: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800' as const, color: tc.text, letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: tc.muted },

  // ── Grid ─────────────────────────────────────────────────────
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 14 },
  card: {
    backgroundColor: tc.panel,
    flex: 1,
    minWidth: 200,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: tc.line,
    overflow: 'hidden' as const,
    ...shadow.sm,
  },
  cardAccent: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 14,
    marginTop: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' as const, color: tc.text, letterSpacing: -0.2 },
  cardCopy: { color: tc.muted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  cardFooter: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, marginTop: 18 },
  openText: { fontWeight: '800' as const, fontSize: 12 },
});
