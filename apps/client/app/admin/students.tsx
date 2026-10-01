import { colors, surfaces } from '../../src/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/services/api';

const today = new Date().toISOString().slice(0, 10);
const initial = { name: '', dob: '2012-01-01', gender: 'Male', mobile: '', email: '', address: '', guardianName: '', guardianContact: '', admissionDate: today, rollNumber: '' };
function dateOnly(value: any) { return value ? String(value).slice(0, 10) : ''; }
function message(error: any) { const value = error?.response?.data?.message; return Array.isArray(value) ? value.join('\n') : value || 'Please check the details and try again.'; }

function Field({ label, value, onChangeText, placeholder, multiline = false, editable = true }: any) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput editable={editable} value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.25)" multiline={multiline} style={[styles.input, multiline && styles.multiline, !editable && styles.readonly]} /></View>;
}
function Choices({ label, value, values, onChange }: any) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.choices}>{values.map((item: string) => <TouchableOpacity accessibilityRole="button" key={item} onPress={() => onChange(item)} style={[styles.choice, value === item && styles.choiceActive]}><Text style={value === item ? styles.choiceTextActive : styles.choiceText}>{item}</Text></TouchableOpacity>)}</View></View>;
}
function SelectCards({ label, value, items, onChange, getLabel }: any) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.choices}>{items.map((item: any) => <TouchableOpacity accessibilityRole="button" key={item.id} onPress={() => onChange(item.id)} style={[styles.choice, value === item.id && styles.choiceActive]}><Text style={value === item.id ? styles.choiceTextActive : styles.choiceText}>{getLabel(item)}</Text></TouchableOpacity>)}</View></View>;
}

export default function StudentsScreen() {
  const client = useQueryClient();
  const [form, setForm] = useState<any>(initial);
  const [edit, setEdit] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordChangedFor, setPasswordChangedFor] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const students = useQuery<any>({ queryKey: ['students'], queryFn: async () => (await api.get('/students')).data });
  const academics = useQuery<any>({ queryKey: ['academics'], queryFn: async () => (await api.get('/academics')).data });
  const detail = useQuery<any>({ queryKey: ['student-detail', selectedId], queryFn: async () => (await api.get('/students/' + selectedId)).data, enabled: !!selectedId });
  const years = academics.data?.academicYears || [];
  const sections = useMemo(() => (academics.data?.classes || []).flatMap((schoolClass: any) => (schoolClass.sections || []).map((section: any) => ({ ...section, className: schoolClass.name }))), [academics.data]);
  const defaultYear = years.find((item: any) => item.isCurrent) || years[0];
  const defaultSection = sections[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');

  const classes = academics.data?.classes || [];
  const availableSections = useMemo(() => {
    if (!filterClassId) return [];
    const foundClass = classes.find((c: any) => c.id === filterClassId);
    return foundClass?.sections || [];
  }, [classes, filterClassId]);

  const filteredStudents = useMemo(() => {
    const list = students.data || [];
    const q = searchQuery.trim().toLowerCase();
    const cleanDigits = q.replace(/\D/g, '');

    return list.filter((student: any) => {
      const enrollment = student.enrollments?.find((item: any) => item.status === 'CURRENT') || student.enrollments?.[0];
      const currentClassId = enrollment?.section?.classId || enrollment?.section?.schoolClass?.id;
      const currentSectionId = enrollment?.sectionId || enrollment?.section?.id;

      // 1. Dynamic class filter from academics
      if (filterClassId && currentClassId !== filterClassId) {
        return false;
      }

      // 2. Section filter
      if (filterSectionId && currentSectionId !== filterSectionId) {
        return false;
      }

      // 3. Search query: name, mobile, guardian contact, studentId, roll no, email, guardian name, address
      if (q) {
        const rollStr = String(enrollment?.rollNumber ?? '');
        const fields = [
          student.name,
          student.studentId,
          student.mobile,
          student.guardianContact,
          student.guardianName,
          student.email,
          student.address,
          rollStr,
          enrollment?.section?.schoolClass?.name,
          enrollment?.section?.name,
        ];

        const textMatches = fields.some((field) => field && String(field).toLowerCase().includes(q));
        if (textMatches) return true;

        if (cleanDigits.length >= 3) {
          const studentMobileDigits = (student.mobile || '').replace(/\D/g, '');
          const guardianContactDigits = (student.guardianContact || '').replace(/\D/g, '');
          if (studentMobileDigits.includes(cleanDigits) || guardianContactDigits.includes(cleanDigits)) {
            return true;
          }
        }

        return false;
      }

      return true;
    });
  }, [students.data, searchQuery, filterClassId, filterSectionId]);

  const isFiltered = Boolean(searchQuery.trim() || filterClassId || filterSectionId);
  const resetFilters = () => {
    setSearchQuery('');
    setFilterClassId('');
    setFilterSectionId('');
  };

  useEffect(() => {
    if (!detail.data) return;
    const enrollment = detail.data.enrollments?.find((item: any) => item.status === 'CURRENT') || detail.data.enrollments?.[0];
    setEdit({ name: detail.data.name || '', dob: dateOnly(detail.data.dob), gender: detail.data.gender || 'Other', mobile: detail.data.mobile || '', email: detail.data.email || '', address: detail.data.address || '', guardianName: detail.data.guardianName || '', guardianContact: detail.data.guardianContact || '', admissionDate: dateOnly(detail.data.admissionDate), academicYearId: enrollment?.academicYearId || '', sectionId: enrollment?.sectionId || '', rollNumber: String(enrollment?.rollNumber || '') });
  }, [detail.data]);

  const setCreate = (key: string, value: string) => setForm((old: any) => ({ ...old, [key]: value }));
  const setStudent = (key: string, value: string) => setEdit((old: any) => ({ ...old, [key]: value }));
  const validate = (value: any) => {
    if (!value.name || !value.guardianName || !value.guardianContact || !value.address || !value.rollNumber) { Alert.alert('Missing details', 'Name, guardian details, address and roll number are required.'); return false; }
    if (value.mobile && value.mobile.replace(/\D/g, '').length < 10) { Alert.alert('Invalid mobile', 'Mobile number must contain at least 10 digits.'); return false; }
    return true;
  };
  const create = async () => {
    if (!validate(form) || !defaultYear?.id || !defaultSection?.id) return;
    setSaving(true);
    try { const { data } = await api.post('/students', { ...form, mobile: form.mobile || undefined, email: form.email || undefined, rollNumber: Number(form.rollNumber), academicYearId: defaultYear.id, sectionId: defaultSection.id }); const credentials = data.temporaryCredentials; Alert.alert('Student created', 'Student ID: ' + credentials.loginId + '\nPassword set by admin successfully.'); setForm(initial); setOpen(false); await client.invalidateQueries({ queryKey: ['students'] }); } catch (error: any) { Alert.alert('Could not create student', message(error)); } finally { setSaving(false); }
  };
  const save = async () => {
    if (!selectedId || !validate(edit)) return;
    setSaving(true);
    try { await api.patch('/students/' + selectedId, { ...edit, rollNumber: Number(edit.rollNumber) }); Alert.alert('Student updated', 'All edited details were saved successfully.'); await Promise.all([client.invalidateQueries({ queryKey: ['students'] }), client.invalidateQueries({ queryKey: ['student-detail', selectedId] })]); } catch (error: any) { Alert.alert('Could not update student', message(error)); } finally { setSaving(false); }
  };
  const resetPassword = async () => {
    if (!selectedId) return;
    setSaving(true);
    if (adminPassword.length < 8) { setSaving(false); return Alert.alert('Password too short', 'Admin password must have at least 8 characters.'); }
    try { const { data } = await api.post('/students/' + selectedId + '/reset-password', { password: adminPassword }); Alert.alert('Password updated', 'Login ID: ' + data.loginId + '\nThe student can now sign in with the password set by you.'); setAdminPassword(''); setPasswordChangedFor(selectedId); await client.invalidateQueries({ queryKey: ['student-detail', selectedId] }); } catch (error: any) { Alert.alert('Password update failed', message(error)); } finally { setSaving(false); }
  };
  const deactivateStudent = async () => {
    if (!selectedId || !deleteReason.trim()) return Alert.alert('Reason required', 'Enter a reason before deleting this student.');
    setSaving(true);
    try { await api.post('/students/' + selectedId + '/deactivate', { reason: deleteReason.trim() }); Alert.alert('Student deleted', 'The student account is now inactive and all historical records are preserved.'); setDeleteReason(''); setSelectedId(null); await client.invalidateQueries({ queryKey: ['students'] }); } catch (error: any) { Alert.alert('Could not delete student', message(error)); } finally { setSaving(false); }
  };

  const downloadPDF = () => {
    if (!detail.data) return;
    const student = detail.data;
    const enrollment = student.enrollments?.find((item: any) => item.status === 'CURRENT') || student.enrollments?.[0];
    const className = enrollment?.section?.schoolClass?.name || 'Class';
    const sectionName = enrollment?.section?.name || '';
    const academicYear = years.find((y: any) => y.id === enrollment?.academicYearId)?.name || '2026-27';

    const sanitize = (str: any) => String(str ?? '—').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');

    const rows = [
      ['Full Name', student.name],
      ['Student ID', student.studentId],
      ['Login ID', student.user?.loginId || student.studentId],
      ['Academic Year', academicYear],
      ['Class / Section', `${className} / ${sectionName}`.trim()],
      ['Roll Number', enrollment?.rollNumber || edit.rollNumber],
      ['Date of Birth', dateOnly(student.dob)],
      ['Gender', student.gender],
      ['Admission Date', dateOnly(student.admissionDate)],
      ['Guardian Name', student.guardianName],
      ['Guardian Contact', student.guardianContact],
      ['Mobile Number', student.mobile],
      ['Email Address', student.email],
      ['Residential Address', student.address],
      ['Account Status', student.status || 'ACTIVE'],
    ];

    let stream = '';
    // Header dark banner
    stream += '0.04 0.11 0.22 rg 40 760 515 45 re f\n';
    stream += 'BT /F2 16 Tf 1 1 1 rg 55 785 Td (Arihant Public School) Tj ET\n';
    stream += 'BT /F1 10 Tf 0.8 0.88 1 rg 55 770 Td (OFFICIAL STUDENT RECORD) Tj ET\n';

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
      a.download = `${student.name || 'student'}_details.pdf`.replace(/\s+/g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const downloadListPDF = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      return Alert.alert('No records', 'No students match the current filters to download.');
    }

    const selectedClassObj = classes.find((c: any) => c.id === filterClassId);
    const selectedSecObj = availableSections.find((s: any) => s.id === filterSectionId);

    const filterParts: string[] = [];
    if (selectedClassObj) {
      filterParts.push(`Class: ${selectedClassObj.name}`);
      if (selectedSecObj) filterParts.push(`Section: ${selectedSecObj.name}`);
    } else {
      filterParts.push('All Classes');
    }
    if (searchQuery.trim()) {
      filterParts.push(`Search: "${searchQuery.trim()}"`);
    }
    const filterDesc = filterParts.join(' | ');

    const title = 'Arihant Public School';
    const subtitle = `STUDENT DIRECTORY REPORT · ${filterDesc} · Total: ${filteredStudents.length} Students`;

    const columns = [
      { header: '#', x: 5 },
      { header: 'Roll', x: 25 },
      { header: 'Student Name', x: 55 },
      { header: 'ID', x: 165 },
      { header: 'Class/Sec', x: 230 },
      { header: 'Guardian Name', x: 300 },
      { header: 'Mobile', x: 400 },
      { header: 'Status', x: 475 },
    ];

    const rows = filteredStudents.map((student: any, idx: number) => {
      const enrollment = student.enrollments?.find((item: any) => item.status === 'CURRENT') || student.enrollments?.[0];
      const className = enrollment?.section?.schoolClass?.name || 'Class';
      const sectionName = enrollment?.section?.name || '';
      const classSec = `${className} ${sectionName}`.trim();
      const roll = enrollment?.rollNumber ? String(enrollment.rollNumber) : '—';

      return [
        String(idx + 1),
        roll,
        student.name || '—',
        student.studentId || '—',
        classSec,
        student.guardianName || '—',
        student.mobile || student.guardianContact || '—',
        student.status || 'ACTIVE',
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
      const cleanFileName = `Students_List_${selectedClassObj ? selectedClassObj.name.replace(/\s+/g, '_') : 'All'}.pdf`;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return <View style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}>
      <View style={styles.heroCopy}>
        <Text style={styles.eyebrow}>STUDENT DIRECTORY</Text>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.sub}>Tap any student to view and edit the complete profile.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <TouchableOpacity accessibilityRole="button" style={[styles.primary, { backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', gap: 6 }]} onPress={downloadListPDF}>
          <Text style={styles.primaryText}>⬇ Download List (PDF)</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => setOpen(!open)}>
          <Text style={styles.primaryText}>{open ? 'Close form' : '+ Add student'}</Text>
        </TouchableOpacity>
      </View>
    </View>
    {open ? <View style={styles.form}><Text style={styles.formTitle}>New student</Text><Field label="Full name *" value={form.name} onChangeText={(value: string) => setCreate('name', value)} placeholder="Aarav Sharma" /><View style={styles.row}><View style={styles.half}><Field label="Date of birth *" value={form.dob} onChangeText={(value: string) => setCreate('dob', value)} placeholder="YYYY-MM-DD" /></View><View style={styles.half}><Field label="Admission date *" value={form.admissionDate} onChangeText={(value: string) => setCreate('admissionDate', value)} placeholder="YYYY-MM-DD" /></View></View><Choices label="Gender" value={form.gender} values={['Male', 'Female', 'Other']} onChange={(value: string) => setCreate('gender', value)} /><Field label="Guardian name *" value={form.guardianName} onChangeText={(value: string) => setCreate('guardianName', value)} placeholder="Parent / guardian" /><Field label="Guardian contact *" value={form.guardianContact} onChangeText={(value: string) => setCreate('guardianContact', value)} placeholder="Required phone number" /><Field label="Mobile" value={form.mobile} onChangeText={(value: string) => setCreate('mobile', value)} placeholder="Optional, minimum 10 digits" /><Field label="Email" value={form.email} onChangeText={(value: string) => setCreate('email', value)} placeholder="student@example.com" /><Field label="Roll number *" value={form.rollNumber} onChangeText={(value: string) => setCreate('rollNumber', value)} placeholder="e.g. 12" /><Field label="Address *" value={form.address} onChangeText={(value: string) => setCreate('address', value)} placeholder="Full address" multiline /><Text style={styles.setup}>Admission: {defaultYear?.name || 'current year'} · {defaultSection?.className || 'Class 1'} / Section {defaultSection?.name || 'A'}</Text><TouchableOpacity accessibilityRole="button" style={styles.save} onPress={create} disabled={saving}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={styles.saveText}>Create student</Text>}</TouchableOpacity></View> : null}

    <Modal visible={!!selectedId} transparent animationType="fade" onRequestClose={() => setSelectedId(null)}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close student details" style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />
        <View style={styles.modalShell}>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator>
            {selectedId ? <View style={styles.detailPanel}>{detail.isLoading ? <ActivityIndicator color="#e8aa43" /> : detail.isError ? <Text style={styles.error}>Could not load student details.</Text> : <><View style={styles.detailHeader}><View><Text style={styles.eyebrow}>COMPLETE STUDENT PROFILE</Text><Text style={styles.formTitle}>{detail.data?.name}</Text><Text style={styles.meta}>Login ID: {detail.data?.user?.loginId || detail.data?.studentId}</Text></View><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><TouchableOpacity accessibilityRole="button" style={[styles.close, { backgroundColor: '#1d4ed8', borderColor: '#2563eb' }]} onPress={downloadPDF}><Text style={styles.closeText}>⬇ PDF</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={styles.close} onPress={() => setSelectedId(null)}><Text style={styles.closeText}>Close ✕</Text></TouchableOpacity></View></View><View style={styles.security}><Text style={styles.securityTitle}>{passwordChangedFor === selectedId ? 'Password changed successfully ✓' : 'Admin-controlled password'}</Text><Text style={styles.securityText}>Students cannot change their password. Set a new password here; the existing password is never displayed.</Text><Text style={styles.meta}>{passwordChangedFor === selectedId ? 'The new admin-set password is active.' : 'Password change required: No'}</Text><Field label="New password (minimum 8 characters)" value={adminPassword} onChangeText={setAdminPassword} placeholder="Enter password" /><TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={resetPassword} disabled={saving}><Text style={styles.secondaryText}>{passwordChangedFor === selectedId ? 'Change password again' : 'Set student password'}</Text></TouchableOpacity></View><Field label="Student ID" value={detail.data?.studentId} editable={false} /><Field label="Full name *" value={edit.name} onChangeText={(value: string) => setStudent('name', value)} /><View style={styles.row}><View style={styles.half}><Field label="Date of birth *" value={edit.dob} onChangeText={(value: string) => setStudent('dob', value)} /></View><View style={styles.half}><Field label="Admission date *" value={edit.admissionDate} onChangeText={(value: string) => setStudent('admissionDate', value)} /></View></View><Choices label="Gender" value={edit.gender} values={['Male', 'Female', 'Other']} onChange={(value: string) => setStudent('gender', value)} /><Field label="Mobile" value={edit.mobile} onChangeText={(value: string) => setStudent('mobile', value)} /><Field label="Email" value={edit.email} onChangeText={(value: string) => setStudent('email', value)} /><Field label="Guardian name *" value={edit.guardianName} onChangeText={(value: string) => setStudent('guardianName', value)} /><Field label="Guardian contact *" value={edit.guardianContact} onChangeText={(value: string) => setStudent('guardianContact', value)} /><Field label="Address *" value={edit.address} onChangeText={(value: string) => setStudent('address', value)} multiline /><SelectCards label="Academic year" value={edit.academicYearId} items={years} onChange={(value: string) => setStudent('academicYearId', value)} getLabel={(item: any) => item.name} /><SelectCards label="Class / section" value={edit.sectionId} items={sections} onChange={(value: string) => setStudent('sectionId', value)} getLabel={(item: any) => item.className + ' / ' + item.name} /><Field label="Roll number *" value={edit.rollNumber} onChangeText={(value: string) => setStudent('rollNumber', value)} /><TouchableOpacity accessibilityRole="button" style={styles.save} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#071d33" /> : <Text style={styles.saveText}>Save student changes</Text>}</TouchableOpacity><View style={styles.dangerZone}><Text style={styles.dangerTitle}>Delete student access</Text><Text style={styles.dangerText}>This deactivates login and preserves attendance, fees and results history.</Text><Field label="Reason *" value={deleteReason} onChangeText={setDeleteReason} placeholder="Transferred to another school" /><TouchableOpacity accessibilityRole="button" style={styles.dangerButton} onPress={deactivateStudent} disabled={saving}><Text style={styles.dangerButtonText}>Delete student</Text></TouchableOpacity></View></>}</View> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Search & Filter Bar */}
    <View style={styles.filterCard}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone / mobile, ID, roll no, guardian..."
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isFiltered ? (
          <TouchableOpacity accessibilityRole="button" style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Reset Filters ↺</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterSelectorsRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Class Filter</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContainer}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.filterChip, !filterClassId && styles.filterChipActive]}
              onPress={() => {
                setFilterClassId('');
                setFilterSectionId('');
              }}
            >
              <Text style={!filterClassId ? styles.filterChipTextActive : styles.filterChipText}>
                All Classes ({students.data?.length || 0})
              </Text>
            </TouchableOpacity>
            {classes.map((cls: any) => {
              const isActive = filterClassId === cls.id;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={cls.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => {
                    setFilterClassId(isActive ? '' : cls.id);
                    setFilterSectionId('');
                  }}
                >
                  <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filterClassId && availableSections.length > 0 ? (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Section Filter</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContainer}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.filterChip, !filterSectionId && styles.filterChipActive]}
                onPress={() => setFilterSectionId('')}
              >
                <Text style={!filterSectionId ? styles.filterChipTextActive : styles.filterChipText}>
                  All Sections
                </Text>
              </TouchableOpacity>
              {availableSections.map((sec: any) => {
                const isActive = filterSectionId === sec.id;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={sec.id}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setFilterSectionId(isActive ? '' : sec.id)}
                  >
                    <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>
                      Section {sec.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View style={styles.filterSummaryRow}>
        <Text style={styles.filterSummaryText}>
          {students.isLoading ? 'Loading students...' : `Showing ${filteredStudents.length} of ${students.data?.length || 0} students`}
        </Text>
      </View>
    </View>

    {students.isLoading ? (
      <ActivityIndicator color="#e8aa43" />
    ) : students.isError ? (
      <Text style={styles.error}>Unable to load students.</Text>
    ) : (students.data || []).length === 0 ? (
      <Text style={styles.empty}>No students yet. Add the first student above.</Text>
    ) : filteredStudents.length === 0 ? (
      <View style={styles.emptyFilterBox}>
        <Text style={styles.emptyFilterTitle}>No matching students found</Text>
        <Text style={styles.emptyFilterSub}>Try searching with a different name, phone number, class or section.</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.emptyFilterReset} onPress={resetFilters}>
          <Text style={styles.emptyFilterResetText}>Clear all filters</Text>
        </TouchableOpacity>
      </View>
    ) : (
      filteredStudents.map((student: any) => {
        const enrollment = student.enrollments?.find((item: any) => item.status === 'CURRENT') || student.enrollments?.[0];
        return (
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.card, selectedId === student.id && styles.cardSelected]}
            key={student.id}
            onPress={() => setSelectedId(student.id)}
          >
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text style={styles.cardTitle}>{student.name}</Text>
              <Text style={styles.meta}>
                {student.studentId} · {enrollment?.section?.schoolClass?.name || 'Class'} {enrollment?.section?.name || ''} · Roll {enrollment?.rollNumber || '—'}
              </Text>
              {student.mobile ? (
                <Text style={styles.subMeta}>📞 {student.mobile}{student.guardianContact ? ` · Parent: ${student.guardianContact}` : ''}</Text>
              ) : student.guardianContact ? (
                <Text style={styles.subMeta}>📞 Parent: {student.guardianContact}</Text>
              ) : null}
              <Text style={styles.tap}>Tap to view complete details and edit</Text>
            </View>
            <Text style={styles.badge}>{student.status || 'ACTIVE'}</Text>
          </TouchableOpacity>
        );
      })
    )}
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...surfaces.content, gap: 16 },
  hero: {
    ...surfaces.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexWrap: 'wrap',
  },
  heroCopy: { flex: 1, minWidth: 0, flexShrink: 1 },
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.4, color: colors.blueLight },
  title: { marginTop: 6, fontSize: 28, color: '#f0f6ff', fontWeight: '800', letterSpacing: -0.3 },
  sub: { marginTop: 4, lineHeight: 21, color: 'rgba(255, 255, 255, 0.45)' },
  primary: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, justifyContent: 'center', backgroundColor: colors.primary, minHeight: 44 },
  primaryText: { fontWeight: '800', color: '#FFFFFF' },
  form: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 20,
    gap: 10,
    borderRadius: 14,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(4, 8, 18, 0.80)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalShell: {
    width: '92%',
    maxWidth: 780,
    maxHeight: '90%',
    backgroundColor: '#0e1525',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: { padding: 0 },
  detailPanel: { backgroundColor: '#0e1525', padding: 22, gap: 11 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  formTitle: { fontSize: 22, marginBottom: 4, fontWeight: '800', color: '#f0f6ff', letterSpacing: -0.2 },
  field: { gap: 5, minWidth: 0, flexShrink: 0 },
  label: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#f0f6ff',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    fontSize: 14,
  },
  readonly: { backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'rgba(255, 255, 255, 0.40)', borderColor: 'rgba(255, 255, 255, 0.06)' },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flex: 1 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  choice: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: 'rgba(255, 255, 255, 0.50)', fontSize: 12, fontWeight: '600' },
  choiceTextActive: { color: '#fff', fontWeight: '800', fontSize: 12 },
  setup: { color: 'rgba(255, 255, 255, 0.40)', fontSize: 12, marginTop: 4 },
  save: { borderRadius: 11, padding: 14, alignItems: 'center', marginTop: 4, justifyContent: 'center', backgroundColor: colors.primary, minHeight: 44 },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
  secondary: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 5,
  },
  secondaryText: { color: '#f0f6ff', fontWeight: '800' },
  close: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  closeText: { color: '#f0f6ff', fontWeight: '700' },
  security: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.20)',
    borderRadius: 12,
    padding: 14,
    gap: 5,
  },
  securityTitle: { color: colors.warning, fontWeight: '800' },
  securityText: { color: 'rgba(255, 255, 255, 0.55)', lineHeight: 19 },
  card: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardTitle: { color: '#f0f6ff', fontSize: 17, fontWeight: '800' },
  meta: { color: 'rgba(255, 255, 255, 0.40)', marginTop: 5 },
  tap: { color: colors.blueLight, fontSize: 11, fontWeight: '700', marginTop: 7 },
  badge: { color: colors.success, fontWeight: '800', fontSize: 11 },
  empty: { color: 'rgba(255, 255, 255, 0.40)', textAlign: 'center', padding: 30 },
  error: { color: colors.danger },
  dangerZone: {
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.20)',
    borderRadius: 12,
    padding: 14,
    gap: 7,
  },
  dangerTitle: { color: colors.danger, fontWeight: '800' },
  dangerText: { color: 'rgba(255, 255, 255, 0.55)' },
  dangerButton: { backgroundColor: colors.danger, borderRadius: 9, padding: 12, alignItems: 'center' },
  dangerButtonText: { color: '#fff', fontWeight: '800' },
  filterCard: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f0f6ff',
    paddingVertical: 10,
    fontSize: 14,
  },
  searchClearIcon: {
    color: 'rgba(255, 255, 255, 0.40)',
    fontSize: 14,
    fontWeight: '700',
    padding: 4,
  },
  resetButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.30)',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 12,
  },
  filterSelectorsRow: {
    gap: 10,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: 'rgba(255, 255, 255, 0.60)',
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
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterSummaryText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  subMeta: {
    color: 'rgba(255, 255, 255, 0.50)',
    fontSize: 12,
    marginTop: 3,
  },
  emptyFilterBox: {
    ...surfaces.card,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
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
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyFilterReset: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyFilterResetText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});
