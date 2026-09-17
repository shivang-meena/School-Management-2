import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

export const ADMIN_NAV_LINKS = [
  { href: '/(admin)/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/(admin)/students', label: 'Students', icon: '👨‍🎓' },
  { href: '/(admin)/staff', label: 'Employees', icon: '👩‍🏫' },
  { href: '/(admin)/academics', label: 'Academics', icon: '🏫' },
  { href: '/(admin)/attendance', label: 'Attendance', icon: '✅' },
  { href: '/(admin)/fees', label: 'Fees', icon: '💳' },
  { href: '/(admin)/salary', label: 'Salary', icon: '₹' },
  { href: '/(admin)/timetable', label: 'Timetable', icon: '🗓️' },
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
    backgroundColor: '#0B2743',
    borderBottomWidth: 1,
    borderBottomColor: '#164A6B',
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
    backgroundColor: '#12385A',
  },
  activeLink: {
    backgroundColor: '#E6A84A',
    borderWidth: 1,
    borderColor: '#F5C66C',
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D8EAF2',
  },
  activeLabel: {
    color: '#071A2F',
    fontWeight: '700',
  },
});
