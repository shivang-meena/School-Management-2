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
import { useStaff, useCreateStaff } from '../../src/hooks/useQueries';
import { api } from '../../src/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function StaffManagementScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [salaryModal, setSalaryModal] = useState<any>(null);

  // Salary calc state
  const [workingDays, setWorkingDays] = useState('30');
  const [absentDays, setAbsentDays] = useState('2');
  const [adjustment, setAdjustment] = useState('0');
  const [salaryResult, setSalaryResult] = useState<any>(null);

  // Add staff state
  const [formData, setFormData] = useState({
    staffId: '',
    name: '',
    designation: 'Teacher',
    joiningDate: '2023-01-10',
    baseSalary: 40000,
    mobile: '',
    email: '',
    address: '',
    assignedClass: 'Class 8',
    assignedSection: 'A',
    assignedSubject: 'Mathematics',
  });

  const { data: staffList, isLoading } = useStaff({ search: search || undefined });
  const { mutate: createStaff, isPending: isCreating } = useCreateStaff();

  const handleCreate = () => {
    if (!formData.staffId || !formData.name || !formData.email) {
      Alert.alert('Validation Error', 'Please fill required fields.');
      return;
    }

    createStaff(
      { ...formData, baseSalary: Number(formData.baseSalary) },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Staff member registered successfully!');
          setModalVisible(false);
          setFormData({
            staffId: '',
            name: '',
            designation: 'Teacher',
            joiningDate: '2023-01-10',
            baseSalary: 40000,
            mobile: '',
            email: '',
            address: '',
            assignedClass: 'Class 8',
            assignedSection: 'A',
            assignedSubject: 'Mathematics',
          });
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.message || 'Failed to create staff.');
        },
      }
    );
  };

  const handleCalcSalary = async (staffId: string) => {
    try {
      const { data } = await api.get('/staff/salary-calc', {
        params: {
          staffId,
          workingDays,
          absentDays,
          adjustment,
        },
      });
      setSalaryResult(data);
    } catch {
      Alert.alert('Error', 'Failed to calculate salary breakdown.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Confirm Delete', `Remove staff member ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/staff/${id}`);
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            Alert.alert('Deleted', 'Staff member removed.');
          } catch {
            Alert.alert('Error', 'Failed to remove staff.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Faculty & Staff" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>Staff & Faculty Directory</Text>
            <Text style={styles.pageSubtitle}>Total Members: {staffList?.length || 0}</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Onboard Staff</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID or subject..."
          value={search}
          onChangeText={setSearch}
        />

        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {staffList?.map((s: any) => (
              <View key={s.id} style={styles.staffCard}>
                <View style={styles.staffHeader}>
                  <View>
                    <Text style={styles.staffName}>{s.name}</Text>
                    <Text style={styles.staffDesig}>{s.designation}</Text>
                  </View>
                  <Text style={styles.staffIdBadge}>{s.staffId}</Text>
                </View>

                <View style={styles.metaBlock}>
                  <Text style={styles.metaText}>📚 Subject: {s.assignedSubject || 'N/A'}</Text>
                  <Text style={styles.metaText}>
                    🏫 Class: {s.assignedClass ? `${s.assignedClass} (${s.assignedSection})` : 'Unassigned'}
                  </Text>
                  <Text style={styles.metaText}>
                    💰 Base Salary: ₹{s.baseSalary?.toLocaleString('en-IN')}/mo
                  </Text>
                  <Text style={styles.metaText}>📱 {s.mobile} | ✉️ {s.email}</Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.salaryBtn}
                    onPress={() => {
                      setSalaryModal(s);
                      handleCalcSalary(s.staffId);
                    }}
                  >
                    <Text style={styles.salaryBtnText}>Calculate Salary 💰</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => handleDelete(s.id, s.name)}
                  >
                    <Text style={styles.delBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Salary Calculation Modal */}
      <Modal visible={!!salaryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Monthly Salary Calculator</Text>
            <Text style={styles.modalSub}>
              Staff: {salaryModal?.name} ({salaryModal?.staffId})
            </Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.label}>Working Days</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={workingDays}
                  onChangeText={setWorkingDays}
                />
              </View>
              <View style={{ flex: 1, marginHorizontal: 6 }}>
                <Text style={styles.label}>Absent Days</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={absentDays}
                  onChangeText={setAbsentDays}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.label}>Bonus/Deduct</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={adjustment}
                  onChangeText={setAdjustment}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.calcBtn}
              onPress={() => handleCalcSalary(salaryModal.staffId)}
            >
              <Text style={styles.calcBtnText}>Recalculate</Text>
            </TouchableOpacity>

            {salaryResult && (
              <View style={styles.resultBox}>
                <View style={styles.resRow}>
                  <Text style={styles.resLabel}>Base Salary:</Text>
                  <Text style={styles.resVal}>₹{salaryResult.baseSalary?.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.resRow}>
                  <Text style={styles.resLabel}>Per Day Rate:</Text>
                  <Text style={styles.resVal}>₹{salaryResult.perDaySalary?.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.resRow}>
                  <Text style={styles.resLabel}>Absent Deduction ({salaryResult.absentDays} days):</Text>
                  <Text style={[styles.resVal, { color: '#ef4444' }]}>
                    -₹{salaryResult.absentDeduction?.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.resRow}>
                  <Text style={styles.resLabel}>Adjustment:</Text>
                  <Text style={styles.resVal}>₹{salaryResult.adjustment?.toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.resRow, styles.resFinalRow]}>
                  <Text style={styles.resFinalLabel}>Net Payable Salary:</Text>
                  <Text style={styles.resFinalVal}>
                    ₹{salaryResult.finalSalary?.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setSalaryModal(null);
                setSalaryResult(null);
              }}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Onboard Staff Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Onboard Staff Member</Text>

              <Text style={styles.label}>Staff ID *</Text>
              <TextInput
                style={styles.input}
                value={formData.staffId}
                onChangeText={(t) => setFormData({ ...formData, staffId: t })}
                placeholder="e.g. ST008"
              />

              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="Teacher Name"
              />

              <Text style={styles.label}>Designation *</Text>
              <TextInput
                style={styles.input}
                value={formData.designation}
                onChangeText={(t) => setFormData({ ...formData, designation: t })}
                placeholder="Teacher / Senior Teacher / Accountant"
              />

              <Text style={styles.label}>Monthly Base Salary (₹) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(formData.baseSalary)}
                onChangeText={(t) => setFormData({ ...formData, baseSalary: Number(t) || 0 })}
                placeholder="40000"
              />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                placeholder="staff@greenwood.edu.in"
              />

              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.mobile}
                onChangeText={(t) => setFormData({ ...formData, mobile: t })}
                placeholder="Mobile"
              />

              <Text style={styles.label}>Assigned Subject</Text>
              <TextInput
                style={styles.input}
                value={formData.assignedSubject}
                onChangeText={(t) => setFormData({ ...formData, assignedSubject: t })}
                placeholder="Mathematics / Science / English"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.label}>Class</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.assignedClass}
                    onChangeText={(t) => setFormData({ ...formData, assignedClass: t })}
                    placeholder="Class 8"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.label}>Section</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.assignedSection}
                    onChangeText={(t) => setFormData({ ...formData, assignedSection: t })}
                    placeholder="A"
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calcBtn}
                  onPress={handleCreate}
                  disabled={isCreating}
                >
                  <Text style={styles.calcBtnText}>
                    {isCreating ? 'Saving...' : 'Save Member'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b' },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  staffCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    flex: 1,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  staffName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  staffDesig: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  staffIdBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  metaBlock: { gap: 4, marginVertical: 8 },
  metaText: { fontSize: 12, color: '#475569' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 8,
  },
  salaryBtn: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  salaryBtnText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
  delBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  delBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
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
    maxWidth: 480,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  modalSub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  row: { flexDirection: 'row' },
  calcBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  calcBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  resultBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 8,
  },
  resRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resLabel: { fontSize: 12, color: '#64748b' },
  resVal: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  resFinalRow: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 8,
    marginTop: 4,
  },
  resFinalLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  resFinalVal: { fontSize: 16, fontWeight: '800', color: '#16a34a' },
  closeBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  closeBtnText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
});
