import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

export const ADMIN_NAV_LINKS = [
  { href: '/(admin)/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/(admin)/students', label: 'Students', icon: '👨‍🎓' },
  { href: '/(admin)/staff', label: 'Staff', icon: '👩‍🏫' },
  { href: '/(admin)/attendance', label: 'Attendance', icon: '✅' },
  { href: '/(admin)/fees', label: 'Fees', icon: '💳' },
  { href: '/(admin)/exams', label: 'Exams & Marks', icon: '📝' },
  { href: '/(admin)/notices', label: 'Notices', icon: '📢' },
  { href: '/(admin)/accounts', label: 'Accounts', icon: '🧾' },
];

export const AdminNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.navContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {ADMIN_NAV_LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <TouchableOpacity
              key={link.href}
              style={[styles.link, isActive && styles.activeLink]}
              onPress={() => router.push(link.href as any)}
            >
              <Text style={styles.icon}>{link.icon}</Text>
              <Text style={[styles.label, isActive && styles.activeLabel]}>{link.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
  },
  scroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  activeLink: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  activeLabel: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
