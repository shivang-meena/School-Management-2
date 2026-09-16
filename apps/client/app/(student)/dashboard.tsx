import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../../src/components/Header';
import { useAuth } from '../../src/hooks/useAuth';
import {
  useStudentFees,
  useStudentReport,
  useIndividualAttendance,
  useNotices,
} from '../../src/hooks/useQueries';

export default function StudentDashboardScreen() {
  const { user } = useAuth();
  const studentId = user?.studentId || 'STU001';

  const { data: fees, isLoading: loadingFees } = useStudentFees(studentId);
  const { data: report, isLoading: loadingReport } = useStudentReport(studentId);
  const { data: attendance, isLoading: loadingAtt } = useIndividualAttendance('STUDENT', studentId);
  const { data: notices } = useNotices('STUDENT', fees?.class);

  const isLoading = loadingFees || loadingReport || loadingAtt;

  return (
    <View style={styles.container}>
      <Header title="Student Portal" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Welcome Profile Banner */}
        <View style={styles.profileBanner}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>🎓</Text>
          </View>
          <View style={styles.bannerInfo}>
            <Text style={styles.studentName}>{fees?.name || user?.name}</Text>
            <Text style={styles.studentSub}>
              ID: {studentId} | Class: {fees?.class || 'Class 8'} - {fees?.section || 'A'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
                <Text style={styles.kpiLabel}>Attendance Rate</Text>
                <Text style={styles.kpiVal}>{attendance?.percentage ?? 95}%</Text>
                <Text style={styles.kpiHint}>
                  {attendance?.present ?? 0} Present / {attendance?.total ?? 0} Days
                </Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
                <Text style={styles.kpiLabel}>Fee Status</Text>
                <Text style={[styles.kpiVal, { color: fees?.pendingFee === 0 ? '#16a34a' : '#ea580c' }]}>
                  {fees?.status || 'Paid'}
                </Text>
                <Text style={styles.kpiHint}>
                  Pending Dues: ₹{(fees?.pendingFee || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Academic Report Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📝 Term Examination Report Card</Text>
              {report?.results && report.results.length > 0 ? (
                <View style={styles.resultsTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>Subject</Text>
                    <Text style={styles.th}>Score</Text>
                    <Text style={styles.th}>%</Text>
                    <Text style={styles.th}>Grade</Text>
                    <Text style={styles.th}>Status</Text>
                  </View>
                  {report.results.map((r: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{r.subject}</Text>
                      <Text style={styles.td}>{r.obtained}/{r.totalMarks}</Text>
                      <Text style={styles.td}>{r.percentage}%</Text>
                      <Text style={[styles.td, { fontWeight: '700', color: '#2563eb' }]}>{r.grade}</Text>
                      <Text style={[styles.td, { color: r.status === 'Pass' ? '#16a34a' : '#dc2626' }]}>
                        {r.status}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No exam results published yet.</Text>
              )}
            </View>

            {/* Fee Receipts & Ledger */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>💳 Fee Payments & Receipts</Text>
              <View style={styles.feeBreakdown}>
                <Text style={styles.feeText}>
                  Annual Tuition: <Text style={{ fontWeight: '700' }}>₹{fees?.totalFee?.toLocaleString('en-IN')}</Text>
                </Text>
                <Text style={styles.feeText}>
                  Paid to Date: <Text style={{ fontWeight: '700', color: '#16a34a' }}>₹{fees?.paidAmount?.toLocaleString('en-IN')}</Text>
                </Text>
              </View>

              {fees?.payments && fees.payments.length > 0 ? (
                <View style={styles.receiptList}>
                  {fees.payments.map((p: any) => (
                    <View key={p.id} style={styles.receiptCard}>
                      <View>
                        <Text style={styles.recNo}>Receipt #{p.receiptNo}</Text>
                        <Text style={styles.recDate}>📅 {p.date} • Mode: {p.method}</Text>
                      </View>
                      <Text style={styles.recAmt}>₹{p.amount?.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No payment history found.</Text>
              )}
            </View>

            {/* Class Notices */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📢 Class Notices & Timetable</Text>
              {notices?.map((n: any) => (
                <View key={n.id} style={styles.noticeBox}>
                  <Text style={styles.nTitle}>{n.title}</Text>
                  <Text style={styles.nDate}>{n.date}</Text>
                  <Text style={styles.nMsg}>{n.message}</Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  profileBanner: {
    backgroundColor: '#1e3a8a',
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
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24 },
  bannerInfo: { flex: 1 },
  studentName: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  studentSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 20 },
  kpiCard: {
    backgroundColor: '#ffffff',
    flex: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  kpiVal: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginVertical: 4 },
  kpiHint: { fontSize: 11, color: '#94a3b8' },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  resultsTable: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  th: { flex: 1, fontSize: 11, fontWeight: '700', color: '#475569' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  td: { flex: 1, fontSize: 12, color: '#334155' },
  feeBreakdown: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  feeText: { fontSize: 13, color: '#475569' },
  receiptList: { gap: 8 },
  receiptCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recNo: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  recDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  recAmt: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13 },
  noticeBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  nTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  nDate: { fontSize: 11, color: '#94a3b8', marginVertical: 2 },
  nMsg: { fontSize: 12, color: '#475569', lineHeight: 16 },
});
