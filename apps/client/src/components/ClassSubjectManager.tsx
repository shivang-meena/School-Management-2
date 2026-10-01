import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { colors, radius, surfaces } from '../theme';

type Props = {
  classes: any[];
  subjects?: any[];
  parentSubjects?: any[];
  onChanged?: () => Promise<void> | void;
};

function isSeniorSecondary(schoolClass?: { name: string; sortOrder?: number | null } | null): boolean {
  if (!schoolClass) return false;
  if (schoolClass.sortOrder != null) {
    if (schoolClass.sortOrder >= 11) return true;
    if (schoolClass.sortOrder >= 1 && schoolClass.sortOrder <= 10) return false;
  }
  const normalized = schoolClass.name.trim().toLowerCase();
  return /\b(11|12|11th|12th|xi|xii)\b/i.test(normalized);
}

function errorText(error: any): string {
  const data = error?.response?.data;
  if (!data) return error?.message || 'A network error occurred. Please try again.';
  if (Array.isArray(data.message)) return data.message.join(' · ');
  return data.message || 'Operation failed. Please check inputs.';
}

export function ClassSubjectManager({
  classes = [],
  parentSubjects = [],
  onChanged,
}: Props) {
  const queryClient = useQueryClient();

  // Class Selection Filter
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || '');
  const activeClassId = selectedClassId || classes[0]?.id || '';
  const currentClass = classes.find((c) => c.id === activeClassId);
  const isSenior = isSeniorSecondary(currentClass);

  // Selected stream for Class 11/12
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');

  // Edit Subject Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editIsOptional, setEditIsOptional] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Edit Stream Modal State
  const [editStreamModalOpen, setEditStreamModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<any>(null);
  const [streamName, setStreamName] = useState('');
  const [streamCode, setStreamCode] = useState('');
  const [streamDesc, setStreamDesc] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');

  // Fetch Class-Wise Subjects for selected class
  const classSubjectsQuery = useQuery({
    queryKey: ['class-subjects', activeClassId],
    queryFn: async () => {
      if (!activeClassId) return null;
      const res = await api.get(`/academics/classes/${activeClassId}/subjects`);
      return res.data;
    },
    enabled: !!activeClassId,
  });

  // Fetch Parent Subjects directly
  const parentSubjectsQuery = useQuery({
    queryKey: ['parent-subjects-list'],
    queryFn: async () => {
      const res = await api.get('/academics/parent-subjects', { params: { includeInactive: true } });
      return res.data;
    },
  });

  const activeParentList = useMemo(() => {
    return parentSubjectsQuery.data || parentSubjects || [];
  }, [parentSubjectsQuery.data, parentSubjects]);

  // Sync selected stream when class changes or query loads
  const currentStreamId = useMemo(() => {
    if (!isSenior) return '';
    if (selectedStreamId && activeParentList.some((p: any) => p.id === selectedStreamId)) {
      return selectedStreamId;
    }
    return activeParentList[0]?.id || '';
  }, [isSenior, selectedStreamId, activeParentList]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['class-subjects', activeClassId] }),
      queryClient.invalidateQueries({ queryKey: ['parent-subjects-list'] }),
      queryClient.invalidateQueries({ queryKey: ['academics'] }),
    ]);
    if (onChanged) await onChanged();
  };

  // Open Edit Subject Modal
  const openEditModal = (item: any) => {
    setEditingSubject(item);
    setEditName(item.subject?.name || '');
    setEditCode(item.subject?.code || '');
    setEditIsOptional(!!item.isOptional);
    setEditError('');
    setEditModalOpen(true);
  };

  // Save Subject Edit
  const handleSaveSubjectEdit = async () => {
    if (!editingSubject?.id) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Subject name is required');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      await api.patch(`/academics/class-subjects/${editingSubject.id}`, {
        name: trimmedName,
        code: editCode.trim() || undefined,
        isOptional: editIsOptional,
      });
      setEditModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      setEditError(errorText(err));
    } finally {
      setEditLoading(false);
    }
  };

  // Toggle Subject Active / Inactive
  const handleToggleSubjectActive = async (item: any) => {
    try {
      const nextActive = item.isActive === false ? true : false;
      await api.patch(`/academics/class-subjects/${item.id}`, { isActive: nextActive });
      await refreshAll();
    } catch (err: any) {
      Alert.alert('Status Update Failed', errorText(err));
    }
  };

  // Remove Subject from Class
  const handleRemoveSubject = (subjectId: string, subjectName: string, streamId?: string) => {
    const doDelete = async () => {
      try {
        const queryParams = streamId ? `?parentSubjectId=${streamId}` : '';
        await api.delete(`/academics/classes/${activeClassId}/subjects/${subjectId}${queryParams}`);
        await refreshAll();
      } catch (err: any) {
        Alert.alert('Cannot Remove Subject', errorText(err));
      }
    };

    const confirmMsg = `Are you sure you want to remove "${subjectName}" from ${currentClass?.name || 'this class'}?`;
    if (Platform.OS === 'web' && typeof (globalThis as any).confirm === 'function') {
      if ((globalThis as any).confirm(confirmMsg)) void doDelete();
      return;
    }
    Alert.alert('Remove Subject', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  // Open Edit Stream Modal
  const openEditStreamModal = (stream: any) => {
    setEditingStream(stream);
    setStreamName(stream.name || '');
    setStreamCode(stream.code || '');
    setStreamDesc(stream.description || '');
    setStreamError('');
    setEditStreamModalOpen(true);
  };

  // Save Stream Edit
  const handleSaveStreamEdit = async () => {
    if (!editingStream?.id) return;
    const trimmedName = streamName.trim();
    if (!trimmedName) {
      setStreamError('Stream name is required');
      return;
    }
    setStreamLoading(true);
    setStreamError('');
    try {
      await api.patch(`/academics/parent-subjects/${editingStream.id}`, {
        name: trimmedName,
        code: streamCode.trim().toUpperCase(),
        description: streamDesc.trim() || undefined,
      });
      setEditStreamModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      setStreamError(errorText(err));
    } finally {
      setStreamLoading(false);
    }
  };

  // Toggle Stream Active / Inactive
  const handleToggleStreamActive = async (stream: any) => {
    try {
      await api.patch(`/academics/parent-subjects/${stream.id}`, {
        isActive: !stream.isActive,
      });
      await refreshAll();
    } catch (err: any) {
      Alert.alert('Could Not Update Stream Status', errorText(err));
    }
  };

  // Data for Class 1-10
  const flatSubjects = classSubjectsQuery.data?.subjects || [];

  // Grouped streams data for Class 11-12
  const streamGroups = useMemo(() => {
    if (!isSenior) return [];
    return classSubjectsQuery.data?.streams || [];
  }, [isSenior, classSubjectsQuery.data]);

  const activeStreamGroup = useMemo(() => {
    if (!isSenior) return null;
    return streamGroups.find((g: any) => g.parentSubject?.id === currentStreamId) || null;
  }, [isSenior, streamGroups, currentStreamId]);

  return (
    <View style={s.container}>
      {/* Dynamic Class Filter Bar */}
      <View style={s.filterHeader}>
        <View style={s.filterTitleRow}>
          <Text style={s.filterHeading}>Class Filter</Text>
          <Text style={s.filterSubtext}>
            Tap a class below to view its subjects. Use the form above to create & assign new subjects.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.classListScroll}>
          {classes.map((cls) => {
            const isSelected = cls.id === activeClassId;
            const clsIsSenior = isSeniorSecondary(cls);
            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={cls.id}
                style={[s.classCard, isSelected && s.classCardSelected]}
                onPress={() => setSelectedClassId(cls.id)}
              >
                <View style={s.classCardBadgeRow}>
                  <Text style={[s.classBadge, clsIsSenior ? s.classBadgeSenior : s.classBadgeJunior]}>
                    {clsIsSenior ? 'STREAMS' : 'DIRECT'}
                  </Text>
                </View>
                <Text style={[s.classCardTitle, isSelected && s.classCardTitleSelected]}>{cls.name}</Text>
                <Text style={s.classCardMeta}>Sort order: {cls.sortOrder}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Class Mode Indicator Banner */}
      <View style={[s.modeBanner, isSenior ? s.modeBannerSenior : s.modeBannerJunior]}>
        <View style={s.modeBannerIcon}>
          <Text style={s.modeBannerIconText}>{isSenior ? '🧬' : '📖'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.modeBannerTitle}>
            {currentClass?.name} · {isSenior ? 'Senior Secondary Mode' : 'Direct Subject Mode'}
          </Text>
          <Text style={s.modeBannerSubtitle}>
            {isSenior
              ? 'Subjects are organized under Parent Subjects / Streams. Select a stream below to view its child subjects.'
              : 'Direct subjects mapped to this class without any streams or parent subjects.'}
          </Text>
        </View>
      </View>

      {/* Loading Indicator */}
      {classSubjectsQuery.isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.loadingText}>Loading subjects for {currentClass?.name}...</Text>
        </View>
      ) : null}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CASE 1: CLASS 1 TO 10 (DIRECT SUBJECTS MODE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {!isSenior && !classSubjectsQuery.isLoading && (
        <View style={s.directSection}>
          <View style={s.listHeaderRow}>
            <View>
              <Text style={s.listTitle}>
                Assigned Subjects ({flatSubjects.length})
              </Text>
              <Text style={s.listSubtitle}>Direct child subjects mapped to {currentClass?.name}</Text>
            </View>
          </View>

          {flatSubjects.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>No subjects assigned to {currentClass?.name} yet</Text>
              <Text style={s.emptyDesc}>
                Use the "Create / process record" form above (Select Configuration: SUBJECT) to add subjects directly to this class.
              </Text>
            </View>
          ) : (
            <View style={s.subjectsGrid}>
              {flatSubjects.map((item: any) => {
                const isActive = item.isActive !== false;
                return (
                  <View key={item.id} style={[s.subjectCard, !isActive && s.subjectCardInactive]}>
                    <View style={s.subjectTopRow}>
                      <View style={s.codeTag}>
                        <Text style={s.codeTagText}>{item.subject?.code || 'SUB'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Text style={[s.statusTag, isActive ? s.statusTagActive : s.statusTagInactive]}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                        <Text style={[s.optionalTag, item.isOptional ? s.optionalTagElective : s.optionalTagCompulsory]}>
                          {item.isOptional ? 'ELECTIVE' : 'COMPULSORY'}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.subjectName}>{item.subject?.name}</Text>

                    <View style={s.subjectCardFooter}>
                      <Text style={s.subjectMeta}>Class 1–10 Mapping</Text>
                      <View style={s.cardActionsRow}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={s.editBtn}
                          onPress={() => openEditModal(item)}
                        >
                          <Text style={s.editBtnText}>✏️ Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          accessibilityRole="button"
                          style={[s.toggleBtn, !isActive && s.toggleBtnActive]}
                          onPress={() => handleToggleSubjectActive(item)}
                        >
                          <Text style={s.toggleBtnText}>{isActive ? '🚫 Deactivate' : '✓ Activate'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          accessibilityRole="button"
                          style={s.deleteBtn}
                          onPress={() => handleRemoveSubject(item.subjectId, item.subject?.name)}
                        >
                          <Text style={s.deleteBtnText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CASE 2: CLASS 11 & 12 (HIERARCHICAL STREAM MODE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSenior && !classSubjectsQuery.isLoading && (
        <View style={s.seniorSection}>
          <View style={s.streamSelectorBlock}>
            <View style={s.listHeaderRow}>
              <View>
                <Text style={s.listTitle}>Academic Streams / Parent Subjects</Text>
                <Text style={s.listSubtitle}>
                  Choose a stream to view and manage its child subjects for {currentClass?.name}:
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.streamTabsScroll}>
              {streamGroups.map((group: any) => {
                const stream = group.parentSubject;
                const isSelected = stream.id === currentStreamId;
                const count = group.subjects?.length || 0;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={stream.id}
                    style={[s.streamTab, isSelected && s.streamTabSelected]}
                    onPress={() => setSelectedStreamId(stream.id)}
                  >
                    <View style={s.streamTabTop}>
                      <Text style={[s.streamTabCode, isSelected && s.streamTabCodeSelected]}>
                        {stream.code}
                      </Text>
                      <Text style={[s.streamCountBadge, isSelected && s.streamCountBadgeSelected]}>
                        {count} subject{count === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={[s.streamTabName, isSelected && s.streamTabNameSelected]} numberOfLines={2}>
                      {stream.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Child Subjects under the Selected Stream */}
          {activeStreamGroup ? (
            <View style={s.childSubjectsBlock}>
              <View style={s.streamHeaderCard}>
                <View style={s.streamHeaderInfo}>
                  <View style={s.streamHeaderBadgeRow}>
                    <Text style={s.streamHeaderCode}>{activeStreamGroup.parentSubject?.code}</Text>
                    <Text style={[s.statusTag, activeStreamGroup.parentSubject?.isActive ? s.statusTagActive : s.statusTagInactive]}>
                      {activeStreamGroup.parentSubject?.isActive ? 'ACTIVE STREAM' : 'INACTIVE STREAM'}
                    </Text>
                  </View>
                  <Text style={s.streamHeaderTitle}>{activeStreamGroup.parentSubject?.name}</Text>
                  {activeStreamGroup.parentSubject?.description ? (
                    <Text style={s.streamHeaderDesc}>{activeStreamGroup.parentSubject.description}</Text>
                  ) : null}
                </View>
                <View style={s.streamHeaderActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.editBtn}
                    onPress={() => openEditStreamModal(activeStreamGroup.parentSubject)}
                  >
                    <Text style={s.editBtnText}>✏️ Edit Stream</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.toggleBtn}
                    onPress={() => handleToggleStreamActive(activeStreamGroup.parentSubject)}
                  >
                    <Text style={s.toggleBtnText}>
                      {activeStreamGroup.parentSubject?.isActive ? '🚫 Deactivate' : '✓ Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.listHeaderRow}>
                <View>
                  <Text style={s.listTitle}>
                    Child Subjects under {activeStreamGroup.parentSubject?.code} ({activeStreamGroup.subjects?.length || 0})
                  </Text>
                  <Text style={s.listSubtitle}>
                    Subjects assigned to {currentClass?.name} under this academic stream
                  </Text>
                </View>
              </View>

              {activeStreamGroup.subjects?.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyTitle}>
                    No child subjects under {activeStreamGroup.parentSubject?.name} yet
                  </Text>
                  <Text style={s.emptyDesc}>
                    Use the "Create / process record" form above (Select Configuration: SUBJECT) to add child subjects under this stream.
                  </Text>
                </View>
              ) : (
                <View style={s.subjectsGrid}>
                  {activeStreamGroup.subjects.map((item: any) => {
                    const isActive = item.isActive !== false;
                    return (
                      <View key={item.id} style={[s.subjectCard, !isActive && s.subjectCardInactive]}>
                        <View style={s.subjectTopRow}>
                          <View style={s.codeTag}>
                            <Text style={s.codeTagText}>{item.subject?.code || 'SUB'}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <Text style={[s.statusTag, isActive ? s.statusTagActive : s.statusTagInactive]}>
                              {isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Text>
                            <Text style={[s.optionalTag, item.isOptional ? s.optionalTagElective : s.optionalTagCompulsory]}>
                              {item.isOptional ? 'ELECTIVE' : 'COMPULSORY'}
                            </Text>
                          </View>
                        </View>

                        <Text style={s.subjectName}>{item.subject?.name}</Text>

                        <View style={s.subjectCardFooter}>
                          <Text style={s.subjectMeta}>Under {activeStreamGroup.parentSubject?.code}</Text>
                          <View style={s.cardActionsRow}>
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={s.editBtn}
                              onPress={() => openEditModal(item)}
                            >
                              <Text style={s.editBtnText}>✏️ Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              accessibilityRole="button"
                              style={[s.toggleBtn, !isActive && s.toggleBtnActive]}
                              onPress={() => handleToggleSubjectActive(item)}
                            >
                              <Text style={s.toggleBtnText}>{isActive ? '🚫 Deactivate' : '✓ Activate'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              accessibilityRole="button"
                              style={s.deleteBtn}
                              onPress={() => handleRemoveSubject(item.subjectId, item.subject?.name, item.parentSubjectId)}
                            >
                              <Text style={s.deleteBtnText}>🗑️ Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: EDIT SUBJECT MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={editModalOpen} transparent animationType="fade" onRequestClose={() => setEditModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>EDIT SUBJECT</Text>
                <Text style={s.modalTitle}>{editingSubject?.subject?.name || 'Edit Subject'}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" style={s.modalCloseBtn} onPress={() => setEditModalOpen(false)}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody}>
              <View style={s.formField}>
                <Text style={s.formLabel}>
                  Subject Name <Text style={s.reqStar}>*</Text>
                </Text>
                <TextInput
                  style={s.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Mathematics, Physics, Hindi"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Subject Code</Text>
                <TextInput
                  style={s.textInput}
                  value={editCode}
                  onChangeText={setEditCode}
                  placeholder="e.g. MATH, PHY, HIN"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCapitalize="characters"
                />
              </View>

              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>Optional / Elective Subject</Text>
                  <Text style={s.switchHelp}>Toggle on if this subject is an elective choice for students.</Text>
                </View>
                <Switch
                  value={editIsOptional}
                  onValueChange={setEditIsOptional}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {editError ? (
                <View style={s.errorBanner}>
                  <Text style={s.errorText}>{editError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                disabled={editLoading}
                style={[s.saveBtn, editLoading && s.disabledBtn]}
                onPress={handleSaveSubjectEdit}
              >
                {editLoading ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: EDIT STREAM MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={editStreamModalOpen} transparent animationType="fade" onRequestClose={() => setEditStreamModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>EDIT STREAM / PARENT SUBJECT</Text>
                <Text style={s.modalTitle}>{editingStream?.name || 'Edit Stream'}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" style={s.modalCloseBtn} onPress={() => setEditStreamModalOpen(false)}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody}>
              <View style={s.formField}>
                <Text style={s.formLabel}>
                  Stream Code <Text style={s.reqStar}>*</Text>
                </Text>
                <TextInput
                  style={s.textInput}
                  value={streamCode}
                  onChangeText={setStreamCode}
                  placeholder="e.g. STR_PCM, STR_COMM"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCapitalize="characters"
                />
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>
                  Stream Name <Text style={s.reqStar}>*</Text>
                </Text>
                <TextInput
                  style={s.textInput}
                  value={streamName}
                  onChangeText={setStreamName}
                  placeholder="e.g. PCM (Physics, Chemistry, Mathematics)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={[s.textInput, { height: 75, textAlignVertical: 'top' }]}
                  value={streamDesc}
                  onChangeText={setStreamDesc}
                  placeholder="Details about subjects or career path in this stream"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                />
              </View>

              {streamError ? (
                <View style={s.errorBanner}>
                  <Text style={s.errorText}>{streamError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                disabled={streamLoading}
                style={[s.saveBtn, streamLoading && s.disabledBtn]}
                onPress={handleSaveStreamEdit}
              >
                {streamLoading ? <ActivityIndicator color="#071d33" /> : <Text style={s.saveBtnText}>Update Stream</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 16,
  },
  filterHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  filterTitleRow: {
    gap: 4,
  },
  filterHeading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  filterSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  classListScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  classCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 100,
    gap: 4,
  },
  classCardSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  classCardBadgeRow: {
    flexDirection: 'row',
  },
  classBadge: {
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  classBadgeJunior: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
  },
  classBadgeSenior: {
    backgroundColor: 'rgba(167, 139, 250, 0.25)',
    color: '#c4b5fd',
  },
  classCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  classCardTitleSelected: {
    color: colors.primary,
  },
  classCardMeta: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
  },

  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modeBannerJunior: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  modeBannerSenior: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  modeBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBannerIconText: {
    fontSize: 18,
  },
  modeBannerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modeBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  loadingBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },

  directSection: {
    gap: 14,
  },
  seniorSection: {
    gap: 16,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  listSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },

  emptyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 500,
  },

  subjectsGrid: {
    gap: 10,
  },
  subjectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    padding: 14,
    gap: 10,
  },
  subjectCardInactive: {
    opacity: 0.6,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  subjectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeTagText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusTagActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    color: '#34d399',
  },
  statusTagInactive: {
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
    color: '#f87171',
  },
  optionalTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  optionalTagCompulsory: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  optionalTagElective: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    color: '#a78bfa',
  },
  subjectName: {
    color: '#f0f6ff',
    fontSize: 15,
    fontWeight: '700',
  },
  subjectCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  subjectMeta: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  toggleBtnText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },

  streamSelectorBlock: {
    gap: 12,
  },
  streamTabsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  streamTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.md,
    padding: 12,
    minWidth: 160,
    maxWidth: 220,
    gap: 6,
  },
  streamTabSelected: {
    backgroundColor: 'rgba(167, 139, 250, 0.16)',
    borderColor: colors.purple,
    borderWidth: 2,
  },
  streamTabTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streamTabCode: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '900',
  },
  streamTabCodeSelected: {
    color: '#ffffff',
  },
  streamCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  streamCountBadgeSelected: {
    backgroundColor: colors.purple,
    color: '#ffffff',
  },
  streamTabName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '700',
  },
  streamTabNameSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },

  childSubjectsBlock: {
    gap: 14,
  },
  streamHeaderCard: {
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  streamHeaderInfo: {
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  streamHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamHeaderCode: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  streamHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  streamHeaderDesc: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
  },
  streamHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  formField: {
    gap: 6,
  },
  formLabel: {
    color: '#f0f6ff',
    fontSize: 13,
    fontWeight: '800',
  },
  reqStar: {
    color: colors.danger,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.md,
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
  },
  switchLabel: {
    color: '#f0f6ff',
    fontSize: 13,
    fontWeight: '800',
  },
  switchHelp: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: radius.md,
    padding: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#071d33',
    fontWeight: '900',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
