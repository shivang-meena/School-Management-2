import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../../src/components/Header';
import { AdminNav } from '../../src/components/AdminNav';
import { useStudents, useStaff, useMarkAttendance } from '../../src/hooks/useQueries';

export default function AttendanceScreen() {
  const [targetType, setTargetType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [selectedClass, setSelectedClass] = useState('Class 8');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

  const { data: students, isLoading: loadingStudents } = useStudents({ class: selectedClass });
  const { data: staffList, isLoading: loadingStaff } = useStaff();
  const { mutate: markAttendance, isPending: isSaving } = useMarkAttendance();

  const items = targetType === 'STUDENT' ? students : staffList;
  const isLoading = targetType === 'STUDENT' ? loadingStudents : loadingStaff;

  const handleToggleStatus = (id: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [id]: status,
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    if (!items) return;
    const next: Record<string, 'present' | 'absent' | 'late'> = {};
    items.forEach((item: any) => {
      const id = targetType === 'STUDENT' ? item.studentId : item.staffId;
      next[id] = status;
    });
    setAttendanceMap(next);
  };

  const handleSaveAttendance = () => {
    if (!items || items.length === 0) return;

    const records = items.map((item: any) => {
      const id = targetType === 'STUDENT' ? item.studentId : item.staffId;
      return {
        id,
        status: attendanceMap[id] || 'present',
      };
    });

    markAttendance(
      {
        targetType,
        data: {
          date,
          records,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Success', `Attendance recorded for ${records.length} ${targetType.toLowerCase()}s on ${date}`);
        },
        onError: () => {
          Alert.alert('Error', 'Failed to submit attendance.');
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Daily Attendance" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topHeader}>
          <Text style={styles.title}>Attendance Register</Text>
          <Text style={styles.subtitle}>Mark present, absent, or late records</Text>
        </View>

        {/* Target Switcher: Student vs Staff */}
        <View style={styles.typeSwitcher}>
          <TouchableOpacity
            style={[styles.typeBtn, targetType === 'STUDENT' && styles.activeTypeBtn]}
            onPress={() => {
              setTargetType('STUDENT');
              setAttendanceMap({});
            }}
          >
            <Text style={[styles.typeBtnText, targetType === 'STUDENT' && styles.activeTypeBtnText]}>
              👨‍🎓 Student Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeBtn, targetType === 'STAFF' && styles.activeTypeBtn]}
            onPress={() => {
              setTargetType('STAFF');
              setAttendanceMap({});
            }}
          >
            <Text style={[styles.typeBtnText, targetType === 'STAFF' && styles.activeTypeBtnText]}>
              👩‍🏫 Staff Attendance
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date and Class Selector */}
        <View style={styles.filterCard}>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={date} onChangeText={setDate} />
            </View>

            {targetType === 'STUDENT' && (
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Select Class</Text>
                <TextInput
                  style={styles.input}
                  value={selectedClass}
                  onChangeText={setSelectedClass}
                  placeholder="Class 8"
                />
              </View>
            )}
          </View>

          <View style={styles.quickBatchRow}>
            <TouchableOpacity
              style={styles.quickBatchBtn}
              onPress={() => handleMarkAll('present')}
            >
              <Text style={styles.quickBatchText}>Mark All Present ✓</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBatchBtn, { backgroundColor: '#fee2e2' }]}
              onPress={() => handleMarkAll('absent')}
            >
              <Text style={[styles.quickBatchText, { color: '#b91c1c' }]}>Mark All Absent ✗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List of Persons to Mark */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.personList}>
            {items?.map((item: any) => {
              const id = targetType === 'STUDENT' ? item.studentId : item.staffId;
              const currentStatus = attendanceMap[id] || 'present';

              return (
                <View key={item.id} style={styles.personRow}>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.personId}>
                      ID: {id} {targetType === 'STUDENT' ? `| Roll: ${item.rollNo}` : `| ${item.designation}`}
                    </Text>
                  </View>

                  <View style={styles.actionButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        currentStatus === 'present' && styles.presentActive,
                      ]}
                      onPress={() => handleToggleStatus(id, 'present')}
                    >
                      <Text style={[styles.statusBtnText, currentStatus === 'present' && styles.activeText]}>
                        Present
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        currentStatus === 'absent' && styles.absentActive,
                      ]}
                      onPress={() => handleToggleStatus(id, 'absent')}
                    >
                      <Text style={[styles.statusBtnText, currentStatus === 'absent' && styles.activeText]}>
                        Absent
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        currentStatus === 'late' && styles.lateActive,
                      ]}
                      onPress={() => handleToggleStatus(id, 'late')}
                    >
                      <Text style={[styles.statusBtnText, currentStatus === 'late' && styles.activeText]}>
                        Late
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveAttendanceBtn}
          onPress={handleSaveAttendance}
          disabled={isSaving}
        >
          <Text style={styles.saveAttendanceText}>
            {isSaving ? 'Submitting Attendance...' : 'Save Attendance Record'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  topHeader: { marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b' },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTypeBtn: { backgroundColor: '#ffffff' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  activeTypeBtnText: { color: '#2563eb', fontWeight: '700' },
  filterCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  row: { flexDirection: 'row' },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  quickBatchRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickBatchBtn: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickBatchText: { color: '#16a34a', fontWeight: '700', fontSize: 12 },
  personList: { gap: 10, marginBottom: 20 },
  personRow: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  personInfo: { flex: 1, minWidth: 160 },
  personName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  personId: { fontSize: 12, color: '#64748b', marginTop: 2 },
  actionButtonGroup: { flexDirection: 'row', gap: 6 },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  presentActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  absentActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  lateActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  activeText: { color: '#ffffff', fontWeight: '700' },
  saveAttendanceBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveAttendanceText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
