import { colors, surfaces, radius, shadow } from '../../src/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

const today = new Date().toISOString().slice(0, 10);
const initial = { name: '', subRole: 'TEACHER', designation: '', joiningDate: today, mobile: '', email: '', address: '', baseSalary: '', canMarkStudentAttendance: false, canMarkEmployeeAttendance: false };

const ROLE_COLORS: Record<string, { color: string; tint: string }> = {
  TEACHER:     { color: '#818cf8', tint: 'rgba(99,102,241,0.15)'  },
  ACCOUNTANT:  { color: '#fbbf24', tint: 'rgba(251,191,36,0.15)'  },
  STAFF:       { color: '#38bdf8', tint: 'rgba(56,189,248,0.15)'  },
  RECEPTIONIST:{ color: '#34d399', tint: 'rgba(52,211,153,0.15)'  },
  LIBRARIAN:   { color: '#38bdf8', tint: 'rgba(56,189,248,0.15)'  },
  OTHER:       { color: '#c4b5fd', tint: 'rgba(167,139,250,0.15)' },
};

function Field({ label, value, onChangeText, placeholder, multiline = false, editable = true }: any) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        editable={editable}
        value={String(value ?? '')}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.20)"
        multiline={multiline}
        style={[s.input, multiline && s.multiline, !editable && s.readonly]}
      />
    </View>
  );
}

function Toggle({ label, value, onPress }: any) {
  return (
    <TouchableOpacity accessibilityRole="checkbox" onPress={onPress} style={s.toggle}>
      <View style={[s.check, value && s.checkOn]}>
        {value ? <Ionicons name="checkmark" size={13} color="#ffffff" /> : null}
      </View>
      <Text style={s.toggleText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Choices({ label, value, values, onChange }: any) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.choices}>
        {values.map((v: string) => (
          <TouchableOpacity accessibilityRole="button" key={v} style={[s.choice, value === v && s.choiceOn]} onPress={() => onChange(v)}>
            <Text style={value === v ? s.choiceTextOn : s.choiceText}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SubjectChoices({ classes = [], classSubjects = [], subjects = [], value, onChange }: any) {
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active class name
  const activeClass = classes.find((c: any) => c.id === selectedClassId);
  const activeClassName = selectedClassId === 'ALL' ? 'All Classes' : (activeClass?.name || 'Selected Class');

  // Filtered subjects for current class
  const classFilteredSubjects = useMemo(() => {
    if (selectedClassId === 'ALL') {
      return subjects.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        streamName: undefined,
      }));
    }

    const forClass = classSubjects.filter((cs: any) => cs.classId === selectedClassId && cs.isActive !== false);
    // Deduplicate and resolve subject details
    const map = new Map<string, any>();
    forClass.forEach((cs: any) => {
      const subId = cs.subjectId || cs.subject?.id;
      if (!subId) return;
      const subObj = cs.subject || subjects.find((s: any) => s.id === subId);
      const streamName = cs.parentSubject?.code || cs.parentSubject?.name;
      const key = `${subId}_${streamName || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          id: subId,
          name: subObj?.name || 'Unknown',
          code: subObj?.code || '',
          streamName,
        });
      }
    });
    return Array.from(map.values());
  }, [selectedClassId, classSubjects, subjects]);

  // Modal search filtering
  const modalDisplayedSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const baseList = classFilteredSubjects.length > 0 || selectedClassId === 'ALL'
      ? classFilteredSubjects
      : subjects.map((sub: any) => ({ id: sub.id, name: sub.name, code: sub.code }));

    if (!q) return baseList;
    return baseList.filter((s: any) =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.streamName && s.streamName.toLowerCase().includes(q))
    );
  }, [classFilteredSubjects, selectedClassId, subjects, searchQuery]);

  const chosenSubjectObj = subjects.find((sub: any) => sub.id === value);

  return (
    <View style={s.subjectSection}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Text style={s.label}>PRIMARY SUBJECT *</Text>
        {value ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => onChange(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '700' }}>Clear selection ✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Step 1: Filter subjects by Class */}
      <View style={{ width: '100%', gap: 6 }}>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Filter subjects by Class:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              s.choice,
              { paddingVertical: 6, paddingHorizontal: 12 },
              selectedClassId === 'ALL' && s.choiceOn,
            ]}
            onPress={() => setSelectedClassId('ALL')}
          >
            <Text style={selectedClassId === 'ALL' ? s.choiceTextOn : s.choiceText}>
              All Classes ({subjects.length})
            </Text>
          </TouchableOpacity>
          {classes.map((cls: any) => {
            const isSelected = selectedClassId === cls.id;
            const count = classSubjects.filter((cs: any) => cs.classId === cls.id && cs.isActive !== false).length;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={cls.id}
                style={[
                  s.choice,
                  { paddingVertical: 6, paddingHorizontal: 12 },
                  isSelected && s.choiceOn,
                ]}
                onPress={() => setSelectedClassId(cls.id)}
              >
                <Text style={isSelected ? s.choiceTextOn : s.choiceText}>
                  {cls.name} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Step 2: Select Subject (Dropdown Selector) */}
      <View style={{ width: '100%', gap: 6 }}>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Select Subject {selectedClassId !== 'ALL' ? `for ${activeClassName}` : ''}:
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            s.subjectDropdownBtn,
            chosenSubjectObj && s.subjectDropdownBtnActive,
          ]}
          onPress={() => {
            setSearchQuery('');
            setDropdownOpen(true);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Ionicons
              name={chosenSubjectObj ? 'checkmark-circle' : 'book-outline'}
              size={18}
              color={chosenSubjectObj ? '#38bdf8' : 'rgba(255,255,255,0.4)'}
            />
            <Text style={{ color: chosenSubjectObj ? '#ffffff' : 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: chosenSubjectObj ? '700' : '500' }}>
              {chosenSubjectObj ? `${chosenSubjectObj.name} (${chosenSubjectObj.code})` : 'Choose Subject from dropdown...'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.45)" />
        </TouchableOpacity>
      </View>

      {/* Quick Select Pills (Immediate 1-tap options) */}
      {classFilteredSubjects.length > 0 ? (
        <View style={{ width: '100%', gap: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: '600' }}>
            Quick select from {activeClassName}:
          </Text>
          <View style={s.choices}>
            {classFilteredSubjects.map((sub: any) => {
              const isChosen = value === sub.id;
              const label = sub.streamName ? `${sub.name} (${sub.code}) [${sub.streamName}]` : `${sub.name} (${sub.code})`;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={sub.id + (sub.streamName || '')}
                  style={[s.choice, isChosen && s.choiceOn]}
                  onPress={() => onChange(sub.id)}
                >
                  <Text style={isChosen ? s.choiceTextOn : s.choiceText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : selectedClassId !== 'ALL' ? (
        <View style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, fontStyle: 'italic' }}>
            No subjects assigned to {activeClassName} yet in Academics. Tap "All Classes" or use the dropdown above to choose any subject.
          </Text>
        </View>
      ) : null}

      {/* Selected Confirmation Badge */}
      {chosenSubjectObj ? (
        <View style={s.selectedSubjectBadge}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark-circle" size={16} color="#38bdf8" />
            <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
              Selected Primary Subject: {chosenSubjectObj.name} ({chosenSubjectObj.code})
            </Text>
          </View>
        </View>
      ) : null}

      {/* Dropdown Modal Sheet */}
      <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity accessibilityLabel="Close dropdown" style={StyleSheet.absoluteFill} onPress={() => setDropdownOpen(false)} />
          <View style={s.dropdownSheet}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <View>
                <Text style={{ color: '#f0f6ff', fontSize: 16, fontWeight: '800' }}>Select Primary Subject</Text>
                <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, marginTop: 2 }}>
                  Showing {modalDisplayedSubjects.length} subjects ({activeClassName})
                </Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => setDropdownOpen(false)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.60)" />
              </TouchableOpacity>
            </View>

            {/* Modal Search Box */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <View style={[s.searchInputContainer, { minWidth: 0 }]}>
                <Ionicons name="search" size={15} color="rgba(255,255,255,0.40)" style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.searchInput, { paddingVertical: 8 }]}
                  placeholder="Search subject by name or code..."
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.40)" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Modal Class Filter Bar */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <TouchableOpacity
                  style={[s.filterChip, selectedClassId === 'ALL' && s.filterChipActive]}
                  onPress={() => setSelectedClassId('ALL')}
                >
                  <Text style={selectedClassId === 'ALL' ? s.filterChipTextActive : s.filterChipText}>All Classes</Text>
                </TouchableOpacity>
                {classes.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.filterChip, selectedClassId === c.id && s.filterChipActive]}
                    onPress={() => setSelectedClassId(c.id)}
                  >
                    <Text style={selectedClassId === c.id ? s.filterChipTextActive : s.filterChipText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Subject Options List */}
            <ScrollView style={{ maxHeight: 320, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 16, gap: 6 }}>
              {modalDisplayedSubjects.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13 }}>No subjects found matching "{searchQuery}"</Text>
                </View>
              ) : (
                modalDisplayedSubjects.map((sub: any) => {
                  const isSelected = value === sub.id;
                  return (
                    <TouchableOpacity
                      key={sub.id + (sub.streamName || '')}
                      style={[
                        s.dropdownOption,
                        isSelected && s.dropdownOptionSelected,
                      ]}
                      onPress={() => {
                        onChange(sub.id);
                        setDropdownOpen(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: isSelected ? '#a5b4fc' : 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '800' }}>
                            {sub.code?.slice(0, 4) || 'SUB'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.dropdownOptionText, isSelected && s.dropdownOptionTextSelected]}>
                            {sub.name}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>
                            Code: {sub.code}{sub.streamName ? ` · Stream: ${sub.streamName}` : ''}
                          </Text>
                        </View>
                      </View>
                      {isSelected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function StaffScreen() {
  const client = useQueryClient();
  const [form, setForm] = useState<any>(initial);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [editState, setEditState] = useState<any>({});

  const employees = useQuery<any>({ queryKey: ['employees'], queryFn: async () => (await api.get('/employees')).data });
  const academics = useQuery<any>({ queryKey: ['academics'], queryFn: async () => (await api.get('/academics')).data });
  const detail = useQuery<any>({ queryKey: ['employee-detail', selectedId], queryFn: async () => (await api.get('/employees/' + selectedId)).data, enabled: !!selectedId });

  const subjects = academics.data?.subjects || [];
  const classes = academics.data?.classes || [];
  const classSubjects = academics.data?.classSubjects || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const rolesList = useMemo(() => {
    const set = new Set<string>(['TEACHER', 'ACCOUNTANT', 'STAFF']);
    (employees.data || []).forEach((e: any) => {
      if (e.subRole) set.add(e.subRole);
    });
    return Array.from(set);
  }, [employees.data]);

  const filteredEmployees = useMemo(() => {
    const list = employees.data || [];
    const q = searchQuery.trim().toLowerCase();
    const cleanDigits = q.replace(/\D/g, '');

    return list.filter((emp: any) => {
      // 1. Role filter
      if (filterRole && emp.subRole !== filterRole) {
        return false;
      }

      // 2. Universal search across details (name, employeeId, subRole, designation, phone, email, address, loginId)
      if (q) {
        const fields = [
          emp.name,
          emp.employeeId,
          emp.subRole,
          emp.designation,
          emp.mobile,
          emp.email,
          emp.address,
          emp.user?.loginId,
        ];

        const matchesText = fields.some((f) => f && String(f).toLowerCase().includes(q));
        if (matchesText) return true;

        if (cleanDigits.length >= 3) {
          const mobileDigits = (emp.mobile || '').replace(/\D/g, '');
          if (mobileDigits.includes(cleanDigits)) return true;
        }

        return false;
      }

      return true;
    });
  }, [employees.data, searchQuery, filterRole]);

  const isFiltered = Boolean(searchQuery.trim() || filterRole);
  const resetFilters = () => {
    setSearchQuery('');
    setFilterRole('');
  };

  useEffect(() => {
    const employee = detail.data;
    if (!employee) return;
    setEditState({
      name: employee.name || '',
      subRole: employee.subRole || 'OTHER',
      designation: employee.designation || '',
      joiningDate: String(employee.joiningDate || '').slice(0, 10),
      mobile: employee.mobile || '',
      email: employee.email || '',
      address: employee.address || '',
      baseSalary: String(employee.salaryRevisions?.[0]?.amount || ''),
      canMarkStudentAttendance: !!employee.canMarkStudentAttendance,
      canMarkEmployeeAttendance: !!employee.canMarkEmployeeAttendance,
    });
  }, [detail.data]);

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  const setEdit = (key: string, value: any) => setEditState((p: any) => ({ ...p, [key]: value }));

  const create = async () => {
    if (!form.name?.trim() || !form.designation?.trim() || !form.baseSalary) {
      return Alert.alert('Missing details', 'Name, designation and base salary are required.');
    }
    if (form.mobile && form.mobile.replace(/\D/g, '').length < 10) {
      return Alert.alert('Invalid mobile', 'Mobile number must contain at least 10 digits.');
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return Alert.alert('Invalid email', 'Please enter a valid email address.');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/employees', { ...form, baseSalary: Number(form.baseSalary), mobile: form.mobile?.trim() || undefined, email: form.email?.trim() || undefined });
      Alert.alert('Employee created', 'Employee ID: ' + data.temporaryCredentials.loginId);
      setForm(initial);
      setOpen(false);
      await client.invalidateQueries({ queryKey: ['employees'] });
    } catch (e: any) {
      const raw = e?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : raw || 'Please check the form.';
      Alert.alert('Could not create employee', msg);
    }
    finally { setSaving(false); }
  };

  const save = async () => {
    if (!selectedId || !editState.name?.trim() || !editState.designation?.trim() || !editState.joiningDate) {
      return Alert.alert('Missing details', 'Name, designation and joining date are required.');
    }
    if (editState.mobile && editState.mobile.replace(/\D/g, '').length < 10) {
      return Alert.alert('Invalid mobile', 'Mobile number must contain at least 10 digits.');
    }
    if (editState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editState.email)) {
      return Alert.alert('Invalid email', 'Please enter a valid email address.');
    }
    setSaving(true);
    try {
      await api.patch('/employees/' + selectedId, { name: editState.name.trim(), subRole: editState.subRole, designation: editState.designation.trim(), joiningDate: editState.joiningDate, mobile: editState.mobile?.trim() || undefined, email: editState.email?.trim() || undefined, address: editState.address, canMarkStudentAttendance: editState.canMarkStudentAttendance, canMarkEmployeeAttendance: editState.canMarkEmployeeAttendance });
      const oldSalary = Number(detail.data?.salaryRevisions?.[0]?.amount || 0), newSalary = Number(editState.baseSalary);
      if (newSalary > 0 && newSalary !== oldSalary) await api.post('/employees/' + selectedId + '/salary-revisions', { amount: newSalary, effectiveDate: editState.joiningDate, reason: 'Admin profile update' });
      Alert.alert('Employee updated', 'All edited details were saved successfully.');
      await Promise.all([client.invalidateQueries({ queryKey: ['employees'] }), client.invalidateQueries({ queryKey: ['employee-detail', selectedId] })]);
    } catch (e: any) {
      const raw = e?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : raw || 'Please check the form.';
      Alert.alert('Could not update employee', msg);
    }
    finally { setSaving(false); }
  };

  const setPassword = async () => {
    if (!selectedId || adminPassword.length < 8) return Alert.alert('Password required', 'Enter at least 8 characters.');
    setSaving(true);
    try { await api.post('/employees/' + selectedId + '/password', { password: adminPassword }); Alert.alert('Password updated', 'Employee can now sign in with the new password.'); setAdminPassword(''); }
    catch (e: any) { Alert.alert('Password update failed', e?.response?.data?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const deactivate = async () => {
    if (!selectedId || !deleteReason.trim()) return Alert.alert('Reason required', 'Enter a reason before deleting.');
    setSaving(true);
    try { await api.post('/employees/' + selectedId + '/deactivate', { reason: deleteReason.trim() }); Alert.alert('Employee deleted', 'Account is inactive. Payroll history preserved.'); setSelectedId(null); setDeleteReason(''); await client.invalidateQueries({ queryKey: ['employees'] }); }
    catch (e: any) { Alert.alert('Could not delete employee', e?.response?.data?.message || 'Resolve active assignments first.'); }
    finally { setSaving(false); }
  };

  const downloadPDF = () => {
    if (!detail.data) return;
    const employee = detail.data;

    const sanitize = (str: any) => String(str ?? '—').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');

    const rows = [
      ['Full Name', employee.name || editState.name],
      ['Employee ID', employee.employeeId],
      ['Login ID', employee.user?.loginId || employee.employeeId],
      ['Role / Department', employee.subRole || editState.subRole || 'OTHER'],
      ['Designation', employee.designation || editState.designation],
      ['Joining Date', editState.joiningDate || String(employee.joiningDate || '').slice(0, 10)],
      ['Base Salary', editState.baseSalary ? `Rs. ${editState.baseSalary}` : '—'],
      ['Mobile Number', employee.mobile || editState.mobile],
      ['Email Address', employee.email || editState.email],
      ['Residential Address', employee.address || editState.address],
      ['Student Attendance Perm.', editState.canMarkStudentAttendance ? 'Allowed' : 'Not Allowed'],
      ['Staff Attendance Perm.', editState.canMarkEmployeeAttendance ? 'Allowed' : 'Not Allowed'],
      ['Account Status', employee.status || 'ACTIVE'],
    ];

    let stream = '';
    // Header dark banner
    stream += '0.04 0.11 0.22 rg 40 760 515 45 re f\n';
    stream += 'BT /F2 16 Tf 1 1 1 rg 55 785 Td (Arihant Public School) Tj ET\n';
    stream += 'BT /F1 10 Tf 0.8 0.88 1 rg 55 770 Td (OFFICIAL EMPLOYEE RECORD) Tj ET\n';

    // Table header
    let y = 730;
    stream += '0.12 0.22 0.38 rg 40 ' + y + ' 515 22 re f\n';
    stream += 'BT /F2 10 Tf 1 1 1 rg 55 ' + (y + 7) + ' Td (Field) Tj ET\n';
    stream += 'BT /F2 10 Tf 1 1 1 rg 200 ' + (y + 7) + ' Td (Details) Tj ET\n';

    y -= 22;
    rows.forEach(([label, val], idx) => {
      if (idx % 2 === 0) {
        stream += '0.96 0.97 0.99 rg 40 ' + y + ' 515 22 re f\n';
      } else {
        stream += '1 1 1 rg 40 ' + y + ' 515 22 re f\n';
      }
      stream += '0.85 0.88 0.92 RG 0.5 w 40 ' + y + ' m 555 ' + y + ' l S\n';
      stream += 'BT /F2 9 Tf 0.2 0.25 0.35 rg 55 ' + (y + 6) + ' Td (' + sanitize(label) + ') Tj ET\n';
      stream += 'BT /F1 9 Tf 0.05 0.08 0.15 rg 200 ' + (y + 6) + ' Td (' + sanitize(val) + ') Tj ET\n';
      y -= 22;
    });

    stream += '0.75 0.8 0.88 RG 0.8 w 40 ' + y + ' 515 ' + (730 + 22 - y) + ' re S\n';

    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    stream += 'BT /F1 8 Tf 0.45 0.5 0.55 rg 40 35 Td (Generated on: ' + sanitize(dateStr) + ' | Arihant Public School ERP) Tj ET\n';

    const streamBytes = new TextEncoder().encode(stream);
    let pdf = '%PDF-1.4\n';
    pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n';
    pdf += '4 0 obj\n<< /Length ' + streamBytes.length + ' >>\nstream\n' + stream + '\nendstream\nendobj\n';
    pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
    pdf += '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

    const o1 = 9;
    const o2 = pdf.indexOf('2 0 obj');
    const o3 = pdf.indexOf('3 0 obj');
    const o4 = pdf.indexOf('4 0 obj');
    const o5 = pdf.indexOf('5 0 obj');
    const o6 = pdf.indexOf('6 0 obj');

    const startxref = new TextEncoder().encode(pdf).length;
    pdf += 'xref\n0 7\n0000000000 65535 f \n';
    pdf += String(o1).padStart(10, '0') + ' 00000 n \n';
    pdf += String(o2).padStart(10, '0') + ' 00000 n \n';
    pdf += String(o3).padStart(10, '0') + ' 00000 n \n';
    pdf += String(o4).padStart(10, '0') + ' 00000 n \n';
    pdf += String(o5).padStart(10, '0') + ' 00000 n \n';
    pdf += String(o6).padStart(10, '0') + ' 00000 n \n';
    pdf += 'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n' + startxref + '\n%%EOF\n';

    if (typeof document !== 'undefined') {
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employee.name || 'employee'}_details.pdf`.replace(/\s+/g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const downloadListPDF = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) {
      return Alert.alert('No records', 'No employees match the current filters to download.');
    }

    const filterParts: string[] = [];
    if (filterRole) {
      filterParts.push(`Role: ${filterRole}`);
    } else {
      filterParts.push('All Staff');
    }
    if (searchQuery.trim()) {
      filterParts.push(`Search: "${searchQuery.trim()}"`);
    }
    const filterDesc = filterParts.join(' | ');

    const title = 'Arihant Public School';
    const subtitle = `EMPLOYEE & STAFF DIRECTORY REPORT · ${filterDesc} · Total: ${filteredEmployees.length} Staff`;

    const columns = [
      { header: '#', x: 5 },
      { header: 'Emp ID', x: 25 },
      { header: 'Name', x: 90 },
      { header: 'Role', x: 200 },
      { header: 'Designation', x: 275 },
      { header: 'Mobile', x: 370 },
      { header: 'Joining Date', x: 450 },
      { header: 'Status', x: 510 },
    ];

    const rows = filteredEmployees.map((emp: any, idx: number) => {
      const joiningDate = emp.joiningDate ? String(emp.joiningDate).slice(0, 10) : '—';
      return [
        String(idx + 1),
        emp.employeeId || '—',
        emp.name || '—',
        emp.subRole || 'OTHER',
        emp.designation || '—',
        emp.mobile || '—',
        joiningDate,
        emp.status || 'ACTIVE',
      ];
    });

    const sanitize = (str: any) => String(str ?? '—').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');

    const startX = 30;
    const rowsPerPage = 26;
    const pagesData: any[][] = [];
    for (let i = 0; i < rows.length; i += rowsPerPage) {
      pagesData.push(rows.slice(i, i + rowsPerPage));
    }
    if (pagesData.length === 0) pagesData.push([]);

    const totalPages = pagesData.length;
    const pageStreams: string[] = [];

    pagesData.forEach((pageRows, pageIdx) => {
      let stream = '';
      let currentY = 800;

      if (pageIdx === 0) {
        stream += '0.04 0.11 0.22 rg 30 760 535 45 re f\n';
        stream += 'BT /F2 15 Tf 1 1 1 rg 42 787 Td (' + sanitize(title) + ') Tj ET\n';
        stream += 'BT /F1 9 Tf 0.8 0.88 1 rg 42 770 Td (' + sanitize(subtitle) + ') Tj ET\n';
        currentY = 735;
      } else {
        stream += '0.04 0.11 0.22 rg 30 790 535 25 re f\n';
        stream += 'BT /F2 11 Tf 1 1 1 rg 42 798 Td (' + sanitize(title) + ' - Contd.) Tj ET\n';
        currentY = 765;
      }

      const tableHeaderY = currentY;
      stream += '0.12 0.22 0.38 rg 30 ' + tableHeaderY + ' 535 20 re f\n';
      columns.forEach((col) => {
        stream += 'BT /F2 8.5 Tf 1 1 1 rg ' + (startX + col.x) + ' ' + (tableHeaderY + 6) + ' Td (' + sanitize(col.header) + ') Tj ET\n';
      });

      currentY -= 20;

      pageRows.forEach((row: string[], rowIdx: number) => {
        const rowY = currentY;
        const isAlt = rowIdx % 2 === 0;
        if (isAlt) {
          stream += '0.96 0.97 0.99 rg 30 ' + rowY + ' 535 18 re f\n';
        } else {
          stream += '1 1 1 rg 30 ' + rowY + ' 535 18 re f\n';
        }
        stream += '0.86 0.89 0.93 RG 0.4 w 30 ' + rowY + ' m 565 ' + rowY + ' l S\n';

        columns.forEach((col, colIdx) => {
          const val = sanitize(row[colIdx]);
          stream += 'BT /F1 8 Tf 0.1 0.12 0.18 rg ' + (startX + col.x) + ' ' + (rowY + 5) + ' Td (' + val + ') Tj ET\n';
        });

        currentY -= 18;
      });

      const tableHeight = (tableHeaderY + 20) - currentY;
      stream += '0.75 0.8 0.88 RG 0.7 w 30 ' + currentY + ' 535 ' + tableHeight + ' re S\n';

      const footerY = 25;
      const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
      stream += 'BT /F1 7.5 Tf 0.45 0.5 0.55 rg 30 ' + footerY + ' Td (Generated: ' + sanitize(dateStr) + ' | Arihant Public School ERP) Tj ET\n';
      stream += 'BT /F1 7.5 Tf 0.45 0.5 0.55 rg 500 ' + footerY + ' Td (Page ' + (pageIdx + 1) + ' of ' + totalPages + ') Tj ET\n';

      pageStreams.push(stream);
    });

    let objIndex = 3;
    const pageObjIds: number[] = [];
    for (let i = 0; i < totalPages; i++) pageObjIds.push(objIndex++);
    const contentObjIds: number[] = [];
    for (let i = 0; i < totalPages; i++) contentObjIds.push(objIndex++);
    const fontF1Id = objIndex++;
    const fontF2Id = objIndex++;
    const totalObjects = objIndex;

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    const addObj = (id: number, content: string) => {
      offsets[id] = new TextEncoder().encode(pdf).length;
      pdf += id + ' 0 obj\n' + content + '\nendobj\n';
    };

    addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    const kidsStr = pageObjIds.map((id) => id + ' 0 R').join(' ');
    addObj(2, '<< /Type /Pages /Kids [' + kidsStr + '] /Count ' + totalPages + ' >>');

    for (let i = 0; i < totalPages; i++) {
      addObj(
        pageObjIds[i],
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ' +
          contentObjIds[i] +
          ' 0 R /Resources << /Font << /F1 ' +
          fontF1Id +
          ' 0 R /F2 ' +
          fontF2Id +
          ' 0 R >> >> >>'
      );
    }

    for (let i = 0; i < totalPages; i++) {
      const streamContent = pageStreams[i];
      const streamLen = new TextEncoder().encode(streamContent).length;
      addObj(contentObjIds[i], '<< /Length ' + streamLen + ' >>\nstream\n' + streamContent + '\nendstream');
    }

    addObj(fontF1Id, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    addObj(fontF2Id, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const startxref = new TextEncoder().encode(pdf).length;
    pdf += 'xref\n0 ' + totalObjects + '\n0000000000 65535 f \n';
    for (let i = 1; i < totalObjects; i++) {
      pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += 'trailer\n<< /Size ' + totalObjects + ' /Root 1 0 R >>\nstartxref\n' + startxref + '\n%%EOF\n';

    if (typeof document !== 'undefined') {
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanFileName = `Employees_List_${filterRole || 'All'}.pdf`;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <View style={s.page}>
      <View style={s.glowOrb} pointerEvents="none" />
      <ScrollView contentContainerStyle={s.content}>

        {/* ── Hero Header ── */}
        <View style={s.hero}>
          <View style={s.heroGlow} pointerEvents="none" />
          <View>
            <Text style={s.eyebrow}>PEOPLE OPERATIONS</Text>
            <Text style={s.heroTitle}>Employees</Text>
            <Text style={s.heroSub}>Tap an employee to view and edit the complete profile.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <TouchableOpacity accessibilityRole="button" style={[s.addBtn, { backgroundColor: '#1d4ed8' }]} onPress={downloadListPDF}>
              <Ionicons name="download-outline" size={17} color="#ffffff" />
              <Text style={s.addBtnText}>Download List (PDF)</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.addBtn} onPress={() => setOpen(!open)}>
              <Ionicons name={open ? 'close' : 'add'} size={18} color="#ffffff" />
              <Text style={s.addBtnText}>{open ? 'Close form' : 'Add employee'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Add Form ── */}
        {open ? (
          <View style={s.formCard}>
            <Text style={s.formTitle}>New Employee</Text>
            <Field label="Full name *" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Priya Mehta" />
            <Choices label="Role" value={form.subRole} values={['TEACHER', 'ACCOUNTANT', 'STAFF']} onChange={(v: string) => setForm((p: any) => ({ ...p, subRole: v, primarySubjectId: v === 'TEACHER' ? p.primarySubjectId : null }))} />
            {form.subRole === 'TEACHER' ? <SubjectChoices classes={classes} classSubjects={classSubjects} subjects={subjects} value={form.primarySubjectId} onChange={(v: string) => set('primarySubjectId', v)} /> : null}
            <Field label="Designation *" value={form.designation} onChangeText={(v: string) => set('designation', v)} placeholder="Senior Teacher" />
            <Field label="Joining date *" value={form.joiningDate} onChangeText={(v: string) => set('joiningDate', v)} placeholder="YYYY-MM-DD" />
            <Field label="Base salary *" value={form.baseSalary} onChangeText={(v: string) => set('baseSalary', v)} placeholder="35000" />
            <Field label="Mobile" value={form.mobile} onChangeText={(v: string) => set('mobile', v)} placeholder="Phone number" />
            <Field label="Email" value={form.email} onChangeText={(v: string) => set('email', v)} placeholder="employee@example.com" />
            <Field label="Address" value={form.address} onChangeText={(v: string) => set('address', v)} placeholder="Full address" multiline />
            <Toggle label="Can mark student attendance" value={form.canMarkStudentAttendance} onPress={() => set('canMarkStudentAttendance', !form.canMarkStudentAttendance)} />
            <Toggle label="Can mark employee attendance" value={form.canMarkEmployeeAttendance} onPress={() => set('canMarkEmployeeAttendance', !form.canMarkEmployeeAttendance)} />
            <TouchableOpacity accessibilityRole="button" style={s.saveBtn} onPress={create} disabled={saving}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={s.saveBtnText}>Create employee</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Employee Detail Modal ── */}
        <Modal visible={!!selectedId} transparent animationType="fade" onRequestClose={() => setSelectedId(null)}>
          <View style={s.overlay}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />
            <View style={s.modalShell}>
              <ScrollView contentContainerStyle={s.modalContent}>
                {selectedId ? (
                  <View style={s.detailWrap}>
                    <View style={s.detailHeader}>
                      <View>
                        <Text style={s.eyebrow}>COMPLETE EMPLOYEE PROFILE</Text>
                        <Text style={s.detailName}>{detail.data?.name}</Text>
                        <Text style={s.detailMeta}>Employee ID: {detail.data?.employeeId}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TouchableOpacity accessibilityRole="button" style={[s.closeBtn, { width: 'auto', paddingHorizontal: 13, borderRadius: radius.sm, backgroundColor: '#1d4ed8', borderWidth: 1, borderColor: '#2563eb' }]} onPress={downloadPDF}>
                          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>⬇ PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" style={s.closeBtn} onPress={() => setSelectedId(null)}>
                          <Ionicons name="close" size={18} color="rgba(255,255,255,0.60)" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {detail.isLoading ? <ActivityIndicator color={colors.blueLight} /> :
                     detail.isError ? <Text style={s.errorText}>Could not load employee details.</Text> : (
                      <>
                        {/* Password Section */}
                        <View style={s.securityBox}>
                          <View style={s.securityHead}>
                            <Ionicons name="lock-closed-outline" size={15} color={colors.warning} />
                            <Text style={s.securityTitle}>Admin-controlled password</Text>
                          </View>
                          <Text style={s.securityText}>Employees cannot change passwords. Set a new password here.</Text>
                          <Field label="New password (min 8 chars)" value={adminPassword} onChangeText={setAdminPassword} placeholder="Enter password" />
                          <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={setPassword} disabled={saving}>
                            <Text style={s.secondaryBtnText}>Set employee password</Text>
                          </TouchableOpacity>
                        </View>

                        <Field label="Employee ID" value={detail.data?.employeeId} editable={false} />
                        <Field label="Full name *" value={editState.name} onChangeText={(v: string) => setEdit('name', v)} />
                        <Choices label="Role" value={editState.subRole} values={['TEACHER', 'ACCOUNTANT', 'STAFF']} onChange={(v: string) => setEdit('subRole', v)} />
                        <Field label="Designation *" value={editState.designation} onChangeText={(v: string) => setEdit('designation', v)} />
                        <Field label="Joining date *" value={editState.joiningDate} onChangeText={(v: string) => setEdit('joiningDate', v)} />
                        <Field label="Base salary" value={editState.baseSalary} onChangeText={(v: string) => setEdit('baseSalary', v)} />
                        <Field label="Mobile" value={editState.mobile} onChangeText={(v: string) => setEdit('mobile', v)} />
                        <Field label="Email" value={editState.email} onChangeText={(v: string) => setEdit('email', v)} />
                        <Field label="Address" value={editState.address} onChangeText={(v: string) => setEdit('address', v)} multiline />
                        <Toggle label="Can mark student attendance" value={!!editState.canMarkStudentAttendance} onPress={() => setEdit('canMarkStudentAttendance', !editState.canMarkStudentAttendance)} />
                        <Toggle label="Can mark employee attendance" value={!!editState.canMarkEmployeeAttendance} onPress={() => setEdit('canMarkEmployeeAttendance', !editState.canMarkEmployeeAttendance)} />
                        <TouchableOpacity accessibilityRole="button" style={s.saveBtn} onPress={save} disabled={saving}>
                          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={s.saveBtnText}>Save employee changes</Text>}
                        </TouchableOpacity>

                        {/* Danger Zone */}
                        <View style={s.dangerZone}>
                          <View style={s.dangerHead}>
                            <Ionicons name="warning-outline" size={16} color={colors.danger} />
                            <Text style={s.dangerTitle}>Delete employee access</Text>
                          </View>
                          <Text style={s.dangerText}>This deactivates login and preserves payroll and assignment history.</Text>
                          <Field label="Reason *" value={deleteReason} onChangeText={setDeleteReason} placeholder="Left the school" />
                          <TouchableOpacity accessibilityRole="button" style={s.dangerBtn} onPress={deactivate} disabled={saving}>
                            <Text style={s.dangerBtnText}>Delete employee</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Search & Filter Bar ── */}
        <View style={s.filterCard}>
          <View style={s.searchRow}>
            <View style={s.searchInputContainer}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.40)" style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name, phone, employee ID, role, designation, email..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.40)" />
                </TouchableOpacity>
              ) : null}
            </View>

            {isFiltered ? (
              <TouchableOpacity accessibilityRole="button" style={s.resetButton} onPress={resetFilters}>
                <Ionicons name="refresh" size={13} color="#fca5a5" style={{ marginRight: 4 }} />
                <Text style={s.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Role Filter Chips */}
          <View style={s.filterGroup}>
            <Text style={s.filterLabel}>Filter by Role</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsContainer}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[s.filterChip, !filterRole && s.filterChipActive]}
                onPress={() => setFilterRole('')}
              >
                <Text style={!filterRole ? s.filterChipTextActive : s.filterChipText}>
                  All Roles ({(employees.data || []).length})
                </Text>
              </TouchableOpacity>
              {rolesList.map((r: string) => {
                const isActive = filterRole === r;
                const rc = ROLE_COLORS[r] || ROLE_COLORS.OTHER;
                const count = (employees.data || []).filter((e: any) => e.subRole === r).length;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={r}
                    style={[
                      s.filterChip,
                      isActive && { backgroundColor: rc.tint, borderColor: rc.color },
                    ]}
                    onPress={() => setFilterRole(isActive ? '' : r)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: rc.color }} />
                      <Text style={isActive ? [s.filterChipTextActive, { color: rc.color }] : s.filterChipText}>
                        {r} ({count})
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Summary status */}
          <View style={s.filterSummaryRow}>
            <Text style={s.filterSummaryText}>
              {employees.isLoading ? 'Loading employees...' : `Showing ${filteredEmployees.length} of ${(employees.data || []).length} employees`}
            </Text>
          </View>
        </View>

        {/* ── Employee List ── */}
        {employees.isLoading ? (
          <ActivityIndicator color={colors.blueLight} style={{ padding: 32 }} />
        ) : employees.isError ? (
          <Text style={s.errorText}>Unable to load employees.</Text>
        ) : (employees.data || []).length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.15)" />
            <Text style={s.emptyTitle}>No employees yet</Text>
            <Text style={s.emptyText}>Add the first employee above.</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={s.emptyFilterBox}>
            <Ionicons name="filter-outline" size={32} color="rgba(255,255,255,0.30)" />
            <Text style={s.emptyFilterTitle}>No matching employees found</Text>
            <Text style={s.emptyFilterSub}>Try searching with a different name, phone number, designation or role.</Text>
            <TouchableOpacity accessibilityRole="button" style={s.emptyFilterReset} onPress={resetFilters}>
              <Text style={s.emptyFilterResetText}>Clear all filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEmployees.map((employee: any) => {
            const rc = ROLE_COLORS[employee.subRole] || ROLE_COLORS.OTHER;
            const active = selectedId === employee.id;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                style={[s.employeeCard, active && s.employeeCardActive]}
                key={employee.id}
                onPress={() => setSelectedId(employee.id)}
                activeOpacity={0.8}
              >
                {/* Avatar */}
                <View style={[s.avatar, { backgroundColor: rc.tint, borderColor: rc.color }]}>
                  <Text style={[s.avatarInitial, { color: rc.color }]}>
                    {(employee.name || 'E').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.empName}>{employee.name}</Text>
                  <Text style={s.empMeta}>{employee.employeeId} · {employee.designation || employee.subRole}</Text>
                  {employee.mobile ? (
                    <Text style={s.subMeta}>📞 {employee.mobile}{employee.email ? ` · ✉️ ${employee.email}` : ''}</Text>
                  ) : employee.email ? (
                    <Text style={s.subMeta}>✉️ {employee.email}</Text>
                  ) : null}
                </View>

                {/* Role Badge */}
                <View style={[s.roleBadge, { backgroundColor: rc.tint }]}>
                  <Text style={[s.roleBadgeText, { color: rc.color }]}>{employee.subRole || 'STAFF'}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { ...surfaces.content, gap: 14 },

  glowOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, top: -120, right: -100, backgroundColor: 'rgba(99,102,241,0.09)' },

  // ── Hero ─────────────────────────────────────────────────────
  hero: { ...surfaces.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 24, flexWrap: 'wrap', overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, top: -80, right: -50, backgroundColor: 'rgba(99,102,241,0.12)' },
  eyebrow: { fontSize: 10, color: colors.blueLight, letterSpacing: 1.6, fontWeight: '800' },
  heroTitle: { fontSize: 26, color: '#f0f6ff', fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  heroSub: { marginTop: 5, lineHeight: 20, color: 'rgba(255,255,255,0.40)', fontSize: 13 },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 7, ...shadow.sm },
  addBtnText: { fontWeight: '800', color: '#ffffff', fontSize: 13 },

  // ── Form Card ────────────────────────────────────────────────
  formCard: { ...surfaces.card, padding: 20, gap: 10 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#f0f6ff', marginBottom: 6 },

  // ── Fields ───────────────────────────────────────────────────
  field: { gap: 6, width: '100%', minWidth: 0, flexShrink: 0 },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, color: '#f0f6ff', fontSize: 14 },
  readonly: { backgroundColor: 'rgba(255,255,255,0.03)', opacity: 0.6 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },

  // ── Choices ──────────────────────────────────────────────────
  choices: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', width: '100%' },
  choice: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 8 },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceText: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  choiceTextOn: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // ── Subject Section ──────────────────────────────────────────
  subjectSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 12,
    marginVertical: 4,
    flexShrink: 0,
  },
  subjectDropdownBtn: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  subjectDropdownBtnActive: {
    borderColor: 'rgba(56, 189, 248, 0.40)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  selectedSubjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 8, 18, 0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  dropdownSheet: {
    width: '92%',
    maxWidth: 540,
    backgroundColor: '#0e1525',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
  },
  dropdownOptionText: {
    color: '#f0f6ff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // ── Toggle ───────────────────────────────────────────────────
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  toggleText: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },

  // ── Buttons ──────────────────────────────────────────────────
  saveBtn: { borderRadius: radius.md, padding: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, ...shadow.sm },
  saveBtnText: { fontWeight: '800', color: '#ffffff', fontSize: 14 },
  secondaryBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.sm, padding: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  secondaryBtnText: { color: '#f0f6ff', fontWeight: '700', fontSize: 13 },

  // ── Modal ────────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: 'rgba(4,8,18,0.80)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalShell: { width: '92%', maxWidth: 780, maxHeight: '90%', backgroundColor: '#0e1525', borderRadius: radius.xxl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  modalContent: { padding: 0 },
  detailWrap: { backgroundColor: '#0e1525', padding: 24, gap: 12 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  detailName: { fontSize: 22, fontWeight: '800', color: '#f0f6ff', marginTop: 4 },
  detailMeta: { color: 'rgba(255,255,255,0.40)', marginTop: 4, fontSize: 13 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  // ── Security Box ─────────────────────────────────────────────
  securityBox: { backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.20)' },
  securityHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityTitle: { color: colors.warning, fontWeight: '800', fontSize: 14 },
  securityText: { color: 'rgba(255,255,255,0.50)', lineHeight: 19, fontSize: 13 },

  // ── Danger Zone ──────────────────────────────────────────────
  dangerZone: { backgroundColor: 'rgba(248,113,113,0.08)', borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: 1, borderColor: 'rgba(248,113,113,0.20)', marginTop: 8 },
  dangerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dangerTitle: { color: colors.danger, fontWeight: '800', fontSize: 14 },
  dangerText: { color: 'rgba(255,255,255,0.50)', fontSize: 13, lineHeight: 19 },
  dangerBtn: { backgroundColor: colors.danger, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // ── Employee Cards ────────────────────────────────────────────
  employeeCard: { ...surfaces.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, gap: 14 },
  employeeCardActive: { borderColor: colors.glowBorder },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarInitial: { fontWeight: '900', fontSize: 17 },
  empName: { color: '#f0f6ff', fontSize: 15, fontWeight: '700' },
  empMeta: { color: 'rgba(255,255,255,0.40)', marginTop: 3, fontSize: 12 },
  roleBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  roleBadgeText: { fontWeight: '800', fontSize: 11 },

  // ── Empty / Error ─────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyTitle: { color: '#f0f6ff', fontSize: 15, fontWeight: '700' },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  errorText: { color: colors.danger, padding: 16 },

  // ── Filter Card & Search ──────────────────────────────────────
  filterCard: {
    ...surfaces.card,
    padding: 16,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchInputContainer: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#f0f6ff',
    paddingVertical: 10,
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 12,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  filterSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  filterSummaryText: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 12,
    fontWeight: '600',
  },
  subMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 3,
  },
  emptyFilterBox: {
    ...surfaces.card,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyFilterTitle: {
    color: '#f0f6ff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyFilterSub: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyFilterReset: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  emptyFilterResetText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});
