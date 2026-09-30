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

function SubjectChoices({ subjects, value, onChange }: any) {
  return (
    <View style={s.field}>
      <Text style={s.label}>Primary subject *</Text>
      <View style={s.choices}>
        {subjects.map((subject: any) => (
          <TouchableOpacity accessibilityRole="button" key={subject.id} style={[s.choice, value === subject.id && s.choiceOn]} onPress={() => onChange(subject.id)}>
            <Text style={value === subject.id ? s.choiceTextOn : s.choiceText}>{subject.name} ({subject.code})</Text>
          </TouchableOpacity>
        ))}
      </View>
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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const rolesList = useMemo(() => {
    const set = new Set<string>(['TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'OTHER']);
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
    if (!form.name || !form.designation || !form.baseSalary) return Alert.alert('Missing details', 'Name, designation and base salary are required.');
    setSaving(true);
    try {
      const { data } = await api.post('/employees', { ...form, baseSalary: Number(form.baseSalary) });
      Alert.alert('Employee created', 'Employee ID: ' + data.temporaryCredentials.loginId);
      setForm(initial);
      setOpen(false);
      await client.invalidateQueries({ queryKey: ['employees'] });
    } catch (e: any) { Alert.alert('Could not create employee', e?.response?.data?.message || 'Please check the form.'); }
    finally { setSaving(false); }
  };

  const save = async () => {
    if (!selectedId || !editState.name || !editState.designation || !editState.joiningDate) return Alert.alert('Missing details', 'Name, designation and joining date are required.');
    setSaving(true);
    try {
      await api.patch('/employees/' + selectedId, { name: editState.name, subRole: editState.subRole, designation: editState.designation, joiningDate: editState.joiningDate, mobile: editState.mobile || undefined, email: editState.email || undefined, address: editState.address, canMarkStudentAttendance: editState.canMarkStudentAttendance, canMarkEmployeeAttendance: editState.canMarkEmployeeAttendance });
      const oldSalary = Number(detail.data?.salaryRevisions?.[0]?.amount || 0), newSalary = Number(editState.baseSalary);
      if (newSalary > 0 && newSalary !== oldSalary) await api.post('/employees/' + selectedId + '/salary-revisions', { amount: newSalary, effectiveDate: editState.joiningDate, reason: 'Admin profile update' });
      Alert.alert('Employee updated', 'All edited details were saved successfully.');
      await Promise.all([client.invalidateQueries({ queryKey: ['employees'] }), client.invalidateQueries({ queryKey: ['employee-detail', selectedId] })]);
    } catch (e: any) { Alert.alert('Could not update employee', e?.response?.data?.message || 'Please check the form.'); }
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
          <TouchableOpacity accessibilityRole="button" style={s.addBtn} onPress={() => setOpen(!open)}>
            <Ionicons name={open ? 'close' : 'add'} size={18} color="#ffffff" />
            <Text style={s.addBtnText}>{open ? 'Close form' : 'Add employee'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Add Form ── */}
        {open ? (
          <View style={s.formCard}>
            <Text style={s.formTitle}>New Employee</Text>
            <Field label="Full name *" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Priya Mehta" />
            <Choices label="Role" value={form.subRole} values={['TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'OTHER']} onChange={(v: string) => setForm((p: any) => ({ ...p, subRole: v, primarySubjectId: v === 'TEACHER' ? p.primarySubjectId : null }))} />
            {form.subRole === 'TEACHER' ? <SubjectChoices subjects={subjects} value={form.primarySubjectId} onChange={(v: string) => set('primarySubjectId', v)} /> : null}
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
                        <Choices label="Role" value={editState.subRole} values={['TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'OTHER']} onChange={(v: string) => setEdit('subRole', v)} />
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
  field: { gap: 6, flex: 1, minWidth: 0, flexShrink: 1 },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, color: '#f0f6ff', fontSize: 14 },
  readonly: { backgroundColor: 'rgba(255,255,255,0.03)', opacity: 0.6 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },

  // ── Choices ──────────────────────────────────────────────────
  choices: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  choice: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 8 },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceText: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  choiceTextOn: { color: '#fff', fontWeight: '700', fontSize: 12 },

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
