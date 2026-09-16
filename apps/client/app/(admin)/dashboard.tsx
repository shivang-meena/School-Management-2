import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../src/components/Header';
import { AdminNav } from '../../src/components/AdminNav';
import {
  useStudents,
  useStaff,
  useFeesOverview,
  useAccountsOverview,
  useNotices,
} from '../../src/hooks/useQueries';

export default function AdminDashboardScreen() {
  const router = useRouter();

  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: staff, isLoading: loadingStaff } = useStaff();
  const { data: fees, isLoading: loadingFees } = useFeesOverview();
  const { data: accounts, isLoading: loadingAccounts } = useAccountsOverview();
  const { data: notices } = useNotices('ADMIN');

  const isLoading = loadingStudents || loadingStaff || loadingFees || loadingAccounts;

  return (
    <View style={styles.container}>
      <Header title="Admin Dashboard" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeTitle}>Welcome, Administrator 👋</Text>
          <Text style={styles.welcomeSub}>
            Here is your daily campus overview, revenue collection, and pending activities.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
                <Text style={styles.statLabel}>Total Students</Text>
                <Text style={styles.statValue}>{students?.length || 0}</Text>
                <Text style={styles.statHint}>Across Classes 6 - 10</Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
                <Text style={styles.statLabel}>Teaching & Staff</Text>
                <Text style={styles.statValue}>{staff?.length || 0}</Text>
                <Text style={styles.statHint}>Active faculty members</Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
                <Text style={styles.statLabel}>Fees Collected</Text>
                <Text style={styles.statValue}>
                  ₹{(fees?.totalCollected || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.statHint}>
                  Pending: ₹{(fees?.totalPending || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#8b5cf6' }]}>
                <Text style={styles.statLabel}>Net Treasury Balance</Text>
                <Text style={styles.statValue}>
                  ₹{(accounts?.netBalance || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.statHint}>Income minus expenses & salary</Text>
              </View>
            </View>

            {/* Quick Actions Grid */}
            <Text style={styles.sectionHeader}>Quick Management Tools</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/students')}
              >
                <Text style={styles.actionIcon}>👨‍🎓</Text>
                <Text style={styles.actionTitle}>Student Roster</Text>
                <Text style={styles.actionDesc}>Add new students, update profiles, view roll numbers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/attendance')}
              >
                <Text style={styles.actionIcon}>✅</Text>
                <Text style={styles.actionTitle}>Take Attendance</Text>
                <Text style={styles.actionDesc}>Mark daily student and staff present/absent sheets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/fees')}
              >
                <Text style={styles.actionIcon}>💳</Text>
                <Text style={styles.actionTitle}>Collect Fees</Text>
                <Text style={styles.actionDesc}>Generate fee receipts and review defaulters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/exams')}
              >
                <Text style={styles.actionIcon}>📝</Text>
                <Text style={styles.actionTitle}>Exams & Marks</Text>
                <Text style={styles.actionDesc}>Schedule exams and publish test report cards</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/staff')}
              >
                <Text style={styles.actionIcon}>👩‍🏫</Text>
                <Text style={styles.actionTitle}>Staff & Salary</Text>
                <Text style={styles.actionDesc}>Review teacher salaries, deductions and payslips</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/accounts')}
              >
                <Text style={styles.actionIcon}>🧾</Text>
                <Text style={styles.actionTitle}>Accounts Ledger</Text>
                <Text style={styles.actionDesc}>Track institution expenses and donation income</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Notices */}
            <Text style={styles.sectionHeader}>📢 Recent School Notices</Text>
            <View style={styles.noticesContainer}>
              {notices?.slice(0, 3).map((n: any) => (
                <View key={n.id} style={styles.noticeItem}>
                  <View style={styles.noticeTop}>
                    <Text style={styles.noticeHeading}>{n.title}</Text>
                    <Text style={styles.noticeDate}>{n.date}</Text>
                  </View>
                  <Text style={styles.noticeBody}>{n.message}</Text>
                  <Text style={styles.noticeAudience}>Audience: {n.audience}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeBanner: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 14,
    color: '#64748b',
  },
  loaderContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#ffffff',
    flex: 1,
    minWidth: 200,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statHint: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 28,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  noticesContainer: {
    gap: 12,
  },
  noticeItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noticeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  noticeDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noticeBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  noticeAudience: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
});
