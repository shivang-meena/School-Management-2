import React from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useStudents, useStaff, useAccountsOverview, useAcademics, useNotices } from '../../src/hooks/useQueries';
import { useAuth } from '../../src/hooks/useAuth';
import { colors, surfaces } from '../../src/theme';

const actions = [
  { title: 'Students', copy: 'Admissions & student profiles', href: 'students', icon: '◎', tint: '#EDF2FF', color: '#3563E9' },
  { title: 'Employees', copy: 'People, roles & assignments', href: 'staff', icon: '♙', tint: '#F2EDFF', color: '#8159C6' },
  { title: 'Attendance', copy: 'Your daily school register', href: 'attendance', icon: '✓', tint: '#E9F7F1', color: '#238565' },
  { title: 'Fee Management', copy: 'Fees, receipts & collections', href: 'fees', icon: '₹', tint: '#FFF4E5', color: '#AF761F' },
  { title: 'Timetable', copy: 'Classes, periods & teachers', href: 'timetable', icon: '▦', tint: '#E9F5FC', color: '#327DAD' },
  { title: 'Exams & Marks', copy: 'Assessments & student results', href: 'exams', icon: '▧', tint: '#FDEEF3', color: '#BB6080' },
];
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function Screen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const students = useStudents();
  const employees = useStaff();
  const accounts = useAccountsOverview();
  const academics = useAcademics();
  const notices = useNotices();
  const current = academics.data?.academicYears?.find((year: any) => year.isCurrent);
  const compact = width < 700;
  const columns = width >= 1300 ? 3 : compact ? 1 : 2;
  const noticesList = Array.isArray(notices.data) ? notices.data.slice(0, 3) : [];
  const open = (path: string) => router.push(`/(admin)/${path}` as any);
  const value = (query: { isLoading: boolean; isError: boolean }, display: string | number | undefined) => query.isLoading ? '…' : query.isError ? '—' : display ?? '—';

  return <ScrollView style={s.page} contentContainerStyle={[s.content, compact && { padding: 16 }]}>
    <View style={s.pageHeading}><View><Text style={s.pageTitle}>School overview</Text><Text style={s.subtitle}>A little clarity for a great school day.</Text></View><View style={s.yearBadge}><View style={s.yearDot}/><Text style={s.yearText}>{current?.name || 'Academic workspace'}</Text></View></View>
    <View style={[s.hero, compact && { padding: 24 }]}>
      <View style={s.heroCopy}><Text style={s.eyebrow}>YOUR CAMPUS, CONNECTED</Text><Text style={[s.welcome, compact && { fontSize: 27, lineHeight: 35 }]}>Welcome back, {user?.name?.split(' ')[0] || 'Admin'}.</Text><Text style={s.heroDescription}>Everything you need to keep your school moving forward, together in one place.</Text><Pressable accessibilityRole="link" onPress={() => open('attendance')} style={s.heroButton}><Text style={s.heroButtonText}>Open daily attendance  →</Text></Pressable></View>
      {!compact ? <View style={s.heroArt} accessible={false}><View style={s.artCircle}/><View style={s.artCard}><Text style={s.artIcon}>▤</Text><Text style={s.artHeading}>Every student.</Text><Text style={s.artHeading}>Every possibility.</Text><View style={s.artLine}/><View style={[s.artLine, { width: 65, opacity: 0.5 }]}/></View><View style={s.artBadge}><Text style={s.artBadgeText}>✓  Ready for a new day</Text></View></View> : null}
    </View>
    <View style={s.metrics}>
      <Metric label="Students" value={value(students, students.data?.length)} note={students.isError ? 'Unable to load students' : 'Student directory'} icon="◎" color="#3563E9" tint="#EDF2FF" onPress={() => open('students')} compact={compact}/>
      <Metric label="Employees" value={value(employees, employees.data?.length)} note={employees.isError ? 'Unable to load employees' : 'Our school team'} icon="♙" color="#8159C6" tint="#F2EDFF" onPress={() => open('staff')} compact={compact}/>
      <Metric label="Recorded income" value={value(accounts, accounts.data ? money(accounts.data.income) : undefined)} note={accounts.isError ? 'Unable to load accounts' : 'School accounts'} icon="₹" color="#238565" tint="#E9F7F1" onPress={() => open('accounts')} compact={compact}/>
      <Metric label="Ledger balance" value={value(accounts, accounts.data ? money(accounts.data.balance) : undefined)} note={accounts.isError ? 'Unable to load accounts' : 'Income less expenses'} icon="▣" color="#AF761F" tint="#FFF4E5" onPress={() => open('accounts')} compact={compact}/>
    </View>
    <View style={[s.lower, width < 1200 && { flexDirection: 'column' }]}>
      <View style={s.modules}><View style={s.sectionHeading}><View><Text style={s.sectionTitle}>School management</Text><Text style={s.subtitle}>Your everyday essentials, a click away.</Text></View></View>
        <View style={s.grid}>{actions.map(action => <View key={action.href} style={{ width: columns === 3 ? '33.333%' : columns === 2 ? '50%' : '100%', padding: 6 }}><Pressable accessibilityRole="link" accessibilityLabel={`Open ${action.title}`} onPress={() => open(action.href)} style={({ pressed }) => [s.moduleCard, pressed && { opacity: 0.75, borderColor: action.color }]}><View style={s.cardTop}><View style={[s.moduleIcon, { backgroundColor: action.tint }]}><Text style={[s.symbol, { color: action.color }]}>{action.icon}</Text></View><Text style={s.arrow}>↗</Text></View><Text style={s.cardTitle}>{action.title}</Text><Text style={s.cardCopy}>{action.copy}</Text></Pressable></View>)}</View>
        <View style={s.shortcuts}>{[['Academic setup', 'academics'], ['Payroll', 'salary'], ['Accounts', 'accounts']].map(([label, path]) => <Pressable key={path} accessibilityRole="link" onPress={() => open(path)} style={s.shortcut}><Text style={s.shortcutText}>{label}  →</Text></Pressable>)}</View>
      </View>
      <View style={[s.noticePanel, width < 1200 && { width: '100%' }]}><View style={s.noticeHeading}><View style={s.smallIcon}><Text style={s.noticeSymbol}>◇</Text></View><Text style={s.sectionTitle}>Notice board</Text></View><Text style={s.subtitle}>The latest from your school.</Text>
        {notices.isLoading ? <Text style={s.empty}>Loading school notices…</Text> : notices.isError ? <View style={s.emptyState}><Text style={s.emptyTitle}>Notices couldn't be loaded</Text><Pressable accessibilityRole="button" onPress={() => notices.refetch()}><Text style={s.textLink}>Try again →</Text></Pressable></View> : noticesList.length ? noticesList.map((notice: any, index: number) => <Pressable accessibilityRole="link" key={notice.id || index} onPress={() => open('notices')} style={s.notice}><Text style={s.noticeAudience}>{notice.audience ? String(notice.audience).replace(/_/g, ' ') : 'SCHOOL UPDATE'}</Text><Text style={s.noticeTitle}>{notice.title || 'School announcement'}</Text><Text numberOfLines={2} style={s.noticeCopy}>{notice.message || notice.content || notice.description || 'Open the notice board for details.'}</Text></Pressable>) : <View style={s.emptyState}><Text style={s.emptySymbol}>▤</Text><Text style={s.emptyTitle}>A fresh notice board</Text><Text style={s.empty}>Publish an announcement to keep your school community informed.</Text></View>}
        <Pressable accessibilityRole="link" onPress={() => open('notices')} style={s.noticeFooter}><Text style={s.textLink}>View notice board  →</Text></Pressable>
      </View>
    </View>
    <Text style={s.footer}>SHIVORA TECHNOLOGIES  ·  Technology for better workflows.</Text>
  </ScrollView>;
}
function Metric({ label, value, note, icon, color, tint, onPress, compact }: { label: string; value: string | number; note: string; icon: string; color: string; tint: string; onPress: () => void; compact: boolean }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={`${label}: ${value}. ${note}`} onPress={onPress} style={[s.metric, compact && { flexBasis: '45%', minWidth: 130 }]}><View style={s.cardTop}><View style={[s.metricIcon, { backgroundColor: tint }]}><Text style={[s.symbol, { color }]}>{icon}</Text></View><Text style={s.arrow}>↗</Text></View><Text style={s.metricLabel}>{label}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={s.metricValue}>{value}</Text><Text style={s.metricNote}>{note}</Text></Pressable>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { ...surfaces.content, padding: 28, gap: 24 }, pageHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, pageTitle: { fontSize: 25, fontWeight: '800', color: colors.ink }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 }, yearBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8 }, yearDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#309A79' }, yearText: { fontSize: 11, color: colors.ink, fontWeight: '600' },
  hero: { backgroundColor: '#E7EEFF', borderWidth: 1, borderColor: '#DBE5FE', borderRadius: 20, padding: 32, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', gap: 12 }, heroCopy: { flex: 1 }, eyebrow: { fontSize: 9, color: colors.blue, letterSpacing: 1.8, fontWeight: '800' }, welcome: { color: '#233F76', fontSize: 32, lineHeight: 40, fontWeight: '800', marginTop: 14 }, heroDescription: { color: '#647CA4', fontSize: 13, lineHeight: 22, maxWidth: 440, marginTop: 10 }, heroButton: { backgroundColor: colors.blue, alignSelf: 'flex-start', borderRadius: 9, paddingHorizontal: 16, paddingVertical: 13, marginTop: 23 }, heroButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroArt: { width: 220, height: 180, alignItems: 'center', justifyContent: 'center' }, artCircle: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#D6E2FF' }, artCard: { backgroundColor: '#fff', width: 154, padding: 20, borderRadius: 14, transform: [{ rotate: '-7deg' }] }, artIcon: { color: colors.blue, fontSize: 29, marginBottom: 9 }, artHeading: { color: '#345387', fontSize: 12, fontWeight: '700', lineHeight: 18 }, artLine: { width: 90, height: 5, borderRadius: 4, backgroundColor: '#DCE6FF', marginTop: 8 }, artBadge: { position: 'absolute', bottom: 2, right: -4, backgroundColor: '#fff', borderRadius: 9, padding: 11, borderWidth: 1, borderColor: '#DCE6FF' }, artBadgeText: { color: '#238565', fontSize: 10, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, metric: { ...surfaces.card, backgroundColor: '#fff', borderRadius: 15, padding: 18, flex: 1, minWidth: 180 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, metricIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, symbol: { fontSize: 23 }, arrow: { color: '#96A5BE', fontSize: 19 }, metricLabel: { color: colors.muted, fontSize: 11, marginTop: 17, fontWeight: '600' }, metricValue: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 6 }, metricNote: { color: '#94A0B5', fontSize: 10, marginTop: 8 },
  lower: { flexDirection: 'row', gap: 24 }, modules: { flex: 1, minWidth: 0 }, sectionHeading: { marginBottom: 12 }, sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' }, grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -6 }, moduleCard: { ...surfaces.card, flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 18 }, moduleIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 18 }, cardCopy: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 5 }, shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }, shortcut: { backgroundColor: '#E9EEF7', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }, shortcutText: { color: '#5C7093', fontSize: 11, fontWeight: '600' },
  noticePanel: { ...surfaces.card, width: 290, backgroundColor: '#fff', borderRadius: 16, padding: 22, alignSelf: 'flex-start' }, noticeHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, smallIcon: { backgroundColor: colors.paleBlue, width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, noticeSymbol: { color: colors.blue, fontSize: 22 }, notice: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18, marginTop: 18 }, noticeAudience: { fontSize: 8, letterSpacing: 1.2, color: colors.blue, fontWeight: '700' }, noticeTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 7 }, noticeCopy: { fontSize: 11, color: colors.muted, lineHeight: 18, marginTop: 5 }, emptyState: { alignItems: 'center', paddingVertical: 32 }, emptySymbol: { fontSize: 40, color: '#BCCBE5', marginBottom: 12 }, emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' }, empty: { color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 10 }, noticeFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 16 }, textLink: { fontSize: 12, fontWeight: '700', color: colors.blue, marginTop: 4 }, footer: { textAlign: 'center', color: '#8C9BB2', fontSize: 9, letterSpacing: 0.8, paddingTop: 8 },
});
