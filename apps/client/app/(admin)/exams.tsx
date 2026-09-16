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
import { useExams, useCreateExam, useStudents } from '../../src/hooks/useQueries';
import { api } from '../../src/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function ExamsManagementScreen() {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [marksModal, setMarksModal] = useState<any>(null);
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    name: 'Final Term Exam 2025',
    class: 'Class 8',
    section: 'A',
    subject: 'Science',
    date: '2025-10-15',
    totalMarks: 100,
    published: true,
  });

  const { data: exams, isLoading } = useExams();
  const { data: classStudents } = useStudents(
    marksModal ? { class: marksModal.class, section: marksModal.section } : undefined
  );
  const { mutate: createExam, isPending: isCreating } = useCreateExam();

  const handleCreate = () => {
    createExam(
      {
        ...formData,
        totalMarks: Number(formData.totalMarks),
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Exam created successfully!');
          setCreateModal(false);
        },
        onError: () => {
          Alert.alert('Error', 'Failed to create exam schedule.');
        },
      }
    );
  };

  const handleOpenMarksModal = (exam: any) => {
    setMarksModal(exam);
    const initial: Record<string, number> = {};
    if (exam.results) {
      exam.results.forEach((r: any) => {
        initial[r.studentId] = r.obtained;
      });
    }
    setMarksMap(initial);
  };

  const handleSaveMarks = async () => {
    if (!marksModal || !classStudents) return;

    const payload = {
      examId: marksModal.id,
      marks: classStudents.map((s: any) => ({
        studentId: s.studentId,
        obtained: Number(marksMap[s.studentId] ?? 0),
      })),
    };

    try {
      await api.post('/exams/marks', payload);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      Alert.alert('Marks Saved', 'Student marks updated successfully.');
      setMarksModal(null);
    } catch {
      Alert.alert('Error', 'Failed to save marks.');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Exams & Grading" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>Examinations & Result Ledger</Text>
            <Text style={styles.pageSubtitle}>Schedule exams and enter marks</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModal(true)}>
            <Text style={styles.addBtnText}>+ Schedule Exam</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.grid}>
            {exams?.map((exam: any) => (
              <View key={exam.id} style={styles.examCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.examName}>{exam.name}</Text>
                  <Text style={styles.examBadge}>{exam.subject}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    🏫 {exam.class} (Section {exam.section})
                  </Text>
                  <Text style={styles.metaText}>📅 Date: {exam.date}</Text>
                  <Text style={styles.metaText}>🎯 Max Marks: {exam.totalMarks}</Text>
                  <Text style={styles.metaText}>
                    📝 Graded Students: {exam.results?.length || 0}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.marksBtn}
                  onPress={() => handleOpenMarksModal(exam)}
                >
                  <Text style={styles.marksBtnText}>Enter / View Marks ✍️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Schedule Exam Modal */}
      <Modal visible={createModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule New Exam</Text>

            <Text style={styles.label}>Exam Title</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              placeholder="e.g. Mid-Term Exam 2025"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.label}>Class</Text>
                <TextInput
                  style={styles.input}
                  value={formData.class}
                  onChangeText={(t) => setFormData({ ...formData, class: t })}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.label}>Section</Text>
                <TextInput
                  style={styles.input}
                  value={formData.section}
                  onChangeText={(t) => setFormData({ ...formData, section: t })}
                />
              </View>
            </View>

            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={formData.subject}
              onChangeText={(t) => setFormData({ ...formData, subject: t })}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.label}>Exam Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.date}
                  onChangeText={(t) => setFormData({ ...formData, date: t })}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.label}>Total Marks</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(formData.totalMarks)}
                  onChangeText={(t) => setFormData({ ...formData, totalMarks: Number(t) || 100 })}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreate}
                disabled={isCreating}
              >
                <Text style={styles.saveBtnText}>
                  {isCreating ? 'Saving...' : 'Save Exam'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Marks Entry Modal */}
      <Modal visible={!!marksModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>Enter Student Marks</Text>
              <Text style={styles.modalSubtitle}>
                {marksModal?.name} - {marksModal?.subject} ({marksModal?.class})
              </Text>

              <View style={styles.studentMarksList}>
                {classStudents?.map((s: any) => (
                  <View key={s.id} style={styles.marksRow}>
                    <View>
                      <Text style={styles.sName}>{s.name}</Text>
                      <Text style={styles.sId}>{s.studentId} | Roll: {s.rollNo}</Text>
                    </View>
                    <View style={styles.marksInputWrapper}>
                      <TextInput
                        style={styles.marksInput}
                        keyboardType="numeric"
                        value={marksMap[s.studentId] !== undefined ? String(marksMap[s.studentId]) : ''}
                        onChangeText={(t) =>
                          setMarksMap({ ...marksMap, [s.studentId]: Number(t) || 0 })
                        }
                        placeholder="0"
                      />
                      <Text style={styles.marksMax}>/ {marksModal?.totalMarks}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setMarksModal(null)}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMarks}>
                  <Text style={styles.saveBtnText}>Save Results</Text>
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
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b' },
  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  examCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    flex: 1,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  examName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  examBadge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaRow: { gap: 4, marginVertical: 8 },
  metaText: { fontSize: 13, color: '#475569' },
  marksBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  marksBtnText: { color: '#1e293b', fontWeight: '600', fontSize: 13 },
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
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
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
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { color: '#ffffff', fontWeight: '700' },
  studentMarksList: { gap: 10, marginVertical: 10 },
  marksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  sId: { fontSize: 12, color: '#64748b' },
  marksInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marksInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    width: 60,
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  marksMax: { fontSize: 12, color: '#64748b' },
});
