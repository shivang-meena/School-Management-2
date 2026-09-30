import React from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useStudents,
  useStaff,
  useAccountsOverview,
  useAcademics,
  useNotices,
} from '../../src/hooks/useQueries';
import { useAuth } from '../../src/hooks/useAuth';
import { colors, radius, shadow, surfaces } from '../../src/theme';

interface ActionItem {
  title: string;
  copy: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  color: string;
  accent: string;
}

const actions: ActionItem[] = [
  { title: 'Students',      copy: 'Admissions & student profiles',        href: 'students',   icon: 'people-outline',        tint: 'rgba(99,102,241,0.12)',  color: '#818cf8', accent: 'rgba(99,102,241,0.35)'  },
  { title: 'Employees',     copy: 'Faculty, roles & assignments',         href: 'staff',      icon: 'briefcase-outline',     tint: 'rgba(167,139,250,0.12)', color: '#c4b5fd', accent: 'rgba(167,139,250,0.35)' },
  { title: 'Attendance',    copy: 'Daily student & staff register',       href: 'attendance', icon: 'checkbox-outline',      tint: 'rgba(52,211,153,0.12)',  color: '#34d399', accent: 'rgba(52,211,153,0.35)'  },
  { title: 'Fee Management',copy: 'Structures, dues & receipts',         href: 'fees',       icon: 'card-outline',          tint: 'rgba(251,191,36,0.12)',  color: '#fbbf24', accent: 'rgba(251,191,36,0.35)'  },
  { title: 'Timetable',     copy: 'Classes, periods & schedules',         href: 'timetable',  icon: 'time-outline',          tint: 'rgba(56,189,248,0.12)',  color: '#38bdf8', accent: 'rgba(56,189,248,0.35)'  },
  { title: 'Exams & Marks', copy: 'Assessments & student results',       href: 'exams',      icon: 'document-text-outline', tint: 'rgba(248,113,113,0.12)', color: '#f87171', accent: 'rgba(248,113,113,0.35)' },
];

const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function Screen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const students  = useStudents();
  const employees = useStaff();
  const accounts  = useAccountsOverview();
  const academics = useAcademics();
  const notices   = useNotices();

  const current  = academics.data?.academicYears?.find((y: any) => y.isCurrent);
  const compact  = width < 700;
  const columns  = width >= 1300 ? 3 : compact ? 1 : 2;
  const noticesList = Array.isArray(notices.data) ? notices.data.slice(0, 3) : [];
  const open = (path: string) => router.push(`/admin/${path}` as any);
  const val  = (q: { isLoading: boolean; isError: boolean }, d: string | number | undefined) =>
    q.isLoading ? '…' : q.isError ? '—' : d ?? '—';

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={[s.content, compact && { padding: 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Ambient glow ── */}
      <View style={s.glowOrb} pointerEvents="none" />

      {/* ── Page Heading ── */}
      <View style={s.pageHeading}>
        <View>
          <Text style={s.pageTitle}>Institutional Overview</Text>
          <Text style={s.subtitle}>Arihant Public School administration center.</Text>
        </View>
        <View style={s.yearBadge}>
          <View style={s.yearDot} />
          <Text style={s.yearText}>{current?.name || 'Academic Session 2026–27'}</Text>
        </View>
      </View>

      {/* ── Hero Banner ── */}
      <View style={[s.hero, compact && { padding: 22 }]}>
        <View style={s.heroGlow} pointerEvents="none" />
        <View style={s.heroCopy}>
          <View style={s.heroPill}>
            <Ionicons name="sparkles" size={11} color={colors.blueLight} />
            <Text style={s.eyebrow}>CAMPUS CONTROL CENTER</Text>
          </View>
          <Text style={[s.welcome, compact && { fontSize: 24, lineHeight: 32 }]}>
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}.
          </Text>
          <Text style={s.heroDesc}>
            Manage student registrations, employee rosters, automated fees, and daily attendance in one place.
          </Text>
          <Pressable accessibilityRole="link" onPress={() => open('attendance')} style={s.heroBtn}>
            <Text style={s.heroBtnText}>Mark Daily Attendance</Text>
            <Ionicons name="arrow-forward" size={14} color="#ffffff" />
          </Pressable>
        </View>
        {!compact ? (
          <View style={s.heroArt} accessible={false}>
            <View style={s.artCircle} />
            <View style={s.artCard}>
              <Ionicons name="school" size={28} color={colors.blueLight} style={{ marginBottom: 8 }} />
              <Text style={s.artHeading}>Every student.</Text>
              <Text style={s.artHeading}>Every possibility.</Text>
              <View style={s.artLine} />
              <View style={[s.artLine, { width: 50, opacity: 0.4 }]} />
            </View>
            <View style={s.artBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={s.artBadgeText}>Campus Online</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Metrics Row ── */}
      <View style={s.metrics}>
        {[
          { label: 'Enrolled Students', value: val(students, students.data?.length),      note: 'Active roster',        icon: 'people-outline'    as const, color: '#818cf8', tint: 'rgba(99,102,241,0.15)',  path: 'students'  },
          { label: 'Faculty & Staff',   value: val(employees, employees.data?.length),    note: 'Teachers & employees', icon: 'briefcase-outline' as const, color: '#c4b5fd', tint: 'rgba(167,139,250,0.15)', path: 'staff'     },
          { label: 'Recorded Income',   value: val(accounts,  accounts.data ? money(accounts.data.income) : undefined),  note: 'Academic revenue', icon: 'wallet-outline'    as const, color: '#34d399', tint: 'rgba(52,211,153,0.15)',  path: 'accounts'  },
          { label: 'Ledger Balance',    value: val(accounts,  accounts.data ? money(accounts.data.balance) : undefined), note: 'School balance',   icon: 'pie-chart-outline' as const, color: '#fbbf24', tint: 'rgba(251,191,36,0.15)',  path: 'accounts'  },
        ].map(m => (
          <Pressable
            key={m.label}
            accessibilityRole="link"
            onPress={() => open(m.path)}
            style={[s.metric, compact && { flexBasis: '46%', minWidth: 140 }]}
          >
            <View style={s.metricTop}>
              <View style={[s.metricIcon, { backgroundColor: m.tint }]}>
                <Ionicons name={m.icon} size={18} color={m.color} />
              </View>
              <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.20)" />
            </View>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={s.metricNote}>{m.note}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Lower: Modules + Notices ── */}
      <View style={[s.lower, width < 1200 && { flexDirection: 'column' }]}>
        <View style={s.modules}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>School Management Modules</Text>
            <Text style={s.subtitle}>Quick access to your core operations.</Text>
          </View>

          <View style={s.grid}>
            {actions.map(action => (
              <View
                key={action.href}
                style={{ width: columns === 3 ? '33.333%' : columns === 2 ? '50%' : '100%', padding: 6 }}
              >
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${action.title}`}
                  onPress={() => open(action.href)}
                  style={({ pressed }) => [s.moduleCard, pressed && { opacity: 0.75, borderColor: action.accent }]}
                >
                  {/* Accent left border */}
                  <View style={[s.moduleAccent, { backgroundColor: action.color }]} />
                  <View style={s.moduleTop}>
                    <View style={[s.moduleIconWrap, { backgroundColor: action.tint }]}>
                      <Ionicons name={action.icon} size={20} color={action.color} />
                    </View>
                    <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.20)" />
                  </View>
                  <Text style={s.moduleTitle}>{action.title}</Text>
                  <Text style={s.moduleCopy}>{action.copy}</Text>
                </Pressable>
              </View>
            ))}
          </View>

          {/* Shortcuts */}
          <View style={s.shortcuts}>
            {[['Academic Setup', 'academics'], ['Salary Payroll', 'salary'], ['Accounts Ledger', 'accounts']].map(([label, path]) => (
              <Pressable key={path} accessibilityRole="link" onPress={() => open(path)} style={s.shortcut}>
                <Text style={s.shortcutText}>{label} →</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Notice Panel ── */}
        <View style={[s.noticePanel, width < 1200 && { width: '100%' }]}>
          <View style={s.noticeHead}>
            <View style={s.noticeIcon}>
              <Ionicons name="megaphone-outline" size={15} color={colors.blueLight} />
            </View>
            <Text style={s.sectionTitle}>Notice Board</Text>
          </View>
          <Text style={s.subtitle}>Latest updates from the school community.</Text>

          {notices.isLoading ? (
            <Text style={s.empty}>Loading announcements…</Text>
          ) : notices.isError ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>Unable to load notices</Text>
              <Pressable accessibilityRole="button" onPress={() => notices.refetch()}>
                <Text style={s.textLink}>Try again →</Text>
              </Pressable>
            </View>
          ) : noticesList.length ? (
            noticesList.map((notice: any, i: number) => (
              <Pressable key={notice.id || i} accessibilityRole="link" onPress={() => open('notices')} style={s.notice}>
                <Text style={s.noticeAudience}>{notice.audience ? String(notice.audience).replace(/_/g, ' ') : 'ALL COMMUNITY'}</Text>
                <Text style={s.noticeTitle}>{notice.title || 'Announcement'}</Text>
                <Text numberOfLines={2} style={s.noticeCopy}>{notice.message || notice.content || 'Open notice board.'}</Text>
              </Pressable>
            ))
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="notifications-off-outline" size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom: 8 }} />
              <Text style={s.emptyTitle}>Notice board is clear</Text>
              <Text style={s.empty}>Publish announcements to broadcast to staff or students.</Text>
            </View>
          )}

          <Pressable accessibilityRole="link" onPress={() => open('notices')} style={s.noticeFooter}>
            <Text style={s.textLink}>Open Full Notice Board →</Text>
          </Pressable>
        </View>
      </View>

      <Text style={s.footer}>ARIHANT PUBLIC SCHOOL · Unified ERP System</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { ...surfaces.content, padding: 26, gap: 24 },

  // ── Orb ──────────────────────────────────────────────────────
  glowOrb: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    top: -200,
    right: -150,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },

  // ── Page Heading ─────────────────────────────────────────────
  pageHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#f0f6ff', letterSpacing: -0.4 },
  subtitle: { color: 'rgba(255,255,255,0.40)', fontSize: 13, marginTop: 3 },
  yearBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: radius.full, ...shadow.sm },
  yearDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  yearText: { fontSize: 12, color: '#f0f6ff', fontWeight: '700' },

  // ── Hero ─────────────────────────────────────────────────────
  hero: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.xl, padding: 32, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', ...shadow.lg },
  heroGlow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, right: -80, top: -120, backgroundColor: 'rgba(99,102,241,0.15)' },
  heroCopy: { flex: 1 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,102,241,0.15)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.30)' },
  eyebrow: { fontSize: 10, color: colors.blueLight, letterSpacing: 1.5, fontWeight: '800' },
  welcome: { color: '#f0f6ff', fontSize: 28, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 },
  heroDesc: { color: 'rgba(255,255,255,0.50)', fontSize: 13, lineHeight: 21, maxWidth: 460, marginTop: 8 },
  heroBtn: { backgroundColor: colors.primary, alignSelf: 'flex-start', borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 11, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.sm },
  heroBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  heroArt: { width: 180, height: 150, alignItems: 'center', justifyContent: 'center' },
  artCircle: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(99,102,241,0.18)' },
  artCard: { backgroundColor: 'rgba(255,255,255,0.08)', width: 140, padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', transform: [{ rotate: '-5deg' }], ...shadow.md },
  artHeading: { color: '#f0f6ff', fontSize: 11, fontWeight: '800', lineHeight: 16 },
  artLine: { width: 80, height: 3, borderRadius: 2, backgroundColor: colors.blueLight, marginTop: 8 },
  artBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', ...shadow.sm },
  artBadgeText: { color: colors.success, fontSize: 10, fontWeight: '800' },

  // ── Metrics ───────────────────────────────────────────────────
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metric: { ...surfaces.card, padding: 18, flex: 1, minWidth: 180 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 11, marginTop: 14, fontWeight: '700' },
  metricValue: { fontSize: 26, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  metricNote: { color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 4 },

  // ── Lower ────────────────────────────────────────────────────
  lower: { flexDirection: 'row', gap: 24 },
  modules: { flex: 1, minWidth: 0 },
  sectionHead: { marginBottom: 12 },
  sectionTitle: { color: '#f0f6ff', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -6 },
  moduleCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', ...shadow.sm },
  moduleAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  moduleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moduleIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { color: '#f0f6ff', fontSize: 14, fontWeight: '800', marginTop: 14 },
  moduleCopy: { color: 'rgba(255,255,255,0.40)', fontSize: 11, lineHeight: 17, marginTop: 4 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  shortcut: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  shortcutText: { color: colors.blueLight, fontSize: 12, fontWeight: '700' },

  // ── Notice Panel ─────────────────────────────────────────────
  noticePanel: { ...surfaces.card, padding: 22, width: 300, alignSelf: 'flex-start' },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeIcon: { backgroundColor: 'rgba(99,102,241,0.15)', width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  notice: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14, marginTop: 14 },
  noticeAudience: { fontSize: 9, letterSpacing: 1.2, color: colors.blueLight, fontWeight: '800' },
  noticeTitle: { color: '#f0f6ff', fontSize: 13, fontWeight: '800', marginTop: 4 },
  noticeCopy: { fontSize: 11, color: 'rgba(255,255,255,0.40)', lineHeight: 17, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { color: '#f0f6ff', fontSize: 13, fontWeight: '700' },
  empty: { color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  noticeFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14, marginTop: 14 },
  textLink: { fontSize: 12, fontWeight: '800', color: colors.blueLight },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.20)', fontSize: 10, letterSpacing: 0.8, paddingTop: 12 },
});
