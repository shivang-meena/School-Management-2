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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../src/components/Header';
import { useSubmitAdmission, useNotices } from '../src/hooks/useQueries';

export default function IndexScreen() {
  const router = useRouter();
  const [admissionModal, setAdmissionModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dob: '2012-05-15',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    mobile: '',
    email: '',
    address: '',
    previousSchool: '',
    applyingClass: 'Class 6',
    guardianName: '',
    guardianContact: '',
  });

  const { mutate: submitAdmission, isPending } = useSubmitAdmission();
  const { data: publicNotices } = useNotices('PUBLIC');

  const handleSubmitAdmission = () => {
    if (!formData.name || !formData.mobile || !formData.guardianName) {
      Alert.alert('Validation Error', 'Please fill all required admission fields.');
      return;
    }

    submitAdmission(formData, {
      onSuccess: () => {
        Alert.alert('Success', 'Admission registration submitted successfully! School admin will review it.');
        setAdmissionModal(false);
        setFormData({
          name: '',
          dob: '2012-05-15',
          gender: 'Male',
          mobile: '',
          email: '',
          address: '',
          previousSchool: '',
          applyingClass: 'Class 6',
          guardianName: '',
          guardianContact: '',
        });
      },
      onError: (err: any) => {
        Alert.alert('Submission Error', err.response?.data?.message || 'Failed to submit application.');
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTag}>Excellence in Education Since 1998</Text>
          <Text style={styles.heroTitle}>Arihant Public School</Text>
          <Text style={styles.heroSubtitle}>
            Nurturing knowledge, character, and global leadership through our modern integrated campus and tech-enabled ERP system.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.primaryBtnText}>Access Portal (Login)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setAdmissionModal(true)}
            >
              <Text style={styles.secondaryBtnText}>Apply for Admission 📝</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Portals Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Login by Role</Text>
          <View style={styles.grid}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(auth)/login', params: { role: 'ADMIN' } })}
            >
              <Text style={styles.cardIcon}>🛡️</Text>
              <Text style={styles.cardTitle}>Admin Portal</Text>
              <Text style={styles.cardDesc}>
                Full institution control: student records, staff payroll, fees, attendance, exam scheduling & accounts.
              </Text>
              <Text style={styles.cardLink}>Admin Login →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(auth)/login', params: { role: 'EMPLOYEE' } })}
            >
              <Text style={styles.cardIcon}>👩‍🏫</Text>
              <Text style={styles.cardTitle}>Employee / Teacher Portal</Text>
              <Text style={styles.cardDesc}>
                Manage assigned classes, mark student attendance, review salary slips and publish curriculum.
              </Text>
              <Text style={styles.cardLink}>Employee Login →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(auth)/login', params: { role: 'STUDENT' } })}
            >
              <Text style={styles.cardIcon}>👨‍🎓</Text>
              <Text style={styles.cardTitle}>Student Portal</Text>
              <Text style={styles.cardDesc}>
                View attendance, fee dues, verified receipts, published results and the current timetable.
              </Text>
              <Text style={styles.cardLink}>Student Login →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notice Board Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Public Notice Board</Text>
          {publicNotices && publicNotices.length > 0 ? (
            <View style={styles.noticeList}>
              {publicNotices.slice(0, 3).map((notice: any) => (
                <View key={notice.id} style={styles.noticeCard}>
                  <View style={styles.noticeHeader}>
                    <Text style={styles.noticeTitle}>{notice.title}</Text>
                    <Text style={styles.noticeDate}>{notice.date}</Text>
                  </View>
                  <Text style={styles.noticeMsg}>{notice.message}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No recent notices announced.</Text>
          )}
        </View>
      </ScrollView>

      {/* Admission Application Modal */}
      <Modal visible={admissionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Student Admission Application</Text>
              <Text style={styles.modalSubtitle}>Fill the details to register an admission inquiry.</Text>

              <Text style={styles.label}>Student Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="e.g. Kabir Malhotra"
              />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                placeholder="student@example.com"
              />

              <Text style={styles.label}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.mobile}
                onChangeText={(t) => setFormData({ ...formData, mobile: t })}
                placeholder="9876543210"
              />

              <Text style={styles.label}>Applying for Class *</Text>
              <TextInput
                style={styles.input}
                value={formData.applyingClass}
                onChangeText={(t) => setFormData({ ...formData, applyingClass: t })}
                placeholder="Class 6 / 7 / 8 / 9 / 10"
              />

              <Text style={styles.label}>Parent / Guardian Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.guardianName}
                onChangeText={(t) => setFormData({ ...formData, guardianName: t })}
                placeholder="Parent Full Name"
              />

              <Text style={styles.label}>Parent Mobile *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.guardianContact}
                onChangeText={(t) => setFormData({ ...formData, guardianContact: t })}
                placeholder="Parent Mobile Number"
              />

              <Text style={styles.label}>Residential Address *</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={formData.address}
                onChangeText={(t) => setFormData({ ...formData, address: t })}
                placeholder="Full address..."
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setAdmissionModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmitAdmission}
                  disabled={isPending}
                >
                  <Text style={styles.submitBtnText}>
                    {isPending ? 'Submitting...' : 'Submit Application'}
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
  container: {
    flex: 1,
    backgroundColor: '#F4F1EA',
  },
  scroll: {
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#071A2F',
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroTag: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    color: '#bfdbfe',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 22,
    marginBottom: 24,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  primaryBtn: {
    backgroundColor: '#C88728',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 15,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    flex: 1,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  cardLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '700',
  },
  noticeList: {
    gap: 12,
  },
  noticeCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  noticeDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noticeMsg: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  emptyText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
