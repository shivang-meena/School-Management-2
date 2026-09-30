import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/services/api';
import { colors, surfaces } from '../../src/theme';

type Registration = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  mobile?: string | null;
  email?: string | null;
  address: string;
  previousSchool?: string | null;
  applyingClass: string;
  guardianName: string;
  guardianContact: string;
  status: 'PENDING' | 'REJECTED' | 'APPROVED' | string;
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
};

const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdmissionRequestsScreen() {
  const client = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'REJECTED' | 'APPROVED'>('ALL');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [rejecting, setRejecting] = useState<Registration | null>(null);
  const [reason, setReason] = useState('');
  const registrations = useQuery<Registration[]>({
    queryKey: ['admin-admission-registrations'],
    queryFn: async () => (await api.get('/students/registrations')).data,
  });
  const rows = useMemo(() => {
    const list = registrations.data || [];
    return filter === 'ALL' ? list : list.filter((row) => row.status === filter);
  }, [filter, registrations.data]);
  const counts = useMemo(() => {
    const list = registrations.data || [];
    return { all: list.length, pending: list.filter((row) => row.status === 'PENDING').length, rejected: list.filter((row) => row.status === 'REJECTED').length, approved: list.filter((row) => row.status === 'APPROVED').length };
  }, [registrations.data]);

  const reject = async () => {
    if (!rejecting || !reason.trim()) {
      Alert.alert('Reason required', 'Please enter a reason before rejecting this request.');
      return;
    }
    try {
      await api.patch(`/students/registrations/${rejecting.id}/reject`, { reason: reason.trim() });
      setRejecting(null);
      setSelected(null);
      setReason('');
      await client.invalidateQueries({ queryKey: ['admin-admission-registrations'] });
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Alert.alert('Could not reject request', Array.isArray(message) ? message.join('\n') : message || 'Please try again.');
    }
  };

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headingRow}><View style={styles.headingCopy}><Text style={styles.eyebrow}>ADMISSIONS INBOX</Text><Text style={styles.title}>Admission Requests</Text><Text style={styles.description}>Review public admission enquiries submitted by prospective families.</Text></View><Pressable accessibilityRole="button" onPress={() => registrations.refetch()} style={styles.refresh}><Text style={styles.refreshText}>↻  Refresh</Text></Pressable></View>
      <View style={styles.stats}>{[['ALL', 'All requests', counts.all, '#818cf8', 'rgba(99,102,241,0.15)'], ['PENDING', 'Awaiting review', counts.pending, '#fbbf24', 'rgba(251,191,36,0.15)'], ['APPROVED', 'Approved', counts.approved, '#34d399', 'rgba(52,211,153,0.15)'], ['REJECTED', 'Rejected', counts.rejected, '#f87171', 'rgba(248,113,113,0.15)']].map(([key, label, value, color, tint]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key as any)} style={[styles.stat, filter === key && { borderColor: color as string }]}><View style={[styles.statIcon, { backgroundColor: tint as string }]}><Text style={[styles.statValue, { color: color as string }]}>{value as number}</Text></View><View><Text style={styles.statLabel}>{label}</Text><Text style={styles.statHint}>{filter === key ? 'Currently showing' : 'View requests'}</Text></View></Pressable>)}</View>
      <View style={styles.listCard}><View style={styles.listHeader}><View><Text style={styles.listTitle}>{filter === 'ALL' ? 'All admission enquiries' : `${filter.charAt(0) + filter.slice(1).toLowerCase()} requests`}</Text><Text style={styles.listSubtitle}>{rows.length} request{rows.length === 1 ? '' : 's'} in this view</Text></View><View style={styles.secure}><Text style={styles.secureDot}>●</Text><Text style={styles.secureText}>Admin only</Text></View></View>
        {registrations.isLoading ? <View style={styles.state}><ActivityIndicator color={colors.blue}/><Text style={styles.stateText}>Loading admission requests…</Text></View> : registrations.isError ? <View style={styles.state}><Text style={styles.stateTitle}>Admission requests could not be loaded.</Text><Pressable accessibilityRole="button" onPress={() => registrations.refetch()}><Text style={styles.link}>Try again →</Text></Pressable></View> : rows.length === 0 ? <View style={styles.state}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.stateTitle}>{filter === 'ALL' ? 'No admission requests yet' : `No ${filter.toLowerCase()} requests`}</Text><Text style={styles.stateText}>New public applications will appear here automatically.</Text></View> : <View style={styles.rows}>{rows.map((row) => <Pressable accessibilityRole="button" key={row.id} onPress={() => setSelected(row)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}><View style={[styles.avatar, row.status === 'PENDING' && styles.avatarPending]}><Text style={styles.avatarText}>{row.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text></View><View style={styles.rowMain}><View style={styles.nameLine}><Text style={styles.rowName}>{row.name}</Text><StatusBadge status={row.status}/></View><Text style={styles.meta}>{row.applyingClass} · Submitted {dateLabel(row.submittedAt)}</Text><Text numberOfLines={1} style={styles.guardian}>Parent / guardian: {row.guardianName} · {row.guardianContact}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}</View>}
      </View>
    </ScrollView>
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Close admission details" style={StyleSheet.absoluteFill} onPress={() => setSelected(null)}/><View style={styles.modal}><ScrollView contentContainerStyle={styles.modalContent}>{selected ? <><View style={styles.modalHeader}><View><Text style={styles.eyebrow}>ADMISSION ENQUIRY</Text><Text style={styles.modalTitle}>{selected.name}</Text><Text style={styles.meta}>{selected.applyingClass} · Submitted {dateLabel(selected.submittedAt)}</Text></View><Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View><View style={styles.detailGrid}><Detail label="Date of birth" value={dateLabel(selected.dob)}/><Detail label="Gender" value={selected.gender}/><Detail label="Student mobile" value={selected.mobile || 'Not provided'}/><Detail label="Email" value={selected.email || 'Not provided'}/><Detail label="Guardian" value={selected.guardianName}/><Detail label="Guardian contact" value={selected.guardianContact}/><Detail label="Previous school" value={selected.previousSchool || 'Not provided'}/><Detail label="Address" value={selected.address}/></View>{selected.status === 'REJECTED' && selected.rejectionReason ? <View style={styles.reasonBox}><Text style={styles.reasonLabel}>Rejection reason</Text><Text style={styles.reasonText}>{selected.rejectionReason}</Text></View> : null}{selected.status === 'PENDING' ? <Pressable accessibilityRole="button" onPress={() => setRejecting(selected)} style={styles.rejectButton}><Text style={styles.rejectText}>Reject request</Text></Pressable> : null}</> : null}</ScrollView></View></View></Modal>
    <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}><View style={styles.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Close rejection dialog" style={StyleSheet.absoluteFill} onPress={() => setRejecting(null)}/><View style={styles.rejectModal}><Text style={styles.modalTitle}>Reject this request?</Text><Text style={styles.modalDescription}>Add a short reason so the admission record stays clear for the school team.</Text><Text style={styles.inputLabel}>Reason *</Text><TextInput autoFocus value={reason} onChangeText={setReason} placeholder="For example: requested class is currently full" placeholderTextColor="#98A4B6" multiline style={styles.input}/><View style={styles.modalActions}><Pressable accessibilityRole="button" onPress={() => setRejecting(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable accessibilityRole="button" onPress={reject} style={styles.confirmReject}><Text style={styles.confirmRejectText}>Reject request</Text></Pressable></View></View></View></Modal>
  </View>;
}

function StatusBadge({ status }: { status: string }) { const tone = status === 'PENDING' ? styles.pending : status === 'APPROVED' ? styles.approved : styles.rejected; return <View style={[styles.badge, tone]}><Text style={[styles.badgeText, status === 'PENDING' ? styles.pendingText : status === 'APPROVED' ? styles.approvedText : styles.rejectedText]}>{status}</Text></View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...surfaces.content, padding: 28, gap: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  headingCopy: { flex: 1, minWidth: 240 },
  eyebrow: { color: colors.blueLight, fontSize: 10, fontWeight: '800', letterSpacing: 1.7 },
  title: { color: '#f0f6ff', fontSize: 29, fontWeight: '800', marginTop: 7, letterSpacing: -0.3 },
  description: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 21, marginTop: 7 },
  refresh: { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.30)', borderRadius: 9, paddingHorizontal: 15, paddingVertical: 12 },
  refreshText: { color: colors.blueLight, fontWeight: '700', fontSize: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 14,
    padding: 15,
    flex: 1,
    minWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#f0f6ff', fontSize: 12, fontWeight: '700' },
  statHint: { color: 'rgba(255,255,255,0.40)', fontSize: 10, marginTop: 4 },
  listCard: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 16,
    padding: 22,
  },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 15 },
  listTitle: { color: '#f0f6ff', fontSize: 17, fontWeight: '700' },
  listSubtitle: { color: 'rgba(255,255,255,0.40)', fontSize: 11, marginTop: 4 },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  secureDot: { color: '#34d399', fontSize: 8 },
  secureText: { color: '#34d399', fontSize: 10, fontWeight: '700' },
  rows: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  row: {
    minHeight: 78,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  rowPressed: { opacity: 0.65 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPending: { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.30)' },
  avatarText: { color: colors.blueLight, fontSize: 12, fontWeight: '800' },
  rowMain: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  rowName: { color: '#f0f6ff', fontSize: 14, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,0.40)', fontSize: 11, marginTop: 4 },
  guardian: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 6 },
  chevron: { color: 'rgba(255,255,255,0.30)', fontSize: 26, paddingHorizontal: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  pending: { backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.30)' },
  pendingText: { color: '#fbbf24' },
  approved: { backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.30)' },
  approvedText: { color: '#34d399' },
  rejected: { backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)' },
  rejectedText: { color: '#f87171' },
  state: { alignItems: 'center', justifyContent: 'center', minHeight: 220, padding: 28 },
  stateTitle: { color: '#f0f6ff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  stateText: { color: 'rgba(255,255,255,0.40)', fontSize: 12, textAlign: 'center', marginTop: 8 },
  emptyIcon: { color: 'rgba(255,255,255,0.20)', fontSize: 33, marginBottom: 12 },
  link: { color: colors.blueLight, fontSize: 12, fontWeight: '700', marginTop: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(4, 8, 18, 0.80)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modal: {
    backgroundColor: '#0e1525',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    width: '92%',
    maxWidth: 650,
    maxHeight: '90%',
  },
  modalContent: { padding: 24, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalTitle: { color: '#f0f6ff', fontSize: 21, fontWeight: '800', marginTop: 6 },
  close: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#f0f6ff', fontSize: 23 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  detail: { width: '50%', minWidth: 210, padding: 12, borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  detailLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: '700' },
  detailValue: { color: '#f0f6ff', fontSize: 13, lineHeight: 19, marginTop: 4 },
  reasonBox: { backgroundColor: 'rgba(248,113,113,0.10)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', borderRadius: 10, padding: 13 },
  reasonLabel: { color: '#f87171', fontSize: 10, fontWeight: '800' },
  reasonText: { color: 'rgba(255,255,255,0.70)', fontSize: 12, marginTop: 5, lineHeight: 18 },
  rejectButton: { alignSelf: 'flex-start', backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 11 },
  rejectText: { color: '#f87171', fontWeight: '700', fontSize: 12 },
  rejectModal: { backgroundColor: '#0e1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 18, width: '92%', maxWidth: 480, padding: 24 },
  modalDescription: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 19, marginTop: 8 },
  inputLabel: { color: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  input: {
    ...surfaces.input,
    minHeight: 90,
    textAlignVertical: 'top',
    color: '#f0f6ff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  cancel: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 9, paddingHorizontal: 15, paddingVertical: 11 },
  cancelText: { color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: '700' },
  confirmReject: { backgroundColor: colors.danger, borderRadius: 9, paddingHorizontal: 15, paddingVertical: 11 },
  confirmRejectText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
