import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../../src/components/Header';
import { AdminNav } from '../../src/components/AdminNav';
import { useFeesOverview, useFeePayments, useRecordPayment, useStudents } from '../../src/hooks/useQueries';

export default function FeesManagementScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    studentId: 'STU003',
    amount: 15000,
    method: 'Online' as 'Cash' | 'Online' | 'Bank' | 'Cheque',
    remarks: 'Term 2 Fee instalment',
  });

  const { data: overview, isLoading: loadingOverview } = useFeesOverview();
  const { data: payments, isLoading: loadingPayments } = useFeePayments();
  const { data: students } = useStudents();
  const { mutate: recordPayment, isPending } = useRecordPayment();

  const handleRecordPayment = () => {
    if (!formData.studentId || !formData.amount) {
      Alert.alert('Validation Error', 'Student ID and amount are required.');
      return;
    }

    recordPayment(
      {
        studentId: formData.studentId,
        amount: Number(formData.amount),
        method: formData.method,
        remarks: formData.remarks,
      },
      {
        onSuccess: (data: any) => {
          Alert.alert('Payment Recorded', `Receipt generated: ${data.receiptNo} for ₹${data.amount}`);
          setModalVisible(false);
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.message || 'Failed to record payment.');
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Fee Management" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>Fee Collections & Invoicing</Text>
            <Text style={styles.pageSubtitle}>Track student payments, dues, and issue receipts</Text>
          </View>

          <TouchableOpacity style={styles.payBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.payBtnText}>+ Collect Fee Payment</Text>
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        {loadingOverview ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderLeftColor: '#3b82f6' }]}>
              <Text style={styles.statLabel}>Expected Revenue</Text>
              <Text style={styles.statVal}>₹{(overview?.totalExpected || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#10b981' }]}>
              <Text style={styles.statLabel}>Total Collected</Text>
              <Text style={[styles.statVal, { color: '#16a34a' }]}>
                ₹{(overview?.totalCollected || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#ef4444' }]}>
              <Text style={styles.statLabel}>Outstanding Dues</Text>
              <Text style={[styles.statVal, { color: '#dc2626' }]}>
                ₹{(overview?.totalPending || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* Payment Receipts History */}
        <Text style={styles.sectionHeader}>Recent Payment Receipts</Text>
        {loadingPayments ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.paymentList}>
            {payments?.map((p: any) => (
              <View key={p.id} style={styles.paymentCard}>
                <View style={styles.pHeader}>
                  <View>
                    <Text style={styles.pReceipt}>{p.receiptNo}</Text>
                    <Text style={styles.pStudent}>
                      {p.student?.name || p.studentId} ({p.student?.class} - {p.student?.section})
                    </Text>
                  </View>
                  <Text style={styles.pAmount}>₹{p.amount?.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.pFooter}>
                  <Text style={styles.pMeta}>Method: {p.method} | Date: {p.date}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{p.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Record Payment Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Student Payment</Text>

            <Text style={styles.label}>Select / Enter Student ID *</Text>
            <TextInput
              style={styles.input}
              value={formData.studentId}
              onChangeText={(t) => setFormData({ ...formData, studentId: t })}
              placeholder="e.g. STU001"
            />

            <Text style={styles.label}>Amount Paid (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(formData.amount)}
              onChangeText={(t) => setFormData({ ...formData, amount: Number(t) || 0 })}
              placeholder="e.g. 15000"
            />

            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(['Online', 'Cash', 'Bank', 'Cheque'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, formData.method === m && styles.activeMethodChip]}
                  onPress={() => setFormData({ ...formData, method: m })}
                >
                  <Text style={[styles.methodChipText, formData.method === m && styles.activeMethodChipText]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Remarks / Transaction Ref</Text>
            <TextInput
              style={styles.input}
              value={formData.remarks}
              onChangeText={(t) => setFormData({ ...formData, remarks: t })}
              placeholder="Optional notes"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitPayBtn}
                onPress={handleRecordPayment}
                disabled={isPending}
              >
                <Text style={styles.submitPayBtnText}>
                  {isPending ? 'Processing...' : 'Confirm Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b' },
  payBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  payBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  statBox: {
    backgroundColor: '#ffffff',
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionHeader: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  paymentList: { gap: 10 },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pReceipt: { fontSize: 15, fontWeight: '800', color: '#2563eb' },
  pStudent: { fontSize: 13, color: '#334155', marginTop: 2 },
  pAmount: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  pFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    alignItems: 'center',
  },
  pMeta: { fontSize: 12, color: '#64748b' },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#16a34a', fontSize: 11, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 460,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 14,
  },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  methodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  activeMethodChip: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  methodChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  activeMethodChipText: { color: '#ffffff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  submitPayBtn: { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  submitPayBtnText: { color: '#ffffff', fontWeight: '700' },
});
