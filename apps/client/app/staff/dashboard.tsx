import { colors, surfaces, radius, shadow } from '../../src/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme, THEME_PALETTES, ThemeColors } from '../../src/context/ThemeContext';

interface TileConfig {
  title: string;
  copy: string;
  path: string;
  icon: any;
  color: string;
  tint: string;
}

function buildTiles(user: any): TileConfig[] {
  const isAccountant = user?.subRole === 'ACCOUNTANT';
  const isTeacher = user?.subRole === 'TEACHER' || !user?.subRole;

  const base: TileConfig[] = [
    ...(isAccountant
      ? ([
          { title: 'Fee Management',      copy: 'Student fee accounts and collections',  path: '/staff/fees',                icon: 'card-outline',           color: '#10b981', tint: 'rgba(16,185,129,0.12)' },
          { title: 'Payroll',             copy: 'Employee salaries and payments',        path: '/staff/payroll',             icon: 'cash-outline',           color: '#f59e0b', tint: 'rgba(245,158,11,0.12)'  },
        ] as TileConfig[])
      : []),
    { title: 'Own Attendance',      copy: 'Daily status and history',              path: '/staff/attendance',          icon: 'checkbox-outline',       color: '#34d399', tint: 'rgba(52,211,153,0.12)'  },
    { title: 'Own Salary',          copy: 'Finalized calculations and payments',   path: '/staff/salary',              icon: 'cash-outline',           color: '#fbbf24', tint: 'rgba(251,191,36,0.12)'  },
    ...(isTeacher
      ? [{ title: 'Teaching Timetable',  copy: 'All assigned sections and periods',     path: '/staff/timetable',           icon: 'time-outline',           color: '#818cf8', tint: 'rgba(99,102,241,0.12)'  }]
      : []),
    { title: 'Academic Calendar',   copy: 'Monthly holidays and school dates',     path: '/staff/calendar',            icon: 'calendar-outline',       color: '#38bdf8', tint: 'rgba(56,189,248,0.12)'  },
    { title: 'Notice Board',        copy: 'Employee announcements',                path: '/staff/notices',             icon: 'megaphone-outline',      color: '#c4b5fd', tint: 'rgba(167,139,250,0.12)' },
  ];

  const extra: TileConfig[] = [];
  if (user?.canMarkStudentAttendance) {
    extra.push({ title: 'Student Attendance', copy: 'Mark attendance by class and section', path: '/staff/student-attendance', icon: 'people-outline', color: '#f87171', tint: 'rgba(248,113,113,0.12)' });
  }
  if (user?.canMarkEmployeeAttendance) {
    extra.push({ title: 'Employee Attendance', copy: 'Mark attendance for employees', path: '/staff/employee-attendance', icon: 'briefcase-outline', color: '#fbbf24', tint: 'rgba(251,191,36,0.12)' });
  }
  if (isTeacher) {
    extra.push({
      title: 'Class Marks Entry',
      copy: 'Enter exam marks for your assigned class',
      path: '/staff/marks',
      icon: 'school-outline',
      color: '#f59e0b',
      tint: 'rgba(245,158,11,0.12)',
    });
  }

  return [...base, ...extra];
}

export default function Screen() {
  const { isDark } = useTheme();
  const s = getThemedStyles(isDark);
  const { user } = useAuth();
  const router = useRouter();
  const tiles = buildTiles(user);

  return (
    <View style={s.page}>
      {/* Ambient glow */}
      <View style={s.glowOrb} pointerEvents="none" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero Welcome ── */}
        <View style={s.hero}>
          <View style={s.heroGlow} pointerEvents="none" />
          <View style={s.heroPill}>
            <Ionicons name="briefcase-outline" size={11} color={colors.blueLight} />
            <Text style={s.eyebrow}>EMPLOYEE WORKSPACE</Text>
          </View>
          <Text style={s.heroName}>{user?.name || 'Staff Member'}</Text>
          <Text style={s.heroId}>
            {user?.employeeId ? `${user.employeeId} · ` : ''}
            Permissions and assignment scope are verified for every action.
          </Text>
          <View style={s.heroBadge}>
            <View style={s.onlineDot} />
            <Text style={s.heroBadgeText}>Faculty Portal · Active</Text>
          </View>
        </View>

        {/* ── Tiles Grid ── */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Quick Access</Text>
          <Text style={s.sectionSub}>All your workspace modules in one place.</Text>
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
              {/* Accent top border */}
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
    width: 400,
    height: 400,
    borderRadius: 200,
    top: -100,
    right: -80,
    backgroundColor: isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)',
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
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -60,
    backgroundColor: isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)',
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
  heroName: { fontSize: 26, color: tc.text, fontWeight: '800' as const, letterSpacing: -0.4 },
  heroId: { fontSize: 13, lineHeight: 20, color: tc.muted, marginTop: 8 },
  heroBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, marginTop: 14 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  heroBadgeText: { fontSize: 12, color: colors.success, fontWeight: '700' as const },

  // ── Section Head ─────────────────────────────────────────────
  sectionHead: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800' as const, color: tc.text, letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: tc.muted },

  // ── Grid ─────────────────────────────────────────────────────
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 14 },

  card: {
    backgroundColor: tc.panel,
    flex: 1,
    minWidth: 220,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: tc.line,
    overflow: 'hidden' as const,
    ...shadow.sm,
  },
  cardAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
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
