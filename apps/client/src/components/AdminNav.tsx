import React, { useEffect } from 'react';
import { Image, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import type { UserProfile } from '@erp/contracts';

export type PortalRole = 'admin' | 'student' | 'staff';
export const ADMIN_NAV_LINKS = [
  { href: '/(admin)/dashboard', label: 'Dashboard', icon: '◫', group: 'OVERVIEW' },
  { href: '/(admin)/students', label: 'Students', icon: '◎', group: 'SCHOOL MANAGEMENT' },
  { href: '/(admin)/staff', label: 'Employees', icon: '♙', group: 'SCHOOL MANAGEMENT' },
  { href: '/(admin)/academics', label: 'Academics', icon: '▤', group: 'SCHOOL MANAGEMENT' },
  { href: '/(admin)/attendance', label: 'Attendance', icon: '✓', group: 'SCHOOL MANAGEMENT' },
  { href: '/(admin)/timetable', label: 'Timetable', icon: '▦', group: 'SCHOOL MANAGEMENT' },
  { href: '/(admin)/exams', label: 'Exams & Marks', icon: '▧', group: 'SCHOOL MANAGEMENT' },
  { href: '/(admin)/fees', label: 'Fee Management', icon: '₹', group: 'FINANCE' },
  { href: '/(admin)/salary', label: 'Payroll', icon: '▣', group: 'FINANCE' },
  { href: '/(admin)/accounts', label: 'Accounts', icon: '≡', group: 'FINANCE' },
  { href: '/(admin)/notices', label: 'Notice Board', icon: '◇', group: 'COMMUNICATION' },
];
export function getPortalLinks(role: PortalRole, user?: UserProfile | null) {
  if (role === 'admin') return ADMIN_NAV_LINKS;
  const items = role === 'student'
    ? [['dashboard', 'Dashboard', '◫'], ['attendance', 'My Attendance', '✓'], ['timetable', 'Timetable', '▦'], ['calendar', 'Academic Calendar', '▤'], ['results', 'My Results', '▧'], ['fees', 'My Fees', '₹'], ['notices', 'Notice Board', '◇']]
    : [['dashboard', 'Dashboard', '◫'], ['attendance', 'My Attendance', '✓'], ...(user?.canMarkStudentAttendance ? [['student-attendance', 'Student Attendance', '✓']] : []), ...(user?.canMarkEmployeeAttendance ? [['employee-attendance', 'Employee Attendance', '✓']] : []), ['timetable', 'Teaching Timetable', '▦'], ['calendar', 'Academic Calendar', '▤'], ['salary', 'My Salary', '₹'], ['notices', 'Notice Board', '◇']];
  return items.map(([path, label, icon]) => ({ href: `/(${role})/${path}`, label, icon, group: 'MY WORKSPACE' }));
}
export function AdminNav({ role = 'admin', onNavigate, onClose }: { role?: PortalRole; onNavigate?: () => void; onClose?: () => void }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, logout, refreshProfile } = useAuth();
  useEffect(() => {
    if (role !== 'staff') return;
    void refreshProfile();
    const timer = setInterval(() => { void refreshProfile(); }, 15000);
    return () => clearInterval(timer);
  }, [role, refreshProfile]);
  const links = getPortalLinks(role, user);
  const page = segments[segments.length - 1];
  const name = user?.name || user?.loginId || 'School member';
  return <View style={s.sidebar}>
    <View style={s.brand}><Image source={require('../../assets/icon.png')} style={s.brandLogo} resizeMode="contain" />{onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Close navigation" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable> : null}</View>
    <View style={s.portal}><View style={s.dot}/><Text style={s.portalText}>{role === 'admin' ? 'Administration' : role === 'staff' ? 'Employee portal' : 'Student portal'}</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.navigation}>
      {links.map((link, index) => {
        const active = page === link.href.split('/').pop();
        return <React.Fragment key={link.href}>
          {index === 0 || links[index - 1].group !== link.group ? <Text style={s.group}>{link.group}</Text> : null}
          <Pressable accessibilityRole="link" accessibilityState={{ selected: active }} onPress={() => { router.navigate(link.href as any); onNavigate?.(); }} style={({ pressed }) => [s.link, active && s.active, pressed && s.pressed]}>
            <Text style={[s.icon, active && s.activeText]}>{link.icon}</Text><Text style={[s.label, active && s.activeText]}>{link.label}</Text>{active ? <View style={s.activeDot}/> : null}
          </Pressable>
        </React.Fragment>;
      })}
    </ScrollView>
    <View style={s.footer}><View style={s.profile}><View style={s.avatar}><Text style={s.initial}>{name.charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.name}>{name}</Text><Text style={s.role}>{role === 'admin' ? 'School administrator' : role === 'staff' ? 'Employee' : 'Student'}</Text></View></View>
      <Pressable accessibilityRole="button" onPress={() => { logout(); onNavigate?.(); router.replace('/(auth)/login'); }} style={s.signOut}><Text style={s.signOutText}>↗  Sign out</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  sidebar: { flex: 1, backgroundColor: colors.navy, paddingTop: 26 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  brandLogo: { width: 180, height: 72, borderRadius: 12, backgroundColor: '#fff' },
  brandName: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 2 }, caption: { color: '#91A5C3', fontSize: 9, letterSpacing: 2, marginTop: 5 },
  portal: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1C304D', margin: 24, marginBottom: 10, borderRadius: 8, padding: 10 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7AB5FF' }, portalText: { color: '#CFDDF1', fontSize: 11, fontWeight: '600' },
  navigation: { paddingHorizontal: 14, paddingBottom: 24 }, group: { color: '#869AB8', fontSize: 9, fontWeight: '700', letterSpacing: 1.7, marginTop: 22, marginBottom: 9, marginLeft: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 44, marginBottom: 3, borderRadius: 9 }, active: { backgroundColor: colors.blue }, pressed: { opacity: 0.7 },
  icon: { color: '#9EB2CD', fontSize: 20, width: 23, textAlign: 'center' }, label: { color: '#B9C8DD', fontSize: 13, fontWeight: '500', flex: 1 }, activeText: { color: '#fff', fontWeight: '700' }, activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  footer: { padding: 18, borderTopWidth: 1, borderTopColor: '#273B57' }, profile: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#2A4264', alignItems: 'center', justifyContent: 'center' }, initial: { color: '#DCEAFF', fontWeight: '700' }, name: { color: '#F4F7FC', fontSize: 12, fontWeight: '700' }, role: { color: '#94A8C5', fontSize: 10, marginTop: 4 },
  signOut: { borderRadius: 8, padding: 10, marginTop: 14 }, signOutText: { color: '#ACBED7', fontSize: 12 }, close: { width: 34, height: 40, justifyContent: 'center', alignItems: 'center' }, closeText: { color: '#fff', fontSize: 26 },
});
