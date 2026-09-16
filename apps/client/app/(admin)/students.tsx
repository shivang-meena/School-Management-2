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
import { useStudents, useClasses, useCreateStudent } from '../../src/hooks/useQueries';
import { api } from '../../src/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function StudentsManagementScreen() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);

  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    dob: '2011-04-15',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    mobile: '',
    email: '',
    address: '',
    previousSchool: '',
    class: 'Class 8',
    section: 'A',
    rollNo: 1,
    parentName: '',
    parentMobile: '',
  });

  const { data: students, isLoading } = useStudents({
    class: selectedClass || undefined,
    search: search || undefined,
  });

  const { data: classes } = useClasses();
  const { mutate: createStudent, isPending: isCreating } = useCreateStudent();

  const handleCreateStudent = () => {
    if (!formData.studentId || !formData.name || !formData.email || !formData.parentName) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    createStudent(
      {
        ...formData,
        rollNo: Number(formData.rollNo),
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Student registered successfully!');
          setModalVisible(false);
          setFormData({
            studentId: '',
            name: '',
            dob: '2011-04-15',
            gender: 'Male',
            mobile: '',
            email: '',
            address: '',
            previousSchool: '',
            class: 'Class 8',
            section: 'A',
            rollNo: 1,
            parentName: '',
            parentMobile: '',
          });
        },
        onError: (err: any) => {
          Alert.alert('Error', err.response?.data?.message || 'Failed to create student.');
        },
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Confirm Delete', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/students/${id}`);
            queryClient.invalidateQueries({ queryKey: ['students'] });
            Alert.alert('Deleted', 'Student record removed.');
          } catch {
            Alert.alert('Error', 'Failed to delete student.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Student Directory" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>Student Management</Text>
            <Text style={styles.pageSubtitle}>Total Enrolled: {students?.length || 0}</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Register Student</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID or email..."
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classChips}>
            <TouchableOpacity
              style={[styles.chip, !selectedClass && styles.activeChip]}
              onPress={() => setSelectedClass('')}
            >
              <Text style={[styles.chipText, !selectedClass && styles.activeChipText]}>All Classes</Text>
            </TouchableOpacity>
            {classes?.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selectedClass === c.name && styles.activeChip]}
                onPress={() => setSelectedClass(selectedClass === c.name ? '' : c.name)}
              >
                <Text style={[styles.chipText, selectedClass === c.name && styles.activeChipText]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Students Table / Cards */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.studentList}>
            {students?.map((s: any) => {
              const pendingFee = s.totalFee - s.paidAmount;
              const feeStatus = pendingFee <= 0 ? 'Paid' : s.paidAmount > 0 ? 'Partial' : 'Unpaid';

              return (
                <View key={s.id} style={styles.studentCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.studentName}>{s.name}</Text>
                      <Text style={styles.studentMeta}>
                        ID: <Text style={{ fontWeight: '700' }}>{s.studentId}</Text> | {s.class} - {s.section} | Roll: {s.rollNo}
                      </Text>
                    </View>
                    <View style={[
                      styles.feeBadge,
                      feeStatus === 'Paid' ? styles.badgePaid : feeStatus === 'Partial' ? styles.badgePartial : styles.badgeUnpaid
                    ]}>
                      <Text style={styles.badgeText}>{feeStatus}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <Text style={styles.detailText}>📱 {s.mobile || '-'} | ✉️ {s.email}</Text>
                    <Text style={styles.detailText}>👨‍👩‍👦 Parent: {s.parentName} ({s.parentMobile})</Text>
                    <Text style={styles.detailText}>
                      💰 Fees: ₹{s.paidAmount?.toLocaleString('en-IN')} / ₹{s.totalFee?.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(s.id, s.name)}
                    >
                      <Text style={styles.deleteBtnText}>Delete Record</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Register Student Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Register New Student</Text>

              <Text style={styles.label}>Student ID *</Text>
              <TextInput
                style={styles.input}
                value={formData.studentId}
                onChangeText={(t) => setFormData({ ...formData, studentId: t })}
                placeholder="e.g. STU009"
              />

              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="Student Name"
              />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                placeholder="student@greenwood.edu.in"
              />

              <Text style={styles.label}>Mobile *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.mobile}
                onChangeText={(t) => setFormData({ ...formData, mobile: t })}
                placeholder="Mobile number"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Class</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.class}
                    onChangeText={(t) => setFormData({ ...formData, class: t })}
                    placeholder="Class 8"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Section</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.section}
                    onChangeText={(t) => setFormData({ ...formData, section: t })}
                    placeholder="A"
                  />
                </View>
              </View>

              <Text style={styles.label}>Roll No</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(formData.rollNo)}
                onChangeText={(t) => setFormData({ ...formData, rollNo: Number(t) || 1 })}
                placeholder="1"
              />

              <Text style={styles.label}>Parent Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.parentName}
                onChangeText={(t) => setFormData({ ...formData, parentName: t })}
                placeholder="Guardian Name"
              />

              <Text style={styles.label}>Parent Mobile *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.parentMobile}
                onChangeText={(t) => setFormData({ ...formData, parentMobile: t })}
                placeholder="Parent Mobile"
              />

              <Text style={styles.label}>Residential Address</Text>
              <TextInput
                style={[styles.input, { height: 55 }]}
                multiline
                value={formData.address}
                onChangeText={(t) => setFormData({ ...formData, address: t })}
                placeholder="Address"
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleCreateStudent}
                  disabled={isCreating}
                >
                  <Text style={styles.saveBtnText}>
                    {isCreating ? 'Saving...' : 'Register Student'}
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
  filterRow: { marginBottom: 18, gap: 10 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  classChips: { flexDirection: 'row' },
  chip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  activeChip: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  activeChipText: { color: '#ffffff' },
  studentList: { gap: 12 },
  studentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  studentName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  studentMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  feeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePaid: { backgroundColor: '#dcfce7' },
  badgePartial: { backgroundColor: '#fef3c7' },
  badgeUnpaid: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDetails: { gap: 4, marginVertical: 6 },
  detailText: { fontSize: 12, color: '#475569' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 6,
  },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
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
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
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
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
