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
import { useAuth } from '../../src/hooks/useAuth';
import { useStaff, useNotices } from '../../src/hooks/useQueries';

export default function StaffDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const staffId = user?.staffId || 'ST001';

  const { data: staffMembers, isLoading } = useStaff();
  const currentStaff = staffMembers?.find((s: any) => s.staffId === staffId) || staffMembers?.[0];
  const { data: notices } = useNotices('STAFF');

  const baseSalary = currentStaff?.baseSalary || 45000;
  const perDay = Math.round(baseSalary / 30);
  const absentDays = 1;
  const deductions = absentDays * perDay;
  const netPayable = baseSalary - deductions;

  return (
    <View style={styles.container}>
      <Header title="Teacher & Faculty Portal" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Welcome Staff Banner */}
        <View style={styles.profileBanner}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>👩‍🏫</Text>
          </View>
          <View style={styles.bannerInfo}>
            <Text style={styles.staffName}>{currentStaff?.name || user?.name}</Text>
            <Text style={styles.staffSub}>
              {currentStaff?.designation} • ID: {currentStaff?.staffId || staffId}
            </Text>
            <Text style={styles.staffSubject}>
              Subject: {currentStaff?.assignedSubject || 'General'} | Assigned: {currentStaff?.assignedClass || 'Class 8'} ({currentStaff?.assignedSection || 'A'})
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* Quick Action: Take Attendance */}
            <View style={styles.actionCard}>
              <View>
                <Text style={styles.actionTitle}>Class Attendance</Text>
                <Text style={styles.actionSub}>Mark daily attendance for your assigned students.</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(admin)/attendance')}
              >
                <Text style={styles.actionBtnText}>Take Attendance →</Text>
              </TouchableOpacity>
            </View>

            {/* Salary Payslip Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>💰 Monthly Salary Payslip Summary</Text>
              <View style={styles.slipRow}>
                <Text style={styles.slipLabel}>Gross Base Salary:</Text>
                <Text style={styles.slipVal}>₹{baseSalary.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.slipRow}>
                <Text style={styles.slipLabel}>Working Days / Month:</Text>
                <Text style={styles.slipVal}>30 Days</Text>
              </View>
              <View style={styles.slipRow}>
                <Text style={styles.slipLabel}>Per Day Remuneration:</Text>
                <Text style={styles.slipVal}>₹{perDay.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.slipRow}>
                <Text style={styles.slipLabel}>Leave / Absent Deductions (1 day):</Text>
                <Text style={[styles.slipVal, { color: '#ef4444' }]}>
                  -₹{deductions.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.slipRow, styles.slipTotalRow]}>
                <Text style={styles.slipTotalLabel}>Net Disbursable Salary:</Text>
                <Text style={styles.slipTotalVal}>₹{netPayable.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Staff Announcements */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📢 Staff Room Announcements</Text>
              {notices && notices.length > 0 ? (
                notices.map((n: any) => (
                  <View key={n.id} style={styles.noticeCard}>
                    <Text style={styles.nTitle}>{n.title}</Text>
                    <Text style={styles.nDate}>📅 {n.date}</Text>
                    <Text style={styles.nMsg}>{n.message}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No current staff circulars.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  profileBanner: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24 },
  bannerInfo: { flex: 1 },
  staffName: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  staffSub: { fontSize: 13, color: '#ccfbf1', marginTop: 2 },
  staffSubject: { fontSize: 12, color: '#99f6e4', marginTop: 4 },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  actionSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  actionBtn: { backgroundColor: '#0f766e', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  slipRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  slipLabel: { fontSize: 13, color: '#64748b' },
  slipVal: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  slipTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 10,
    marginTop: 6,
  },
  slipTotalLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  slipTotalVal: { fontSize: 18, fontWeight: '800', color: '#0f766e' },
  noticeCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0f766e',
  },
  nTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  nDate: { fontSize: 11, color: '#94a3b8', marginVertical: 2 },
  nMsg: { fontSize: 12, color: '#475569', lineHeight: 16 },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13 },
});
