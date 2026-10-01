import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { colors, radius, surfaces } from '../theme';

interface Props {
  visible: boolean;
  selectedClass: any;
  allStudentFeeAccounts: any[];
  classSections?: any[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function ClassStudentsFeeModal({
  visible,
  selectedClass,
  allStudentFeeAccounts,
  classSections = [],
  onClose,
  onSaved,
}: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PENDING' | 'OFFER' | 'PAID'>('ALL');

  // Editing state for individual student fee
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFeeAmount, setEditFeeAmount] = useState('');
  const [editFeeReason, setEditFeeReason] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [editError, setEditError] = useState('');

  const formatMoney = (value: any) =>
    Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // Students belonging to this class
  const classStudents = useMemo(() => {
    if (!selectedClass?.id) return [];
    return allStudentFeeAccounts.filter((acc: any) => acc.classId === selectedClass.id);
  }, [selectedClass?.id, allStudentFeeAccounts]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let list = classStudents;

    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((st: any) => {
        const name = String(st.studentName || '').toLowerCase();
        const code = String(st.studentCode || '').toLowerCase();
        const roll = String(st.rollNumber || '').toLowerCase();
        const sec = String(st.sectionName || '').toLowerCase();
        return name.includes(query) || code.includes(query) || roll.includes(query) || sec.includes(query);
      });
    }

    // Section filter
    if (selectedSectionId) {
      list = list.filter((st: any) => st.sectionId === selectedSectionId);
    }

    // Status filter
    if (filterType === 'PENDING') {
      list = list.filter((st: any) => st.remainingFee > 0);
    } else if (filterType === 'PAID') {
      list = list.filter((st: any) => st.remainingFee === 0);
    } else if (filterType === 'OFFER') {
      // Custom offer: assessed fee is different from class default fee
      list = list.filter((st: any) => selectedClass?.totalFee != null && st.totalFee !== selectedClass.totalFee);
    }

    return list;
  }, [classStudents, searchQuery, selectedSectionId, filterType, selectedClass?.totalFee]);

  const startEditStudent = (student: any) => {
    setEditingStudentId(student.id);
    setEditFeeAmount(String(student.totalFee ?? selectedClass?.totalFee ?? ''));
    setEditFeeReason('');
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingStudentId(null);
    setEditFeeAmount('');
    setEditFeeReason('');
    setEditError('');
  };

  const saveStudentFee = async (student: any) => {
    const rawVal = editFeeAmount.trim();
    const amount = Number(rawVal);
    if (!rawVal || !Number.isFinite(amount) || amount < 0) {
      setEditError('Please enter a valid non-negative fee amount.');
      return;
    }

    setSavingFee(true);
    setEditError('');
    try {
      await api.patch(`/fees/accounts/${student.id}`, {
        amount,
        reason: editFeeReason.trim() || undefined,
      });

      if (Platform.OS === 'web') {
        // notification
      } else {
        Alert.alert('Fee Updated', `Fee for ${student.studentName} updated to ₹${formatMoney(amount)} successfully.`);
      }

      await onSaved();
      cancelEdit();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not update student fee.';
      setEditError(String(msg));
    } finally {
      setSavingFee(false);
    }
  };

  if (!selectedClass) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[s.dialog, { maxWidth: isDesktop ? 860 : '96%' }]}>
          {/* ── Modal Header ── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <View style={s.headerEyebrowRow}>
                <Ionicons name="school-outline" size={14} color={colors.primary} />
                <Text style={s.headerEyebrow}>CLASS STUDENT FEES & OFFERS</Text>
              </View>
              <Text style={s.headerTitle}>{selectedClass.name} — Student Fee List</Text>
              <Text style={s.headerSubtitle}>
                Manage individual student fees, offer concessions/discounts, and view payment balances.
              </Text>
            </View>

            <TouchableOpacity
              accessibilityLabel="Close"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {/* ── Class Quick Summary KPI Bar ── */}
          <View style={s.kpiBar}>
            <View style={s.kpiItem}>
              <Text style={s.kpiLabel}>Default Class Fee</Text>
              <Text style={s.kpiValue}>
                {selectedClass.hasFee ? `₹${formatMoney(selectedClass.totalFee)}` : 'Not Set'}
              </Text>
            </View>

            <View style={s.kpiItem}>
              <Text style={s.kpiLabel}>Enrolled Students</Text>
              <Text style={s.kpiValue}>{classStudents.length} Students</Text>
            </View>

            <View style={s.kpiItem}>
              <Text style={s.kpiLabel}>Fee Collected</Text>
              <Text style={[s.kpiValue, { color: colors.success }]}>
                ₹{formatMoney(selectedClass.totalCollected)}
              </Text>
            </View>

            <View style={s.kpiItem}>
              <Text style={s.kpiLabel}>Fee Pending</Text>
              <Text style={[s.kpiValue, { color: selectedClass.totalPending > 0 ? colors.danger : colors.muted }]}>
                ₹{formatMoney(selectedClass.totalPending)}
              </Text>
            </View>
          </View>

          {/* ── Search & Filter Controls ── */}
          <View style={s.filterSection}>
            {/* Search Input */}
            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.muted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by student name, student ID, roll number..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter Pills Row */}
            <View style={s.filterRow}>
              {/* Section Filters */}
              {classSections.length > 0 && (
                <View style={s.chipGroup}>
                  <Text style={s.chipGroupLabel}>Section:</Text>
                  <TouchableOpacity
                    style={[s.chip, !selectedSectionId && s.chipActive]}
                    onPress={() => setSelectedSectionId('')}
                  >
                    <Text style={[s.chipText, !selectedSectionId && s.chipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {classSections.map((sec: any) => (
                    <TouchableOpacity
                      key={sec.id}
                      style={[s.chip, selectedSectionId === sec.id && s.chipActive]}
                      onPress={() => setSelectedSectionId(sec.id)}
                    >
                      <Text style={[s.chipText, selectedSectionId === sec.id && s.chipTextActive]}>
                        Sec {sec.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Status Filters */}
              <View style={s.chipGroup}>
                <Text style={s.chipGroupLabel}>Status:</Text>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'PENDING', label: 'Due Pending' },
                  { id: 'OFFER', label: 'Custom Offer' },
                  { id: 'PAID', label: 'All Paid' },
                ].map((f: any) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[s.chip, filterType === f.id && s.chipActive]}
                    onPress={() => setFilterType(f.id)}
                  >
                    <Text style={[s.chipText, filterType === f.id && s.chipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Students List Content ── */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {classStudents.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="people-outline" size={36} color={colors.muted} />
                <Text style={s.emptyTitle}>No students enrolled in {selectedClass.name}</Text>
                <Text style={s.emptyText}>
                  Students enrolled in this class will appear here along with their fee accounts.
                </Text>
              </View>
            ) : filteredStudents.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="search-outline" size={32} color={colors.muted} />
                <Text style={s.emptyTitle}>No matching students found</Text>
                <Text style={s.emptyText}>Try adjusting your search query or filter options.</Text>
              </View>
            ) : (
              <View style={s.studentList}>
                {filteredStudents.map((st: any) => {
                  const isEditing = editingStudentId === st.id;
                  const hasCustomOffer = selectedClass?.totalFee != null && st.totalFee !== selectedClass.totalFee;

                  return (
                    <View key={st.id} style={[s.studentCard, isEditing && s.studentCardEditing]}>
                      {/* Top Row: Student Identity */}
                      <View style={s.studentCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={s.studentNameRow}>
                            <Text style={s.studentName}>{st.studentName}</Text>
                            {st.rollNumber ? (
                              <View style={s.rollBadge}>
                                <Text style={s.rollBadgeText}>Roll #{st.rollNumber}</Text>
                              </View>
                            ) : null}
                            <View style={s.sectionBadge}>
                              <Text style={s.sectionBadgeText}>Sec {st.sectionName || 'A'}</Text>
                            </View>
                          </View>
                          <Text style={s.studentCodeText}>Student ID: {st.studentCode}</Text>
                        </View>

                        {hasCustomOffer ? (
                          <View style={s.offerBadge}>
                            <Ionicons name="pricetag-outline" size={12} color="#fbbf24" />
                            <Text style={s.offerBadgeText}>OFFER / CONCESSION APPLIED</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Fee Metrics Row */}
                      <View style={s.feeMetricsRow}>
                        <View style={s.feeMetricItem}>
                          <Text style={s.feeMetricLabel}>Total Fee Assigned</Text>
                          <Text style={[s.feeMetricValue, hasCustomOffer && { color: colors.primary }]}>
                            ₹{formatMoney(st.totalFee)}
                            {hasCustomOffer ? ' *' : ''}
                          </Text>
                        </View>

                        <View style={s.feeMetricItem}>
                          <Text style={s.feeMetricLabel}>Paid Amount</Text>
                          <Text style={[s.feeMetricValue, { color: colors.success }]}>
                            ₹{formatMoney(st.paidAmount)}
                          </Text>
                        </View>

                        <View style={s.feeMetricItem}>
                          <Text style={s.feeMetricLabel}>Remaining Pending</Text>
                          <Text style={[s.feeMetricValue, { color: st.remainingFee > 0 ? colors.danger : colors.muted }]}>
                            ₹{formatMoney(st.remainingFee)}
                          </Text>
                        </View>

                        <View style={{ justifyContent: 'center' }}>
                          {!isEditing ? (
                            <TouchableOpacity
                              style={s.editFeeBtn}
                              onPress={() => startEditStudent(st)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="create-outline" size={14} color={colors.primary} />
                              <Text style={s.editFeeBtnText}>Edit Fee / Give Offer</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>

                      {/* Inline Fee Editor Form */}
                      {isEditing ? (
                        <View style={s.inlineEditorBox}>
                          <View style={s.inlineEditorHeader}>
                            <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                            <Text style={s.inlineEditorTitle}>
                              Set Custom / Offer Fee for {st.studentName}
                            </Text>
                          </View>

                          <Text style={s.inlineEditorHint}>
                            Default Class Fee is ₹{formatMoney(selectedClass.totalFee)}. Enter the exact annual fee for this student (e.g. 15000). Remaining balance will update automatically.
                          </Text>

                          <View style={s.inlineEditorInputsRow}>
                            <View style={{ flex: 1.2, minWidth: 160 }}>
                              <Text style={s.inputLabel}>New Fee Amount (₹) *</Text>
                              <TextInput
                                style={s.amountInput}
                                placeholder="e.g. 15000"
                                placeholderTextColor={colors.muted}
                                keyboardType="numeric"
                                value={editFeeAmount}
                                onChangeText={setEditFeeAmount}
                              />
                            </View>

                            <View style={{ flex: 2, minWidth: 200 }}>
                              <Text style={s.inputLabel}>Offer Reason / Concession Note (Optional)</Text>
                              <TextInput
                                style={s.reasonInput}
                                placeholder="e.g. 15k Special Concession / Merit Offer"
                                placeholderTextColor={colors.muted}
                                value={editFeeReason}
                                onChangeText={setEditFeeReason}
                              />
                            </View>
                          </View>

                          {editError ? (
                            <Text style={s.errorText}>{editError}</Text>
                          ) : null}

                          <View style={s.inlineEditorActionsRow}>
                            <TouchableOpacity
                              style={[s.saveFeeBtn, savingFee && s.btnDisabled]}
                              disabled={savingFee}
                              onPress={() => saveStudentFee(st)}
                              activeOpacity={0.8}
                            >
                              {savingFee ? (
                                <ActivityIndicator size="small" color="#080c14" />
                              ) : (
                                <Ionicons name="checkmark-outline" size={16} color="#080c14" />
                              )}
                              <Text style={s.saveFeeBtnText}>
                                {savingFee ? 'Saving…' : 'Save Student Fee'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={s.cancelEditBtn}
                              disabled={savingFee}
                              onPress={cancelEdit}
                              activeOpacity={0.8}
                            >
                              <Text style={s.cancelEditBtnText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* ── Modal Bottom Bar ── */}
          <View style={s.footer}>
            <Text style={s.footerHint}>
              • Total {filteredStudents.length} of {classStudents.length} student(s) displayed
            </Text>
            <TouchableOpacity style={s.footerCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={s.footerCloseBtnText}>Done / Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any) : {}),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#0c121e',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    flexShrink: 0,
    gap: 12,
  },
  headerEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  headerSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // KPI Bar
  kpiBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    flexShrink: 0,
  },
  kpiItem: {
    flex: 1,
    minWidth: 130,
    paddingHorizontal: 6,
  },
  kpiLabel: { fontSize: 11, color: colors.muted, marginBottom: 2 },
  kpiValue: { fontSize: 15, fontWeight: '800', color: colors.ink },

  // Filter Section
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
    flexShrink: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  chipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipGroupLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', marginRight: 2 },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(147, 155, 255, 0.18)',
    borderColor: colors.primary,
  },
  chipText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  chipTextActive: { color: colors.primary, fontWeight: '700' },

  // Scroll Content
  scroll: { flex: 1, flexShrink: 1 },
  scrollContent: { padding: 18, gap: 12 },

  // Student Card
  studentList: { gap: 12 },
  studentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 10,
  },
  studentCardEditing: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(147, 155, 255, 0.05)',
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  studentName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rollBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  rollBadgeText: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  sectionBadge: {
    backgroundColor: 'rgba(147, 155, 255, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  sectionBadgeText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  studentCodeText: { fontSize: 11, color: colors.muted, marginTop: 2 },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  offerBadgeText: { fontSize: 10, fontWeight: '800', color: '#fbbf24', letterSpacing: 0.4 },

  // Fee Metrics Row
  feeMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 10,
    borderRadius: radius.sm,
  },
  feeMetricItem: { minWidth: 110 },
  feeMetricLabel: { fontSize: 10, color: colors.muted, marginBottom: 2 },
  feeMetricValue: { fontSize: 13, fontWeight: '800', color: colors.ink },
  editFeeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(147, 155, 255, 0.14)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(147, 155, 255, 0.3)',
  },
  editFeeBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  // Inline Editor Box
  inlineEditorBox: {
    backgroundColor: 'rgba(12, 18, 30, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(147, 155, 255, 0.3)',
    borderRadius: radius.sm,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  inlineEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineEditorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  inlineEditorHint: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  inlineEditorInputsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
  },
  amountInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.sm,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reasonInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.sm,
    color: colors.ink,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: { fontSize: 11, color: colors.danger, fontWeight: '600' },
  inlineEditorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  saveFeeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  saveFeeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#080c14',
  },
  cancelEditBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  btnDisabled: { opacity: 0.6 },

  // Empty Box
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: 'center', maxWidth: 360 },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: 10,
  },
  footerHint: { fontSize: 11, color: colors.muted },
  footerCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerCloseBtnText: { fontSize: 12, fontWeight: '700', color: colors.ink },
});
