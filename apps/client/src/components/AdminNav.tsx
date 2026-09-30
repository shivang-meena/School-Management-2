import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, shadow } from '../theme';
import type { UserProfile } from '@erp/contracts';

export type PortalRole = 'admin' | 'student' | 'staff';

export interface NavLinkItem {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  group: string;
}

export const ADMIN_NAV_LINKS: NavLinkItem[] = [
  { href: '/admin/dashboard',          label: 'Dashboard',          icon: 'grid-outline',          group: 'OVERVIEW' },
  { href: '/admin/students',           label: 'Students',           icon: 'people-outline',        group: 'SCHOOL' },
  { href: '/admin/staff',              label: 'Employees',          icon: 'briefcase-outline',     group: 'SCHOOL' },
  { href: '/admin/academics',          label: 'Academics',          icon: 'school-outline',        group: 'SCHOOL' },
  { href: '/admin/attendance',         label: 'Attendance',         icon: 'checkbox-outline',      group: 'SCHOOL' },
  { href: '/admin/timetable',          label: 'Timetable',          icon: 'time-outline',          group: 'SCHOOL' },
  { href: '/admin/exams',              label: 'Exams & Marks',      icon: 'document-text-outline', group: 'SCHOOL' },
  { href: '/admin/fees',               label: 'Fee Management',     icon: 'card-outline',          group: 'FINANCE' },
  { href: '/admin/salary',             label: 'Payroll',            icon: 'cash-outline',          group: 'FINANCE' },
  { href: '/admin/accounts',           label: 'Accounts',           icon: 'pie-chart-outline',     group: 'FINANCE' },
  { href: '/admin/notices',            label: 'Notice Board',       icon: 'megaphone-outline',     group: 'COMMS' },
  { href: '/admin/admission-requests', label: 'Admissions',         icon: 'person-add-outline',    group: 'COMMS' },
];

export function getPortalLinks(role: PortalRole, user?: UserProfile | null): NavLinkItem[] {
  if (role === 'admin') return ADMIN_NAV_LINKS;

  const items: [string, string, keyof typeof Ionicons.glyphMap][] =
    role === 'student'
      ? [
          ['dashboard',  'Dashboard',        'grid-outline'],
          ['attendance', 'My Attendance',    'checkbox-outline'],
          ['timetable',  'Timetable',        'time-outline'],
          ['calendar',   'Calendar',         'calendar-outline'],
          ['results',    'My Results',       'ribbon-outline'],
          ['fees',       'My Fees',          'card-outline'],
          ['notices',    'Notice Board',     'megaphone-outline'],
        ]
      : [
          ['dashboard',  'Dashboard',        'grid-outline'],
          ['attendance', 'My Attendance',    'checkbox-outline'],
          ...(user?.canMarkStudentAttendance
            ? ([['student-attendance', 'Student Attendance', 'people-outline']] as [string, string, keyof typeof Ionicons.glyphMap][])
            : []),
          ...(user?.canMarkEmployeeAttendance
            ? ([['employee-attendance', 'Employee Attendance', 'briefcase-outline']] as [string, string, keyof typeof Ionicons.glyphMap][])
            : []),
          ['timetable',  'Teaching Timetable', 'time-outline'],
          ['calendar',   'Academic Calendar',  'calendar-outline'],
          ['salary',     'My Salary',           'cash-outline'],
          ['notices',    'Notice Board',        'megaphone-outline'],
        ];

  return items.map(([path, label, icon]) => ({
    href: `/${role}/${path}`,
    label,
    icon,
    group: 'MY WORKSPACE',
  }));
}

export function AdminNav({
  role = 'admin',
  onNavigate,
  onClose,
}: {
  role?: PortalRole;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
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
  const name = user?.name || user?.loginId || 'School Member';

  // Group links
  const groups = links.reduce<Record<string, NavLinkItem[]>>((acc, link) => {
    if (!acc[link.group]) acc[link.group] = [];
    acc[link.group].push(link);
    return acc;
  }, {});

  const roleLabel =
    role === 'admin'   ? 'Administrator Portal' :
    role === 'staff'   ? 'Faculty & Staff Portal' :
                         'Student & Parent Portal';

  return (
    <View style={s.sidebar}>
      {/* ── Brand ── */}
      <View style={s.brand}>
        <View style={s.brandBadge}>
          <Ionicons name="school" size={22} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.brandName}>Arihant Public</Text>
          <Text style={s.brandCaption}>SCHOOL ERP</Text>
        </View>
        {onClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation"
            onPress={onClose}
            style={s.closeBtn}
          >
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        ) : null}
      </View>

      {/* ── Portal Pill ── */}
      <View style={s.portalPill}>
        <View style={s.portalDot} />
        <Text style={s.portalText}>{roleLabel}</Text>
      </View>

      {/* ── Navigation ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.nav}>
        {Object.entries(groups).map(([group, items]) => (
          <View key={group}>
            <Text style={s.groupLabel}>{group}</Text>
            {items.map(link => {
              const active = page === link.href.split('/').pop();
              return (
                <Pressable
                  key={link.href}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    router.navigate(link.href as any);
                    onNavigate?.();
                  }}
                  style={({ pressed }) => [s.link, active && s.linkActive, pressed && s.linkPressed]}
                >
                  <View style={[s.iconWrap, active && s.iconWrapActive]}>
                    <Ionicons
                      name={link.icon}
                      size={16}
                      color={active ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                    />
                  </View>
                  <Text style={[s.linkLabel, active && s.linkLabelActive]}>{link.label}</Text>
                  {active ? <View style={s.activeDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* ── Footer Profile ── */}
      <View style={s.footer}>
        <View style={s.profileRow}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.userName}>{name}</Text>
            <Text style={s.userRole}>
              {role === 'admin' ? 'School Administrator' : role === 'staff' ? 'Faculty Member' : 'Student'}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            logout();
            onNavigate?.();
            router.replace('/(auth)/login');
          }}
          style={s.signOutBtn}
        >
          <Ionicons name="log-out-outline" size={15} color="rgba(255,255,255,0.40)" style={{ marginRight: 6 }} />
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Shell ────────────────────────────────────────────────────
  sidebar: {
    flex: 1,
    backgroundColor: 'rgba(8,12,20,0.98)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.07)',
    paddingTop: 20,
  },

  // ── Brand ────────────────────────────────────────────────────
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  brandName: {
    color: '#f0f6ff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  brandCaption: {
    color: colors.blueLight,
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Portal Pill ──────────────────────────────────────────────
  portalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99,102,241,0.12)',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  portalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  portalText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Nav ──────────────────────────────────────────────────────
  nav: {
    paddingHorizontal: 10,
    paddingBottom: 16,
    paddingTop: 6,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 10,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    minHeight: 40,
    marginBottom: 2,
    borderRadius: radius.md,
    gap: 10,
  },
  linkActive: {
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  linkPressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  linkLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  linkLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.70)',
  },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paleBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.glowBorderSm,
  },
  avatarInitial: {
    color: colors.blueLight,
    fontWeight: '800',
    fontSize: 14,
  },
  userName: {
    color: '#f0f6ff',
    fontSize: 13,
    fontWeight: '700',
  },
  userRole: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 11,
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  signOutText: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 12,
    fontWeight: '600',
  },
});
