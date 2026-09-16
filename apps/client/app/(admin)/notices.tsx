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
import { useNotices, useCreateNotice } from '../../src/hooks/useQueries';
import { api } from '../../src/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function NoticesManagementScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'All Users' as 'All Users' | 'Staff' | 'All Students' | 'Specific Class',
    specificClass: 'Class 10',
  });

  const { data: notices, isLoading } = useNotices('ADMIN');
  const { mutate: createNotice, isPending } = useCreateNotice();

  const handleCreate = () => {
    if (!formData.title || !formData.message) {
      Alert.alert('Validation Error', 'Title and message are required.');
      return;
    }

    createNotice(
      {
        title: formData.title,
        message: formData.message,
        audience: formData.audience,
        specificClass: formData.audience === 'Specific Class' ? formData.specificClass : undefined,
        published: true,
      },
      {
        onSuccess: () => {
          Alert.alert('Notice Published', 'Announcement sent to targeted audience.');
          setModalVisible(false);
          setFormData({
            title: '',
            message: '',
            audience: 'All Users',
            specificClass: 'Class 10',
          });
        },
        onError: () => {
          Alert.alert('Error', 'Failed to publish notice.');
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Remove this notice announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/notices/${id}`);
            queryClient.invalidateQueries({ queryKey: ['notices'] });
          } catch {
            Alert.alert('Error', 'Failed to delete notice.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Notice Board" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>Campus Announcements</Text>
            <Text style={styles.pageSubtitle}>Publish circulars for students, staff or parents</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ New Announcement</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.noticeList}>
            {notices?.map((n: any) => (
              <View key={n.id} style={styles.noticeCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.noticeTitle}>{n.title}</Text>
                    <Text style={styles.noticeDate}>📅 Published on: {n.date}</Text>
                  </View>
                  <View style={styles.audienceBadge}>
                    <Text style={styles.audienceText}>{n.audience}</Text>
                  </View>
                </View>

                <Text style={styles.noticeBody}>{n.message}</Text>

                <View style={styles.cardFooter}>
                  {n.specificClass ? (
                    <Text style={styles.targetClass}>Target: {n.specificClass}</Text>
                  ) : <View />}

                  <TouchableOpacity onPress={() => handleDelete(n.id)}>
                    <Text style={styles.delText}>Delete Notice</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* New Notice Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Publish Announcement</Text>

            <Text style={styles.label}>Notice Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(t) => setFormData({ ...formData, title: t })}
              placeholder="e.g. Annual Sports Day 2025"
            />

            <Text style={styles.label}>Target Audience</Text>
            <View style={styles.audienceRow}>
              {(['All Users', 'Staff', 'All Students', 'Specific Class'] as const).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.audChip, formData.audience === a && styles.activeAudChip]}
                  onPress={() => setFormData({ ...formData, audience: a })}
                >
                  <Text style={[styles.audChipText, formData.audience === a && styles.activeAudChipText]}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {formData.audience === 'Specific Class' && (
              <View>
                <Text style={styles.label}>Select Class</Text>
                <TextInput
                  style={styles.input}
                  value={formData.specificClass}
                  onChangeText={(t) => setFormData({ ...formData, specificClass: t })}
                  placeholder="Class 10"
                />
              </View>
            )}

            <Text style={styles.label}>Message Body *</Text>
            <TextInput
              style={[styles.input, { height: 90 }]}
              multiline
              value={formData.message}
              onChangeText={(t) => setFormData({ ...formData, message: t })}
              placeholder="Write the announcement description..."
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreate}
                disabled={isPending}
              >
                <Text style={styles.saveBtnText}>
                  {isPending ? 'Publishing...' : 'Publish Notice'}
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
  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  noticeList: { gap: 14 },
  noticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  noticeDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  audienceBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  audienceText: { color: '#2563eb', fontSize: 11, fontWeight: '700' },
  noticeBody: { fontSize: 14, color: '#475569', lineHeight: 20, marginVertical: 10 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    alignItems: 'center',
  },
  targetClass: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  delText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
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
    fontSize: 13,
    marginBottom: 12,
  },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  audChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  activeAudChip: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  audChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  activeAudChipText: { color: '#ffffff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { color: '#ffffff', fontWeight: '700' },
});
