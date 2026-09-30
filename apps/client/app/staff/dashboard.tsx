import { colors, surfaces, radius, shadow } from '../../src/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';

interface TileConfig {
  title: string;
  copy: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
}

function buildTiles(user: any): TileConfig[] {
  const base: TileConfig[] = [
    { title: 'Own Attendance',      copy: 'Daily status and history',              path: '/staff/attendance',          icon: 'checkbox-outline',       color: '#34d399', tint: 'rgba(52,211,153,0.12)'  },
    { title: 'Own Salary',          copy: 'Finalized calculations and payments',   path: '/staff/salary',              icon: 'cash-outline',           color: '#fbbf24', tint: 'rgba(251,191,36,0.12)'  },
    { title: 'Teaching Timetable',  copy: 'All assigned sections and periods',     path: '/staff/timetable',           icon: 'time-outline',           color: '#818cf8', tint: 'rgba(99,102,241,0.12)'  },
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

  return [...base, ...extra];
}

export default function Screen() {
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

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { ...surfaces.content, gap: 20 },

  // ── Orb ──────────────────────────────────────────────────────
  glowOrb: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    top: -100,
    right: -80,
    backgroundColor: 'rgba(99,102,241,0.10)',
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
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -60,
    backgroundColor: 'rgba(99,102,241,0.14)',
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
  heroName: { fontSize: 26, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.4 },
  heroId: { fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.45)', marginTop: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  heroBadgeText: { fontSize: 12, color: colors.success, fontWeight: '700' },

  // ── Section Head ─────────────────────────────────────────────
  sectionHead: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#f0f6ff', letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: 'rgba(255,255,255,0.40)' },

  // ── Grid ─────────────────────────────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    flex: 1,
    minWidth: 220,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardAccent: {
    position: 'absolute',
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
